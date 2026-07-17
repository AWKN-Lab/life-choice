# 扫描版PDF OCR工具对比报告

**时间**: 2026-06-05

---

## 一、工具清单

| # | 工具 | 状态 | 说明 |
|---|------|------|------|
| 1 | Tesseract 5.5 | ✅ 可用 | 本地CLI/库调用 |
| 2 | EasyOCR | ✅ 已装 | 本地Python库 |
| 3 | PyMuPDF (fitz) | ✅ 可用 | PDF→图片 |
| 4 | OCR.space | ⚠️ 待测 | 在线API |
| 5 | Mistral OCR | ⚠️ 需Key | 在线API |
| 6 | PaddleOCR | ❌ 未装 | 需Ollama |

---

## 二、测试用PDF

**文件**: `八字入门捉用神.pdf` (241页)

---

## 三、测试结果

### 3.1 Tesseract + chi_sim

| 项目 | 结果 |
|------|------|
| 版本 | 5.5.0.20241111 |
| 语言包 | chi_sim (44MB) |
| CPU | ✅ 支持 |
| GPU | ❌ 不需要 |
| **竖排中文 | ⚠️ 差 |
| **古籍扫描 | ⚠️ 一般 |
| 配置 | `--psm 6` |
| 前处理 | PyMuPDF提取图片 |

**识别示例**:
```
0。 《人亲入门》最新版修定...
```

### 3.2 EasyOCR

| 项目 | 结果 |
|------|------|
| 模型 | CPU模式 |
| 初始化 | 需下载模型 |
| **竖排中文 | ⚠️ 差 |
| **古籍扫描 | ⚠️ 差 |

### 3.3 PyMuPDF (PDF→图片)

| 项目 | 结果 |
|------|------|
| PDF处理 | ✅ 正常 |
| 图片导出 | ✅ 正常 |
| 300DPI | ✅ 4215×6375px |

---

## 四、局限

1. **竖排中文** → OCR识别率低
2. **古籍扫描** → 字体模糊影响大
3. **在线API** → 网络依赖 + Key/额度限制

---

## 五、建议

| 场景 | 推荐工具 |
|------|----------|
| 批量处理 | Tesseract + PyMuPDF |
| 高质量需求 | Mistral OCR (需API Key) |
| 无Key临时用 | EasyOCR |
| 图片提取 | PyMuPDF |

---

## 六、Python依赖

```
# 已安装
- fitz (PyMuPDF) ✅
- easyocr ✅
- pytesseract ✅
- torch ✅

# 待装
- paddlepaddle ❌
- paddleocr ❌
```

## 七、API工具

| 工具 | 免费额度 | 状态 |
|------|---------|------|
| Mistral OCR | $2/1000页 | 需Key |
| OCR.space | 有限 | 待测 |
| i2ocr | 有限 | 待测 |
| OCR在线工具 | - | 网络可用 |
| Google Vision | 有免费 | 需卡 |
| **中文OCR | - | 待找 |

---

## 八、结论

1. **Tesseract** → 本地可用，中文支持
2. **EasyOCR** → 本地可用，竖排差
3. **Mistral OCR** → 效果好，需Key
4. **在线工具** → 依赖网络
5. **古籍竖排** → OCR识别率普遍低
6. **推荐** → 先用Tesseract处理大批量，效果不够再上Mistral OCR