> **状态**: REFERENCE | **权威替代**: — | **最后核验**: 2026-06-05

# LLM 与 Agent 模块

## 模块总览

LLM 网关与 Agent 模块是系统的语义分析层，负责多 Provider 管理、Agent 调度、提示词工程、质量监控与降级容错。

| 子模块 | 路径 | 职责 |
|--------|------|------|
| LLM Gateway | `src/llm-gateway/` | 多 Agent 调度与结果标准化 |
| LLM Providers | `src/llm-providers/` | 多 Provider 调用与降级 |
| Liuren Agent | `src/liuren-agent/` | 大六壬语义分析 |
| Liuyao Agent | `src/liuyao-agent/` | 六爻语义分析 |
| Qimen Agent | `src/qimen-agent/` | 奇门遁甲语义分析 |
| Quming Agent | `src/quming-agent/` | 取名语义分析 |
| Ziping Agent | `src/ziping-agent/` | 子平八字语义分析 |
| Ziwei Agent | `src/ziwei-agent/` | 紫微斗数语义分析 |
| Shared | `src/shared/` | 共享基础设施 |

---

## 1. LLM Gateway 服务

### 文件路径

| 文件 | 路径 |
|------|------|
| LlmGatewayService | `src/llm-gateway/llm-gateway.service.ts` |
| LlmGatewayModule | `src/llm-gateway/llm-gateway.module.ts` |

### 架构定位

LlmGatewayService 是所有 Agent 的统一调度层，接收 CalcEngine 的算法结果 + 用户输入，分发给对应 Agent 进行语义分析，并标准化输出格式。

### 输入结构

```typescript
interface GatewayInput {
  routeType: 'ziping' | 'liuren' | 'clarify' | 'quming' | 'qimen' | 'liuyao' | 'ziwei';
  calcResult?: any;
  inputData?: {
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: 'male' | 'female';
    askTime?: string;
    askLocation?: string;
    question?: string;
    surname?: string;
    parentWish?: string;
    avoidChars?: string[];
  };
  lang?: string;
}
```

### 输出结构（GatewayOutput）

GatewayOutput 是所有路由类型的统一输出格式，包含通用字段和路由专属字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `summary_line` | `string` | 一句话总断 |
| `summary_body` | `string` | 详细分析 |
| `one_line_conclusion` | `string?` | 一句准话 |
| `risks` | `string[]` | 风险列表 |
| `actions` | `string[]` | 行动建议 |
| `time_window` | `string` | 时间窗口 |
| `evidence_fold` | `string` | 证据折叠 |
| `paywall_modules` | `string[]` | 付费模块标记 |
| `llm_fallback` | `boolean` | 是否降级 |
| `route_type` | `string` | 路由类型 |
| `qualityScore` | `number?` | 质量评分 (0-100) |
| `schemaValid` | `boolean?` | Schema 验证 |
| `provider` | `string?` | 实际使用的 Provider |
| `model` | `string?` | 实际使用的模型 |
| `retryCount` | `number?` | 重试次数 |
| `algorithmEvidence` | `AlgorithmEvidencePacket?` | 算法证据包 |

### 路由专属字段

| routeType | 专属字段 |
|-----------|----------|
| `ziping` | `classicAnalysis`, `daYunTheme`, `keyYearPhenomenon`, `futureYearsRhythm`, `modules`, `modulesRating`, `decisionAudit`, `mvpPlan`, `stopDoingList`, `partnerPortrait`, `guardianGuidance` |
| `liuren` | `课体`, `三传`, `coreReasoning`, `keySignals`, `timeWindows`, `action_strategy`, `counterpartPortrait`, `threeLayerAdvice`, `phasedCalendar`, `scripts`, `proposalVersions` |
| `quming` | `bazi`, `wuxing_analysis`, `xi_yong_shen`, `name_suggestions` |
| `qimen` | `coreReasoning`, `keySignals`, `timeWindows`, `action_strategy` |

### 质量评分机制

```
基础分 = schemaValid ? 60 : 35
+ summary_line ≤ 40字: +8
+ summary_body ≥ 60字: +8
+ 有证据标签: +10
+ risks ≥ 2: +7
+ actions ≥ 2: +7
+ 路由专属加分（如 ziping 有 classicAnalysis: +8）
+ 一句话总断质量加分（排比结构、行动指向）
- 空泛词扣分（"保持努力"、"未来可期"等: -15）
- llm_fallback: -20
最终: Math.max(0, Math.min(100, score))
```

### 降级策略

当 LLM 调用失败时，Gateway 返回基于算法证据的简版结论：

```
算法证据包构建 → 提取关键标签 → 生成保守结论
  → qualityScore = 45
  → provider = 'fallback'
  → model = 'algorithm-template'
```

---

## 2. LLM Providers 服务

### 文件路径

| 文件 | 路径 |
|------|------|
| LlmProvidersService | `src/llm-providers/llm-providers.service.ts` |
| LlmProvidersModule | `src/llm-providers/llm-providers.module.ts` |

### 支持的 Provider

| Provider | API 基地址 | 默认模型 | 环境变量 |
|----------|-----------|----------|----------|
| `sensenova` | `https://token.sensenova.cn/v1` | `deepseek-v4-flash` | `SENSENOVA_API_KEY` |
| `deepseek-direct` | `https://api.deepseek.com/v1` | `deepseek-v4-pro` | `DEEPSEEK_DIRECT_API_KEY` |
| `doubao` | `https://ark.cn-beijing.volces.com/api/v3` | `ep-20260426223838-l8sv4` | `DOUBAO_API_KEY` |
| `minimax` | `https://api.minimaxi.com/v1` | `MiniMax-M2.7` | `MINIMAX_API_KEY` |
| `deepseek` | `https://ark.cn-beijing.volces.com/api/v3` | `deepseek-chat` | `DEEPSEEK_API_KEY` |

**默认 Provider**: `sensenova`（可通过 `DEFAULT_LLM_PROVIDER` 环境变量覆盖）

### 核心接口

#### chat()

```typescript
async chat(
  messages: LlmMessage[],
  provider?: LlmProviderType,
  options?: LlmOptions,
): Promise<LlmResponse>
```

直接调用指定 Provider，不进行降级。

#### chatWithUser()

```typescript
async chatWithUser(
  userMessage: string,
  systemPrompt: string,
  provider?: LlmProviderType,
  options?: LlmOptions,
  routeType?: string,
  retryCount?: number,
): Promise<LlmResponse>
```

高级接口，支持指定 Provider 或自动降级。

#### chatWithFallback()

```typescript
async chatWithFallback(
  messages: LlmMessage[],
  options?: LlmOptions,
  routeType?: string,
): Promise<LlmResponse>
```

自动降级接口，按优先级依次尝试所有已配置的 Provider，直到成功或全部失败。

### 降级链路

```
defaultProvider → deepseek → sensenova → doubao → minimax → deepseek-direct
（仅尝试已配置 API Key 的 Provider）
```

### LlmOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `temperature` | `number` | `0.7` | 生成温度 |
| `maxTokens` | `number` | `4096` | 最大 Token 数 |
| `timeout` | `number` | `60000` (minimax: `180000`) | 超时时间(ms) |
| `jsonMode` | `boolean` | `false` | JSON 输出模式 |
| `thinking` | `boolean` | `false` | 深度思考模式（仅 deepseek-direct） |
| `promptVersion` | `string` | — | 提示词版本 |

### Provider 特殊处理

| Provider | 特殊逻辑 |
|----------|----------|
| `minimax` | 请求体添加 `reasoning_split: true`；超时 180s |
| `deepseek-direct` | `thinking: true` 时添加 `thinking: { type: 'enabled' }` |
| 所有 | 自动清理 `<think...</think >` 标签 |

---

## 3. Liuren Agent（六壬 Agent）

### 文件路径

| 文件 | 路径 |
|------|------|
| LiurenAgentService | `src/liuren-agent/liuren-agent.service.ts` |
| LiurenAgentModule | `src/liuren-agent/liuren-agent.module.ts` |
| 系统提示词 | `src/liuren-agent/prompts/liuren-system-prompt.md` |
| 英文提示词 | `src/liuren-agent/prompts/liuren-system-prompt-en.md` |
| 分析提示词 | `src/liuren-agent/prompts/liuren-analysis-prompt.md` |
| 金口诀提示词 | `src/liuren-agent/prompts/jinkoujue-prompt.md` |
| 推命提示词 | `src/liuren-agent/prompts/tuiming-prompt.md` |
| 择日提示词 | `src/liuren-agent/prompts/zeri-prompt.md` |

### 核心能力

| 方法 | 说明 |
|------|------|
| `analyze(input)` | 标准六壬断事分析 |
| `analyzeJinKouJue(input)` | 金口诀分析 |
| `analyzeTuiMing(input)` | 六壬推命分析 |
| `analyzeZeRi(input)` | 择日分析 |
| `setUpLesson(askTime, location)` | 起课排盘 |

### 分析流程

```
输入 → LiurenCalculator.setUpLesson() → 课盘
  → detectEventType() → 事件分类
  → findSimilarCases() → 历史案例检索
  → RuleEngine.evaluateAll() → 规则引擎结构化判定
  → LLM 分析（3 次重试 + Barnum 检测）
  → 降级到模板（LLM 失败时）
```

### Barnum 语句检测

LLM 输出经过 `BARNUM_PHRASES` 检测，包含空泛表达（如"保持努力"、"未来可期"）时降级到模板。

### 规则引擎集成

LiurenAgent 集成了 `RuleEngineService`，在 LLM 调用前先进行规则匹配：

```
extractLiurenFacts() → 提取事实
  → ruleEngine.evaluateAll() → 规则匹配
  → ruleEngine.buildStructuredConclusion() → 结构化结论
  → formatRuleEngineBlock() → 注入 LLM 提示词
```

LLM 被要求将规则引擎的结构化判定翻译为自然语言，而非自行推理。

---

## 4. Liuyao Agent（六爻 Agent）

### 文件路径

| 文件 | 路径 |
|------|------|
| LiuyaoAgentService | `src/liuyao-agent/liuyao-agent.service.ts` |
| LiuyaoAgentModule | `src/liuyao-agent/liuyao-agent.module.ts` |
| 系统提示词 | `src/liuyao-agent/prompts/liuyao-system-prompt.md` |

### 核心能力

| 方法 | 说明 |
|------|------|
| `paipan(input)` | 六爻排盘（大衍法/手动起卦） |
| `analyze(input)` | 六爻分析 |

### 排盘依赖

使用 `iching-shifa` 库进行排盘计算：

```typescript
import { dayan, manualQiGua, decodePan, getGuaName, getZhiGua, getMovingYaoPositions } from 'iching-shifa';
```

### 起卦方式

| 方式 | 触发条件 | 说明 |
|------|----------|------|
| 手动起卦 | `hexagramCode` 为 6 位数字(6-9) | `manualQiGua(hexagramCode)` |
| 大衍法 | 默认 | `dayan()` 自动起卦 |

### 用神判定

| 问题类型 | 用神 |
|----------|------|
| 财运/投资 | 妻财 |
| 事业/考试 | 官鬼 |
| 健康 | 官鬼 |
| 感情 | 妻财 |
| 子女/学业 | 子孙 |
| 房产/文书 | 父母 |
| 默认 | 世爻六亲 |

---

## 5. Qimen Agent（奇门 Agent）

### 文件路径

| 文件 | 路径 |
|------|------|
| QimenAgentService | `src/qimen-agent/qimen-agent.service.ts` |
| QimenAgentModule | `src/qimen-agent/qimen-agent.module.ts` |
| 系统提示词 | `src/qimen-agent/prompts/qimen-system-prompt.md` |

### 排盘依赖

使用 `@yhjs/dunjia` 库进行时家奇门排盘：

```typescript
import { TimeDunjia } from '@yhjs/dunjia';
const board = TimeDunjia.create({ datetime });
```

### 核心能力

| 方法 | 说明 |
|------|------|
| `paipan(input)` | 奇门排盘 |
| `analyze(input)` | 奇门分析 |

### 排盘输出结构

```typescript
interface QimenResult {
  yinyang: string;       // 阴阳遁
  juNumber: number;      // 局数
  xunHead: string;       // 旬首
  ganZhi: string;        // 干支
  solarTerm: string;     // 节气
  geJu: string;          // 格式化局数（如"阳3局"）
  palaces: QimenPalaceData[];  // 九宫数据
}
```

### 模板分析分支

| 问题类型 | 分析方法 |
|----------|----------|
| 方位/出行 | `analyzeDirection()` |
| 择日/择时 | `analyzeTiming()` |
| 决策类 | `analyzeDecision()` |
| 通用 | `analyzeGeneral()` |

---

## 6. Quming Agent（取名 Agent）

### 文件路径

| 文件 | 路径 |
|------|------|
| QumingAgentService | `src/quming-agent/quming-agent.service.ts` |
| QumingAgentModule | `src/quming-agent/quming-agent.module.ts` |
| 系统提示词 | `src/quming-agent/prompts/quming-system-prompt.md` |
| 用户提示词 | `src/quming-agent/prompts/quming-user-prompt.md` |

### 分析流程

```
输入 → BaZiCalculator.calculateBaZi() → 八字排盘
  → analyzeWuxing() → 五行缺失分析
  → calculateXiYongShen() → 喜用神计算（三层判定法）
  → LLM/算法生成名字推荐
  → validateNameWuge() → 五格验证过滤
  → 构建结果
```

### 喜用神三层判定法

```
1. 特殊格局（化气/专旺/从格）→ 直接使用 pattern 的 favorableElements
2. 非特殊格局 → pattern十神映射五行 ∩ 日主强弱五行
3. 交集非空用交集，空则以 pattern 为准
```

### 名字生成策略

| 策略 | 说明 |
|------|------|
| LLM 生成 | 调用 LLM 生成名字建议，解析 JSON 输出 |
| 算法生成 | 按五行属性从字库中组合推荐字 |
| 五格验证 | 过滤三格以上为凶的名字 |

### 五行推荐字库

按五行分类的精选字库（`NAME_CHARACTERS`），每行约 100+ 字，覆盖木/火/土/金/水五行。

---

## 7. 共享模块

### 7.1 案例库（Case Library）

**文件路径**: `src/shared/case-library/case-library.service.ts`

| 方法 | 说明 |
|------|------|
| `getLiurenExamples(count)` | 获取六壬案例 |
| `getBaziExamples(count)` | 获取八字案例 |
| `getLiurenFewShot(maxChars)` | 获取六壬 Few-Shot 示例 |
| `getBaziFewShot(maxChars)` | 获取八字 Few-Shot 示例 |

案例数据存储在 `cases.json` 中，用于 LLM 提示词的 Few-Shot 注入。

### 7.2 Barnum 语句检测

**文件路径**: `src/shared/constants/barnum-phrases.ts`

```typescript
export const BARNUM_PHRASES: readonly string[] = [
  '事情有起有落', '注意人际关系', '可能会遇到贵人', '需要谨慎行事',
  '保持努力', '未来可期', '顺其自然', '顺势而为', '稳扎稳打',
  '静观其变', '注意细节', '保持积极心态', '脚踏实地', '循序渐进',
  // ... 共 40+ 条中英文空泛表达
];
```

所有 Agent 在 LLM 输出后进行 Barnum 检测，命中则降级到模板。

### 7.3 LLM 调用日志

**文件路径**: `src/shared/logger/llm-call-logger.ts`

| 字段 | 类型 | 说明 |
|------|------|------|
| `timestamp` | `string` | 调用时间 |
| `provider` | `string` | Provider 名称 |
| `model` | `string` | 模型名称 |
| `routeType` | `string` | 路由类型 |
| `durationMs` | `number` | 耗时(ms) |
| `status` | `success/failed` | 调用状态 |
| `promptTokens` | `number?` | 输入 Token 数 |
| `completionTokens` | `number?` | 输出 Token 数 |
| `totalTokens` | `number?` | 总 Token 数 |
| `retryCount` | `number` | 重试次数 |

日志文件按日期轮转：`logs/llm-calls-YYYY-MM-DD.log`，每行一条 JSON 记录。

### 7.4 LLM 健康监控

**文件路径**: `src/shared/monitor/llm-health.service.ts`

| 指标 | 说明 |
|------|------|
| 成功率 | 滑动窗口（最近 100 次调用）内的成功率 |
| Provider 连续失败 | 单个 Provider 连续失败 ≥ 3 次触发告警 |
| 整体健康 | 成功率 < 80% 触发告警 |

### 7.5 提示词注册

**文件路径**: `src/shared/prompt-registry/prompt-registry.service.ts`

| 版本 | 标签 | 说明 |
|------|------|------|
| `v1` | 稳定版 | 当前线上版本 |
| `v2` | 增强版 | 优化后的 Prompt，含 Few-Shot 示例 |

默认版本通过 `LLM_PROMPT_VERSION` 环境变量控制。

---

## Agent 通用模式

所有 Agent 遵循统一的分析模式：

```
1. 排盘/计算 → 获取原始数据
2. 规则引擎评估（可选）→ 结构化判定
3. LLM 分析 → 语义解读
   - 3 次重试
   - JSON 模式输出
   - 必填字段检查
   - Barnum 检测
4. 降级到模板 → LLM 失败时兜底
```

---

## 模块依赖关系

```
LlmGatewayModule
  ├── ZipingAgentService
  ├── LiurenAgentService
  ├── QumingAgentService
  ├── QimenAgentService
  ├── LiuyaoAgentService
  ├── ZiweiAgentService
  └── LlmProvidersService
       ├── LlmCallLogger
       ├── LlmHealthService
       └── PromptRegistryService

各 Agent 共享:
  ├── RuleEngineService (规则引擎)
  ├── BARNUM_PHRASES (Barnum 检测)
  ├── CaseLibraryService (案例库)
  └── PrismaService (数据库)

---

## v1.1+ 增量更新 — Orchestrator 多 Agent 编排（2026-05）

> 以下内容为 v1.0 后新增，原 LlmGatewayService 已被多 Agent 编排流水线取代。

---

### 架构演进

**v1.0 架构**（旧）：
```
LlmGatewayService（单点调度）
  └── LlmProvidersService（多 Provider 降级）
```

**v1.1+ 架构**（新）：
```
OrchestratorService（多 Agent 编排）
  ├── IntentRouterService        → 意图识别 + 引擎路由
  ├── EvidencePacketBuilderService → 算法证据包生成（八字/六壬/奇门/六爻）
  ├── KnowledgeRetrieverService  → 知识库检索（向量搜索 + 图谱查询）
  ├── GenerationComposerService  → LLM 生成编排（组装 prompt → 调用 LLM → 质量评估）
  │   └── QualityGateService     → 质量门禁（幻觉检测 + 完整性校验）
  └── GenerationProcessor        → BullMQ 异步任务处理
```

---

### 各 Agent 职责

#### IntentRouterService
- **输入**：用户问题 + 出生信息
- **处理**：LLM 分析用户意图，判断适合哪种术数体系
- **输出**：`{ engineType: 'liuren' | 'ziping' | 'qimen' | 'liuyao', confidence: number }`

#### EvidencePacketBuilderService
- **输入**：engineType + 八字数据
- **处理**：调用对应算法引擎生成证据（八字排盘/六壬课式/奇门局/六爻卦）
- **输出**：`EvidencePacket { engineType, pillars, daYun, liuRen, qiMen, liuYao, ... }`

#### KnowledgeRetrieverService
- **输入**：用户问题 + 命盘数据 + 证据包
- **处理**：向量搜索（chroma_db）+ 知识图谱查询，检索相关经典文献和案例
- **输出**：`KnowledgeResult { passages, cases, references }`

#### GenerationComposerService
- **输入**：用户问题 + EvidencePacket + KnowledgeResult + 对话历史
- **处理**：
  1. 组装多段 prompt（系统提示 → 命盘数据 → 知识参考 → 用户问题）
  2. 调用 LlmProvidersService（支持 sensenova/deepseek/doubao/minimax/deepseek-direct 降级链路）
  3. 解析 LLM 返回的 reasoningContent（思维链）
  4. 调用 QualityGate 进行质量评估
- **输出**：`GenerationResult { finalJson, rawOutput, reasoningContent, qualityScore, provider, model, durationMs }`

#### QualityGateService
- **输入**：LLM 生成结果
- **处理**：
  1. 幻觉检测：检查生成内容中的事实是否与证据包一致
  2. 完整性校验：检查报告是否包含所有必需模块
  3. 质量评分：0-100 分
- **输出**：`{ score: number, issues: string[], passed: boolean }`

#### GenerationProcessor（BullMQ）
- 将 Orchestrator 的同步编排拆分为异步任务
- 支持批量处理、重试、超时控制
- 任务状态：waiting → active → completed/failed

---

### LLM Provider 降级链路（更新）

**v1.0 链路**（已废弃）：
```
豆包 → MiniMax → OpenAI
```

**v1.1+ 链路**（当前）：
```
sensenova → deepseek → doubao → minimax → deepseek-direct
```

| Priority | Provider | 模型 | 特性 |
|----------|----------|------|------|
| 1 | Sensenova | DeepSeek-V3 | 默认首选 |
| 2 | DeepSeek | DeepSeek-R1 | 支持 reasoning_content |
| 3 | Doubao | Doubao-Pro | 支持 reasoning |
| 4 | MiniMax | abab6.5s | Token Plan Plus |
| 5 | DeepSeek-Direct | DeepSeek API | 兜底直连 |

---

### reasoning_content 捕获

部分模型（DeepSeek-R1、Doubao-Pro）返回思维链推理过程：

```typescript
// LlmProvidersService.chat() 返回值扩展
export interface LlmResponse {
  content: string;
  provider: string;
  model: string;
  durationMs: number;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  reasoningContent?: string;  // 新增：LLM 思维链
}
```

`reasoningContent` 写入 `GenerationRun` 表，前端 ResultPage 通过 ReasoningPanel 组件展示。

---

### MingLi-Bench 评估模块

评估 LLM 在命理推理任务上的准确率：

```
MingliBenchService
  ├── 加载 data.json（160 道选择题，12 个生活维度）
  ├── 筛选：year / sampleSize / category
  ├── 模式：
  │   ├── Basic：纯问题 + 选项
  │   ├── Cot：逐步推理（Chain of Thought）
  │   └── Astro：注入八字排盘数据
  ├── 调用 LlmProvidersService.chat() 获取答案
  ├── 鲁棒答案解析（8 层正则匹配）
  └── 汇总：accuracy / categoryBreakdown / avgDurationMs
```

**端点**：`POST /api/v1/benchmark/run`、`GET /api/v1/benchmark/history`

**结果持久化**：`BenchmarkRun` 表记录每次评估结果，支持按模型/日期对比。
```

---

## v1.5 增量更新 — 并行竞速 + fallback 修复（2026-06-05）

### chatWithFallback 并行竞速

v1.5 将 chatWithFallback 改为前 2 个 Provider 并行竞速（Promise.allSettled），显著降低首响应延迟：

```typescript
// 旧：串行尝试
for (const provider of providers) {
  try { return await this.chat(messages, provider, options); } catch {}
}

// 新：前2个并行，失败后串行尝试剩余
if (providers.length >= 2) {
  const [primary, secondary] = providers;
  const results = await Promise.allSettled([
    this.chat(messages, primary, options),
    this.chat(messages, secondary, options),
  ]);
  for (const r of results) {
    if (r.status === 'fulfilled') { return r.value; }
  }
  // 两个都失败，继续串行尝试剩余
  const remaining = providers.slice(2);
  for (const provider of remaining) {
    try { return await this.chat(messages, provider, options); } catch {}
  }
}
```

### chatWithUser fallback 修复

v1.5 修复了 chatWithUser 指定 Provider 失败后不 fallback 的 Bug：

```typescript
// 旧：指定 Provider 失败直接抛异常
if (provider) {
  const resp = await this.chat(messages, provider, options);
  return resp;
}

// 新：指定 Provider 失败后走 fallback 链
if (provider) {
  try {
    const resp = await this.chat(messages, provider, options);
    return resp;
  } catch (error) {
    this.logger.warn(`指定提供商 ${provider} 失败，尝试fallback`);
    this.healthService.recordCall(provider, 'failure');
    // 继续走 fallback 链
  }
}
return this.chatWithFallback(messages, options, routeType);
```
