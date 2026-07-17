# 人生决策宗师 - 知识库代码索引

> 最后更新：2026-06-05 | 责任人：技术团队
>
> 状态说明：ACTIVE=仍有效 | REFERENCE=历史参考 | DEPRECATED=已废弃 | ARCHIVE=已归档

---

## 总览

| 维度 | 数值 |
|------|------|
| 智能体系统 | 4 |
| 算法工具 | 6 (六壬/六爻/梅花/奇门/紫微/太乙) |
| 数据库 | 6 (.db) |
| 向量库 | 4 (ChromaDB) |
| 知识文件 | 21 (sources) + 21 (preprocessed) |
| 脚本总数 | ~70 |
| 总文件数 | ~200 |

---

## 一、索引表

### 智能体系统 (agents/)

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| agents/case-analyzer/analyzer.py | 命例判案核心分析器 | ACTIVE | — | AI团队 |
| agents/case-analyzer/ml_predictor.py | ML格局预测器 | ACTIVE | — | AI团队 |
| agents/case-analyzer/advanced_similarity.py | 高级相似度计算 | ACTIVE | — | AI团队 |
| agents/case-analyzer/scripts/case_analyzer.py | 命令行入口 | ACTIVE | — | AI团队 |
| agents/case-analyzer/templates/case_report.md | 判案报告模板 | REFERENCE | — | AI团队 |
| agents/case-analyzer/memory/2026-03-21.md | 工作日志 | ARCHIVE | — | AI团队 |
| agents/case-analyzer/README.md | 使用说明 | REFERENCE | — | AI团队 |
| agents/case-importer/ROLE.md | 角色定义 | ACTIVE | — | AI团队 |
| agents/case-importer/SOUL.md | 核心信念 | ACTIVE | — | AI团队 |
| agents/case-importer/agent.prompt | 智能体提示词 | ACTIVE | — | AI团队 |
| agents/case-importer/scripts/extract_from_sources.py | 批量提取命例 | ACTIVE | — | AI团队 |
| agents/ocr-expert/ROLE.md | 角色定义 | ACTIVE | — | AI团队 |
| agents/ocr-expert/SOUL.md | 核心信念 | ACTIVE | — | AI团队 |
| agents/ocr-expert/agent.prompt | 智能体提示词 | ACTIVE | — | AI团队 |
| agents/ocr-expert/scripts/extract_pdf_text.py | PDF文本提取 | ACTIVE | — | AI团队 |
| agents/ocr-expert/scripts/setup_ocr.py | OCR环境配置 | ACTIVE | — | AI团队 |
| agents/ocr-expert/README.md | 使用说明 | REFERENCE | — | AI团队 |
| agents/rag-qa/ROLE.md | 角色定义 | ACTIVE | — | AI团队 |
| agents/rag-qa/SOUL.md | 核心信念 | ACTIVE | — | AI团队 |
| agents/rag-qa/agent.prompt | 智能体提示词 | ACTIVE | — | AI团队 |

### 数据库系统 (database/)

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| database/mingli.db | 命理案例库 | ACTIVE | — | 数据团队 |
| database/liuren.db | 六壬案例库 | ACTIVE | — | 数据团队 |
| database/shensha.db | 神煞数据库 | ACTIVE | — | 数据团队 |
| database/ziwei_cases.db | 紫微斗数案例库 | ACTIVE | — | 数据团队 |
| database/quming_cases.db | 趋命案例库 | ACTIVE | — | 数据团队 |
| database/wuxing.db | 五行数据库 | ACTIVE | — | 数据团队 |
| database/mingli_backup_corrupt.db | 损坏的备份 | DEPRECATED | — | — |
| database/README.md | 数据库说明 | REFERENCE | — | 数据团队 |
| database/schema.sql | 表结构定义 | ACTIVE | — | 数据团队 |
| database/pattern_model.pkl | ML格局预测模型 | ACTIVE | — | AI团队 |
| database/ml_dataset.json | 机器学习数据集 | ACTIVE | — | AI团队 |
| database/case_import_plan.md | 导入计划 | REFERENCE | — | 数据团队 |
| database/case_import_report.md | 导入报告 | REFERENCE | — | 数据团队 |

#### 数据库脚本 (database/scripts/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| create_db.py | 创建命理数据库 | ACTIVE | 数据团队 |
| batch_import_mingli.py | 批量导入命理 | ACTIVE | 数据团队 |
| import_20_examples.py | 导入20条命例 | ACTIVE | 数据团队 |
| import_detailed_examples.py | 导入详细命例 | ACTIVE | 数据团队 |
| extract_detailed_mingli.py | 提取详细命理 | ACTIVE | 数据团队 |
| extract_all_cases.py | 提取所有命例 | ACTIVE | 数据团队 |
| batch_extract_cases.py | 批量提取命例 | ACTIVE | 数据团队 |
| batch_extract_lvy.py | 批量提取吕文艺 | ACTIVE | 数据团队 |
| add_detailed_analysis.py | 添加详细分析 | ACTIVE | 数据团队 |
| expand_examples.py | 扩展命例 | ACTIVE | 数据团队 |
| validate_data.py | 数据验证 | ACTIVE | 数据团队 |
| export_to_excel.py | 导出Excel | ACTIVE | 数据团队 |
| query_examples.py | 查询示例 | ACTIVE | 数据团队 |
| view_cases.py | 查看命例 | ACTIVE | 数据团队 |
| view_analysis.py | 查看分析 | ACTIVE | 数据团队 |
| create_liuyao_db.py | 创建六爻库 | ACTIVE | 数据团队 |
| create_liuren_db.py | 创建六壬库 | ACTIVE | 数据团队 |
| create_shensha_db.py | 创建神煞库 | ACTIVE | 数据团队 |
| create_ziwei_db.py | 创建紫微库 | ACTIVE | 数据团队 |
| create_ziwei_sample_data.py | 创建紫微样例 | ACTIVE | 数据团队 |
| create_liuyao_sample_data.py | 创建六爻样例 | ACTIVE | 数据团队 |
| create_wuxing_db.py | 创建五行库 | ACTIVE | 数据团队 |
| fix_source_info.py | 修复来源信息 | ACTIVE | 数据团队 |
| db_cleanup.py | 数据库清理 | ACTIVE | 数据团队 |
| enhance_pattern_recognition.py | 增强格局识别 | ACTIVE | AI团队 |
| train_pattern_model.py | 训练格局模型 | ACTIVE | AI团队 |
| prepare_ml_data.py | 准备ML数据 | ACTIVE | AI团队 |
| restore_mingli_db.py | 恢复数据库 | REFERENCE | 数据团队 |

### 算法工具 (tools/)

#### 大六壬 (tools/da_liu_ren/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| dlr_core.py | 核心引擎（十二宫/神将/遁干） | ACTIVE | 算法团队 |
| dlr_basic.py | 基础数据 | ACTIVE | 算法团队 |
| dlr_bifa.py | 毕法赋 | ACTIVE | 算法团队 |
| dlr_keti.py | 课体系统 | ACTIVE | 算法团队 |
| dlr_sanchuan.py | 三传系统 | ACTIVE | 算法团队 |
| dlr_sike.py | 四课系统 | ACTIVE | 算法团队 |
| dlr_shensha.py | 神煞系统 | ACTIVE | 算法团队 |
| dlr_tiandi.py | 天地盘系统 | ACTIVE | 算法团队 |
| dlr_yuejiang.py | 月将系统 | ACTIVE | 算法团队 |
| dlr_zhanduan.py | 占断系统 | ACTIVE | 算法团队 |
| test_all.py | 全量测试 | ACTIVE | 算法团队 |
| test_jiuzongmen.py | 九宗门测试 | ACTIVE | 算法团队 |

#### 六爻 (tools/liu_yao/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| ly_core.py | 核心引擎 | ACTIVE | 算法团队 |
| ly_basic.py | 基础数据 | ACTIVE | 算法团队 |
| ly_qigua.py | 起卦方法 | ACTIVE | 算法团队 |
| ly_zhuanggua.py | 装卦系统 | ACTIVE | 算法团队 |
| ly_duangua.py | 断卦系统 | ACTIVE | 算法团队 |
| README.md | 使用说明 | REFERENCE | 算法团队 |

#### 农历干支工具 (tools/lunar_tools/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| lunar_converter.py | 农历转换器 | ACTIVE | 算法团队 |
| ganzhi_calculator.py | 干支计算器 | ACTIVE | 算法团队 |
| shichen_calculator.py | 时辰计算器 | ACTIVE | 算法团队 |
| wuxing_engine.py | 五行引擎 | ACTIVE | 算法团队 |
| zhangsheng_engine.py | 长生十二宫 | ACTIVE | 算法团队 |
| bamen_jiuxing.py | 八门九星 | ACTIVE | 算法团队 |
| test_all.py | 全量测试 | ACTIVE | 算法团队 |

#### 其他算法工具

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| mei_hua/mh_core.py | 梅花易数核心 | ACTIVE | 算法团队 |
| qi_men_dunjia/qmdj_core.py | 奇门遁甲核心 | ACTIVE | 算法团队 |
| qi_men_dunjia/qmdj_api.py | 奇门API | ACTIVE | 算法团队 |
| qi_men_dunjia/qmdj_zhanduan.py | 奇门占断 | ACTIVE | 算法团队 |
| qi_men_dunjia/README.md | 奇门说明 | REFERENCE | 算法团队 |
| tai_yi/ty_core.py | 太乙神数核心 | ACTIVE | 算法团队 |
| zi_wei/zw_core.py | 紫微斗数核心 | ACTIVE | 算法团队 |
| zi_wei/zw_jiepan.py | 紫微解盘 | ACTIVE | 算法团队 |
| zi_wei/zw_api.py | 紫微API | ACTIVE | 算法团队 |
| zi_wei/README.md | 紫微说明 | REFERENCE | 算法团队 |

### 向量系统 (vector/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| vector/chroma_db_cleaned/ | 清洗后向量库（推荐） | ACTIVE | AI团队 |
| vector/chroma_db_optimized/ | 优化后向量库 | ACTIVE | AI团队 |
| vector/chroma_db_quming/ | 趋命向量库 | ACTIVE | AI团队 |
| vector/chroma_db/ | 初始向量库 | DEPRECATED | — |
| vector/knowledge.jsonl | 原始知识 | REFERENCE | AI团队 |
| vector/knowledge_cleaned.jsonl | 清洗后知识 | ACTIVE | AI团队 |
| vector/knowledge_merged.jsonl | 合并后知识 | ACTIVE | AI团队 |
| vector/knowledge_scored.jsonl | 评分后知识 | ACTIVE | AI团队 |
| vector/knowledge_graph.json | 知识图谱 | ACTIVE | AI团队 |
| vector/grouped_points.json | 分组数据 | ACTIVE | AI团队 |
| vector/optimized_points.jsonl | 优化数据 | ACTIVE | AI团队 |
| vector/quming_knowledge.jsonl | 趋命知识 | ACTIVE | AI团队 |

#### 向量脚本 (vector/scripts/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| vectorize_knowledge_simple.py | 简单向量化 | ACTIVE | AI团队 |
| vectorize_cleaned_data.py | 清洗数据向量化 | ACTIVE | AI团队 |
| vectorize_optimized.py | 优化数据向量化 | ACTIVE | AI团队 |
| query_interface.py | 向量检索接口 | ACTIVE | AI团队 |
| rag_generator.py | RAG生成器 | ACTIVE | AI团队 |
| knowledge_graph_builder.py | 知识图谱构建 | ACTIVE | AI团队 |
| semantic_grouping.py | 语义分组 | ACTIVE | AI团队 |
| merge_sentences.py | 句子合并 | ACTIVE | AI团队 |
| split_knowledge_simple.py | 知识切分 | ACTIVE | AI团队 |
| dedup_and_filter.py | 去重过滤 | ACTIVE | AI团队 |
| extract_low_quality.py | 提取低质量 | ACTIVE | AI团队 |
| quality_score.py | 质量评分 | ACTIVE | AI团队 |
| score_optimized.py | 优化评分 | ACTIVE | AI团队 |
| performance_test.py | 性能测试 | ACTIVE | AI团队 |
| performance_monitor.py | 性能监控 | ACTIVE | AI团队 |
| intelligent_reorganize.py | 智能重组 | ACTIVE | AI团队 |

### 知识来源 (sources/ & preprocessed/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| sources/三命通会.md | 明代万民英撰 | ACTIVE | 知识团队 |
| sources/滴天髓*.md | 八字命理经典 | ACTIVE | 知识团队 |
| sources/子平真诠评注.md | 清沈孝瞻 | ACTIVE | 知识团队 |
| sources/图解渊海子平*.md | 渊海子平图解 | ACTIVE | 知识团队 |
| sources/图解干支密码*.md | 干支密码图解 | ACTIVE | 知识团队 |
| sources/子平精粹*.md | 五行大义合集 | ACTIVE | 知识团队 |
| sources/四库存目子平汇刊*.md | 清代命理典籍(8种) | ACTIVE | 知识团队 |
| sources/图解三命通会*.md | 三命通会图解(3种) | ACTIVE | 知识团队 |
| sources/吕文艺-八字命理全集.md | 现代命理丛书 | ACTIVE | 知识团队 |
| sources/命理天书滴天髓详解*.md | PDF转换文本 | ACTIVE | 知识团队 |
| preprocessed/ | 预处理后文件(21个) | ACTIVE | 知识团队 |

### 工具脚本 (scripts/)

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| organize_knowledge.py | 知识整理 | ACTIVE | 数据团队 |
| preprocess_texts.py | 文本预处理 | ACTIVE | 数据团队 |
| import_knowledge_data.py | 导入知识数据 | ACTIVE | 数据团队 |
| extract_pdf_sanming.py | 提取三命通会PDF | ACTIVE | 数据团队 |
| extract_docx_cases.py | 提取docx案例 | ACTIVE | 数据团队 |
| auto_extract_and_import.py | 自动提取导入 | ACTIVE | 数据团队 |
| auto_extract_final.py | 最终自动提取 | ACTIVE | 数据团队 |
| batch_pdf_ocr.py | 批量PDF OCR | ACTIVE | 数据团队 |
| pdf_ocr_processor.py | PDF OCR处理 | ACTIVE | 数据团队 |
| quick_ocr.py | 快速OCR | ACTIVE | 数据团队 |
| setup_tesseract_ocr.py | Tesseract安装 | ACTIVE | 数据团队 |
| check_db_status.py | 检查数据库状态 | ACTIVE | 数据团队 |
| extract_special_chars.py | 特殊字符提取 | ACTIVE | 数据团队 |
| merge_modules.py | 模块合并 | ACTIVE | 数据团队 |
| TESSERACT_SETUP_GUIDE.md | OCR安装指南 | REFERENCE | 数据团队 |
| INSTALL.md | 安装说明 | REFERENCE | 数据团队 |
| requirements.txt | Python依赖 | REFERENCE | 数据团队 |
| extract_texts.py | 通用文本提取 | DEPRECATED | — |
| extract_silent.py | 无声提取 | DEPRECATED | — |
| extract_cases_from_sanming.py | 从三命通会提取 | DEPRECATED | — |
| auto_extract_simple.py | 简单自动提取 | DEPRECATED | — |

### 根目录文档

| 文档路径 | 主题 | 状态 | 责任人 |
|----------|------|------|--------|
| README.md | 项目说明 | REFERENCE | 技术团队 |
| 东方玄学知识库架构设计*.md | 架构文档(5个版本) | REFERENCE | 技术团队 |
| COMPLETION_REPORT.md | 完成报告 | ARCHIVE | 技术团队 |
| DATA_IMPORT_REPORT.md | 数据导入报告 | ARCHIVE | 技术团队 |
| EXTRACTION_REPORT.md | 提取报告 | ARCHIVE | 技术团队 |
| AUTO_EXTRACT_COMPLETE.md | 自动提取完成 | ARCHIVE | 技术团队 |
| 项目复盘报告.md | 项目复盘 | ARCHIVE | 技术团队 |
| 最终优化报告.md | 最终优化 | ARCHIVE | 技术团队 |
| DELIVERY.md | 交付文档 | REFERENCE | 技术团队 |
| 精简说明.md | 精简说明 | REFERENCE | 技术团队 |
| 命理法则索引.md | 法则索引 | REFERENCE | 知识团队 |
| 玄学内容汇总.md | 内容汇总 | REFERENCE | 知识团队 |
| OCR工具对比.md | OCR对比 | REFERENCE | 数据团队 |
| 09-神煞与纳音.md | 神煞纳音章节 | REFERENCE | 知识团队 |

---

## 二、状态统计

| 状态 | 数量 | 占比 |
|------|------|------|
| ACTIVE | ~150 | 75% |
| REFERENCE | ~35 | 17% |
| DEPRECATED | 5 | 3% |
| ARCHIVE | ~10 | 5% |

---

## 三、分类详情

### 3.1 智能体系统

**case-analyzer**（命例判案专家）
- 核心：`analyzer.py`（规则引擎 + ML预测 + 相似度检索）
- ML依赖：`ml_predictor.py`, `pattern_model.pkl`
- 入口：`scripts/case_analyzer.py`

**case-importer**（命例批量录入专家）
- 角色：data_engineer
- 入口：`scripts/extract_from_sources.py`

**ocr-expert**（PDF OCR提取专家）
- 角色：data_engineer special pdf_ocr
- 入口：`scripts/extract_pdf_text.py`

**rag-qa**（RAG命理问答专家）
- 角色：knowledge_expert
- 依赖：ChromaDB + `vector/scripts/rag_generator.py`

### 3.2 算法工具依赖关系

```
lunar_tools/              # 基础：农历转换、干支计算
    ├── da_liu_ren/       # 依赖 lunar_tools
    ├── qi_men_dunjia/    # 依赖 lunar_tools
    ├── tai_yi/           # 依赖 lunar_tools
    └── zi_wei/           # 依赖 lunar_tools

liu_yao/                  # 独立：六爻
mei_hua/                  # 独立：梅花易数

tools/ → agents/case-analyzer → database/
                                → knowledge-base (sources/)
```

### 3.3 数据库 Schema 概览

| 数据库 | 主要表 | 用途 |
|--------|--------|------|
| mingli.db | mingli_examples | 八字命例 |
| liuren.db | liuren_cases | 六壬案例 |
| shensha.db | shensha_table | 神煞总表 |
| ziwei_cases.db | ziwei_cases | 紫微斗数 |
| quming_cases.db | quming_cases | 趋命案例 |
| wuxing.db | wuxing_table | 五行数据 |

### 3.4 向量数据库架构

| 数据库 | 用途 | 推荐度 |
|--------|------|--------|
| chroma_db_cleaned | 清洗后知识（推荐） | ⭐⭐⭐ |
| chroma_db_optimized | 优化后知识 | ⭐⭐ |
| chroma_db_quming | 趋命专用 | ⭐⭐ |
| chroma_db | 初始版本（已废弃） | ⭐ |

---

## 四、核心入口点

| 功能 | 入口文件 | 说明 |
|------|----------|------|
| 命例判案 | `agents/case-analyzer/analyzer.py` | 规则+ML+相似度 |
| 六壬起课 | `tools/da_liu_ren/dlr_core.py` | 十二宫/神将/课体 |
| 六爻占卜 | `tools/liu_yao/ly_core.py` | 起卦/装卦/断卦 |
| 奇门遁甲 | `tools/qi_men_dunjia/qmdj_core.py` | 天地人神四盘 |
| 紫微斗数 | `tools/zi_wei/zw_core.py` | 十四正曜/十二宫 |
| 梅花易数 | `tools/mei_hua/mh_core.py` | 体用/感应 |
| 太乙神数 | `tools/tai_yi/ty_core.py` | 太乙局数 |
| 农历干支 | `tools/lunar_tools/lunar_converter.py` | 公历农历互转 |
| RAG问答 | `vector/scripts/query_interface.py` | 向量检索+生成 |
| 批量导入 | `database/scripts/batch_import_mingli.py` | 命例导入数据库 |
| 知识向量化 | `vector/scripts/vectorize_knowledge_simple.py` | 文本→向量 |

---

## 五、数据流图

```
sources/ (原始Markdown)
    ↓ organize_knowledge.py
preprocessed/ (预处理后)
    ↓ vectorize_*.py
vector/chroma_db_* (向量数据库)
    ↓ query_interface.py / rag_generator.py
AI Agent (检索+生成)

sources/ → extract_*.py → JSON
    ↓ batch_import_*.py
database/*.db (结构化数据)
    ↓ case-analyzer/analyzer.py
命例判案结果
```