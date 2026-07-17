import fitz
import sys

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

try:
    doc = fitz.open(pdf_path)
    print(f'Pages: {len(doc)}')

    # 读取第1页
    page = doc[0]
    text = page.get_text()
    print('--- Page 1 ---')
    if text:
        print(text[:3000])
    else:
        print('No text found - likely scanned PDF')

    doc.close()
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)