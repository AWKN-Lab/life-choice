import fitz, json, os, time
from pathlib import Path

BASE = Path(r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师')
REPORT = BASE / 'pdf_scan_report.json'
OUT_ROOT = BASE / 'md_converted'

with open(REPORT, 'r', encoding='utf-8') as f:
    data = json.load(f)

text_files = data['text_files']
mixed_files = data['ocr_files']

print(f'文本层 PDF: {len(text_files)} 个')
print(f'混合层 PDF: {len(mixed_files)} 个')
print(f'扫描版 PDF: {data["scan"]} 个 (跳过)')
print()

def convert_text_pdf(rel_path: str):
    pdf_path = BASE / rel_path
    out_path = OUT_ROOT / rel_path.replace('.pdf', '.md')
    os.makedirs(out_path.parent, exist_ok=True)

    doc = fitz.open(str(pdf_path))
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text("text")
        if text.strip():
            pages.append(f"\n## 第{i+1}页\n\n{text.strip()}")

    if not pages:
        doc.close()
        return {'status': 'empty', 'pages': len(doc)}

    md = f"# {pdf_path.stem}\n\n> 文件: {pdf_path.name}\n\n" + "\n".join(pages)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(md)

    doc.close()
    return {'status': 'ok', 'pages': len(pages)}

t0 = time.time()
ok = 0
fail = 0

for i, f in enumerate(text_files):
    rel = f['file']
    kb = f['size_kb']
    print(f"[{i+1}/{len(text_files)}] {rel} ({kb}KB) ... ", end='', flush=True)
    try:
        r = convert_text_pdf(rel)
        if r['status'] == 'ok':
            print(f"✅ {r['pages']}页")
            ok += 1
        else:
            print(f"⚠️ 空")
            fail += 1
    except Exception as e:
        print(f"❌ {e}")
        fail += 1

elapsed = time.time() - t0
print(f'\n--- 文本层完成 --- 耗时 {elapsed:.0f}s')
print(f'成功: {ok}  失败: {fail}')

# Now mixed files - try text first, skip OCR
print(f'\n--- 混合层 PDF ({len(mixed_files)}个) ---')
mix_ok = 0
for i, f in enumerate(mixed_files):
    rel = f['file']
    print(f"[{i+1}/{len(mixed_files)}] {rel} ... ", end='', flush=True)
    try:
        r = convert_text_pdf(rel)
        if r['status'] == 'ok':
            print(f"✅ {r['pages']}页")
            mix_ok += 1
        else:
            print(f"⚠️ 文字不足，跳过OCR")
    except Exception as e:
        print(f"❌ {e}")

print(f'\n混合层文本提取成功: {mix_ok}/{len(mixed_files)}')
print(f'总耗时: {time.time()-t0:.0f}s')
print(f'输出目录: {OUT_ROOT}')
