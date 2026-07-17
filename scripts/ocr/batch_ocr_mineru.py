"""
AWKN 六壬 PDF → MD 批量转换 (MinerU VLM 长驻服务器模式)
模型只加载一次，批量处理所有扫描 PDF，断电续传
"""
import subprocess, time, json, os, sys, requests, shutil
from pathlib import Path

VENV_PYTHON = r"C:\Users\10919\.claude\skills\awkn-mineru\skills\.venv-mineru\Scripts\python.exe"
API_PORT = 8765
API_URL = f"http://127.0.0.1:{API_PORT}"
PDF_ROOT = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬")
OUT_ROOT = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬")
PROGRESS_FILE = OUT_ROOT / "_batch_progress.json"
SKIP_FILES = {
    '六爻正道.pdf', '大六壬神课金口诀分类解断.pdf',
    '大六壬神课研究应用课程讲义.pdf', '六壬神课金口诀现代实例精解.pdf',
    '六爻预测彩票3D.pdf',
}

def find_pdfs():
    pdfs = sorted(PDF_ROOT.rglob("*.pdf"))
    return [p for p in pdfs if p.name not in SKIP_FILES]

def load_progress():
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"completed": [], "failed": [], "started_at": None, "updated_at": None}

def save_progress(data):
    data["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def wait_for_api(timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{API_URL}/health", timeout=2)
            if r.status_code == 200:
                return True
        except:
            pass
        time.sleep(2)
    return False

def submit_task(file_path, output_dir):
    output_dir = str(output_dir.absolute())
    files = {"files": (file_path.name, open(str(file_path), "rb"), "application/pdf")}
    data = {
        "output_dir": output_dir,
        "parse_method": "ocr",
        "lang_list": ["ch"],
        "backend": "hybrid-auto-engine",
    }
    r = requests.post(f"{API_URL}/file_parse", files=files, data=data, timeout=300)
    return r.json()

def get_task_result(task_id, timeout=7200):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{API_URL}/tasks/{task_id}/status", timeout=5)
            status = r.json()
            if status.get("state") in ("SUCCESS", "FAILURE"):
                return status
        except:
            pass
        time.sleep(10)
        elapsed = int(time.time() - start)
        if elapsed % 120 == 0:
            print(f"    等待中... ({elapsed}s)")
    return {"state": "TIMEOUT"}

def copy_md_to_target(task_result, pdf_name):
    """Copy the generated MD and assets from MinerU output to our target dir"""
    result = task_result.get("result", {})
    md_path = result.get("markdown_file", "")
    if md_path and os.path.exists(md_path):
        clean_name = Path(pdf_name).stem
        out_md = OUT_ROOT / f"{clean_name}.md"
        out_md.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(md_path, out_md)

        # copy images dir if exists
        img_dir = os.path.join(os.path.dirname(md_path), "images")
        if os.path.isdir(img_dir):
            out_img = OUT_ROOT / f"{clean_name}_images"
            if out_img.exists():
                shutil.rmtree(out_img)
            shutil.copytree(img_dir, out_img)
        return out_md
    return None

def main():
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

    progress = load_progress()
    pdf_files = find_pdfs()
    completed_names = set(f["name"] for f in progress["completed"])

    pending = [p for p in pdf_files if p.name not in completed_names]
    if not pending:
        print("✅ 全部已完成！")
        return

    print(f"总计 {len(pdf_files)} 个 PDF")
    print(f"已完成 {len(progress['completed'])} 个")
    print(f"待处理 {len(pending)} 个")
    print(f"API: {API_URL}")
    print()

    # Start MinerU API server
    print("启动 MinerU API 服务器...")
    api_args = [
        VENV_PYTHON, "-m", "mineru.cli.fast_api",
        "--host", "127.0.0.1", "--port", str(API_PORT),
    ]
    api_proc = subprocess.Popen(
        api_args,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        env={**os.environ, "HF_ENDPOINT": "https://hf-mirror.com"}
    )

    try:
        if not wait_for_api(120):
            print("❌ API 服务器启动超时")
            api_proc.kill()
            return
        print("✅ API 服务器就绪")
        print()

        for i, pdf_path in enumerate(pending):
            name = pdf_path.name
            size_kb = pdf_path.stat().st_size // 1024
            print(f"[{i+1}/{len(pending)}] {name} ({size_kb}KB)", flush=True)

            try:
                output_dir = Path(os.environ.get("TEMP", "/tmp")) / f"mineru_{Path(name).stem}"
                task = submit_task(pdf_path, output_dir)
                task_id = task.get("task_id", "")
                print(f"    任务ID: {task_id}, 等待完成...", flush=True)

                result = get_task_result(task_id)
                if result.get("state") == "SUCCESS":
                    out_file = copy_md_to_target(result, name)
                    if out_file:
                        print(f"    ✅ {out_file}", flush=True)
                    else:
                        print(f"    ⚠️ MD 文件未找到", flush=True)
                    progress["completed"].append({"name": name, "task_id": task_id, "time": time.strftime("%H:%M:%S")})
                else:
                    print(f"    ❌ {result.get('state', 'UNKNOWN')}", flush=True)
                    progress["failed"].append({"name": name, "task_id": task_id, "error": result})
            except Exception as e:
                print(f"    ❌ 异常: {e}", flush=True)
                progress["failed"].append({"name": name, "error": str(e)})

            save_progress(progress)

    except KeyboardInterrupt:
        print("\n中断...")
    finally:
        print("关闭 API 服务器...")
        api_proc.kill()
        api_proc.wait()

    ok = len(progress["completed"])
    fail = len(progress["failed"])
    print(f"\n=== 完成 === 成功:{ok} 失败:{fail}")

if __name__ == "__main__":
    main()
