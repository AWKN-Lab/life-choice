#!/usr/bin/env python3
"""完整OCR工具链检测"""
import subprocess, os, sys

print("=== 系统环境 ===")
print("Python:", sys.version.split()[0])

# 1. Tesseract CLI
print("\n--- Tesseract ---")
tesseract_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
]
for p in tesseract_paths:
    if os.path.exists(p):
        try:
            r = subprocess.run([p, "--version"], capture_output=True, text=True)
            print("Tesseract:", r.stdout.split("\n")[0])
        except: pass

# 2. Poppler
print("\n--- Poppler (pdf2image后端 ---")
found = False
for p in os.environ.get("PATH", "").split(os.pathsep):
    if "poppler" in p.lower():
        print("Poppler:", p)
        found = True
if not found:
    print("Poppler: 未在PATH中找到")

# 3. 库导入
libs = {"easyocr": None, "fitz": "PyMuPDF", "PIL": "Pillow", "cv2": "OpenCV", "requests": "requests"}
for lib, name in libs.items():
    try:
        __import__(lib)
        print(f"{name}: OK")
    except ImportError:
        print(f"{name}: 未安装")

# 4. 提取测试图片
print("\n--- PDF提取 ---")
test_img = os.path.join(os.environ["TEMP"], "ocr_full_test.png")
try:
    import fitz
    pdf = r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf"
    doc = fitz.open(pdf)
    page = doc[0]
    pix = page.get_pixmap(fitz.Matrix(2.0, 2.0)
    pix.save(test_img)
    doc.close()
    size = os.path.getsize(test_img)
    print(f"PyMuPDF图片: {size//1024}KB")

    # Base64
    with open(test_img, "rb") as f:
        b64 = __import__("base64").b64encode(f.read()).decode()

    # 5. 在线API测试
    print("\n--- 在线API ---")
    apis = [
        ("OCR.space", "https://api.ocr.space/parse/image/base64", {"base64Image": "data:image/png;base64," + b64, "language": "chs"}),
    ]
    import requests
    for name, url, data in apis:
        try:
            r = requests.post(url, data=data, timeout=60)
            j = r.json()
            txt = j.get("ParsedResults", [{}])[0].get("ParsedText", "")
            print(f"{name}: {'成功' if txt else '失败'}")
            if txt:
                print(f"  识别文字: {txt[:100]}")
        except Exception as e:
            print(f"{name}: 失败 - {e}")
except Exception as e:
    print(f"图片生成: {e}")

print("\n=== 完成 ===")
