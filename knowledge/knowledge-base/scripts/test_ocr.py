#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tesseract OCR 测试脚本
"""

import pytesseract
from PIL import Image, ImageDraw, ImageFont
import os

def test_ocr():
    """测试 OCR 功能"""
    print("=" * 60)
    print("Tesseract OCR Test")
    print("=" * 60)
    
    # 配置 Tesseract 路径
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    # 测试1: 检查版本
    print("\n[1] Checking Tesseract version...")
    try:
        version = pytesseract.get_tesseract_version()
        print(f"    Version: {version}")
    except Exception as e:
        print(f"    [ERROR] {e}")
        return False
    
    # 测试2: 检查可用语言
    print("\n[2] Checking available languages...")
    try:
        langs = pytesseract.get_languages()
        print(f"    Available: {', '.join(langs)}")
        if 'chi_sim' in langs:
            print("    [OK] Chinese (Simplified) available")
        if 'chi_tra' in langs:
            print("    [OK] Chinese (Traditional) available")
    except Exception as e:
        print(f"    [ERROR] {e}")
    
    # 测试3: 创建测试图像并进行 OCR
    print("\n[3] Testing OCR on sample image...")
    try:
        # 创建一个简单的测试图像
        img = Image.new('RGB', (400, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # 尝试使用默认字体
        try:
            font = ImageFont.truetype("arial.ttf", 32)
        except:
            font = ImageFont.load_default()
        
        draw.text((10, 30), "Hello World 123", fill='black', font=font)
        
        # 保存临时图像
        temp_img = os.path.join(os.environ.get('TEMP', '.'), 'ocr_test.png')
        img.save(temp_img)
        
        # OCR 识别
        text = pytesseract.image_to_string(Image.open(temp_img), lang='eng')
        print(f"    Recognized: {text.strip()}")
        
        # 清理
        os.remove(temp_img)
        
        print("    [OK] OCR test passed")
    except Exception as e:
        print(f"    [ERROR] {e}")
        return False
    
    print("\n" + "=" * 60)
    print("All tests passed!")
    print("=" * 60)
    return True

if __name__ == '__main__':
    test_ocr()
