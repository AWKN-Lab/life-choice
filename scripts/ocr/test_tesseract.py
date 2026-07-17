import fitz
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
import pytesseract
import io
import sys

PDF = r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬\大六壬择日精要.pdf"

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

doc = fitz.open(PDF)
page_count = len(doc)
print(f"Total pages: {page_count}")

page = doc[2]
print(f"\n--- Page 3 (index 2) ---")

mat = fitz.Matrix(3.0, 3.0)
pix = page.get_pixmap(matrix=mat)
img = Image.open(io.BytesIO(pix.tobytes("png")))

img_gray = img.convert("L")

enhancer = ImageEnhance.Contrast(img_gray)
img_enhanced = enhancer.enhance(2.0)

img_sharp = img_enhanced.filter(ImageFilter.SHARPEN)

img_inverted = ImageOps.invert(img_sharp)

for name, img_obj in [("gray", img_gray), ("enhanced", img_enhanced), ("sharp", img_sharp), ("inverted", img_inverted)]:
    text = pytesseract.image_to_string(img_obj, lang="chi_sim", config="--psm 6")
    print(f"\n--- {name} (len={len(text)}) ---")
    print(text[:500] if text.strip() else "(empty)")

doc.close()
