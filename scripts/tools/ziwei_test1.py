import fitz, time
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import pytesseract, io
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇\紫微斗数精成上.pdf'
print(f'测试: {pdf_path}')

doc = fitz.open(pdf_path)
total = len(doc)
print(f'页数: {total}')

t0 = time.time()
for i in range(min(15, total)):
    page = doc[i]
    mat = fitz.Matrix(72/72, 72/72)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes('png')
    img = Image.open(io.BytesIO(img_bytes)).convert('L')
    if img.width > 1000:
        ratio = 1000 / img.width
        img = img.resize((1000, int(img.height * ratio)), Image.LANCZOS)
    arr = np.array(img)
    binary = ((arr > 128) * 255).astype(np.uint8)
    img_bin = Image.fromarray(binary)
    text = pytesseract.image_to_string(img_bin, lang='chi_tra+chi_sim', config='--psm 4')
    elapsed = time.time() - t0
    ct = text.strip().replace('\n', ' ')[:100]
    print(f'  第{i+1}页 ({elapsed:.1f}s): {ct}')

total_time = time.time() - t0
print(f'总耗时: {total_time:.1f}s, 均{total_time/min(15,total):.1f}s/页')
doc.close()
