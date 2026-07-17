import fitz, time
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import pytesseract, io
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

base = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇'

for dpi in [40, 50, 60]:
    pdf_path = f'{base}\\中州派紫微斗数深造讲义上.pdf'
    doc = fitz.open(pdf_path)
    t0 = time.time()
    text_total = ""
    for pg in [3, 8, 13]:
        page = doc[pg]
        mat = fitz.Matrix(dpi/72, dpi/72)
        pix = page.get_pixmap(matrix=mat)
        img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('L')
        arr = np.array(img)
        binary = ((arr > 128) * 255).astype(np.uint8)
        img_bin = Image.fromarray(binary)
        text = pytesseract.image_to_string(img_bin, lang='chi_tra+chi_sim', config='--psm 4')
        text_total += text
    elapsed = time.time() - t0
    sample = text_total.replace('\n', ' ')[:120]
    print(f'DPI={dpi} {pix.width}x{pix.height} 3页={elapsed:.1f}s 均{elapsed/3:.1f}s/页')
    print(f'  文字: {sample[:120]}')
    print()
    doc.close()
