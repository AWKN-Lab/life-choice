import fitz, os, tempfile

pdf = r"C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf"
doc = fitz.open(pdf)
page = doc[0]
pix = page.get_pixmap(fitz.Matrix(2.0, 2.0))
tmp = tempfile.gettempdir()
out = os.path.join(tmp, 'test.png')
pix.save(out)
doc.close()
print('Image:', out, os.path.getsize(out))