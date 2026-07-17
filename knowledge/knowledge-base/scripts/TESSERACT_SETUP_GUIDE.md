# Tesseract OCR Setup Guide

## Installation Steps

### 1. Install Tesseract
- Download: https://github.com/UB-Mannheim/tesseract/releases
- Select: tesseract-ocr-w64-setup-*.exe
- Check "Chinese (Simplified)" during installation

### 2. Add to PATH
Add Tesseract install dir to system PATH:
- Default: C:\Program Files\Tesseract-OCR

### 3. Verify
Open CMD and run:
```
tesseract --version
```

### 4. Install Python packages
```bash
pip install pytesseract pillow
```

## Usage Example

```python
import pytesseract
from PIL import Image

# OCR image
text = pytesseract.image_to_string(Image.open('image.png'), lang='chi_sim')
print(text)
```

## Notes

1. Chinese OCR needs chi_sim.traineddata
2. Default tessdata location: C:\Program Files\Tesseract-OCR\tessdata
3. Use TESSDATA_PREFIX env var for custom path
