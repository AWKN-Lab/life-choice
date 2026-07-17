#!/usr/bin/env python3
"""
PDF转图片 + OCR测试
"""
import os
import sys
import base64
import json
import tempfile

# PDF转图片
from pdf2image import convert_from_path
from PIL import Image

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

print(f'Converting PDF to images...')
pages = convert_from_path(pdf_path, dpi=200, first_page=1, last_page=1)
print(f'Converted {len(pages)} page(s)')

# 保存第1页
output_path = os.path.join(tempfile.gettempdir(), 'page1.png')
pages[0].save(output_path, 'PNG')
print(f'Saved to: {output_path}')

# 获取文件大小
size = os.path.getsize(output_path)
print(f'File size: {size / 1024:.1f} KB')

# Base64编码
with open(output_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
print(f'Base64 length: {len(b64)} chars')

# 输出data URL
print(f'Data URL ready: data:image/png;base64,{b64[:100]}...')
print('\\n--- 现在可以用Mistral OCR处理 ---')