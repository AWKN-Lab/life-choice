"""六壬 PDF → MD 批量 OCR 转换器（easyocr CPU 版）"""
import fitz, json, os, sys, time, re
from pathlib import Path

import easyocr
reader = easyocr.Reader(['ch_sim', 'en'], gpu=False, verbose=False)

PDF_DIR = Path(r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬')
OUT_DIR = Path(r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\md_converted\东方术数\六壬')
SKIP_EXISTING = True

pdf_files = sorted(PDF_DIR.rglob('*.pdf'))
# skip already converted text-based ones
already = {'六爻正道.pdf','大六壬神课金口诀分类解断.pdf','大六壬神课研究应用课程讲义.pdf','六壬神课金口诀现代实例精解.pdf','六爻预测彩票3D.pdf'}
pdf_files = [p for p in pdf_files if p.name not in already]

print(f'待处理: {len(pdf_files)} 个 PDF')
print(f'输出: {OUT_DIR}')
print()

t0 = time.time()
results = []

for idx, pdf_path in enumerate(pdf_files):
    name = pdf_path.name
    out_path = OUT_DIR / pdf_path.relative_to(PDF_DIR).with_suffix('.md')
    if SKIP_EXISTING and out_path.exists():
        print(f'[{idx+1}/{len(pdf_files)}] {name} → 跳过(已存在)')
        continue

    print(f'[{idx+1}/{len(pdf_files)}] {name} ({(pdf_path.stat().st_size)//1024}KB) ... ', end='', flush=True)

    try:
        doc = fitz.open(str(pdf_path))
        pages = []
        valid = 0
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=150)
            img = pix.tobytes('png')
            lines = reader.readtext(img, detail=0)
            text = '\n'.join(lines).strip()
            if text:
                pages.append(f'\n## 第{i+1}页\n\n{text}')
                valid += 1

        doc.close()

        if valid == 0:
            print(f'⚠️ 无文字')
            results.append({'file': name, 'status': 'empty', 'pages': len(doc)})
            continue

        out_path.parent.mkdir(parents=True, exist_ok=True)
        md = f'# {pdf_path.stem}\n\n> 文件: {name}  |  OCR: easyocr\n\n' + '\n'.join(pages)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(md)

        elapsed = time.time() - t0
        print(f'✅ {valid}/{len(doc)}页 ({elapsed:.0f}s)')
        results.append({'file': name, 'status': 'ok', 'pages': valid, 'total': len(doc)})

    except Exception as e:
        print(f'❌ {e}')
        results.append({'file': name, 'status': 'error', 'error': str(e)})

elapsed = time.time() - t0
ok = sum(1 for r in results if r['status'] == 'ok')
print(f'\n=== 完成 === {ok}/{len(pdf_files)} 成功, 耗时 {elapsed:.0f}s')
with open(OUT_DIR / '_ocr_report.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f'报告: {OUT_DIR / "_ocr_report.json"}')
