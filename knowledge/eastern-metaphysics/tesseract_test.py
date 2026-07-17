#!/usr/bin/env python3
"""使用Tesseract OCR测试扫描版PDF"""
import pytesseract
import fitz
import os
import tempfile

# 设置tesseract路径
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

print('=== Tesseract OCR测试 ===')

# 检查版本
try:
    v = pytesseract.get_tesseract_version()
    print(f'Tesseract版本: {v}')
except Exception as e:
    print(f'版本检查失败: {e}')

# 检查语言包
tessdata = r'C:\Program Files\Tesseract-OCR\tessdata'
if os.path.exists(tessdata):
    langs = [f for f in os.listdir(tessdata) if f.endswith('.traineddata')]
    print(f'语言包数量: {len(langs)}')
    print(f'中文支持: {"chi_sim" in langs or "chi" in str(langs)}')

# 提取PDF第1页为图片
print('\n正在提取PDF页面...')
doc = fitz.open(pdf_path)
page = doc[0]
mat = fitz.Matrix(2.0, 2.0)
pix = page.get_pixmap(matrix=mat)
img_path = os.path.join(tempfile.gettempdir(), 'test_page.png')
pix.save(img_path)
doc.close()
print(f'图片已保存: {img_path}')

# OCR识别
print('\n正在进行OCR识别...')
try:
    # 使用中文简体
    text = pytesseract.image_to_string(img_path, lang='chi_sim+eng')
    print('\n=== OCR结果（前2000字符）===')
    print(text[:2000] if len(text) > 2000 else text)
except Exception as e:
    print(f'OCR失败: {e}')