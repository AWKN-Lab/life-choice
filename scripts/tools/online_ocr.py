#!/usr/bin/env python3
"""在线OCR工具测试"""
import requests
import base64
import fitz
import os, tempfile

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

# 提取PDF第1页为图片
doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(fitz.Matrix(2.0, 2.0))
img_path = os.path.join(tempfile.gettempdir(), 'online_ocr_test.png')
pix.save(img_path)
doc.close()

with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode()

print('=== 在线OCR工具测试 ===')
print(f'图片: {img_path} ({len(img_b64)} chars base64)')

# 测试1: OCR.space (免费API)
print('\n--- OCR.space ---')
try:
    import json
    url = 'https://api.ocr.space/parse/image/base64'
    data = {'base64Image': f'data:image/png;base64,{img_b64}', 'language': 'chs'}
    r = requests.post(url, data=data, timeout=30)
    result = r.json()
    if result.get('ParsedResults'):
        for p in result['ParsedResults'][:3]:
            print(f"OCR.space: {p['ParsedText'][:200]}")
    else:
        print(f"OCR.space: {result}")
except Exception as e:
    print(f'OCR.space失败: {e}')

# 测试2: 免费OCR API (2Cnt/Limit)
print('\n--- 2Cnt ---')
try:
    # 不需要API key的端点
    url2 = 'https://ai.stsup.com/ocr/base64'
    files = {'image': open(img_path, 'rb')}
    r = requests.post(url2, files=files, timeout=30)
    print(f'2Cnt: {r.status_code} {r.text[:200] if r.text else "无响应"}')
except Exception as e:
    print(f'2Cnt失败: {e}')

print('\n=== 完成 ===')