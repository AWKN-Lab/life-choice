#!/usr/bin/env python3
"""批量 MinerU VLM OCR 转换扫描版六壬 PDF -> MD
稳健版：顺序处理、进度保存、断点续传、日志记录
"""
import subprocess
import json
import time
import shutil
import sys
from pathlib import Path

MINERU = r"C:\Users\10919\.claude\skills\awkn-mineru\skills\.venv-mineru\Scripts\mineru.exe"
PDF_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬")
OUT_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬")
PROGRESS = OUT_DIR / "_batch_progress.json"
LOG_FILE = OUT_DIR / "_batch_log.txt"
PROCESSED = OUT_DIR / "_processed_md"
PROCESSED.mkdir(parents=True, exist_ok=True)

SKIP = {
    '六爻正道.pdf', '大六壬神课金口诀分类解断.pdf',
    '大六壬神课研究应用课程讲义.pdf', '六壬神课金口诀现代实例精解.pdf',
    '六爻预测彩票3D.pdf', '彩票与奇门.pdf'
}

TIMEOUT_FILE = 5400

def log(msg: str):
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def load_progress():
    if PROGRESS.exists():
        with open(PROGRESS, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": [], "failed": [], "skipped": []}

def save_progress(p):
    with open(PROGRESS, "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)

def get_pending():
    progress = load_progress()
    completed = set(progress.get("completed", []))
    failed = set(item["name"] if isinstance(item, dict) else item for item in progress.get("failed", []))

    pdfs = []
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        name = pdf.name
        if name in SKIP or name in completed or name in failed:
            continue
        md_out = PROCESSED / name.replace(".pdf", ".md")
        if md_out.exists():
            completed.add(name)
            continue
        kb = pdf.stat().st_size // 1024
        pdfs.append((kb, pdf, name))
    pdfs.sort()
    return pdfs, completed, failed, progress

def main():
    pdfs, completed, failed, progress = get_pending()
    if not pdfs:
        log(f"全部完成! 成功 {len(completed)} | 失败 {len(failed)}")
        return

    log(f"待处理: {len(pdfs)} | 已完成: {len(completed)} | 失败: {len(failed)}")
    env = {**__import__("os").environ, "HF_ENDPOINT": "https://hf-mirror.com"}

    for i, (kb, pdf_path, name) in enumerate(pdfs):
        log(f"[{i+1}/{len(pdfs)}] {name} ({kb}KB)")

        outdir = OUT_DIR / f"_{name}_temp"
        if outdir.exists():
            shutil.rmtree(str(outdir), ignore_errors=True)
        outdir.mkdir(parents=True, exist_ok=True)

        t0 = time.time()
        try:
            result = subprocess.run(
                [MINERU, "-p", str(pdf_path), "-o", str(outdir), "-m", "ocr"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=TIMEOUT_FILE, env=env
            )
            elapsed = int(time.time() - t0)

            if result.returncode == 0:
                md_files = list(outdir.rglob("*.md"))
                if md_files:
                    final_md = PROCESSED / name.replace(".pdf", ".md")
                    shutil.copy2(md_files[0], final_md)

                    img_dir = outdir / name.replace(".pdf", "") / "hybrid_ocr" / "images"
                    if img_dir.exists():
                        dest_img = PROCESSED / f"{name.replace('.pdf','')}_images"
                        if dest_img.exists():
                            shutil.rmtree(str(dest_img), ignore_errors=True)
                        shutil.copytree(str(img_dir), str(dest_img))

                    log(f"  OK {elapsed}s -> {final_md.stat().st_size} bytes")
                    progress.setdefault("completed", []).append(name)
                else:
                    log(f"  WARN: 无 MD 输出 (elapsed={elapsed}s)")
                    progress.setdefault("failed", []).append({"name": name, "error": "no md output"})
            else:
                log(f"  FAIL exit={result.returncode} (elapsed={elapsed}s)")
                progress.setdefault("failed", []).append(
                    {"name": name, "error": f"exit code {result.returncode}"})
        except subprocess.TimeoutExpired:
            elapsed = int(time.time() - t0)
            log(f"  TIMEOUT after {elapsed}s")
            progress.setdefault("failed", []).append({"name": name, "error": "timeout"})
        except Exception as e:
            log(f"  ERROR: {e}")
            progress.setdefault("failed", []).append({"name": name, "error": str(e)})

        if outdir.exists():
            shutil.rmtree(str(outdir), ignore_errors=True)
        save_progress(progress)

    log(f"DONE! 成功 {len(progress.get('completed',[]))} | 失败 {len(progress.get('failed',[]))}")

if __name__ == "__main__":
    main()
