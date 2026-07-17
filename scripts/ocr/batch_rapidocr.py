#!/usr/bin/env python3
"""核心六壬扫描版 PDF -> MD 批量转换（RapidOCR 版）
竖版繁体中文优化，~30s/页，进度保存，断点续传
"""
import fitz
from rapidocr_onnxruntime import RapidOCR
import time
import json
from pathlib import Path

PDF_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬")
OUT_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬\_processed_md")
PROGRESS = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬\_rapid_progress.json")
OUT_DIR.mkdir(parents=True, exist_ok=True)

CORE_FILES = [
    "六壬断案详解.pdf",
    "六壬指南例题解.pdf",
    "大六壬高级预测学.pdf",
    "六壬大全.pdf",
    "韦千里大六壬全集.pdf",
]

ZOOM = 3.0

def log(msg: str):
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)

def load_progress():
    if PROGRESS.exists():
        with open(PROGRESS, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": [], "failed": []}

def save_progress(p):
    with open(PROGRESS, "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)

def process_pdf(pdf_path: Path, ocr: RapidOCR) -> tuple:
    name = pdf_path.name
    doc = fitz.open(str(pdf_path))
    total = doc.page_count
    log(f"  {name}: {total} pages")

    lines = []
    lines.append(f"# {name.replace('.pdf', '')}\n")
    lines.append(f"> OCR by RapidOCR | {total} pages\n")

    total_time = 0
    page_times = []

    for i in range(total):
        page = doc[i]
        mat = fitz.Matrix(ZOOM, ZOOM)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")

        t0 = time.time()
        result, _ = ocr(img_bytes)
        elapsed = time.time() - t0
        total_time += elapsed
        page_times.append(elapsed)

        page_lines = []
        if result:
            for item in result:
                if item[1] is not None:
                    page_lines.append(item[1])

        lines.append(f"\n## Page {i+1}\n")
        lines.append("\n".join(page_lines))

        if (i + 1) % 10 == 0:
            avg = total_time / (i + 1)
            etc = avg * (total - i - 1) / 60
            log(f"    {i+1}/{total} | avg={avg:.1f}s | ETC={etc:.0f}min")

    doc.close()

    md_text = "\n".join(lines)
    avg_time = total_time / total if total > 0 else 0
    return md_text, avg_time

def main():
    progress = load_progress()
    completed = set(progress.get("completed", []))
    failed = set(progress.get("failed", []))

    pending = []
    for name in CORE_FILES:
        if name in completed or name in failed:
            continue
        md_out = OUT_DIR / name.replace(".pdf", ".md")
        if md_out.exists() and md_out.stat().st_size > 1000:
            completed.add(name)
            progress["completed"] = list(completed)
            save_progress(progress)
            continue
        pdf_path = PDF_DIR / name
        if pdf_path.exists():
            pending.append(pdf_path)
        else:
            log(f"SKIP 文件不存在: {name}")

    if not pending:
        log(f"全部完成! 成功 {len(completed)} | 失败 {len(failed)}")
        return

    log(f"待处理: {len(pending)} | 已完成: {len(completed)} | 失败: {len(failed)}")
    ocr = RapidOCR()

    for idx, pdf_path in enumerate(pending):
        name = pdf_path.name
        log(f"\n[{idx+1}/{len(pending)}] {name}")

        try:
            t0 = time.time()
            md_text, avg_time = process_pdf(pdf_path, ocr)
            total_elapsed = time.time() - t0

            md_out = OUT_DIR / name.replace(".pdf", ".md")
            md_out.write_text(md_text, encoding="utf-8")

            log(f"  OK | {md_out.stat().st_size} bytes | avg={avg_time:.1f}s/page | total={total_elapsed/60:.0f}min")
            completed.add(name)
            progress["completed"] = list(completed)
        except Exception as e:
            log(f"  ERROR: {e}")
            failed.add(name)
            progress["failed"] = list(failed)

        save_progress(progress)

    log(f"\nDONE! 成功 {len(completed)} | 失败 {len(failed)}")

if __name__ == "__main__":
    main()
