# 知识资产 Git 存储规则

Git 中按资产性质治理，不以“超过阈值就删除”作为统一策略。

| 资产 | Git 策略 | 原因 |
|---|---|---|
| PDF、DOCX、EPUB 等书籍原件 | 不提交 | 二进制原件体积大，已有知识源/归档链路负责保存 |
| JSONL 主索引、恢复数据集、血缘数据库 | 按 24 MiB 上限分片提交 | 数据内容需要版本化，同时避免 GitHub 大文件限制 |
| embeddings、Chroma、SQLite、IDF 缓存 | 不提交 | 可由索引重新生成或属于运行时数据库 |
| `.gz`、部署包、临时备份 | 不提交 | 与源数据重复，可按需重新生成 |
| manifest、统计与质量报告 | 提交 | 体积小，用于追溯、验收和重建 |

## 当前分片数据集

- `processed/classics_index.parts/`：主检索数据库。
- `processed/recovered_import.parts/`：恢复导入数据集；其中仍有未进入主库的独立记录，不能删除。
- `asset-ledger/source-lineage.parts/`：逐 passage 血缘数据库。

每个目录的 `manifest.json` 记录分片大小、行数、单片 SHA-256 和完整数据集 SHA-256。使用以下命令验证分片可无损重组：

```powershell
python scripts/verify_jsonl_parts.py knowledge/processed/classics_index.parts
python scripts/verify_jsonl_parts.py knowledge/processed/recovered_import.parts
python scripts/verify_jsonl_parts.py knowledge/asset-ledger/source-lineage.parts
```

知识服务优先读取部署环境中的单体 `classics_index.jsonl`；单体不存在时，自动按序读取 Git 分片。
