#!/usr/bin/env python3
"""使用PyMuPDF提取PDF页面为图片"""
import fitz
import os
import base64
import tempfile

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

doc = fitz.open(pdf_path)
print(f'Pages: {len(doc)}')

# 提取第1页为图片
page = doc[0]
mat = fitz.Matrix(2.0, 2.0)  # 2x缩放 (DPI 200)
pix = page.get_pixmap(matrix=mat)
print(f'Image: {pix.width} x {pix.height}')

# 保存
output_path = os.path.join(tempfile.gettempdir(), 'page1.png')
pix.save(output_path)
print(f'Saved: {output_path}')

# Base64
with open(output_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
print(f'\nBase64长度: {len(b64)}')
print(f'Data URL: data:image/png;base64,{b64[:50]}...')

doc.close()
print('\n=== 可用于Mistral OCR ===')