# 子平经典知识库 - 安装与使用指南

## 📦 安装步骤

### 步骤 1：安装 Python 依赖

```bash
cd knowledge-base/ziping/scripts
pip install -r requirements.txt
```

**依赖说明：**
- `pdfplumber` - PDF 文本提取（推荐）
- `PyMuPDF` - 高级 PDF 处理（适合扫描版）
- `python-docx` - DOCX 文件处理

### 步骤 2：验证安装

```bash
python extract_texts.py --help
```

如果看到帮助信息，说明安装成功。

---

## 🚀 使用方法

### 快速开始（推荐）

```bash
# 从项目根目录执行
cd c:\Users\10919\Desktop\AI

# 提取所有 PDF 和 DOCX 文件
python knowledge-base/ziping/scripts/extract_texts.py \
  --input "玄学 data" \
  --output "knowledge-base/ziping/sources"
```

### 高级用法

#### 1. 只提取特定格式

```bash
# 只提取 DOCX 文件
python knowledge-base/ziping/scripts/extract_texts.py \
  --input "玄学 data" \
  --output "knowledge-base/ziping/sources" \
  --pattern "*.docx"

# 只提取 PDF 文件
python knowledge-base/ziping/scripts/extract_texts.py \
  --input "玄学 data" \
  --output "knowledge-base/ziping/sources" \
  --pattern "*.pdf"
```

#### 2. 使用 PyMuPDF 提取（适合扫描版 PDF）

```bash
python knowledge-base/ziping/scripts/extract_texts.py \
  --input "玄学 data" \
  --output "knowledge-base/ziping/sources" \
  --pymupdf
```

#### 3. 提取单个典籍

```bash
# 只提取滴天髓相关文件
python knowledge-base/ziping/scripts/extract_texts.py \
  --input "玄学 data" \
  --output "knowledge-base/ziping/sources" \
  --pattern "*滴天髓*"
```

---

## 📊 输出说明

### 输出文件结构

```
knowledge-base/ziping/sources/
├── 滴天髓 子平真詮 今註.md          # 提取的文本
├── 滴天髓 子平真詮 今註.meta.json   # 元数据
├── 命理天书滴天髓详解 - 白鹤鸣.md
├── 命理天书滴天髓详解 - 白鹤鸣.meta.json
└── ...
```

### 元数据格式（.meta.json）

```json
{
  "file": "滴天髓 子平真詮 今註.docx",
  "pages": 512,
  "chapters": [
    "第一章 总论",
    "第二章 阴阳五行",
    "第三章 天干地支",
    ...
  ]
}
```

---

## 🔧 常见问题

### Q1: 提示缺少依赖库

**解决方法：**
```bash
pip install -r requirements.txt
```

如果安装失败，可以单独安装：
```bash
pip install pdfplumber
pip install PyMuPDF
pip install python-docx
```

### Q2: PDF 提取乱码或空白

**原因：** PDF 是扫描版或使用了特殊字体

**解决方法：**
1. 尝试使用 PyMuPDF：
   ```bash
   python extract_texts.py --pymupdf
   ```

2. 如果仍然不行，可能需要 OCR 工具（如 Tesseract）

### Q3: DOCX 提取后章节混乱

**原因：** 文档样式不标准

**解决方法：**
- 手动调整提取后的文本
- 或提供标准化的 DOCX 版本

### Q4: 提取速度慢

**原因：** PDF 文件大或页数多

**解决方法：**
- 分批提取（使用 `--pattern` 参数）
- 使用 PyMuPDF（通常比 pdfplumber 快）

---

## 📝 处理流程

### 自动化流程（推荐）

```bash
# 1. 安装依赖
cd knowledge-base/ziping/scripts
pip install -r requirements.txt

# 2. 批量提取所有典籍
python extract_texts.py \
  --input "../../../玄学 data" \
  --output "../sources"

# 3. 检查输出
cd ../sources
dir  # 查看提取的文件
```

### 手动流程（精细控制）

```bash
# 1. 提取 P0 核心经典
python extract_texts.py \
  --input "../../../玄学 data" \
  --output "../sources" \
  --pattern "*滴天髓*" \
  --pattern "*子平真诠*" \
  --pattern "*渊海子平*" \
  --pattern "*穷通宝鉴*" \
  --pattern "*神峰通考*"

# 2. 检查提取质量
# 打开 sources 目录，查看提取的 Markdown 文件

# 3. 提取 P1 重要典籍
python extract_texts.py \
  --input "../../../玄学 data" \
  --output "../sources" \
  --pattern "*三命通会*" \
  --pattern "*命理金鉴*" \
  --pattern "*命理探原*" \
  --pattern "*袁氏命谱*"
```

---

## 🎯 下一步

文本提取完成后，进入**阶段 3：文本预处理**

```bash
# 运行预处理脚本（待开发）
python scripts/preprocess_texts.py \
  --input "../sources" \
  --output "../modules"
```

预处理包括：
- 去除页眉页脚
- 章节划分
- 繁简转换（如需要）
- 格式规范化

---

## 📞 技术支持

遇到问题时：

1. 检查错误信息
2. 查看本指南的"常见问题"部分
3. 联系天师（技术战略家）

---

**版本**：v1.0.0  
**更新时间**：2026-03-18  
**维护者**：AWKN Lab - 天师
