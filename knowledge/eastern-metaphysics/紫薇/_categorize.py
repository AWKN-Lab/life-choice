import fitz
from pathlib import Path

SRC_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇")

batch1_text = []
batch2_ocr = []
batch3_vertical = []

for pdf_path in sorted(SRC_DIR.glob("*.pdf")):
    try:
        doc = fitz.open(pdf_path)
        pages = len(doc)

        text_count = 0
        for i in range(min(5, pages)):
            text = doc[i].get_text().strip()
            if len(text) > 50:
                text_count += 1

        if text_count >= 2:
            batch1_text.append((pdf_path.name, pages))
        else:
            w = doc[0].rect.width
            h = doc[0].rect.height
            if h > w * 1.5:
                batch3_vertical.append((pdf_path.name, pages))
            else:
                batch2_ocr.append((pdf_path.name, pages))
        doc.close()
    except Exception as e:
        batch2_ocr.append((pdf_path.name, 0))

print("=== 第一批：PRD直接文本提取 ===")
print(f"  {len(batch1_text)} 本, {sum(p[1] for p in batch1_text)} 页")
for n, p in batch1_text:
    print(f"    {n} ({p}页)")

print(f"\n=== 第二批：标准OCR横版 ===")
print(f"  {len(batch2_ocr)} 本, {sum(p[1] for p in batch2_ocr)} 页")
for n, p in batch2_ocr[:10]:
    print(f"    {n} ({p}页)")
if len(batch2_ocr) > 10:
    print(f"    ... 还有 {len(batch2_ocr)-10} 本")

print(f"\n=== 第三批：竖版/繁体（页面高>宽*1.5）===")
print(f"  {len(batch3_vertical)} 本, {sum(p[1] for p in batch3_vertical)} 页")
for n, p in batch3_vertical:
    print(f"    {n} ({p}页)")

print(f"\n总计: {len(batch1_text)+len(batch2_ocr)+len(batch3_vertical)} 本")
