#!/usr/bin/env python3
"""OCR工具完整检测"""
import sys

results = {}

# 1. pytesseract
print("=== pytesseract ===")
try:
    import pytesseract
    v = pytesseract.get_tesseract_version()
    results["pytesseract"] = f"OK - Tesseract {v}"
    print(f"pytesseract: {v}")
except Exception as e:
    results["pytesseract"] = f"FAIL - {e}"
    print(f"pytesseract: {e}")

# 2. Tesseract语言包
print("\n=== Tesseract语言包 ===")
import os
tessdata = r"C:\Program Files\Tesseract-OCR\tessdata"
if os.path.exists(tessdata):
    files = os.listdir(tessdata)
    trained = [f for f in files if f.endswith('.traineddata')]
    results["tesseract_lang"] = f"{len(trained)}语言包"
    print(f"语言包: {len(trained)}")
    for t in trained:
        print(f"  - {t}")
else:
    results["tesseract_lang"] = "NOT FOUND"
    print("语言包目录不存在")

# 3. EasyOCR
print("\n=== EasyOCR ===")
try:
    import easyocr
    results["easyocr"] = "OK"
    print("EasyOCR: OK")
except Exception as e:
    results["easyocr"] = f"FAIL - {e}"
    print(f"EasyOCR: {e}")

# 4. PyMuPDF
print("\n=== PyMuPDF ===")
try:
    import fitz
    results["PyMuPDF"] = f"OK"
    print(f"PyMuPDF: {fitz.__version__}")
except Exception as e:
    results["PyMuPDF"] = f"FAIL - {e}"
    print(f"PyMuPDF: {e}")

# 5. pdf2image
print("\n=== pdf2image ===")
try:
    from pdf2image import convert_from_path
    results["pdf2image"] = "OK"
    print("pdf2image: OK")
except Exception as e:
    results["pdf2image"] = f"FAIL - {e}"
    print(f"pdf2image: {e}")

# 6. PIL
print("\n=== PIL ===")
try:
    from PIL import Image
    results["PIL"] = "OK"
    print("PIL: OK")
except Exception as e:
    results["PIL"] = f"FAIL - {e}"
    print(f"PIL: {e}")

# 7. cv2
print("\n=== OpenCV ===")
try:
    import cv2
    results["OpenCV"] = f"OK"
    print("OpenCV: OK")
except Exception as e:
    results["OpenCV"] = f"FAIL - {e}"
    print(f"OpenCV: {e}")

# 8. requests
print("\n=== requests ===")
try:
    import requests
    results["requests"] = "OK"
    print("requests: OK")
except Exception as e:
    results["requests"] = f"FAIL - {e}"
    print(f"requests: {e}")

# 9. Tesseract CLI
print("\n=== Tesseract CLI ===")
import subprocess
tesseract_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
]
for p in tesseract_paths:
    if os.path.exists(p):
        try:
            r = subprocess.run([p, "--version"], capture_output=True, text=True)
            results["tesseract_cli"] = f"OK - {r.stdout.strip()}"
            print(f"Tesseract CLI: {r.stdout.strip()}")
        except Exception as e:
            results["tesseract_cli"] = f"FAIL - {e}"
            print(f"Tesseract CLI: {e}")

# 输出汇总
print("\n" + "="*50)
print("汇总")
for k, v in results.items():
    status = "✅" if v.startswith("OK") else "❌" if v.startswith("FAIL") else "⚠️"
    print(f"{status} {k}: {v}")
