import fitz
from rapidocr_onnxruntime import RapidOCR
import time

PDF = r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\六壬\六壬断案详解.pdf"

doc = fitz.open(PDF)
print(f"Total pages: {doc.page_count}")

ocr = RapidOCR()

for page_idx in [2, 5, 10]:
    page = doc[page_idx]
    print(f"\n{'='*60}")
    print(f"=== Page {page_idx+1} ===")

    mat = fitz.Matrix(3.0, 3.0)
    pix = page.get_pixmap(matrix=mat)
    img_bytes = pix.tobytes("png")

    t0 = time.time()
    result, _ = ocr(img_bytes)
    t1 = time.time()

    print(f"OCR time: {t1-t0:.1f}s")
    if result:
        lines = []
        for item in result:
            if item[1] is not None:
                lines.append(item[1])
        text = "\n".join(lines)
        print(text[:1000] if text else "(empty)")
    else:
        print("No text detected")

doc.close()
