# 多轮对话整改 PRD — 批判性分析与重构方案

> 文档版本：v1.0
> 创建日期：2026-06-20
> 作者：天火（批判性分析 + PRD 生成）
> 状态：待评审

---

## 一、背景

### 1.1 触发原因

用户要求对标多轮对话 PRD（`prd-multi-turn-conversation-vl.md`）批判性分析"人生决策宗师"项目现状。该目标 PRD 文件未找到，故以**多轮对话工程最佳实践**为对标基准，结合项目深度调研结果，直接产出批判性分析与整改 PRD。

### 1.2 调研方法

- 全仓库只读扫描（后端 NestJS + 前端 React + 文档 + 测试）
- 7 维度深度调研：对话编排、上下文管理、追问机制、LLM 调用层、记忆持久化、安全护栏、测试覆盖
- 关键源码逐行验证（dialogue.service.ts、followup.service.ts、orchestrator.service.ts 等）

---

## 二、批判性分析（对标最佳实践）

### 2.1 总体诊断：**能力存在但未落地，设计过度而验证不足**

项目在多轮对话上投入了大量设计成本（6态状态机、9节点状态机、7类记忆、5层Prompt），但这些能力**几乎全部处于关闭状态**（Feature Flag 默认 off），且存在**架构割裂、上下文失控、追问低智、测试空白**四大硬伤。

| 维度 | 现状 | 成熟度 | 批判性结论 |
|------|------|--------|-----------|
| 对话编排 | 双轨制，多轮默认关闭 | ★★★☆☆ | 设计过度，两套状态机并存却都未验证 |
| 上下文管理 | 无压缩，硬截断 | ★★☆☆☆ | **最严重短板**，长对话必崩 |
| 追问机制 | 三套并存，长度触发 | ★★★☆☆ | 触发逻辑根本性错误 |
| LLM 调用层 | 多Provider+Failover+流式 | ★★★★★ | 唯一亮点，无需大改 |
| 记忆持久化 | 7类结构化，无向量检索 | ★★★★☆ | 存得进取不出 |
| 安全护栏 | 输入+输出+危机干预 | ★★★★☆ | 较完善，但多轮路径绕过了质量门 |
| 测试覆盖 | 20+测试，多轮空白 | ★★★☆☆ | 核心功能零覆盖 |

### 2.2 逐维度批判

#### 维度一：对话状态管理 — 设计债务

**现状**：存在两套状态机：
- 6态状态机（[dialogue.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/dialogue/dialogue.service.ts#L9)）：`IDLE → SCHEDULING → CLARIFYING → GENERATING → RESPONDING → COMPLETED`
- 9节点状态机（[node-state-machine.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/node-state-machine.service.ts)）：`cold_start → first_issue → ... → long_memory_update`

**批判**：
1. **两套状态机职责重叠**：6态管对话宏观流程，9节点管微观节点流转，但两者没有清晰的边界定义和协同协议。实际运行中 DialogueService 的 `currentNode` 与 NodeStateMachine 的节点是两套独立逻辑。
2. **GENERATING 死锁前科**：注释显示 2026-06-17 P0 修复前，GENERATING 状态"没有任何代码调用 LLM 或推进状态"——这说明状态机未经压力测试就上线（虽然默认关闭）。
3. **默认关闭 = 设计沉没成本**：投入了状态机设计但不敢启用，说明对正确性没有信心。

**结论**：应合并为单一状态机，删除未验证的冗余设计。

#### 维度二：上下文管理 — 定时炸弹

**现状**：
- 多轮对话：[dialogue.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/dialogue/dialogue.service.ts) `generateAnswer` **全量传递** turns 给 LLM，无截断、无压缩
- 追问：[followup.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/followup/followup.service.ts) 硬编码 `context.slice(-6)`，无重要性排序
- 无 Token 计数预检

**批判**：
1. **全量传递 = 必然超限**：张半山的单轮回复约 1500-2000 token，5 轮对话累计 10000+ token，加上 5 层 Prompt（~2150 token），轻松超过经济模型的上下文窗口。
2. **slice(-6) 是暴力截断**：最近 6 条不一定是最重要的。用户在第 1 轮提供的生辰八字是关键信息，但会被截断丢弃。
3. **无 Token 预检 = 运行时炸雷**：不预先计算 Token 数，依赖 LLM Provider 自身截断，可能导致回复不完整或报错。
4. **多轮与追问策略不一致**：一个全量、一个截断 6 条，同一项目的上下文管理策略割裂。

**结论**：这是阻碍多轮对话启用的**第一硬伤**。必须实现 Token-aware 滑动窗口 + 对话摘要压缩。

#### 维度三：追问机制 — 根本性设计错误

**现状**：三套追问逻辑并存：
- DialogueService.shouldClarify：问题长度 < 10 字符 或 含模糊词且 < 20 字符
- ZhangbanshanScheduler.synthesizeByNode(1/2)：LLM 生成问句
- FollowupService.handleFollowup：基于 recordId 的结果页追问

**批判**：
1. **字符长度 ≠ 信息完整性**：这是最根本的设计错误。
   - "我该不该辞职"（6字）→ 信息明确，不需要追问
   - "那个事情怎么样了你觉得好不好"（15字）→ 信息模糊，需要追问
   - 用长度判断，前者会被误判为需要追问，后者不会
2. **三套追问无统一抽象**：DialogueService、Scheduler、FollowupService 各自实现追问触发和话术生成，逻辑分散，维护成本高。
3. **追问话术无质量门**：单轮有 5 层质量门 + 护栏，但追问生成的问句没有任何质量校验。
4. **追问次数硬限制**：3 次后触发付费墙，无弹性机制（会员等级、问题复杂度差异化）。

**结论**：追问触发应基于**信息完整性评估**（槽位填充 + 意图清晰度），而非字符长度。

#### 维度四：LLM 调用层 — 唯一亮点

**现状**：6 Provider + 并行竞速 + Failover + 流式 + 5层Prompt + 超时降级

**批判**：
1. **整体优秀**，无需大改
2. **小问题**：并行竞速浪费成本（失败 Provider 仍计费）；无智能 Provider 选择
3. **多轮路径绕过质量门**：DialogueService.generateAnswer 直接调 `llmProviders.chatStream`，跳过了 Orchestrator 的路由→调度→证据包→质量门完整管线

**结论**：LLM 调用层保持不变，但多轮对话必须接入完整管线。

#### 维度五：记忆系统 — 存得进取不出

**现状**：7类结构化记忆（major_issue / time_anchor / person_anchor / bottom_line / repeat_pattern / mood_signal / feedback），SimHash 去重，但检索仅关键词 + 2-gram

**批判**：
1. **检索能力不匹配存储设计**：7类记忆设计完善，但检索只能靠关键词匹配。"用户三个月前问过跳槽"和"用户最近在考虑换工作"语义相同但关键词不同，检索不到。
2. **无向量检索 = 记忆失效**：这是记忆系统的核心缺陷。
3. **对话历史存为 JSON 字符串**：`ConsultDialogue.turns` 是 JSON 字符串，无法高效查询、索引、分析。
4. **无记忆遗忘机制**：`expiresAt` 字段存在但无清理任务，记忆只增不减。
5. **用户画像缓存无 TTL**：`cache: Map<string, ClassificationResult>` 永不过期，内存泄漏风险。

**结论**：记忆系统需要引入 embedding 向量检索，对话历史需要独立表结构。

#### 维度六：安全护栏 — 单轮完善，多轮裸奔

**现状**：输入有高风险检测 + 危机干预，输出有 Guardrail（P-01~P-04）+ 质量门（5层校验）

**批判**：
1. **单轮路径完善**：Orchestrator 完整管线包含高风险检测 → 路由 → 质量门 → 护栏
2. **多轮路径裸奔**：DialogueService.generateAnswer 直接调 LLM，**跳过了全部安全检查**。多轮对话中用户可能逐步引导 LLM 输出违规内容（Prompt 注入的渐进式攻击）。
3. **无 Prompt 注入防护**：用户输入直接拼入 prompt，未做消毒。
4. **危机干预仅关键词**：无情绪强度评估，可能漏判隐性危机。

**结论**：多轮对话必须接入与单轮一致的安全护栏。

#### 维度七：测试覆盖 — 核心功能零覆盖

**现状**：20+ 测试文件覆盖单轮管线，但 DialogueService **无单元测试**，无多轮集成测试。

**批判**：
1. **核心功能零测试**：多轮对话是核心差异化能力，却没有任何测试。
2. **死锁前科印证**：GENERATING 死锁 bug 正是因为无测试才未被发现。
3. **E2E 用 Mock LLM**：`pipeline-e2e.spec.ts` 使用 mock 返回，未验证真实 LLM 行为。

**结论**：多轮对话必须有完整的单元测试 + 集成测试 + 真实 LLM 冒烟测试。

---

## 三、整改目标

### 3.1 北极星指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 多轮对话可用性 | 默认关闭 | 灰度 10% → 全量 |
| 上下文 Token 控制 | 无限制 | 单轮 ≤ 4000 token，10轮 ≤ 8000 token |
| 追问准确率 | 不可量化 | 信息不足检出率 ≥ 85%，误追问率 ≤ 15% |
| 多轮对话测试覆盖 | 0% | 核心路径 ≥ 70% |
| 多轮输出质量门 | 无 | 与单轮一致（5层校验 + 护栏） |

### 3.2 整改原则

1. **统一架构**：合并双轨状态机，多轮对话接入 Orchestrator 完整管线
2. **上下文可控**：Token-aware 滑动窗口 + 对话摘要压缩
3. **追问智能化**：基于槽位填充的信息完整性评估，替代字符长度判断
4. **安全一致**：多轮路径接入与单轮一致的安全护栏
5. **测试先行**：核心路径 TDD，先补测试再重构

---

## 四、详细设计

### 4.1 统一对话状态机（合并 6态 + 9节点）

**目标**：一套状态机管全流程，删除冗余设计。

```
INIT → COLLECTING → REASONING → DELIVERING → FOLLOWUP → CLOSED
```

| 状态 | 职责 | 退出条件 |
|------|------|----------|
| INIT | 接收用户问题，初始化对话 | 问题入库 |
| COLLECTING | 槽位填充，信息不足则追问 | 所有必填槽位已填充 |
| REASONING | 调用 Orchestrator 完整管线推演 | 推演完成或超时降级 |
| DELIVERING | 输出结果，质量门校验 | 质量门通过 |
| FOLLOWUP | 用户追问，上下文压缩 | 追问次数耗尽或用户结束 |
| CLOSED | 对话归档，记忆提取 | — |

**关键变更**：
- 删除 6态状态机的 GENERATING/RESPONDING（合并到 REASONING/DELIVERING）
- 删除 9节点状态机（节点逻辑下沉为 COLLECTING/REASONING 阶段的内部步骤）
- `NodeStateMachineService` 标记 deprecated

### 4.2 上下文工程（Token-aware 滑动窗口 + 摘要压缩）

**目标**：10轮对话 Token 可控，关键信息不丢失。

#### 4.2.1 滑动窗口策略

```
上下文 = SystemPrompt(固定) + 摘要(动态) + 最近N轮(滑动) + 当前问题
```

- **SystemPrompt**：5层 Prompt 架构（~2150 token，保持不变）
- **摘要**：超过 3 轮后，将前 N-3 轮压缩为摘要（≤ 500 token）
- **最近 N 轮**：保留最近 3 轮完整对话（~1500 token）
- **当前问题**：用户最新输入

#### 4.2.2 Token 计数预检

```typescript
interface ContextBudget {
  systemPrompt: number;     // ~2150
  summary: number;          // ≤500
  recentTurns: number;      // ≤1500
  currentUserInput: number;
  total: number;            // ≤4000 (经济模型窗口的 80%)
}
```

- 每次 LLM 调用前计算 Token 数
- 超预算时自动压缩（增加摘要轮数，减少 recentTurns）
- 使用 `tiktoken` 或 `gpt-tokenizer` 做本地 Token 计数

#### 4.2.3 对话摘要生成

- 触发条件：对话轮数 > 3
- 摘要内容：用户核心诉求 + 已提供的关键信息 + 张半山已给出的判断要点
- 摘要频率：每 3 轮生成一次
- 摘要存储：`ConsultDialogue.summary` 字段（新增）

### 4.3 追问智能化（槽位填充 + 信息完整性评估）

**目标**：基于信息完整性判断是否追问，替代字符长度。

#### 4.3.1 槽位定义

按咨询类型定义必填槽位：

| 咨询类型 | 必填槽位 |
|----------|----------|
| 事业决策 | 问题领域、当前处境、核心矛盾、时间紧迫度 |
| 感情决策 | 关系状态、核心矛盾、当事人态度、用户期望 |
| 财富决策 | 决策类型（投资/消费/储蓄）、金额量级、风险偏好 |
| 健康决策 | 症状描述、持续时间、已采取措施、就医情况 |

#### 4.3.2 信息完整性评估

```typescript
interface CompletenessAssessment {
  filledSlots: string[];      // 已填充槽位
  missingSlots: string[];     // 缺失槽位
  clarityScore: number;       // 意图清晰度 0-1
  needsClarification: boolean;
  clarifyingTarget: string;   // 追问目标槽位
}
```

- **槽位提取**：LLM 轻量调用（经济模型，≤ 200 token 输出）
- **意图清晰度**：基于问题是否包含明确动词 + 明确对象
- **追问决策**：缺失必填槽位 或 clarityScore < 0.6 时追问

#### 4.3.3 统一追问服务

合并三套追问逻辑为 `ClarificationService`：
- `assessCompleteness(question, dialogueHistory)` → 评估信息完整性
- `generateClarifyingQuestion(missingSlot, context)` → 生成追问话术
- `shouldContinueClarifying(userReply, missingSlot)` → 判断是否继续追问

### 4.4 多轮对话接入完整管线

**目标**：多轮对话的每一轮都经过与单轮一致的安全 + 质量保障。

```
多轮对话每轮流程：
用户输入 → 高风险检测 → 槽位评估 → (追问 / 推演) → 质量门 → 护栏 → 输出
```

**关键变更**：
- DialogueService.generateAnswer 不再直接调 `llmProviders.chatStream`
- 改为调用 `OrchestratorService.processTurn()`（新增方法）
- `processTurn` 复用单轮管线的高风险检测 + 路由 + 调度 + 质量门 + 护栏

### 4.5 记忆系统增强

#### 4.5.1 向量检索（Phase 2）

- 新增 `MemoryEmbedding` 表：`memoryId, embedding(vector), createdAt`
- 记忆写入时同步生成 embedding
- 检索时用 cosine similarity topK
- embedding 模型：本地 sentence-transformers 或 API（如 OpenAI text-embedding-3-small）

#### 4.5.2 对话历史独立表

```prisma
model ConsultDialogueTurn {
  id          String   @id @default(cuid())
  dialogueId  String
  role        String   // user | zhangbanshan
  content     String
  node        Int?
  tokenCount  Int?
  createdAt   DateTime @default(now())
  dialogue    ConsultDialogue @relation(fields: [dialogueId], references: [id])
}
```

- 替代 `ConsultDialogue.turns` JSON 字符串
- 支持高效查询、索引、分页

#### 4.5.3 记忆遗忘机制

- 定时任务（每日）：清理 `expiresAt < now()` 的记忆
- 衰减策略：30天未命中的记忆降低权重，90天未命中归档

### 4.6 安全护栏增强

#### 4.6.1 多轮路径接入护栏

- COLLECTING 阶段：用户每次输入都过高风险检测
- DELIVERING 阶段：每次输出都过质量门 + 护栏
- FOLLOWUP 阶段：追问输入过 Prompt 注入检测

#### 4.6.2 Prompt 注入防护

- 用户输入消毒：过滤 `ignore previous`、`you are`、`system:` 等注入模式
- 输入长度限制：单条 ≤ 2000 字符
- 多轮累积检测：检测用户是否在多轮中逐步引导 LLM 偏离角色

---

## 五、实施计划

### Phase 1：上下文工程 + 测试补齐（P0，解除启用阻断）

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| T1.1 实现 Token 计数预检（tiktoken 集成） | P0 | 无 |
| T1.2 实现滑动窗口上下文构建器 | P0 | T1.1 |
| T1.3 实现对话摘要压缩（3轮触发） | P0 | T1.2 |
| T1.4 补齐 DialogueService 单元测试（≥ 70%） | P0 | 无 |
| T1.5 补齐多轮对话集成测试（dialogue + orchestrator） | P0 | T1.4 |
| T1.6 统一追问与多轮的上下文策略 | P0 | T1.2 |

**验收**：10轮对话 Token ≤ 8000，DialogueService 测试覆盖 ≥ 70%

### Phase 2：追问智能化 + 安全一致（P1）

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| T2.1 定义咨询类型槽位 schema | P1 | 无 |
| T2.2 实现信息完整性评估服务 | P1 | T2.1 |
| T2.3 实现统一追问服务（合并三套逻辑） | P1 | T2.2 |
| T2.4 多轮对话接入 Orchestrator 完整管线 | P1 | Phase 1 |
| T2.5 多轮路径接入质量门 + 护栏 | P1 | T2.4 |
| T2.6 实现 Prompt 注入防护 | P1 | 无 |

**验收**：追问基于槽位填充，多轮输出经过质量门

### Phase 3：状态机统一 + 灰度启用（P1）

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| T3.1 设计统一状态机（合并 6态 + 9节点） | P1 | Phase 2 |
| T3.2 迁移 DialogueService 到新状态机 | P1 | T3.1 |
| T3.3 标记 NodeStateMachineService deprecated | P1 | T3.2 |
| T3.4 灰度启用多轮对话（1% → 10% → 50% → 100%） | P1 | T3.2 |

**验收**：单一状态机，多轮对话灰度 10%

### Phase 4：记忆系统增强（P2）

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| T4.1 新增 ConsultDialogueTurn 表，迁移 turns JSON | P2 | Phase 3 |
| T4.2 集成 embedding 模型，新增 MemoryEmbedding 表 | P2 | 无 |
| T4.3 记忆检索改为向量 + 关键词混合 | P2 | T4.2 |
| T4.4 实现记忆遗忘定时任务 | P2 | 无 |
| T4.5 用户画像缓存加 TTL | P2 | 无 |

**验收**：记忆向量检索可用，对话历史独立表

### Phase 5：可观测性 + 成本优化（P2）

| 任务 | 优先级 | 依赖 |
|------|--------|------|
| T5.1 多轮对话指标埋点（轮次分布/追问率/Token消耗） | P2 | Phase 3 |
| T5.2 LLM 调用成本看板（单轮 vs 多轮对比） | P2 | T5.1 |
| T5.3 智能 Provider 选择（按问题类型路由） | P2 | 无 |
| T5.4 追问次数弹性机制（会员等级差异化） | P2 | Phase 2 |

**验收**：多轮对话可观测，成本可量化

---

## 六、验收标准

### 6.1 Phase 1 验收（解除启用阻断）

- [ ] 10轮对话累计 Token ≤ 8000（经济模型窗口内）
- [ ] 第 1 轮用户提供的关键信息在第 10 轮仍可通过摘要保留
- [ ] DialogueService 单元测试覆盖 ≥ 70%
- [ ] 多轮对话集成测试通过（dialogue + orchestrator 联调）
- [ ] 追问与多轮的上下文策略统一（同一构建器）

### 6.2 Phase 2 验收（追问智能化 + 安全一致）

- [ ] 追问触发基于槽位填充，不再基于字符长度
- [ ] "我该不该辞职"（6字）不被误追问
- [ ] 多轮对话每轮输出经过质量门 + 护栏
- [ ] Prompt 注入防护生效（`ignore previous` 等模式被过滤）

### 6.3 Phase 3 验收（状态机统一 + 灰度）

- [ ] 单一状态机，无 6态/9节点双轨
- [ ] NodeStateMachineService 标记 deprecated
- [ ] 多轮对话灰度 10%，无死锁/异常
- [ ] 灰度用户的多轮对话成功率 ≥ 95%

### 6.4 上线 Go/No-Go 清单

| 检查项 | 状态 |
|--------|------|
| 上下文 Token 可控（≤ 8000/10轮） | ☐ |
| 多轮测试覆盖 ≥ 70% | ☐ |
| 多轮路径接入质量门 + 护栏 | ☐ |
| 追问基于信息完整性 | ☐ |
| 单一状态机 | ☐ |
| 灰度 10% 验证通过 | ☐ |

---

## 七、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 摘要压缩丢失关键信息 | 追问断链 | 摘要保留必填槽位值，质量门校验摘要完整性 |
| 槽位定义不覆盖所有场景 | 追问失效 | 灰度期收集未覆盖场景，迭代槽位 schema |
| 向量检索引入新依赖 | 架构复杂度 | Phase 4 再做，Phase 1-3 不依赖 |
| 状态机迁移破坏现有功能 | 回归 bug | 迁移前补齐测试，灰度启用 |
| 多轮成本高于单轮 | 成本超支 | Token 预算控制 + 摘要减少 prompt 长度 |

---

## 八、附录

### 8.1 关键文件索引

| 模块 | 文件 |
|------|------|
| 多轮对话 | [dialogue.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/dialogue/dialogue.service.ts) |
| 追问服务 | [followup.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/followup/followup.service.ts) |
| 主编排器 | [orchestrator.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/orchestrator.service.ts) |
| 9节点状态机 | [node-state-machine.service.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/node-state-machine.service.ts) |
| LLM Provider | [llm-providers.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/llm-providers/llm-providers.service.ts) |
| 用户记忆 | [user-memory.service.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/memory/user-memory.service.ts) |
| 质量门 | [quality-gate.service.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/quality-gate.service.ts) |
| 护栏 | [guardrail.service.ts](file:///c:/Users/10919/Desktop/AWKW-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/guardrails/guardrail.service.ts) |
| 数据库 Schema | [schema.prisma](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/schema.prisma) |

### 8.2 现状调研报告摘要

详见调研 Sub-Agent 输出（已嵌入本 PRD 第二节批判性分析）。

### 8.3 术语表

| 术语 | 含义 |
|------|------|
| 槽位填充 | 从用户输入中提取结构化信息字段 |
| 滑动窗口 | 只保留最近 N 轮对话，旧轮次压缩为摘要 |
| Token 预算 | 单次 LLM 调用的最大 Token 限制 |
| 信息完整性 | 用户输入是否包含推演所需的全部必填信息 |
| Prompt 注入 | 用户通过精心构造的输入操纵 LLM 偏离角色 |
