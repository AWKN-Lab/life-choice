# PDF OCR提取专家 - 使用指南

## 🎯 功能概述

自动从PDF文件中提取命理典籍内容，支持：
- ✅ 文本PDF直接提取
- ✅ 扫描版PDF OCR识别
- ✅ 自动识别八字命例
- ✅ 批量处理多个文件

---

## 📦 安装步骤

### 1. 安装OCR环境

```bash
cd c:\Users\10919\Desktop\AI\knowledge-base\ziping\agents\ocr-expert\scripts
python setup_ocr.py
```

这将安装：
- PaddleOCR（中文OCR首选）
- PyMuPDF（PDF解析）
- pdfplumber（表格提取）
- 其他辅助工具

### 2. 验证安装

```bash
python -c "from paddleocr import PaddleOCR; print('✅ PaddleOCR安装成功')"
python -c "import fitz; print('✅ PyMuPDF安装成功')"
```

---

## 🚀 使用方法

### 提取单个PDF

```bash
python extract_pdf_text.py "C:\Users\10919\Desktop\AI\玄学data\滴天髓.pdf"
```

### 批量处理目录

```bash
python extract_pdf_text.py "C:\Users\10919\Desktop\AI\玄学data"
```

### 强制使用OCR（适用于扫描版PDF）

```bash
python extract_pdf_text.py "典籍.pdf" --ocr-only
```

---

## 📊 输出说明

### 提取的文本
- 位置：`extracted_texts/`
- 格式：`{原文件名}.txt`

### 处理报告
- 位置：`ocr_report_{时间戳}.json`
- 包含：处理统计、命例列表、错误信息

---

## 🔧 故障排除

### PaddleOCR安装失败
```bash
# 使用国内镜像
pip install paddlepaddle -i https://pypi.tuna.tsinghua.edu.cn/simple
pip install paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### pdf2image错误
需要安装poppler：
- Windows: 下载 [poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases)
- 添加到系统PATH

### 内存不足
```bash
# 处理大PDF时，限制页数
python extract_pdf_text.py "大文件.pdf" --pages 50
```

---

## 📚 支持的典籍格式

### 八字命例识别模式

1. **六X年格式**
   ```
   六甲年丁卯月乙未日戊寅时
   ```

2. **标准格式**
   ```
   甲子年丙寅月丁卯日戊申时
   ```

3. **乾造/坤造格式**
   ```
   乾造：甲子 丙寅 丁卯 戊申
   坤造：乙丑 丁卯 己巳 庚午
   ```

---

## 🎓 学习路径

### 第1步：理解OCR原理
- OCR = Optical Character Recognition（光学字符识别）
- 将图片中的文字转换为可编辑文本
- 中文OCR需要专门训练的语言模型

### 第2步：熟悉工具
- **PaddleOCR**: 百度开源，中文效果好
- **PyMuPDF**: 快速PDF解析
- **正则表达式**: 命例模式匹配

### 第3步：实践提取
1. 从简单的文本PDF开始
2. 逐步尝试扫描版PDF
3. 验证提取的命例准确性

---

## 📖 进阶功能

### 自定义命例识别规则

编辑 `extract_pdf_text.py` 中的 `extract_bazi_cases` 方法：

```python
# 添加新的识别模式
pattern_custom = r'你的正则表达式'
for match in re.finditer(pattern_custom, text):
    cases.append({
        'day_master': match.group(1),
        # ... 其他字段
    })
```

### 集成到数据库

提取的命例可以直接导入数据库：

```python
from database.db_manager import insert_case

for case in extracted_cases:
    insert_case(case)
```

---

## 🔗 相关资源

- [PaddleOCR GitHub](https://github.com/PaddlePaddle/PaddleOCR)
- [PyMuPDF 文档](https://pymupdf.readthedocs.io/)
- [正则表达式教程](https://regexr.com/)

---

**创建时间**: 2026-03-21  
**版本**: v1.0
