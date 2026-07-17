# PDF 转 MD 执行计划

## 任务目标
使用 awkn-mineru 技能将 3 本 PDF 书籍转换为 Markdown 格式文件。

## 输入文件
1. `C:\Users\10919\Downloads\中国系统思维 (刘长林) (z-library.sk, 1lib.sk, z-lib.sk) (1).pdf`
2. `C:\Users\10919\Downloads\历史的巨镜 (金观涛 [金观涛]) (z-library.sk, 1lib.sk, z-lib.sk).pdf`
3. `C:\Users\10919\Downloads\系统理论中的科学方法与哲学问题 1982年北京系统论、信息论、控制论中的科学方法与哲学问题学术讨论会文集 (钱学森等著) (z-library.sk, 1lib.sk, z-lib.sk).pdf`

## 输出目录
`C:\Users\10919\Desktop\AWKN-Lab\记忆系统\L1主题辅助\系统思维书库\`

## 环境状态
- ✅ Python 3.10.11
- ✅ PyMuPDF 1.27.2（文本层 PDF 直接提取）
- ❌ MinerU 未安装（高精度解析不可用）
- ❌ easyocr 未安装（扫描版 OCR 不可用）

## 解析策略

### 方案选择：使用 pdf2md.py（PyMuPDF 模式）
- 原因：PyMuPDF 已安装，可直接处理文本层 PDF
- 这 3 本书大概率是数字版 PDF（z-library 来源），有文本层
- 如果某本是扫描版（无文本层），会跳过并报告

### 降级方案（如果 PyMuPDF 提取质量不够）
- 安装 MinerU：`pip install -U "mineru[all]"`
- 使用 parse_wrapper.py 进行高精度解析

## 执行步骤

### Step 1｜创建输出目录
- 动作：创建 `C:\Users\10919\Desktop\AWKN-Lab\记忆系统\L1主题辅助\系统思维书库\`
- 验收：目录存在

### Step 2｜逐本转换 PDF → MD
- 使用 `pdf2md.py parse <input> <output>` 逐本转换
- 每本转换后检查输出文件是否存在、内容是否非空
- 3 本书依次执行，避免内存问题

**Step 2.1**｜转换《中国系统思维》
- 输入：`中国系统思维 (刘长林) (z-library.sk, 1lib.sk, z-lib.sk) (1).pdf`
- 输出：`系统思维书库/中国系统思维.md`

**Step 2.2**｜转换《历史的巨镜》
- 输入：`历史的巨镜 (金观涛 [金观涛]) (z-library.sk, 1lib.sk, z-lib.sk).pdf`
- 输出：`系统思维书库/历史的巨镜.md`

**Step 2.3**｜转换《系统理论中的科学方法与哲学问题》
- 输入：`系统理论中的科学方法与哲学问题...pdf`
- 输出：`系统思维书库/系统理论中的科学方法与哲学问题.md`

### Step 3｜验证输出质量
- 检查每个 MD 文件的大小和内容
- 确认非空、有章节结构
- 如果某本质量差（扫描版），考虑安装 MinerU 重新解析

### Step 4｜质量报告
- 输出转换结果汇总
- 标注每本书的解析方法和页数

## 风险与回退
| 风险 | 应对 |
|------|------|
| 扫描版 PDF 无文本层 | 安装 easyocr 或 MinerU 重新解析 |
| 大文件内存溢出 | PyMuPDF 逐页处理，一般不会 |
| 文件名含特殊字符 | 用引号包裹路径 |
| 输出内容乱码 | 切换 MinerU pipeline 后端 |

## 不做什么
- 不安装额外依赖（除非 PyMuPDF 无法处理）
- 不修改原始 PDF 文件
- 不做内容编辑或格式优化（仅转换）
