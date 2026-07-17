import sys
print('Python:', sys.version)

# 检查可用的库
libs = ['pytesseract', 'fitz', 'cv2']
for lib in libs:
    try:
        __import__(lib)
        print(f'{lib}: OK')
    except ImportError as e:
        print(f'{lib}: MISSING')

# 检查PIL
try:
    from PIL import Image
    print('PIL (Pillow): OK')
except:
    print('PIL: MISSING')

# 检查tesseract
import os
tesseract_paths = [
    r'C:\Program Files\Tesseract OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract OCR\tesseract.exe',
    r'C:\ProgramData\chocolatey\bin\tesseract.exe',
]
found = False
for p in tesseract_paths:
    if os.path.exists(p):
        print(f'Tesseract found at: {p}')
        found = True
if not found:
    print('Tesseract: NOT FOUND in common locations')