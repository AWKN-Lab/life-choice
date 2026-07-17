"""完整OCR工具链检测"""
import subprocess, os, sys, base64, requests, fitz

print("=== 工具链检测 ===")
print("Python:", sys.version.split()[0])

# Tesseract
print("\n--- Tesseract CLI ---")
p = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(p):
    r = subprocess.run([p, "--version"], capture_output=True, text=True)
    print("Tesseract:", r.stdout.strip().split("\n")[0])
else:
    print("Tesseract: 未安装")

# Poppler
print("\n--- Poppler ---")
found = any("poppler" in p.lower() for p in os.environ.get("PATH", "").split(os.pathsep))
print("Poppler:", "在PATH中" if found else "未在PATH")

# 库
print("\n--- 库 ---")
for lib, name in [("easyocr", "EasyOCR", ("fitz", "PyMuPDF"), ("PIL", "Pillow"), ("cv2", "OpenCV"), ("requests", "requests")]:
    try:
        __import__(lib)
        print(f"{name}: OK")
    except:
        print(f"{name}: 未安装")

# 图片
print("\n--- PDF图片 ---")
test_img = os.path.join(os.environ["TEMP"], "ocr.png")
pdf = r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf"
try:
    doc = fitz.open(pdf)
    pix = doc[0].get_pixmap(fitz.Matrix(2.0, 2.0)
    pix.save(test_img)
    doc.close()
    size = os.path.getsize(test_img)
    print(f"图片: {size//1024}KB")
    with open(test_img, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    print(f"Base64: {len(b64)}字符")
except Exception as e:
    print(f"错误: {e}")

# 在线API
print("\n--- 在线API ---")
apis = [("OCR.space", "https://api.ocr.space/parse/image/base64")]
for name, url in apis:
    data = {"base64Image": "data:image/png;base64," + b64, "language": "chs"}
    try:
        r = requests.post(url, data=data, timeout=60)
        j = r.json()
        txt = (j.get("ParsedResults") or [{}])[0].get("ParsedText", "")
        print(f"{name}: {'成功' if txt else '失败'}
        if txt:
            print(f"  文字: {txt[:100]}")
    except Exception as e:
        print(f"{name}: 失败 - {e}")

print("\n=== 完成 ===")
