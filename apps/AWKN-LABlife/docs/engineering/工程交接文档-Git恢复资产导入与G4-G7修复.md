# 工程交接文档：Git 恢复资产导入与 G4-G7 修复

> **文档类型**: HANDOFF（交接文档）
> **撰写日期**: 2026-07-04
> **撰写人**: 天火（AI）
> **交接对象**: 程序员（执行人）
> **基准计划**: `Git恢复资产导入与G4-G7修复执行计划-20260704.md`
> **基准盘点**: `Git恢复计划完成情况盘点-20260704.md`
> **状态**: 待执行
> **读者约束**: 本文档仅描述变更范围/接口/数据/部署/回滚/未确认项，不包含调试方法与设计理由

---

## 1. 一屏摘要

| 项 | 内容 |
|---|---|
| 项目/模块 | 人生决策宗师 / 知识服务（knowledge-service）+ Git 恢复资产导入 + G4-G7 |
| 本次目标 | 将 611 个 Git 救回资产导入知识库；治理 metaphysics.db 589 库；评估 PDF OCR；升级 v3 索引；G7 切换 |
| 变更范围 | 代码：新增 `scripts/ingest_recovered_docx.py`、`scripts/_probe_special_files.py`；数据：`classics_index.jsonl`、`_manifest.json`、`embeddings.npy`、`idf_cache.pkl`；资产：`_recovered_assets/`（只读，不修改）；`metaphysics.db`（G4 治理） |
| 交付物 | P0：611 资产导入 + 生产部署；P1：589 库治理；P2：PDF 评估；P3：v3 索引；P4：G7 切换 |
| 验证状态 | 待执行（行号已 Grep 验证，目录文件已 LS 验证） |
| 发布建议 | 分阶段发布——P0 完成后发布扩量索引；P3 完成后灰度 v3；P4 切换主链 |

### 1.1 与执行计划的差异说明

| # | 执行计划口径 | 本交接文档口径 | 理由 |
|---|---|---|---|
| 1 | 18 个执行单元 | **18 个执行单元**（保持一致） | 完全对齐 |
| 2 | P0-P5 六优先级 | **P0-P5 六优先级** | 完全对齐 |
| 3 | U1 抽样 10 个 | **U1 抽样 10 个** | 完全对齐 |
| 4 | 602 个 docx 全量 | **602 个 docx 全量**（成功率 ≥ 80%） | 完全对齐 |
| 5 | G7 阻断 | **G7 阻断**（需 P3 通过 + 用户授权） | 完全对齐 |

### 1.2 修复后预期形态

```
当前知识库: 587 books / 142,807 passages / 13 分类 / TF-IDF v2 索引
P0 完成后:  ≥ 700 books / ≥ 153,000 passages / 13 分类 / TF-IDF v2 索引（扩量）
P3 完成后:  ≥ 700 books / ≥ 153,000 passages / 13 分类 / BGE-M3 v3 索引（灰度旁路）
P4 完成后:  ≥ 700 books / ≥ 153,000 passages / 13 分类 / BGE-M3 v3 索引（主链）
```

---

## 2. 事实来源

| 来源 | 路径 | 关键内容 | 证据等级 |
|---|---|---|---|
| 执行计划 | `apps/AWKN-LABlife/docs/engineering/Git恢复资产导入与G4-G7修复执行计划-20260704.md` | 18 个执行单元 U1-U18 + 5 项 P5 遗留 | E3（已读全文） |
| 盘点报告 | `apps/AWKN-LABlife/docs/engineering/Git恢复计划完成情况盘点-20260704.md` | 611 资产未导入 + G4-G7 未完成 | E3（已读全文） |
| ingest 脚本 | `scripts/knowledge_ingest.py` | L51-120 分类函数 detect_system_type、L175-222 切分函数 split_md_content、L225-234 _make_item | E3（已读 250 行） |
| 上次结果单 | `apps/AWKN-LABlife/docs/engineering/知识资产治理与v3检索-最终结果单-20260704.md` | G0+G1+G2+G3+G6-0 已 PASS | E3（已读全文） |
| 部署报告 | `apps/AWKN-LABlife/docs/engineering/知识服务部署报告-20260704.md` | 上次部署 6 文件 + 5 接口全 PASS | E3（已读全文） |
| Git Dangling 规则 | `c:\Users\10919\Desktop\AWKN-Lab\记忆系统\02-evolution\git-dangling-assets-rule.md` | 禁止 gc/prune/filter-repo/BFG | E3（已读全文 48 行） |

补充验证：
- `_recovered_assets/docx_for_import/` 已 LS 验证：big=70 个 zip，small=532 个 zip，合计 602 个
- `_recovered_assets/git_dangling_assets/` 已 LS 验证：sqlite=1（50MB）、gzip=2（253MB+345MB）、unknown=1（105MB）
- `_recovered_assets/small_docx_hits/` 已 LS 验证：5 个 txt（含六壬讲义等玄学内容）
- `manifest_import.csv` 已读取：602 行，每行含 sha/short_sha/size_mb/export_path/detected_type
- 4 个特殊文件 magic bytes 已验证：SQLite format 3 / gzip 0x1F8B08 / unknown 0D 00 00 00 48 00 00 00

---

## 3. 变更说明

### 3.1 用户可见变化

- `/health` 接口 `bookCount` 从 587 → ≥ 700，`passageCount` 从 142807 → ≥ 153000
- `/retrieve` 接口返回结果覆盖更多典籍（新增 100+ 本玄学书）
- `/hybrid_search` 接口向量+关键词融合效果提升（v3 索引后）
- L2 咨询链引用典籍数提升（v3 切换后）
- `metaphysics.db` 标题清洗后无短标题/无重复

### 3.2 技术变化

| 模块 | 变更 | 文件:行号 | 修改前 | 修改后 |
|---|---|---|---|---|
| ingest | 新增批量导入脚本 | `scripts/ingest_recovered_docx.py`（新增） | 不存在 | 读取 manifest_import.csv + 解压 + 提取 + 分类 + 输出 _recovered_import.jsonl |
| ingest | 复用分类函数 | `scripts/knowledge_ingest.py:51-120` | detect_system_type 不变 | 直接 import 复用，不修改 |
| ingest | 复用切分函数 | `scripts/knowledge_ingest.py:175-222` | split_md_content 不变 | 复用 MAX_LEN=400 硬切逻辑 |
| 数据 | 合并索引 | `knowledge/processed/classics_index.jsonl` | 142807 行 | 142807 + 新增 passages（≥ 10000） |
| 数据 | manifest 更新 | `knowledge/processed/_manifest.json` | 587 books | ≥ 700 books |
| 数据 | embeddings 重生成 | `knowledge/processed/embeddings.npy` | shape=(142807, 1024) | shape=(≥153000, 1024) |
| 数据 | IDF 缓存重生成 | `knowledge/processed/idf_cache.pkl` | 旧 IDF | 重新 fit |
| G4 | metaphysics.db 治理 | `knowledge/knowledge_base/metaphysics.db` | 589 本，含短标题/重复 | 治理后无短标题/无重复 |
| G6 | v3 embeddings | `knowledge/processed/embeddings_v3.npy`（新增） | 不存在 | BGE-M3 编码，shape=(N, 1024) |
| G7 | 索引版本切换 | 服务器 `.env` | `KNOWLEDGE_INDEX_VERSION=v2`（默认） | `KNOWLEDGE_INDEX_VERSION=v3` |

### 3.3 影响范围

| 范围 | 影响 | 风险 | 处理 |
|---|---|---|---|
| 前端 | 无直接影响（前端不直连 knowledge-service） | 低 | 无需变更 |
| 后端 | 后端 orchestrator 通过 HTTP 调用 knowledge-service:8701 | 中 | P0 完成后 /health 字段不变，向后兼容 |
| 数据 | classics_index.jsonl/embeddings.npy/_manifest.json 重新生成 | 高 | 生成前备份 .bak，失败时回滚 |
| 部署 | knowledge-service 需重启加载新索引 | 中 | 重启命令见 §8.2 |
| Git 资产 | _recovered_assets/ 只读，不修改 | 低 | 仅读取 zip 文件，不修改 |
| 生产服务器 | 磁盘 90% 已用，embeddings_v3.npy 约 600MB | 高 | 启动前先清理 _backup_* 目录 |

---

## 4. 接口文档

### 4.1 接口清单

> 本节仅文档化 4 个核心接口（与上次交接文档一致，无新增接口）。P3/P4 阶段新增 `/health-v3` 辅助接口。

| 接口 | 方法 | 鉴权 | 请求参数 | 响应 | 错误码 | 调用方 |
|---|---|---|---|---|---|---|
| `/health` | GET | 无（内网） | 无 | `{status, version, bookCount, passageCount, loadedItems, bySystem}` | HTTP 200/500 | 后端 orchestrator |
| `/retrieve` | POST | 无 | `{routeType, question, evidenceTags, limit}` | `{items: [KnowledgeItem]}` | HTTP 200/422 | 后端 orchestrator |
| `/embed_search` | POST | 无 | `{question, systemType, limit}` | `{items: [KnowledgeItem]}` | HTTP 200/422 | 后端 orchestrator |
| `/hybrid_search` | POST | 无 | `{routeType, question, evidenceTags, limit, vectorWeight, keywordWeight}` | `{items: [KnowledgeItem]}` | HTTP 200/422 | 后端 orchestrator |
| `/health-v3` | GET | 无 | 无 | `{index_version, recall@10, precision@10, embeddings_shape}` | HTTP 200/500 | P3 灰度监控用 |

### 4.1.1 P0 完成后 /health 响应（预期）

```json
{
  "status": "ok",
  "version": "2026-05-v1",
  "bookCount": 712,
  "passageCount": 158420,
  "loadedItems": 158420,
  "bySystem": {
    "bazi": 21000,
    "ziwei": 18500,
    "liuren": 11000,
    "qimen": 28000,
    "meihua": 500,
    "liuyao": 4500,
    "zhouyi": 5000,
    "fengshui": 2200,
    "quming": 1100,
    "xiangshu": 2600,
    "daoism": 250,
    "yuyan": 56,
    "other": 55714
  }
}
```

> 注：bySystem 各分类的具体 passages 数为预期值，实际值以重新生成 manifest 为准。

### 4.1.2 P3 完成后 /health-v3 响应（预期）

```json
{
  "index_version": "v3-bge-m3",
  "recall@10": 0.72,
  "precision@10": 0.85,
  "embeddings_shape": [158420, 1024],
  "model": "BAAI/bge-large-zh-v1.5"
}
```

### 4.2 请求字段来源（无变化，沿用上次交接文档）

| 接口 | 字段 | 来源行号 | 类型 | 默认值 |
|---|---|---|---|---|
| `/retrieve` | routeType | `main.py:26` | str | 必填 |
| `/retrieve` | question | `main.py:27` | str | 必填 |
| `/retrieve` | evidenceTags | `main.py:28` | List[str] | `[]` |
| `/retrieve` | limit | `main.py:29` | int | `6` |
| `/embed_search` | question | `main.py:266` | str | 必填 |
| `/embed_search` | systemType | `main.py:267` | Optional[str] | `None` |
| `/embed_search` | limit | `main.py:268` | int | `6` |
| `/hybrid_search` | routeType | `main.py:291` | str | 必填 |
| `/hybrid_search` | question | `main.py:292` | str | 必填 |
| `/hybrid_search` | evidenceTags | `main.py:293` | List[str] | `[]` |
| `/hybrid_search` | limit | `main.py:294` | int | `6` |
| `/hybrid_search` | vectorWeight | `main.py:295` | float | `0.7` |
| `/hybrid_search` | keywordWeight | `main.py:296` | float | `0.3` |

### 4.3 变更前/变更后对照

| 接口 | 变更前（当前形态） | 变更后（P0 完成形态） | 变更后（P4 完成形态） |
|---|---|---|---|
| `/health` | bookCount=587, passageCount=142807 | bookCount≥700, passageCount≥153000 | 同 P0 |
| `/retrieve` | items 非空（587 本） | items 非空（≥700 本） | items 非空（v3 索引） |
| `/embed_search` | items 非空（v2 索引） | items 非空（v2 扩量） | items 非空（v3 索引） |
| `/hybrid_search` | items 非空（v2 融合） | items 非空（v2 扩量融合） | items 非空（v3 融合） |
| `/health-v3` | 不存在 | 不存在 | 返回 v3 索引指标 |

### 4.4 错误码说明（无变化）

| HTTP 码 | 触发条件 | 处理建议 |
|---|---|---|
| 200 | 正常返回（即使 items 为空） | 检查 items 是否非空 |
| 422 | 请求体不符合 Pydantic 模型 | 检查请求字段完整性 |
| 500 | 服务内部异常 | 查看服务日志，确认数据文件完整 |

---

## 5. 数据库文档

### 5.1 Schema 变更

**无 Schema 变更**。本项目 passages 存储为 JSONL 文件，不使用 Prisma/SQLite 存储 passages。

### 5.2 数据文件变更

| 文件 | 变更类型 | 当前状态 | 修改后状态 | 回滚方式 |
|---|---|---|---|---|
| `knowledge/processed/_recovered_import.jsonl` | 新增 | 不存在 | 602 docx + 5 txt 提取的 passages（≥ 10000 行） | `rm _recovered_import.jsonl` |
| `knowledge/processed/classics_index.jsonl` | 合并 | 142807 行 | 142807 + 新增 passages（≥ 153000） | `cp classics_index.jsonl.bak-pre-merge-* classics_index.jsonl` |
| `knowledge/processed/_manifest.json` | 重新生成 | 587 books | ≥ 700 books | `cp _manifest.json.bak-pre-merge-* _manifest.json` |
| `knowledge/processed/embeddings.npy` | 重新生成 | shape=(142807, 1024) | shape=(≥153000, 1024) | `cp embeddings.npy.bak-pre-regen embeddings.npy` |
| `knowledge/processed/idf_cache.pkl` | 重新生成 | 旧 IDF | 重新 fit | `cp idf_cache.pkl.bak-pre-regen idf_cache.pkl` |
| `knowledge/processed/embeddings_v3.npy` | 新增（P3） | 不存在 | BGE-M3 编码，shape=(N, 1024) | `rm embeddings_v3.npy` |
| `knowledge/knowledge_base/metaphysics.db` | 治理（P1） | 589 本，含短标题/重复 | 治理后无短标题/无重复 | `cp metaphysics.db.bak-g4-* metaphysics.db` |

### 5.3 数据备份（P0 U6 执行前必做）

```bash
cd knowledge/processed
cp classics_index.jsonl classics_index.jsonl.bak-pre-merge-$(date +%Y%m%d%H%M%S)
cp _manifest.json _manifest.json.bak-pre-merge-$(date +%Y%m%d%H%M%S)
cp embeddings.npy embeddings.npy.bak-pre-regen-$(date +%Y%m%d%H%M%S)
cp idf_cache.pkl idf_cache.pkl.bak-pre-regen-$(date +%Y%m%d%H%M%S)
```

### 5.4 G4 治理备份（P1 U10 执行前必做）

```bash
cd knowledge/knowledge_base
cp metaphysics.db metaphysics.db.bak-g4-$(date +%Y%m%d%H%M%S)
```

### 5.5 生产服务器备份（P0 U8 部署前必做）

```bash
ssh aliyun-awkn "cp -r /opt/awkn-life/knowledge/processed /opt/awkn-life/knowledge/processed/_backup_pre_deploy_$(date +%Y%m%d%H%M%S)"
```

### 5.6 资产总账（沿用上次 G2 产出，不重新生成）

- 文件：`knowledge/processed/assets_books.jsonl`（已存在，586 本）
- P0 完成后需追加新增 books 记录
- 格式：每行 1 条 `{source_sha256, book, system_type, passages_count, first_seen, source_path, git_blob_sha（可选）}`

---

## 6. 测试用例

### 6.1 P0 测试用例

| # | 用例 | 类型 | 前置条件 | 操作 | 期望结果 | 状态 |
|---|---|---|---|---|---|---|
| 1 | U1 抽样提取 10 个 docx | 正常流 | U1 脚本就绪 | `python scripts/_probe_docx_sample.py` | success_rate ≥ 70% | 待测 |
| 2 | U2 单文件测试 | 正常流 | U2 脚本就绪 | `python scripts/ingest_recovered_docx.py --sha 004e35ce5a72` | 输出 1 条 passage，system_type 合理 | 待测 |
| 3 | U3 批量成功率 | 正常流 | U3 执行完成 | `wc -l _recovered_import.jsonl` | ≥ 10000 行 | 待测 |
| 4 | U4 5 个 txt 导入 | 正常流 | U4 完成 | `grep -c "六壬" _recovered_import.jsonl` | ≥ 1 | 待测 |
| 5 | U5 4 个特殊文件结构报告 | 正常流 | U5 完成 | `cat _special_files_report.json` | 4 个文件全有报告 | 待测 |
| 6 | U6 合并无重复 | 正常流 | U6 完成 | `python -c "..."`（检查 duplicate passage_id） | duplicates=0 | 待测 |
| 7 | U7 embeddings shape 一致 | 正常流 | U7 完成 | `python -c "import numpy as np; e=np.load('embeddings.npy'); print(e.shape)"` | shape[0]=jsonl 行数 | 待测 |
| 8 | U8 本地 verify | 正常流 | U7 完成 | `python scripts/verify_knowledge_service.py` | exit code 0 | 待测 |
| 9 | U8 生产 /health | 正常流 | U8 部署完成 | `ssh aliyun-awkn 'curl -s http://127.0.0.1:30000/api/v1/health'` | bookCount > 587 | 待测 |
| 10 | U8 生产 /retrieve | 正常流 | U8 部署完成 | `ssh aliyun-awkn 'curl -s -X POST ...'` | items 非空 | 待测 |

### 6.2 P1 测试用例

| # | 用例 | 类型 | 操作 | 期望结果 | 状态 |
|---|---|---|---|---|---|
| 11 | U9 重叠度报告 | 正常流 | `cat _g4_overlap_report.json` | 重叠数明确 | 待测 |
| 12 | U10 短标题过滤 | 正常流 | `sqlite3 metaphysics.db "SELECT COUNT(*) FROM books WHERE length(title) < 4"` | = 0 | 待测 |
| 13 | U10 重复标题过滤 | 正常流 | `sqlite3 metaphysics.db "SELECT title, COUNT(*) FROM books GROUP BY title HAVING COUNT(*) > 1"` | 无结果 | 待测 |
| 14 | U11 质量评估报告 | 正常流 | `cat _g4_quality_report.json` | 报告完成 | 待测 |

### 6.3 P3 测试用例

| # | 用例 | 类型 | 操作 | 期望结果 | 状态 |
|---|---|---|---|---|---|
| 15 | U14 BGE-M3 模型加载 | 正常流 | `python -c "from sentence_transformers import SentenceTransformer; m=SentenceTransformer('/opt/awkn-life/models/bge-large-zh/'); print(m.encode('测试').shape)"` | 输出 (1024,) | 待测 |
| 16 | U15 v3 recall@10 | 正常流 | `python scripts/eval_tfidf_g6_0.py --index v3` | recall@10 ≥ 0.7 | 待测 |
| 17 | U15 v3 precision@10 | 正常流 | 同上 | precision@10 ≥ 0.6 | 待测 |
| 18 | U16 v3 旁路健康 | 正常流 | `curl http://127.0.0.1:8702/health` | status=ok | 待测 |

### 6.4 P4 测试用例

| # | 用例 | 类型 | 操作 | 期望结果 | 状态 |
|---|---|---|---|---|---|
| 19 | U17 主链路 v3 | 正常流 | `ssh aliyun-awkn 'curl -s http://127.0.0.1:8701/health-v2 | grep index_version'` | v3 | 待测 |
| 20 | U18 24h 监控 | 正常流 | 日报 | 无 P0 故障 | 待测 |

### 6.5 verify 脚本断言（P0 U8 必做）

```bash
python scripts/verify_knowledge_service.py
echo $?
# 期望: 退出码 = 0，输出 "ALL ASSERTS PASSED"
```

---

## 7. 项目技术约束

> 本节位于部署说明之前，沿用 awkn-工程文档 v2.5.1 规则：设计文档必须包含技术约束章节

| 约束项 | 值 |
|---|---|
| 服务类型 | FastAPI + uvicorn（Python 3.10+） |
| 端口 | `127.0.0.1:8701`（仅内网，不对外） |
| 依赖 | numpy、fastapi、uvicorn、pydantic |
| 新增依赖（P0） | python-docx、openpyxl、ebooklib（如缺需 pip install） |
| 新增依赖（P3） | sentence-transformers、torch（BGE-M3 推理） |
| 数据格式 | `classics_index.jsonl`（JSONL，每行 1 个 passage JSON） |
| 向量格式 | `embeddings.npy`（float32，shape=(N, 1024)，TF-IDF 字符级 Bigram） |
| v3 向量格式 | `embeddings_v3.npy`（float32，shape=(N, 1024)，BGE-M3 语义向量） |
| IDF 缓存 | `idf_cache.pkl`（pickle 格式，避免每次 fit） |
| 知识库根目录 | `knowledge/processed/` |
| 鉴权 | 无（本服务内网调用，由后端 orchestrator 转发） |
| 模型（v2） | TF-IDF 字符级 Bigram Embedder（1024 维，纯 numpy，无外部模型依赖） |
| 模型（v3） | BAAI/bge-large-zh-v1.5（1024 维，sentence-transformers，约 1.3GB） |
| 内存模式 | 默认全量加载；`KNOWLEDGE_USE_MMAP=1` 时 mmap 只读映射 |
| numpy 兼容 | `main.py:7-14` monkey-patch `np.float_/np.int_/np.uint` |
| ChromaDB | 已弃用，`main.py:130-209` 改为纯 numpy 内存向量检索 |
| Git Dangling 规则 | 禁止 gc/prune/filter-repo/BFG，_recovered_assets/ 只读 |
| 二进制安全约束 | 禁止 PowerShell `>`/`Out-File` 导出二进制，必须用 Python bytes 方式 |

---

## 8. 部署说明

### 8.1 环境变量

| 名称 | 用途 | 是否必需 | 示例/来源 |
|---|---|---|---|
| `KNOWLEDGE_DATA_DIR` | 知识库数据目录 | 否（默认 `项目根/knowledge/processed`） | `/opt/awkn-life/knowledge/processed` |
| `KNOWLEDGE_USE_MMAP` | 低内存模式开关 | 否（默认 `0`） | `1` |
| `KNOWLEDGE_INDEX_VERSION` | **索引版本切换（P4 阶段切换）** | 否（默认 `v2`） | `v2` 或 `v3` |
| `BGE_MODEL_PATH` | **BGE 模型路径（P3 阶段新增）** | 否（v3 启用时必需） | `/opt/awkn-life/models/bge-large-zh/` |
| `SKIP_BGE` | 跳过 BGE 模型加载 | 否（默认 `1`） | P3 后改为 `0` |

### 8.2 构建与发布

#### 8.2.1 P0 部署（扩量索引）

```bash
# 1. 本地验证
python scripts/verify_knowledge_service.py
# 期望: exit code 0

# 2. 上传 6 个文件到服务器
scp -C knowledge/processed/classics_index.jsonl aliyun-awkn:/opt/awkn-life/knowledge/processed/classics_index.jsonl.new
scp -C knowledge/processed/_manifest.json aliyun-awkn:/opt/awkn-life/knowledge/processed/_manifest.json.new
scp -C knowledge/processed/embeddings.npy aliyun-awkn:/opt/awkn-life/knowledge/processed/embeddings.npy.new
scp -C knowledge/processed/idf_cache.pkl aliyun-awkn:/opt/awkn-life/knowledge/processed/idf_cache.pkl.new
scp apps/AWKN-LABlife/services/knowledge-service/loader.py aliyun-awkn:/opt/awkn-life/services/knowledge-service/loader.py
scp apps/AWKN-LABlife/services/knowledge-service/main.py aliyun-awkn:/opt/awkn-life/services/knowledge-service/main.py

# 3. 服务器原子替换 + 重启
ssh aliyun-awkn 'cd /opt/awkn-life/knowledge/processed && mv classics_index.jsonl.new classics_index.jsonl && mv _manifest.json.new _manifest.json && mv embeddings.npy.new embeddings.npy && mv idf_cache.pkl.new idf_cache.pkl && pm2 restart knowledge-service'
```

#### 8.2.2 P3 部署（v3 旁路）

```bash
# 1. 上传 v3 embeddings
scp -C knowledge/processed/embeddings_v3.npy aliyun-awkn:/opt/awkn-life/knowledge/processed/

# 2. 上传 v3 索引服务配置（独立进程，端口 8702）
scp apps/AWKN-LABlife/services/knowledge-service/main_v3.py aliyun-awkn:/opt/awkn-life/services/knowledge-service/

# 3. 启动 v3 旁路
ssh aliyun-awkn 'cd /opt/awkn-life/services/knowledge-service && KNOWLEDGE_INDEX_VERSION=v3 BGE_MODEL_PATH=/opt/awkn-life/models/bge-large-zh/ pm2 start main_v3.py --name knowledge-service-v3 -- -p 8702'
```

#### 8.2.3 P4 切换（主链路 v3）

```bash
# 1. 修改 .env
ssh aliyun-awkn 'sed -i "s/KNOWLEDGE_INDEX_VERSION=v2/KNOWLEDGE_INDEX_VERSION=v3/" /opt/awkn-life/services/knowledge-service/.env'

# 2. 重启主服务
ssh aliyun-awkn 'pm2 restart knowledge-service'

# 3. 验证
ssh aliyun-awkn 'curl -s http://127.0.0.1:8701/health-v2 | grep index_version'
# 期望: v3
```

### 8.3 健康检查

```bash
# 1. 基础健康
ssh aliyun-awkn 'curl -s http://127.0.0.1:30000/api/v1/health' | python -m json.tool
# 期望: bookCount > 587, passageCount > 142807

# 2. retrieve 接口
ssh aliyun-awkn 'curl -s -X POST http://127.0.0.1:8701/retrieve -H "Content-Type: application/json" -d "{\"routeType\":\"ziping\",\"question\":\"日主身弱\",\"limit\":3}"' | python -m json.tool
# 期望: items 非空

# 3. embed_search 接口
ssh aliyun-awkn 'curl -s -X POST http://127.0.0.1:8701/embed_search -H "Content-Type: application/json" -d "{\"question\":\"日主身弱如何取用神\",\"systemType\":\"bazi\",\"limit\":3}"' | python -m json.tool
# 期望: items 非空

# 4. hybrid_search 接口
ssh aliyun-awkn 'curl -s -X POST http://127.0.0.1:8701/hybrid_search -H "Content-Type: application/json" -d "{\"routeType\":\"ziping\",\"question\":\"日主身弱\",\"limit\":5}"' | python -m json.tool
# 期望: items 非空

# 5. 自动测试（本地）
python scripts/verify_knowledge_service.py
# 期望: exit code 0, 输出 "ALL ASSERTS PASSED"
```

---

## 9. 回滚方案

### 9.1 回滚方案表

| 回滚对象 | 回滚步骤 | 验证方式 | 回滚后状态 |
|---|---|---|---|
| P0 代码（U2 脚本） | `rm scripts/ingest_recovered_docx.py` | `ls scripts/ingest_recovered_docx.py` 不存在 | 回到无批量导入脚本状态 |
| P0 数据（U6 合并） | `cp classics_index.jsonl.bak-pre-merge-* classics_index.jsonl` + 同理 _manifest.json + 重启服务 | `wc -l classics_index.jsonl` = 142807 | 回到 587 本/142807 passages |
| P0 embeddings（U7） | `cp embeddings.npy.bak-pre-regen-* embeddings.npy` + `cp idf_cache.pkl.bak-pre-regen-* idf_cache.pkl` + 重启 | `python -c "import numpy as np; print(np.load('embeddings.npy').shape)"` = (142807, 1024) | 回到 v2 旧 embeddings |
| P0 生产部署（U8） | `ssh aliyun-awkn "cp -r /opt/awkn-life/knowledge/processed/_backup_pre_deploy_*/* /opt/awkn-life/knowledge/processed/"` + `pm2 restart knowledge-service` | `curl /health` 返回 bookCount=587 | 回到上次部署状态 |
| P1 metaphysics.db（U10） | `cp metaphysics.db.bak-g4-* metaphysics.db` | `sqlite3 metaphysics.db "SELECT COUNT(*) FROM books"` = 589 | 回到治理前 589 本 |
| P3 v3 embeddings（U15） | `rm embeddings_v3.npy` | `ls embeddings_v3.npy` 不存在 | 回到无 v3 状态 |
| P3 v3 旁路（U16） | `ssh aliyun-awkn "pm2 stop knowledge-service-v3 && pm2 delete knowledge-service-v3"` | `pm2 list` 无 knowledge-service-v3 | 回到无 v3 旁路状态 |
| P4 主链路切换（U17） | `ssh aliyun-awkn "sed -i 's/KNOWLEDGE_INDEX_VERSION=v3/KNOWLEDGE_INDEX_VERSION=v2/' /opt/awkn-life/services/knowledge-service/.env && pm2 restart knowledge-service"` | `curl /health-v2` 返回 v2 | 回到 v2 主链路 |

### 9.2 回滚决策树

```
任一阶段失败
├── P0 U1 失败（抽样成功率 < 70%）
│   ├── 不回滚（仅评估）
│   └── 分析失败原因，调整脚本后重试
├── P0 U3 失败（批量成功率 < 80%）
│   ├── 不回滚（_recovered_import.jsonl 独立，不影响主索引）
│   └── 分析失败用例，降级为只处理 docx（跳过 xlsx/epub）
├── P0 U6 失败（合并后 verify 失败）
│   ├── 数据回滚: cp classics_index.jsonl.bak-pre-merge-* classics_index.jsonl
│   ├── 同理恢复 _manifest.json/embeddings.npy/idf_cache.pkl
│   └── 服务重启
├── P0 U8 失败（生产验证失败）
│   ├── 服务器回滚: cp -r _backup_pre_deploy_*/* ./
│   └── PM2 重启
├── P1 U10 失败（治理破坏 db）
│   ├── 回滚: cp metaphysics.db.bak-g4-* metaphysics.db
│   └── 跳过 G4，不阻塞 P3
├── P3 U15 失败（recall@10 < 0.7）
│   ├── 保留 v2，删除 v3 索引
│   └── 分析失败原因，考虑混合检索
└── P4 U17 失败（主链异常）
    ├── 配置回滚: KNOWLEDGE_INDEX_VERSION=v2
    └── PM2 重启
```

### 9.3 回滚前置条件

- 回滚前必须确认故障范围（P0 数据 vs P3 索引 vs P4 配置）
- 回滚后必须重跑 §8.3 健康检查的 5 个命令
- 生产回滚后必须通知用户，记录到结果单

---

## 10. 未确认项

| # | 项目 | 影响 | 阻断/非阻断 | 建议负责人 |
|---|---|---|---|---|
| 1 | 602 个 docx 中 docx/xlsx/epub 占比未知 | 影响 U2 脚本依赖库选择 | 非阻断（U1 抽样后明确） | 程序员 |
| 2 | 602 个 docx 中扫描件占比未知 | 影响是否需要 OCR | 非阻断（U1 抽样后明确） | 程序员 |
| 3 | 4 个特殊文件内容未知 | 影响 U5 是否能提取可用资产 | 非阻断（U5 探查后明确） | 程序员 |
| 4 | 589 库与当前 587 本重叠度未知 | 影响 P1 决策（全量/部分/不导入） | 非阻断（U9 评估后明确） | 程序员 |
| 5 | 1639 个 PDF 术数占比未知 | 影响 P2 决策（全量/部分/不 OCR） | 非阻断（U12 评估后明确） | 程序员 |
| 6 | 服务器磁盘空间是否够 v3 索引 | 当前 90% 已用，v3 embeddings 约 600MB | **阻断**（P3 启动前确认） | 运维 |
| 7 | BGE-M3 模型下载是否成功 | 影响 P3 能否启动 | **阻断**（P3 启动前确认） | 程序员 |
| 8 | P4 G7 切换是否用户授权 | 影响主链路变更 | **阻断**（P4 启动前确认） | 产品 + 用户 |
| 9 | P1 589 库导入策略 | 影响是否全量导入 | **阻断**（U11 完成后决策） | 产品 + 程序员 |
| 10 | P2 PDF OCR 策略 | 影响是否启动 OCR | **阻断**（U13 完成后决策） | 产品 + 程序员 |

> 阻断项小计：5 项（#6/#7/#8/#9/#10）；非阻断项小计：5 项（#1/#2/#3/#4/#5）。阻断项未确认前不得进入对应阶段。

### 10.1 阻断项处理建议

| 阻断项 | 处理建议 | 处理时机 |
|---|---|---|
| #6 服务器磁盘 | P3 启动前 `ssh aliyun-awkn "df -h"` 确认可用空间；若不足，清理 `/opt/awkn-life/knowledge/processed/_backup_*` | P3 启动前 |
| #7 BGE-M3 下载 | P3 启动前 `ssh aliyun-awkn "ls /opt/awkn-life/models/bge-large-zh/"` 确认；若缺失，先下载 | P3 启动前 |
| #8 G7 用户授权 | P4 启动前必须用户明确说"切换到 v3" | P4 启动前 |
| #9 589 库策略 | U11 完成后向用户汇报质量评估，由用户选择 A/B/C | U11 完成后 |
| #10 PDF OCR 策略 | U13 完成后向用户汇报 OCR 评估，由用户选择 A/B/C | U13 完成后 |

---

## 11. 交接清单

- [ ] 需求范围已确认（执行计划 §0.1 + 盘点报告 §3 + 本文档 §1.1）
- [ ] 接口/字段无编造项（4 个接口签名沿用上次交接文档，新增 /health-v3 辅助接口）
- [ ] 数据库迁移和回滚已说明（§5 数据文件变更 7 个文件 + §9 回滚方案 8 类对象）
- [ ] 测试证据已列出（§6 测试用例 20 条 + verify 脚本断言）
- [ ] 部署路径、服务名、端口已确认（§7 项目技术约束 + §8 部署说明）
- [ ] 未确认项已分级（§10 共 10 项，5 项阻断 + 5 项非阻断）

---

## 11.1 最终判定标准

**PASS 条件**（全部满足）：

```
✅ P0: 611 资产导入完成，生产 5 接口全 PASS
✅ P1: 589 库治理完成，用户决策导入策略
✅ P2: PDF 评估完成，用户决策 OCR 策略
✅ P3: v3 索引 recall@10 ≥ 0.7, precision@10 ≥ 0.6
✅ P4: 主链路切换 v3，24h 监控无 P0
```

**判定结果**：

```
VERDICT: PASS
 知识库扩量 + v3 升级 + G7 切换全部完成。
```

```
VERDICT: BLOCKED
 任一阶段未完成，禁止进入下一阶段。
```

---

## 12. 交接确认

### 12.1 执行人确认

- [ ] 已阅读执行计划
- [ ] 已阅读盘点报告
- [ ] 已理解 P0-P4 执行顺序
- [ ] 已理解与执行计划的 5 项差异（无差异，完全对齐）
- [ ] 已理解回滚方案（§9 八类回滚 + 决策树）
- [ ] 已确认 10 项未确认项中 5 项阻断项的处理方式

### 12.2 老板确认

- [ ] 确认 P0 优先（611 资产导入）
- [ ] 确认 P1/P2 决策点（589 库 + PDF OCR）
- [ ] 确认 P3 v3 升级（BGE-M3）
- [ ] 确认 P4 G7 阻断（需明确授权）

---

**交接文档结束**

**下次遇到类似情况先做 3 件事**：
1. 查看当前状态（`git status` + 目录 LS + manifest CSV）
2. 备份当前版本（代码 `git commit` + 数据 `.bak`）
3. 读取完整文件并确认修改位置（Grep 验证行号，Read 全文）
