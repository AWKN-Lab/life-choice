import urllib.request
import os
import subprocess

url = "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.1.20230401.exe"
out_path = os.path.join(os.environ['TEMP'], 'tesseract-setup.exe')

print(f'Downloading to {out_path}...')
urllib.request.urlretrieve(url, out_path)
print('Download complete, installing...')

# 静默安装
result = subprocess.run([out_path, '/S'], capture_output=True, text=True)
print('Install result:', result.returncode)

# 查找安装路径
install_paths = [
    r'C:\Program Files\Tesseract OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract OCR\tesseract.exe',
]
for p in install_paths:
    if os.path.exists(p):
        print(f'Found: {p}')

print('Done')