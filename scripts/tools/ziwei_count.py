import fitz
from pathlib import Path

SRC_DIR = Path(r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇")
total_pages = 0
pdf_info = []

for pdf_path in sorted(SRC_DIR.glob("*.pdf")):
    try:
        doc = fitz.open(pdf_path)
        pages = len(doc)
        total_pages += pages
        pdf_info.append((pdf_path.name, pages))
        doc.close()
    except Exception as e:
        print(f"ERROR: {pdf_path.name}: {e}")

print(f"总计: {len(pdf_info)} 个PDF, {total_pages} 页")
print(f"估算: {total_pages}页 × 10s/页 = {total_pages*10/3600:.1f} 小时")
print(f"4核并行: {total_pages*10/3600/4:.1f} 小时")
for name, pages in pdf_info[:10]:
    print(f"  {name}: {pages}页")
