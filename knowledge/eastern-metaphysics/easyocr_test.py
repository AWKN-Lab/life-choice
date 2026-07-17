#!/usr/bin/env python3
"""EasyOCR测试"""
import easyocr
import fitz
import os
import tempfile

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

print('=== EasyOCR测试 ===')

# 初始化读取器（中英文）
print('初始化EasyOCR...')
try:
    reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
    print('EasyOCR初始化成功')
except Exception as e:
    print(f'初始化失败: {e}')
    exit(1)

# 提取PDF第1页
print('\n提取PDF页面...')
doc = fitz.open(pdf_path)
page = doc[0]
mat = fitz.Matrix(2.0, 2.0)
pix = page.get_pixmap(matrix=mat)
img_path = os.path.join(tempfile.gettempdir(), 'easyocr_test.png')
pix.save(img_path)
doc.close()
print(f'图片: {img_path}')

# OCR识别
print('\nOCR识别中...')
try:
    result = reader.readtext(img_path)
    print(f'\n识别结果 ({len(result)} 个文本框):')
    for detection in result[:20]:
        bbox, text, confidence = detection
        print(f'  [{confidence:.2f}] {text[:50]}')
except Exception as e:
    print(f'OCR失败: {e}')