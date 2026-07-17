import fitz, os, tempfile

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'
doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(fitz.Matrix(2.0, 2.0)
img_path = os.path.join(tempfile.gettempdir(), 'ocr_test_img.png')
pix.save(img_path)
doc.close()
print('OK: img saved', img_path)
print('Size:', os.path.getsize(img_path))