#!/usr/bin/env python3
"""使用Tesseract OCR完整测试"""
import pytesseract
import fitz
import os
import tempfile

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

print('=== PDF OCR 完整测试 ===')

# 提取第1页，高质量
doc = fitz.open(pdf_path)
page = doc[0]
mat = fitz.Matrix(3.0, 3.0)  # 更高DPI
pix = page.get_pixmap(matrix=mat)
img_path = os.path.join(tempfile.gettempdir(), 'page_hq.png')
pix.save(img_path)
doc.close()
print(f'图片: {pix.width}x{pix.height}')

# OCR配置
configs = [
    ('chi_sim+eng', '--psm 6'),
    ('chi_sim+eng', '--psm 4'),
    ('chi_sim', '--psm 6'),
]

for lang, config in configs:
    print(f'\n--- Lang={lang}, Config={config} ---')
    try:
        text = pytesseract.image_to_string(img_path, lang=lang, config=config)
        print(text[:1500] if len(text) > 1500 else text)
    except Exception as e:
        print(f'Error: {e}')

print('\n=== 测试完成 ===')