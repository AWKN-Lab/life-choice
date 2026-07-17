"""六壬 PDF → MD 批量转换（MinerU CLI 逐文件 + 断电续传）"""
import subprocess, json, time, os, shutil
from pathlib import Path

MINERU = r"C:\Users\10919\.claude\skills\awkn-mineru\skills\.venv-mineru\Scripts\mineru.exe"
PDF_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬")
OUT_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬")
PROGRESS = OUT_DIR / "_batch_progress.json"

SKIP = {'六爻正道.pdf','大六壬神课金口诀分类解断.pdf','大六壬神课研究应用课程讲义.pdf','六壬神课金口诀现代实例精解.pdf','六爻预测彩票3D.pdf','彩票与奇门.pdf'}

def get_pending():
    pdfs = sorted([p for p in PDF_DIR.rglob("*.pdf") if p.name not in SKIP], key=lambda p: p.stat().st_size)
    done = set()
    if PROGRESS.exists():
        with open(PROGRESS, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data.get("completed", []):
                done.add(item["name"])
            # also check existing MD files
            for md in OUT_DIR.rglob("*.md"):
                done.add(md.stem + ".pdf")
    return [p for p in pdfs if p.name not in done], json.load(open(PROGRESS, 'r', encoding='utf-8')) if PROGRESS.exists() else {"completed":[],"failed":[],"started":time.strftime("%Y-%m-%d %H:%M:%S")}

def find_md_in_output(outpath):
    for md in Path(outpath).rglob("*.md"):
        return md
    return None

def main():
    env = {**os.environ, "HF_ENDPOINT": "https://hf-mirror.com"}
    pending, progress = get_pending()

    if not pending:
        print("✅ 全部已完成")
        return

    print(f"待处理: {len(pending)} / 总计: {len(pending) + len(progress['completed'])}")
    print(f"MinersU: {MINERU}")
    print()

    t0 = time.time()

    for i, pdf in enumerate(pending):
        name = pdf.name
        stem = pdf.stem
        kb = pdf.stat().st_size // 1024
        outdir = OUT_DIR / stem

        print(f"\n[{i+1}/{len(pending)}] {name} ({kb}KB) {time.strftime('%H:%M:%S')}", flush=True)

        # 清理旧临时输出
        if outdir.exists():
            shutil.rmtree(str(outdir), ignore_errors=True)
        outdir.mkdir(parents=True, exist_ok=True)

        t1 = time.time()
        try:
            result = subprocess.run(
                [MINERU, "-p", str(pdf), "-o", str(outdir), "-m", "ocr"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=7200, env=env
            )

            elapsed = time.time() - t1
            md_file = find_md_in_output(outdir)
            if md_file and result.returncode == 0:
                # 把 MD 移到目录根
                final_md = OUT_DIR / f"{stem}.md"
                os.makedirs(str(final_md.parent), exist_ok=True)
                shutil.move(str(md_file), str(final_md))
                # 移动 images 目录
                img_src = outdir / stem / "images"
                img_dst = OUT_DIR / f"{stem}_images"
                if img_src.exists():
                    if img_dst.exists():
                        shutil.rmtree(str(img_dst), ignore_errors=True)
                    shutil.move(str(img_src), str(img_dst))
                # 清理
                shutil.rmtree(str(outdir), ignore_errors=True)

                md_kb = final_md.stat().st_size // 1024 if final_md.exists() else 0
                progress["completed"].append({
                    "name": name, "time": time.strftime("%H:%M:%S"),
                    "elapsed": f"{elapsed:.0f}s", "md_kb": md_kb
                })
                print(f"  ✅ {elapsed:.0f}s → {stem}.md ({md_kb}KB)", flush=True)
            else:
                print(f"  ❌ 退出码={result.returncode}", flush=True)
                progress["failed"].append({"name": name, "error": f"exit code {result.returncode}"})

        except subprocess.TimeoutExpired:
            print(f"  ❌ 超时 (7200s)", flush=True)
            progress["failed"].append({"name": name, "error": "timeout"})
        except Exception as e:
            print(f"  ❌ {e}", flush=True)
            progress["failed"].append({"name": name, "error": str(e)})

        # 每次保存进度
        progress["updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        with open(PROGRESS, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - t0
    ok = len(progress["completed"])
    fail = len(progress["failed"])
    print(f"\n{'='*50}")
    print(f"全部完成! 成功:{ok} 失败:{fail} 总耗时:{elapsed:.0f}s ({elapsed/3600:.1f}h)")

if __name__ == "__main__":
    main()
