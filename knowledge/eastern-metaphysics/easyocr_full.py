#!/usr/bin/python
import easyocr
import fitz
import os, tempfile

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)

doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(fitz.Matrix(2.0, 2.0))
img_path = os.path.join(tempfile.gettempdir(), 'easy.png')
pix.save(img_path)
doc.close()

print('=== EasyOCR完整结果 ===')
result = reader.readtext(img_path)
for r in result:
    bbox, text, conf = r
    print(f'[{conf:.2f}] {text[:80]}')

# 测试在线OCR - 用PDF转图片后调用
print('\n=== 在线OCR API测试 ===')
# 准备图片base64
import base64
with open(img_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
print(f'图片Base64长度: {len(b64)}')
print('在线工具待测试')