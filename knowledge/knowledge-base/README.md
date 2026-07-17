# 命理知识库

## 项目简介

本知识库包含命理相关的知识体系，包括八字、六壬、奇门等多种命理流派的理论和实践。

## 目录结构

- `agents/` - 智能体相关文件（case-analyzer / case-importer / ocr-expert / rag-qa）
- `database/` - 数据库文件和脚本（mingli.db / liuren.db / shensha.db / ziwei_cases.db / quming_cases.db / liuyao_cases.db）
- `preprocessed/` - 预处理后的文本文件（21 部典籍 .md + .passages.json）
- `scripts/` - 工具脚本（OCR / 批量提取 / 导入 / 数据库管理）
- `sources/` - 原始资料（21 部典籍 .md + .meta.json）
- `tools/` - 命理工具库（六壬/六爻/梅花/奇门/紫微/太乙 + 农历/干支/五行引擎）
- `vector/` - 向量数据库（4 个 ChromaDB 实例 + RAG 脚本 + 质量评分）

## 核心功能

1. **知识管理** - 收集、整理和存储命理相关知识
2. **案例分析** - 分析命理案例（case-analyzer 智能体 + ML 格局预测）
3. **数据库管理** - 管理命理数据（6 个 SQLite 数据库）
4. **向量搜索** - 基于向量的知识检索（ChromaDB + RAG）
5. **命理计算** - 六壬/六爻/梅花/奇门/紫微/太乙 排盘与断卦

## 后端集成状态（2026-06-05 更新）

| 知识库组件 | 后端集成 | 说明 |
|-----------|---------|------|
| tools/da_liu_ren | ✅ 已集成 | liuren-agent 调用 |
| tools/liu_yao | ✅ 已集成 | liuyao-agent 调用 |
| tools/qi_men_dunjia | ✅ 已集成 | qimen-agent 调用 |
| tools/zi_wei | ✅ 已集成 | 紫微斗数排盘 |
| tools/lunar_tools | ✅ 已集成 | 干支/农历/真太阳时计算 |
| tools/mei_hua | ⚠️ 部分 | 梅花易数工具 |
| tools/tai_yi | ⚠️ 部分 | 太乙神数工具 |
| database/mingli.db | ✅ 已集成 | 八字命例库 |
| database/liuren.db | ✅ 已集成 | 六壬案例库 |
| database/shensha.db | ✅ 已集成 | 神煞数据库 |
| vector/chroma_db | ✅ 已集成 | RAG 检索（consult service） |
| agents/case-analyzer | ⚠️ 独立 | Python 智能体，未直接集成 NestJS |
| agents/rag-qa | ⚠️ 独立 | RAG 问答智能体，未直接集成 NestJS |

### 服务器部署

| 组件 | 位置 | 说明 |
|------|------|------|
| 后端 API | `/opt/awkn-life/awkn-life-backend/` | NestJS :3002 |
| 知识库 | 本地开发环境 | Python 3.14+ |
| 向量库 | 本地 ChromaDB | 4 实例 |
| 数据库 | 后端 Prisma SQLite | prod.db 472KB |

> **注意**：knowledge-base 中的 Python 工具和智能体目前仅在本地开发环境运行，未部署到阿里云服务器。后端 NestJS 通过内置的 calc-engine 模块调用算法（TypeScript 重写版），不直接调用 Python 脚本。

## 依赖项

- Python 3.14+
- SQLite
- Tesseract OCR (用于PDF文本提取)
- ChromaDB (向量数据库)
- scikit-learn (ML 格局预测)

## 许可证

本项目仅供学习和研究使用。