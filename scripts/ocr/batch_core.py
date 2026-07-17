#!/usr/bin/env python3
"""核心六壬扫描版 PDF -> MD 批量转换（精简版）
按断事价值排序，MinerU VLM OCR，进度保存，断点续传
"""
import subprocess
import json
import time
import shutil
from pathlib import Path

MINERU = r"C:\Users\10919\.claude\skills\awkn-mineru\skills\.venv-mineru\Scripts\mineru.exe"
PDF_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬")
OUT_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬")
PROGRESS = OUT_DIR / "_core_progress.json"
LOG_FILE = OUT_DIR / "_core_log.txt"
PROCESSED = OUT_DIR / "_processed_md"
PROCESSED.mkdir(parents=True, exist_ok=True)

CORE_FILES = [
    "六壬断案详解.pdf",
    "六壬指南例题解.pdf",
    "大六壬高级预测学.pdf",
    "六壬大全.pdf",
    "韦千里大六壬全集.pdf",
]

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
    return {"completed": [], "failed": []}

def save_progress(p):
    with open(PROGRESS, "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)

def main():
    progress = load_progress()
    completed = set(progress.get("completed", []))
    failed = set(item["name"] if isinstance(item, dict) else item for item in progress.get("failed", []))

    pdfs = []
    for name in CORE_FILES:
        if name in completed or name in failed:
            continue
        md_out = PROCESSED / name.replace(".pdf", ".md")
        if md_out.exists():
            completed.add(name)
            progress["completed"] = list(completed)
            save_progress(progress)
            continue
        pdf_path = PDF_DIR / name
        if pdf_path.exists():
            kb = pdf_path.stat().st_size // 1024
            pages = "?"
            pdfs.append((kb, pdf_path, name))
        else:
            log(f"SKIP 文件不存在: {name}")

    if not pdfs:
        log(f"全部完成! 成功 {len(completed)} | 失败 {len(failed)}")
        return

    log(f"待处理: {len(pdfs)} | 已完成: {len(completed)} | 失败: {len(failed)}")
    env = {**__import__("os").environ, "HF_ENDPOINT": "https://hf-mirror.com"}

    for i, (kb, pdf_path, name) in enumerate(pdfs):
        log(f"[{i+1}/{len(pdfs)}] {name} ({kb}KB)")

        outdir = OUT_DIR / f"_core_{name}_temp"
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
                    log(f"  OK {elapsed}s -> {final_md.stat().st_size} bytes")
                    completed.add(name)
                    progress["completed"] = list(completed)
                else:
                    log(f"  WARN: 无 MD 输出 (elapsed={elapsed}s)")
                    failed.add(name)
                    progress["failed"] = list(failed)
            else:
                log(f"  FAIL exit={result.returncode} (elapsed={elapsed}s)")
                failed.add(name)
                progress["failed"] = list(failed)
        except subprocess.TimeoutExpired:
            elapsed = int(time.time() - t0)
            log(f"  TIMEOUT after {elapsed}s")
            failed.add(name)
            progress["failed"] = list(failed)
        except Exception as e:
            log(f"  ERROR: {e}")
            failed.add(name)
            progress["failed"] = list(failed)

        if outdir.exists():
            shutil.rmtree(str(outdir), ignore_errors=True)
        save_progress(progress)

    log(f"DONE! 成功 {len(completed)} | 失败 {len(failed)}")

if __name__ == "__main__":
    main()
