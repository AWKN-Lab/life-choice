import fitz, json, sys
from pathlib import Path

base = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师'
pdfs = list(Path(base).rglob('*.pdf'))

text_ok, need_ocr, empty = [], [], []

for p in pdfs:
    try:
        doc = fitz.open(str(p))
        pages = len(doc)
        tlen = sum(len(doc[i].get_text()) for i in range(min(3, pages)))
        doc.close()
        rel = str(p.relative_to(base))
        info = {'file': rel, 'pages': pages, 'size_kb': p.stat().st_size // 1024}
        if tlen > 100:
            text_ok.append(info)
        elif tlen > 0:
            need_ocr.append(info)
        else:
            empty.append(info)
    except Exception as e:
        empty.append({'file': str(p.relative_to(base)), 'error': str(e), 'pages': 0, 'size_kb': 0})

print(f'文本层: {len(text_ok)}')
print(f'少量文字: {len(need_ocr)}')
print(f'扫描版: {len(empty)}')

print('\n--- 文本层 (前15) ---')
for t in text_ok[:15]:
    print(f'  {t["file"]}  ({t["size_kb"]}KB, {t["pages"]}页)')

print(f'\n--- 扫描版 (前15) ---')
for t in empty[:15]:
    print(f'  {t["file"]}  ({t["size_kb"]}KB, {t["pages"]}页)')

report_path = Path(base) / 'pdf_scan_report.json'
with open(report_path, 'w', encoding='utf-8') as f:
    json.dump({'text_ok': len(text_ok), 'need_ocr': len(need_ocr), 'scan': len(empty),
               'text_files': text_ok, 'ocr_files': need_ocr, 'scan_files': empty}, f, ensure_ascii=False, indent=2)
print(f'\n报告: {report_path}')
