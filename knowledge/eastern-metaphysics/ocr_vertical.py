import pytesseract
import fitz
import tempfile
import os

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

doc = fitz.open(pdf_path)
page = doc[0]
mat = fitz.Matrix(3.0, 3.0)
pix = page.get_pixmap(matrix=mat)
img_path = os.path.join(tempfile.gettempdir(), 'page_test.png')
pix.save(img_path)
doc.close()

print('=== OCR测试 ===')
print('图片:', img_path)

# 测试竖排
for cfg in ['--psm 5', '--psm 6', '-c textlayout=6']:
    print(f'\n--- config: {cfg} ---')
    try:
        text = pytesseract.image_to_string(img_path, lang='chi_sim', config=cfg)
        lines = [l for l in text.split('\n') if l.strip()]
        print(f'识别行数: {len(lines)}')
        for l in lines[:8]:
            print(repr(l[:100]))
    except Exception as e:
        print(f'Error: {e}')

# 简单测试
print('\n--- 默认 ---')
try:
    text = pytesseract.image_to_string(img_path, lang='chi_sim')
    if '八字' in text:
        print('找到"八字"！')
    print(text[:300])
except Exception as e:
    print(f'Error: {e}')