import fitz
from pathlib import Path

SRC_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇")

has_text = []
no_text = []
total_pages = 0

for pdf_path in sorted(SRC_DIR.glob("*.pdf")):
    try:
        doc = fitz.open(pdf_path)
        pages = len(doc)
        total_pages += pages
        text_count = 0
        for i in range(min(5, pages)):
            text = doc[i].get_text().strip()
            if len(text) > 50:
                text_count += 1
        if text_count >= 2:
            has_text.append((pdf_path.name, pages))
        else:
            no_text.append((pdf_path.name, pages))
        doc.close()
    except Exception as e:
        no_text.append((pdf_path.name, 0))

print(f"有文本层: {len(has_text)} 本, {sum(p[1] for p in has_text)} 页")
print(f"需OCR:   {len(no_text)} 本, {sum(p[1] for p in no_text)} 页")
print(f"总计:    {len(has_text)+len(no_text)} 本, {total_pages} 页")
print()
print("=== 有文本层 ===")
for name, pages in has_text:
    print(f"  {name}: {pages}页")
print()
print("=== 需OCR (前20) ===")
for name, pages in no_text[:20]:
    print(f"  {name}: {pages}页")
