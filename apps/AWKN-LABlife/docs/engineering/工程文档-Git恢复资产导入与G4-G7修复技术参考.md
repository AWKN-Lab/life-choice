# 工程文档：Git 恢复资产导入与 G4-G7 修复技术参考

> **文档类型**: TECHNICAL_REFERENCE（技术参考）
> **撰写日期**: 2026-07-04
> **撰写人**: 天火（AI）
> **基准交接文档**: `工程交接文档-Git恢复资产导入与G4-G7修复.md`
> **状态**: 待执行
> **读者约束**: 本文档提供调试方法、设计理由、原理说明，不重复交接文档的变更范围/接口/数据/部署

---

## 1. 技术背景与设计原理

### 1.1 问题背景

人生决策宗师知识服务在 G0+G1+G2+G3+G6-0 五阶段完成后，知识库规模为 587 本书 / 142,807 passages / 13 分类，但仍有大量 Git 游离资产未导入：

- **602 个 docx/xlsx/epub 文件**（从 Git dangling objects 导出，存放在 `_recovered_assets/docx_for_import/`）
- **5 个 txt 文件**（small_docx_hits，含六壬讲义等玄学内容）
- **4 个特殊文件**（1 个 SQLite 50MB + 2 个 gzip 共 598MB + 1 个 unknown bin 105MB）
- **589 本恢复库**（metaphysics.db，897,370 passages，质量参差）
- **1639 个 PDF**（待评估术数占比与 OCR 必要性）

当前 TF-IDF v2 索引 recall@10=0.473 < 0.7 阈值，需升级到 BGE-M3 v3 索引。

### 1.2 设计目标

1. **资产救回**: 将 611 个 Git 救回资产导入知识库，目标新增 ≥ 100 本 books / ≥ 10000 passages
2. **质量治理**: metaphysics.db 589 库去重 + 标题清洗
3. **索引升级**: v2 (TF-IDF) → v3 (BGE-M3)，recall@10 ≥ 0.7
4. **平稳切换**: v3 旁路灰度 24h → 主链路切换

### 1.3 技术选型理由

| 选型 | 理由 | 备选 |
|------|------|------|
| python-docx 处理 .docx | 成熟稳定，纯 Python，无 Office 依赖 | docx2txt（更简单但功能弱） |
| openpyxl 处理 .xlsx | 只读模式，内存友好 | xlrd（已停止维护 xlsx） |
| ebooklib 处理 .epub | 标准库，支持 EPUB2/3 | 无可靠备选 |
| BGE-M3 (bge-large-zh-v1.5) | 中文 SOTA，1024 维，与 v2 兼容 | bge-small-zh（小但精度低） |
| 旁路灰度而非直接切换 | 主链路零风险，可随时回滚 | 蓝绿部署（资源占用高） |
| SHA256 去重 | 与 G2 资产总账一致 | UUIDv5（延后到 v0.2） |

### 1.4 架构原则

1. **只读原则**: `_recovered_assets/` 目录只读，不修改原始 zip 文件
2. **独立输出原则**: 新导入数据先写入 `_recovered_import.jsonl`，验证后再合并到主索引
3. **幂等原则**: ingest 脚本相同输入重跑结果相同（passage_id 用 book+idx 计算）
4. **断点续跑原则**: 批量脚本记录已处理 sha，失败后可续跑
5. **回滚优先原则**: 每个高风险单元必须有可执行回滚命令

---

## 2. 模块边界与数据流

### 2.1 模块边界

```
┌─────────────────────────────────────────────────────────────────┐
│  P0: 资产导入模块                                                │
├─────────────────────────────────────────────────────────────────┤
│  输入: _recovered_assets/docx_for_import/{big,small}/*.zip       │
│        _recovered_assets/small_docx_hits/*.txt                   │
│        _recovered_assets/git_dangling_assets/{sqlite,gzip,unknown}│
│  处理: scripts/ingest_recovered_docx.py                          │
│        scripts/_probe_special_files.py                           │
│  输出: knowledge/processed/_recovered_import.jsonl               │
│        knowledge/processed/_special_files_report.json            │
│  合并: classics_index.jsonl += _recovered_import.jsonl           │
│  重生成: embeddings.npy, idf_cache.pkl, _manifest.json           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  P1: G4 治理模块                                                 │
├─────────────────────────────────────────────────────────────────┤
│  输入: knowledge/knowledge_base/metaphysics.db (589 本)          │
│  处理: scripts/govern_metaphysics_db.py                          │
│  输出: metaphysics.db (治理后)                                   │
│        knowledge/processed/_g4_overlap_report.json               │
│        knowledge/processed/_g4_quality_report.json               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  P3: v3 索引模块                                                 │
├─────────────────────────────────────────────────────────────────┤
│  输入: classics_index.jsonl (合并后)                             │
│  处理: scripts/embed_classics.py --model bge-m3                  │
│  输出: knowledge/processed/embeddings_v3.npy                     │
│        knowledge/processed/bm25_index.bin                        │
│  评估: scripts/eval_tfidf_g6_0.py --index v3                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  P4: G7 切换模块                                                 │
├─────────────────────────────────────────────────────────────────┤
│  输入: KNOWLEDGE_INDEX_VERSION 环境变量                          │
│  处理: 服务器 .env 修改 + PM2 重启                               │
│  输出: 主链路使用 v3 索引                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
Git dangling objects
    ↓ (已导出，2026-06-25 完成)
_recovered_assets/
    ↓ (P0 U1-U5 提取+分类+切分)
_recovered_import.jsonl (独立文件)
    ↓ (P0 U6 合并)
classics_index.jsonl (扩量后)
    ↓ (P0 U7 重生成)
embeddings.npy + idf_cache.pkl + _manifest.json
    ↓ (P0 U8 部署)
生产服务器 knowledge-service
    ↓ (P3 U14-U15 升级)
embeddings_v3.npy (BGE-M3)
    ↓ (P3 U16 灰度)
knowledge-service-v3 旁路 (端口 8702)
    ↓ (P4 U17 切换)
主链路 knowledge-service (端口 8701) 使用 v3
```

---

## 3. 关键算法与实现细节

### 3.1 docx/xlsx/epub 文本提取算法

#### 3.1.1 docx 提取（python-docx）

```python
from docx import Document

def extract_docx(zip_path: Path) -> str:
    """从 zip 中提取 docx 文本"""
    with zipfile.ZipFile(zip_path) as zf:
        # 找到 docx 文件（zip 内可能有多个文件）
        docx_names = [n for n in zf.namelist() if n.endswith('.docx')]
        if not docx_names:
            return ""
        # 读取第一个 docx
        with zf.open(docx_names[0]) as f:
            doc = Document(f)
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
```

**设计理由**: 
- zip 内可能含多个文件（docx + 图片 + 元数据），只取第一个 docx
- 用 `paragraphs` 而非 `tables`，因为玄学典籍主要是段落文本
- 保留段落分隔符 `\n`，便于后续 split_md_content 按段落切分

#### 3.1.2 xlsx 提取（openpyxl）

```python
from openpyxl import load_workbook

def extract_xlsx(zip_path: Path) -> str:
    """从 zip 中提取 xlsx 文本"""
    with zipfile.ZipFile(zip_path) as zf:
        xlsx_names = [n for n in zf.namelist() if n.endswith('.xlsx')]
        if not xlsx_names:
            return ""
        with zf.open(xlsx_names[0]) as f:
            wb = load_workbook(f, read_only=True, data_only=True)
            texts = []
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    for cell in row:
                        if cell and str(cell).strip():
                            texts.append(str(cell).strip())
            return "\n".join(texts)
```

**设计理由**:
- `read_only=True` 流式读取，避免大文件 OOM
- `data_only=True` 读取计算值而非公式
- 逐单元格拼接，保留所有非空文本

#### 3.1.3 epub 提取（ebooklib）

```python
from ebooklib import epub, ITEM_DOCUMENT
from bs4 import BeautifulSoup

def extract_epub(zip_path: Path) -> str:
    """从 zip 中提取 epub 文本"""
    with zipfile.ZipFile(zip_path) as zf:
        epub_names = [n for n in zf.namelist() if n.endswith('.epub')]
        if not epub_names:
            return ""
        with zf.open(epub_names[0]) as f:
            book = epub.read_epub(f)
            texts = []
            for item in book.get_items_of_type(ITEM_DOCUMENT):
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                texts.append(soup.get_text(separator='\n'))
            return "\n".join(texts)
```

**设计理由**:
- epub 本质是 zip + XHTML
- 用 BeautifulSoup 解析 HTML，提取纯文本
- `separator='\n'` 保留段落结构

### 3.2 magic bytes 类型判断

```python
def detect_file_type(zip_path: Path) -> str:
    """通过 magic bytes 判断 zip 内文件类型"""
    with zipfile.ZipFile(zip_path) as zf:
        first_file = zf.namelist()[0]
        with zf.open(first_file) as f:
            header = f.read(8)
    
    # docx/xlsx/epub 都是 zip 格式，需看内部 [Content_Types].xml
    if header[:4] == b'PK\x03\x04':
        with zipfile.ZipFile(zip_path) as zf:
            if '[Content_Types].xml' in zf.namelist():
                ct = zf.read('[Content_Types].xml').decode('utf-8', errors='ignore')
                if 'wordprocessingml' in ct:
                    return 'docx'
                elif 'spreadsheetml' in ct:
                    return 'xlsx'
                elif 'epub' in ct.lower():
                    return 'epub'
    return 'unknown'
```

**设计理由**:
- docx/xlsx/epub 本质都是 zip，但内部 `[Content_Types].xml` 不同
- 通过 Content Types 命名空间判断，比文件扩展名更可靠
- magic bytes `PK\x03\x04` 是 zip 格式标准头

### 3.3 分类函数复用（不修改原函数）

```python
# scripts/ingest_recovered_docx.py
import sys
sys.path.insert(0, str(Path(__file__).parent))
from knowledge_ingest import detect_system_type, split_md_content

def classify_extracted_text(text: str, source_name: str) -> str:
    """复用 detect_system_type，传入虚拟 Path"""
    fake_path = Path(source_name)
    return detect_system_type(fake_path)
```

**设计理由**:
- 不修改 `knowledge_ingest.py`，避免影响现有 G3 治理成果
- 通过 import 复用，保持分类逻辑一致性
- 若后续 G3 分类规则更新，新导入数据自动同步

### 3.4 断点续跑机制

```python
PROCESSED_SHA_FILE = OUTPUT_DIR / "_recovered_import_progress.txt"

def load_processed_shas() -> set:
    """加载已处理的 sha"""
    if PROCESSED_SHA_FILE.exists():
        return set(PROCESSED_SHA_FILE.read_text(encoding='utf-8').splitlines())
    return set()

def save_processed_sha(sha: str):
    """记录已处理的 sha"""
    with open(PROCESSED_SHA_FILE, 'a', encoding='utf-8') as f:
        f.write(sha + '\n')

def batch_process():
    shas = load_processed_shas()
    with open(MANIFEST_CSV) as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['short_sha'] in shas:
                continue  # 跳过已处理
            try:
                process_one(row)
                save_processed_sha(row['short_sha'])
            except Exception as e:
                log_failure(row, e)
```

**设计理由**:
- 602 个文件批量处理可能中断（OOM/超时/网络）
- 进度文件 `_recovered_import_progress.txt` 记录已处理 sha
- 重跑时跳过已处理，避免重复工作
- 失败用例记录到 `_recovered_import_failures.jsonl`，不阻塞整体流程

### 3.5 BGE-M3 v3 索引构建

```python
# scripts/embed_classics.py（v3 模式）
from sentence_transformers import SentenceTransformer

def embed_v3(passages: List[str], model_path: str) -> np.ndarray:
    """用 BGE-M3 编码 passages"""
    model = SentenceTransformer(model_path)
    # 批量编码，避免 OOM
    batch_size = 32
    embeddings = []
    for i in range(0, len(passages), batch_size):
        batch = passages[i:i+batch_size]
        emb = model.encode(batch, normalize_embeddings=True)
        embeddings.append(emb)
    return np.vstack(embeddings).astype(np.float32)
```

**设计理由**:
- BGE-M3 输出 1024 维，与 v2 维度一致，可共用检索代码
- `normalize_embeddings=True` 归一化，便于余弦相似度计算
- 批量编码避免 GPU/CPU OOM
- 142807 passages 预计耗时 15-30 分钟（CPU），5-10 分钟（GPU）

### 3.6 旁路灰度架构

```
生产环境（P3 阶段）
┌──────────────────────────────────┐
│  Nginx :443                       │
│  ├─ /life/api/ → :30000 (backend)│
│  └─ /life/      → 前端静态        │
└──────────────────────────────────┘
                ↓
┌──────────────────────────────────┐
│  awkn-life-backend :30000         │
│  └─ orchestrator                  │
│      ├─ 95% → knowledge-service:8701 (v2)│
│      └─ 5%  → knowledge-service-v3:8702 (v3)│  ← 灰度
└──────────────────────────────────┘
```

**设计理由**:
- v3 作为独立进程运行，不影响主链路
- orchestrator 按百分比路由，可动态调整
- 24h 监控无异常后才切换主链路
- 失败立即关闭 v3 旁路，流量回到 v2

---

## 4. 调试方法

### 4.1 P0 调试

#### 4.1.1 单文件调试

```bash
# 调试单个 zip 的提取流程
python scripts/ingest_recovered_docx.py --sha 004e35ce5a72 --debug

# 期望输出:
# [DEBUG] zip_path = _recovered_assets/docx_for_import/small/004e35ce5a72.zip
# [DEBUG] detected_type = docx
# [DEBUG] extracted_text length = 1234
# [DEBUG] system_type = bazi
# [DEBUG] passages count = 5
# [DEBUG] first passage = 滴天髓...
```

#### 4.1.2 批量失败分析

```bash
# 查看失败用例
python -c "
import json
with open('knowledge/processed/_recovered_import_failures.jsonl') as f:
    for line in f:
        failure = json.loads(line)
        print(f'{failure[\"short_sha\"]}: {failure[\"error\"]}')
" | sort | uniq -c | sort -rn
```

#### 4.1.3 合并后重复检测

```bash
python -c "
import json
from collections import Counter
lines = open('knowledge/processed/classics_index.jsonl', encoding='utf-8').readlines()
ids = [json.loads(l)['passage_id'] for l in lines]
dupes = [k for k,v in Counter(ids).items() if v > 1]
print(f'duplicates: {len(dupes)}')
if dupes:
    print(dupes[:10])
"
```

### 4.2 P1 调试

#### 4.2.1 SQLite 表结构探查

```bash
sqlite3 knowledge/knowledge_base/metaphysics.db ".tables"
sqlite3 knowledge/knowledge_base/metaphysics.db ".schema books"
sqlite3 knowledge/knowledge_base/metaphysics.db "SELECT * FROM books LIMIT 5"
```

#### 4.2.2 重叠度计算

```python
import sqlite3, hashlib, json

# 589 库的 sha256
conn = sqlite3.connect('knowledge/knowledge_base/metaphysics.db')
cur = conn.execute("SELECT title, content FROM books")
db_shas = {hashlib.sha256(content.encode()).hexdigest(): title for title, content in cur}

# 当前 587 本的 sha256
with open('knowledge/processed/assets_books.jsonl') as f:
    current_shas = {json.loads(l)['source_sha256']: json.loads(l)['book'] for l in f}

overlap = set(db_shas.keys()) & set(current_shas.keys())
print(f'overlap: {len(overlap)}')
print(f'unique in 589: {len(db_shas) - len(overlap)}')
```

### 4.3 P3 调试

#### 4.3.1 BGE-M3 模型加载验证

```python
from sentence_transformers import SentenceTransformer
import time

model_path = '/opt/awkn-life/models/bge-large-zh/'
start = time.time()
model = SentenceTransformer(model_path)
print(f'model loaded in {time.time()-start:.1f}s')

start = time.time()
emb = model.encode(['测试句子'], normalize_embeddings=True)
print(f'encode 1 sentence in {time.time()-start:.3f}s')
print(f'shape: {emb.shape}, dtype: {emb.dtype}')
```

#### 4.3.2 v3 索引效果对比

```bash
# v2 效果
python scripts/eval_tfidf_g6_0.py --index v2
# 期望: recall@10=0.473, precision@10=0.917

# v3 效果
python scripts/eval_tfidf_g6_0.py --index v3
# 期望: recall@10≥0.7, precision@10≥0.6
```

### 4.4 通用调试

#### 4.4.1 知识服务日志

```bash
ssh aliyun-awkn 'pm2 logs knowledge-service --lines 50'
```

#### 4.4.2 内存使用监控

```bash
ssh aliyun-awkn 'pm2 monit'
# 关注 knowledge-service 的 memory 字段
# 正常: < 2GB（142807 passages × 1024 dim × 4 bytes ≈ 558MB）
```

---

## 5. 风险与缓解

### 5.1 技术风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| docx 提取乱码（编码问题） | 中 | 部分书籍不可用 | 优先 UTF-8，失败降级 GBK/GB18030 |
| xlsx 表格结构破坏文本流 | 中 | 切分异常 | 逐单元格拼接后按段落切分 |
| epub 含大量 HTML 标签 | 低 | 文本噪声 | BeautifulSoup 提取纯文本 |
| BGE-M3 模型下载失败 | 低 | P3 延期 | 预下载到本地，或降级 bge-small-zh |
| v3 embeddings OOM | 中 | 生成失败 | 批量编码 batch_size=32，必要时降到 16 |
| 服务器磁盘不足 | 高 | 多任务受阻 | 启动前清理 _backup_* 目录 |
| 合并后重复 passage_id | 低 | 检索异常 | U6 验收必须 duplicates=0 |

### 5.2 数据风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 602 个文件含敏感内容 | 低 | 合规风险 | ingest 不修改内容，原样提取 |
| 589 库治理误删有效书籍 | 中 | 数据丢失 | 治理前 .bak 备份，治理后抽样验证 |
| metaphysics.db 损坏 | 低 | 589 库不可用 | .bak 备份 + 立即回滚 |
| embeddings_v3.npy 生成不完整 | 中 | v3 检索异常 | 生成后验证 shape[0] = classics 行数 |

### 5.3 生产风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 部署期间服务中断 | 低 | 用户感知 | 使用 .new 后缀原子替换 |
| v3 切换后主链异常 | 低 | 主咨询链不可用 | 立即回滚到 v2 |
| 24h 监控发现退化 | 中 | 用户体验下降 | 回滚到 v2，分析原因 |

---

## 6. 性能基线与对比

### 6.1 当前 v2 性能基线

| 指标 | v2 值 | 来源 |
|------|-------|------|
| 知识库规模 | 587 books / 142807 passages | 上次结果单 |
| embeddings 大小 | 558MB | 上次部署报告 |
| 加载耗时 | < 5s | verify 脚本 |
| /retrieve 响应 | < 100ms | verify 脚本 |
| /embed_search 响应 | < 50ms | verify 脚本 |
| recall@10 | 0.473 | G6-0 评估 |
| precision@10 | 0.917 | G6-0 评估 |

### 6.2 P0 完成后预期

| 指标 | P0 完成后 | 变化 |
|------|----------|------|
| 知识库规模 | ≥ 700 books / ≥ 153000 passages | +113 books / +10200 passages |
| embeddings 大小 | ≈ 600MB | +42MB |
| 加载耗时 | < 6s | +1s |
| /retrieve 响应 | < 100ms | 不变 |
| recall@10 | ≈ 0.5 | 略升（覆盖更广） |
| precision@10 | ≈ 0.9 | 略降（新数据质量参差） |

### 6.3 P3 完成后预期

| 指标 | P3 完成后 | 变化 |
|------|----------|------|
| embeddings 大小 | ≈ 600MB（v3） | 与 v2 相近 |
| 加载耗时 | < 10s | +5s（BGE 模型加载） |
| /embed_search 响应 | < 80ms | +30ms（语义检索） |
| recall@10 | ≥ 0.7 | +0.227 |
| precision@10 | ≥ 0.6 | -0.317（语义召回更广，精度略降） |

---

## 7. 历史经验参考

### 7.1 上次部署经验（2026-07-04）

来源: `知识服务部署报告-20260704.md`

| 经验 | 应用到本次 |
|------|-----------|
| Windows 无 rsync，改用 scp -C 压缩上传 | P0 U8 沿用 scp |
| 大文件用 .new 后缀原子替换 | P0 U8 沿用 |
| PowerShell 解析 SSH 命令中的 $()，需用单引号 | P0 U8 沿用 |
| 服务器 main.py 可能是旧版，需上传本地版 | P0 U8 沿用（main.py 已是修复版） |
| 本地 curl awkn.cn 超时，改从服务器内部验证 | P0 U8 沿用 |

### 7.2 G6-0 TF-IDF 评估经验

来源: `知识资产治理与v3检索-最终结果单-20260704.md`

| 经验 | 应用到本次 |
|------|-----------|
| fengshui precision@10=0.2 偏低 | P5 L1 优化（补充风水词典） |
| 495 条短文本(<30字) | P5 L2 过滤 |
| 八宅明镜误归 bazi | P5 L3 修正 |
| 康熙字典误归 other | P5 L4 修正 |
| recall@10=0.473 不达标 | P3 v3 升级 |

### 7.3 Git Dangling 资产规则

来源: `git-dangling-assets-rule.md`

| 规则 | 应用到本次 |
|------|-----------|
| 禁止 git gc/prune/filter-repo/BFG | 全程禁止 |
| _recovered_assets/ 只读 | P0 仅读取 zip，不修改 |
| 二进制安全约束 | 特殊文件用 Python bytes 读取 |
| 用户确认后才决定哪些丢弃 | P0 U11 完成后向用户汇报 |

---

## 8. 工具链与依赖

### 8.1 Python 依赖

| 包名 | 版本 | 用途 | P0/P1/P3 |
|------|------|------|----------|
| python-docx | >=0.8.11 | docx 提取 | P0 |
| openpyxl | >=3.0.9 | xlsx 提取 | P0 |
| ebooklib | >=0.18 | epub 提取 | P0 |
| beautifulsoup4 | >=4.10.0 | epub HTML 解析 | P0 |
| sentence-transformers | >=2.2.0 | BGE-M3 推理 | P3 |
| torch | >=1.13.0 | BGE-M3 后端 | P3 |
| numpy | >=1.21.0 | 向量计算 | 全部 |
| fastapi | >=0.95.0 | API 服务 | 全部 |
| pydantic | >=1.10.0 | 数据校验 | 全部 |

### 8.2 系统依赖

| 工具 | 用途 |
|------|------|
| sqlite3 | metaphysics.db 治理（P1） |
| ssh | 服务器操作 |
| scp | 文件上传 |
| pm2 | 服务管理 |

### 8.3 验证脚本

| 脚本 | 用途 | 阶段 |
|------|------|------|
| `scripts/verify_knowledge_service.py` | 5 接口验证 + 11 项断言 | P0 U8 |
| `scripts/eval_tfidf_g6_0.py` | TF-IDF/BGE-M3 效果评估 | P0/P3 |
| `scripts/generate_assets_ledger.py` | G2 资产总账生成 | P0 U6 后 |
| `scripts/diag_bazi_doushu.py` | bazi 紫微污染诊断 | P0 U6 后 |

---

## 9. 执行检查清单

### 9.1 P0 启动前检查

- [ ] `pip list | grep -E "python-docx|openpyxl|ebooklib|beautifulsoup4"` 确认依赖
- [ ] `ls _recovered_assets/docx_for_import/big/*.zip | wc -l` = 70
- [ ] `ls _recovered_assets/docx_for_import/small/*.zip | wc -l` = 532
- [ ] `ls _recovered_assets/small_docx_hits/*.txt | wc -l` = 5
- [ ] `ls _recovered_assets/git_dangling_assets/{sqlite,gzip,unknown}/*` = 4 个文件
- [ ] `df -h .` 确认本地磁盘 ≥ 5GB 可用
- [ ] `git status` 确认工作区干净

### 9.2 P0 U8 部署前检查

- [ ] `python scripts/verify_knowledge_service.py` exit code 0
- [ ] `wc -l knowledge/processed/classics_index.jsonl` > 142807
- [ ] `python -c "import numpy as np; print(np.load('knowledge/processed/embeddings.npy').shape)"` shape[0] = jsonl 行数
- [ ] `ssh aliyun-awkn "df -h /"` 确认服务器磁盘 ≥ 5GB 可用
- [ ] `ssh aliyun-awkn "pm2 list"` 确认 knowledge-service 运行中

### 9.3 P3 启动前检查

- [ ] P0 完成（U8 验收 PASS）
- [ ] `ssh aliyun-awkn "ls /opt/awkn-life/models/bge-large-zh/"` 模型已下载
- [ ] `ssh aliyun-awkn "df -h /"` 磁盘 ≥ 5GB 可用
- [ ] `pip list | grep sentence-transformers` 依赖已安装

### 9.4 P4 启动前检查

- [ ] P3 完成（U16 灰度 24h 无异常）
- [ ] 用户明确授权"切换到 v3"
- [ ] `ssh aliyun-awkn "pm2 list"` knowledge-service-v3 运行中
- [ ] 回滚方案已准备（`KNOWLEDGE_INDEX_VERSION=v2`）

---

## 10. 常见问题与解决方案

### 10.1 P0 常见问题

**Q1: docx 提取乱码？**
A: 优先 UTF-8，失败降级 GBK/GB18030。代码示例：
```python
try:
    text = content.decode('utf-8')
except UnicodeDecodeError:
    text = content.decode('gb18030', errors='ignore')
```

**Q2: zip 内多个 docx，选哪个？**
A: 选第一个（`namelist()[0]`），通常 zip 是单文件压缩。

**Q3: 批量处理中途 OOM？**
A: 降低 batch_size，或改为逐文件处理（不批量加载到内存）。

**Q4: 失败率 > 20% 怎么办？**
A: 暂停执行，分析失败用例：
- 若全是扫描件（无文本），需 OCR（延后到 P2）
- 若全是加密文件，跳过
- 若是格式异常，记录到 failures.jsonl，继续处理其他

### 10.2 P3 常见问题

**Q1: BGE-M3 模型下载失败？**
A: 使用国内镜像：
```bash
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download BAAI/bge-large-zh-v1.5 --local-dir /opt/awkn-life/models/bge-large-zh/
```

**Q2: v3 recall@10 仍 < 0.7？**
A: 分析失败查询：
- 若是专业术语不足，补充领域词典
- 若是语义偏差，考虑混合检索（v2 关键词 + v3 语义）

**Q3: v3 加载耗时过长？**
A: 检查是否启用了 GPU；CPU 模式下 batch_size 降到 16。

### 10.3 P4 常见问题

**Q1: 切换后 /retrieve 返回空？**
A: 立即回滚：`sed -i 's/v3/v2/' .env && pm2 restart knowledge-service`

**Q2: 24h 监控发现退化？**
A: 回滚到 v2，分析退化查询，优化 v3 索引后重新灰度。

---

## 11. 文档索引

| 文档 | 类型 | 用途 |
|------|------|------|
| `Git恢复计划完成情况盘点-20260704.md` | ANALYSIS | 盘点报告（输入） |
| `Git恢复资产导入与G4-G7修复执行计划-20260704.md` | EXECUTION | 执行计划（输入） |
| `工程交接文档-Git恢复资产导入与G4-G7修复.md` | HANDOFF | 交接文档（基于执行计划） |
| **本文档** | **TECHNICAL_REFERENCE** | **技术参考（基于交接文档）** |
| `工程交接文档-知识资产治理与v3检索.md` | HANDOFF | 上次交接文档（参考） |
| `知识资产治理与v3检索-最终结果单-20260704.md` | REPORT | 上次结果单（参考） |
| `知识服务部署报告-20260704.md` | REPORT | 上次部署报告（参考） |
| `git-dangling-assets-rule.md` | RULE | Git Dangling 硬规则 |

---

## 12. 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| v1.0 | 2026-07-04 | 初版，基于执行计划 + 交接文档生成 |

---

**文档结束**

**下次遇到类似情况先做 3 件事**：
1. 查看当前状态（`git status` + 目录 LS + manifest CSV）
2. 备份当前版本（代码 `git commit` + 数据 `.bak`）
3. 读取完整文件并确认修改位置（Grep 验证行号，Read 全文）
