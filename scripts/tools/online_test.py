import fitz, base64, os, tempfile, requests, json

pdf_path = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\八字入门捉用神.pdf'

doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(fitz.Matrix(2.0, 2.0)
img_path = os.path.join(tempfile.gettempdir(), 'online_test.png')
pix.save(img_path)
doc.close()

with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode()

print('图片:', img_path)
print('Base64长度:', len(img_b64))

# OCR.space测试
print('\n--- OCR.space ---')
try:
    url = 'https://api.ocr.space/parse/image/base64'
    data = {'base64Image': 'data:image/png;base64,' + img_b64, 'language': 'chs'}
    r = requests.post(url, data=data, timeout=60)
    result = r.json()
    if result.get('ParsedResults'):
        for p in result['ParsedResults'][:3]:
            print('OCR.space:', p['ParsedText'][:300])
    else:
        print('结果:', result)
except Exception as e:
    print('失败:', e)

print('\n=== 完成 ===')