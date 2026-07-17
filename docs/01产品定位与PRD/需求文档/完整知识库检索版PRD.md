# 人生决策宗师完整知识库检索版 PRD

## 目标

在“稳定案例级 v1”基础上，新增正式检索证据层，让子平、六壬、取名、人生 K 线的结论都能追溯到算法证据、知识库片段和相似案例，减少 LLM 杜撰，提高复盘与调参效率。

## 核心能力

- 建立资源索引：命理法则、经典摘录、案例、名人八字、六壬课体、神煞、节气月将、冲合刑害。
- 每条知识片段生成 `sourceId`、标题、类别、适用 routeType、关键词、原文/释义、风险等级。
- LLM Gateway 根据算法证据包检索 3-8 条证据，注入 prompt；LLM 只能引用检索到的 `sourceId`。
- 相似案例召回：按格局、日主、月令、大运、课体、三传、问题类型召回案例，作为表达和判断参考。
- 质量看板：LLM 成功率、重试率、JSON 失败率、sourceId 覆盖率、fallback 率、用户反馈。

## 数据接口

- `EvidenceSnippet`: `sourceId/type/title/text/paraphrase/tags/routeType/confidence`
- `RetrievedEvidence`: `query/algorithmTags/snippets/caseRefs`
- `LlmQualityTrace`: `recordId/provider/model/schemaValid/qualityScore/sourceCoverage/retryCount/fallbackReason`

## 实施阶段

1. 离线整理知识库，生成可读 JSON 索引。
2. 接入关键词检索，不先上向量库，保证可控可解释。
3. 将检索结果接入 Ziping/Liuren prompt，并强制 sourceId 校验。
4. 增加相似案例召回和 golden case 自动评测。
5. 后台增加质量日志和用户反馈聚合。

## 验收标准

- 每条核心结论至少 1 个 `sourceId`。
- 子平/六壬 golden case 通过率不低于 85%。
- 经典引用 0 杜撰，未检索到原文时只能写“按知识库释义”。
- 用户可见结论保留“决策参考”边界，不输出绝对化承诺。
