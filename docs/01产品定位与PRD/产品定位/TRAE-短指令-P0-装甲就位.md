# TRAE 短指令：P0 装甲就位

> **喂给 TRAE AI 执行。不要扩展全术数 Agent。先执行 P0 装甲就位。**
> **闸门式推进：每步完成后汇报，确认后再执行下一步。不要一口气 T1-T5。**

---

## 任务顺序

### T1：RuleMatcher Lite（最先做，无依赖）

**文件**：`src/consult/orchestrator/rule-matcher/rule-matcher.service.ts`

**关键前置**：
- 引擎在 `src/calc-engine/bazi-calculator-wrapper.ts`（不是 `consult/bazi-engine/`）
- 直接引用 `BaziFullResult` 接口，不要新建 `BaziChart`
- `BaziFullResult` 字段：`daYun`（不是 dayun）、`liuNian`（不是 liunian）、`yearShishen/monthShishen/dayShishen/hourShishen`（4 个独立字段，不是 shishen[]）
- `xingChongHeHai` 已结构化（he/chong/hai/xing），R002-R006 直接读取，不重新算

**做什么**：
1. 创建 `rule-matcher/` 目录，包含 `rule-matcher.service.ts`、`rules/chonghe.rules.ts`、`rules/shishen.rules.ts`、`rules/dayun.rules.ts`、`rules/risk.rules.ts`
2. **第一轮只做 8 条核心规则**（螺旋上升，第二轮补齐 20 条）：
   - R001 夫妻宫冲：双方 `dayPillar[1]` 交叉对比（非 xingChongHeHai）
   - R002 子午冲、R003 卯酉冲：读 `xingChongHeHai.chong`，匹配 relation
   - R007 伤官见官：四柱十神含伤官 + `daYun`/`liuNian` 见正官
   - R008 财星引动：`daYun` + `liuNian` 引动日主财星
   - R012 大运引动夫妻宫：`daYun[].zhi` + `dayPillar[1]`
   - R019 价值观冲突：双方 `dayPillar[0]` 五行相克
   - R020 决策方式冲突：双方四柱十神对比
3. 输入：`{ chartSnapshot: { male: BaziFullResult, female?: BaziFullResult }, questionType: 'marriage_decision', userContext }`
4. 输出：`{ matchedRules: MatchedRule[], summary }`
5. 写 `rule-matcher.spec.ts`：8 条规则各至少 1 个正向 case

**完成后汇报**：
1. 新增/修改文件列表
2. 8 条规则完成情况
3. 测试结果（gc-001 命中 >=3 条？gc-012 命中 >=5 条？）
4. `tsc --noEmit` 结果
5. 是否执行了禁令中的事项（必须为否）
6. **不要继续 T2**，等我确认。

---

### T2：EvidenceComposer Lite（依赖 T1）

**文件**：`src/consult/orchestrator/evidence-composer/evidence-composer.service.ts`

**做什么**：
1. 创建 `evidence-composer/` 目录
2. 实现 `EvidenceComposerService.compose(input)`：
   - 按 severity 分组 matchedRules
   - 计算 rule-based score（evidenceCompleteness + decisionConfidence，**不是 confidence = 命中数/20**）
   - 组装 evidencePackage（含 meta.versions）
3. 实现 L2 规则绑定：创建 `rule-knowledge-bindings.json`，每条规则挂 1-3 个文件引用
   - **fragment 分三种状态：confirmed（可引用）/ placeholder（不可引用）/ disabled（暂不使用）**
   - **placeholder 不得进入 LLM 正文**
4. **不做 L1 文件索引**（推迟到 Spiral 2）
5. **不做 L3 向量检索**
6. 写 `evidence-composer.spec.ts`

**完成后汇报**：
1. 新增/修改文件列表
2. evidencePackage 包含几类证据
3. knowledgeFragments 中 confirmed / placeholder 数量
4. 测试结果
5. `tsc --noEmit` 结果
6. **不要继续 T3**，等我确认。

---

### T3：Prompt 证据包改造（依赖 T2）

**文件**：`src/consult/orchestrator/prompt-layers.ts`

**关键前置**：
- prompt 是 5 层架构（Identity/Capability/Context/Dynamic/Confirmation）
- `agentSummary`（排盘结果）在 Layer 4 Dynamic 的 `buildDynamicLayer` 函数里注入
- evidencePackage 注入点是 **`buildDynamicLayer`**（在 agentSummary 之后追加），不是 `buildCapabilityLayer`
- 不要改 Layer 1/2/3/5

**做什么**：
1. `BuildSystemPromptInput` 新增 `evidencePackage?: EvidencePackage`
2. `DynamicLayerInput` 新增 `evidencePackage?: EvidencePackage`
3. `buildDynamicLayer` 新增分支：
   - 如果 `input.evidencePackage` 存在 → 在 agentSummary 之后追加 `formatEvidencePackage()` 输出（matchedRules + knowledgeFragments + userContext + ruleBasedScore）
   - 如果不存在 → 走旧路径（向后兼容）
4. `buildSystemPromptFromLayers` 把 `evidencePackage` 传给 `buildDynamicLayer`
5. 14 段骨架不变
6. 更新 `prompt-layers.spec.ts`：新增证据包测试 + 旧路径回归

**验收**：
- [ ] 输入 evidencePackage → LLM 输出无"推算八字""我推算出"
- [ ] 输入 evidencePackage → LLM 输出含"根据排盘结果""命中规则""用户现实描述"
- [ ] 输入空 evidencePackage → 走旧路径，行为不变
- [ ] `prompt-layers.spec.ts` 全量通过

---

**完成后汇报**：
1. 新增/修改文件列表
2. 新 prompt 模板是否包含证据包段（命中规则/知识片段/用户描述）
3. 旧路径兼容性测试结果
4. `tsc --noEmit` 结果
5. **不要继续 T4**，等我确认。

---

### T4：AgentRun 日志（依赖 T1/T2，先 JSON log 后 Prisma）

**先不做 Prisma migration。先用 JSON 文件记录 AgentRun。**

**做什么**：
1. 创建 `src/consult/orchestrator/agent-run-log.service.ts`
2. 每次 RuleMatcher/EvidenceComposer 调用后，写入 JSON 日志：
   ```json
   {
     "recordId": "...",
     "agentName": "rulematcher",
     "status": "success",
     "inputJson": "...",
     "matchedRules": [...],
     "outputJson": "...",
     "latencyMs": 12,
     "promptVersion": "v2.0",
     "ruleVersion": "v0.1",
     "timestamp": "2026-06-27T..."
   }
   ```
3. 日志文件路径：`logs/agent-run/agent-run-{date}.jsonl`
4. 后续（Spiral 1）再迁移到 Prisma AgentRun 表

**完成后汇报**：
1. 新增/修改文件列表
2. 日志文件是否正常写入
3. **不要继续 T5**，等我确认。

---

### T5：姻缘 Golden Case 回归（依赖 T3）

**只跑 3-5 条姻缘 case，不跑 20 条全量。**

**做什么**：
1. 用 `mvp0-runner.ts` 跑 gc-001、gc-012 至少 2 条
2. 验证：结构完整（14 段）、不裸算、不乱引古籍、主矛盾稳定、建议可执行
3. 如果失败，回退到旧路径，不阻塞后续

---

## 禁止项（严格执行）

- ❌ 禁止做梅花/六壬/奇门/太乙 Agent
- ❌ 禁止做全量知识库向量化（只做 L1+L2）
- ❌ 禁止做独立 score-engine（用 rule-based lite）
- ❌ 禁止做多 Agent 并行调度
- ❌ 禁止清理 Git dangling 资产
- ❌ 禁止修改 14 段骨架
- ❌ 禁止修改 LLM 模型

---

## 参考文档

- [PRD-00 装甲就位主文档](PRD-00-人生决策宗师-装甲就位-v0.2.md)
- [PRD-00A RuleMatcher Lite](PRD-00A-RuleMatcher-Lite.md)
- [PRD-00B EvidenceComposer Lite](PRD-00B-EvidenceComposer-Lite.md)
- [PRD-00C Prompt 证据包改造](PRD-00C-Prompt-Evidence-Package-改造.md)