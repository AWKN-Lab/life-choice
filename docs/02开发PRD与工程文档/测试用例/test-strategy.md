# 人生决策宗师 - 测试策略

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）

> **版本**：v1.1
> **原始日期**：2026-06-15
> **生产校准日期**：2026-07-07
> **当前生产烟测入口**：[`TEST-当前生产烟测基线-20260707.md`](./TEST-当前生产烟测基线-20260707.md)
> **统一口径源**：[`_ground-truth.md`](../工程交接/_ground-truth.md)

下文保留历史测试策略。当前发布硬闸门、数据库迁移验证、知识检索性能和公网烟测采用 2026-07-07 基线。

---

## 1. 测试技术栈

| 层级 | 工具 | 用途 |
|------|------|------|
| 单元测试 | **vitest** | Service / 工具函数 / 分类器 / 提取器 |
| 集成测试 | **vitest** + NestJS TestingModule | 多 Service 协作、数据库交互 |
| E2E 测试 | **Playwright** | 用户完整旅程（浏览器端到端） |
| Mock 工具 | vitest vi.fn() / vi.mock() | PrismaService / LlmGatewayService / BullMQ Queue |

### 测试目录结构

```
awkn-life-backend/apps/api-server/src/consult/
├── __tests__/
│   ├── test-helpers.ts              # 通用 mock 工具
│   ├── orchestrator.spec.ts         # 基础设施验证
│   ├── routes/
│   │   ├── ziping.e2e.spec.ts       # 子平路由 e2e
│   │   ├── liuren.e2e.spec.ts       # 六壬路由 e2e
│   │   ├── mixed.e2e.spec.ts        # 混合路由 e2e
│   │   └── clarify.e2e.spec.ts      # 澄清路由 e2e
│   ├── safety/
│   │   └── high-risk-3-segments.spec.ts  # 高风险 3 段补全
│   ├── classifier/
│   │   └── user-state-6-types.spec.ts    # 6 类分类测试
│   ├── orchestrator/
│   │   ├── quality-gate-v2.spec.ts       # Quality Gate v2
│   │   ├── pipeline-v2-toggle.spec.ts    # 灰度开关
│   │   ├── memory-to-prompt.spec.ts      # 记忆回流
│   │   ├── five-layer-extraction.spec.ts # 5 层提取
│   │   └── react-engine.e2e.spec.ts      # ReAct 引擎
│   └── regression/
│       └── full-pipeline.spec.ts         # 全量回归
```

---

## 2. Pipeline 9 步测试

Pipeline 完整流程 9 步，每步对应独立测试标准：

| 步骤 | 模块 | 测试要点 | 通过标准 |
|------|------|---------|---------|
| Step 1 | Intent Router | 4 路由分类（ziping/liuren/mixed/clarify） | 输入含生辰+事业问题 → `ziping`；含时间无生辰 → `liuren`；含生辰+合作问题 → `mixed`；模糊问题 → `clarify` |
| Step 2 | High-Risk Detector | 危机关键词 + 场景规则匹配 | 命中危机词 → `isCrisis=true` + 返回心理援助热线 + 不走 LLM |
| Step 3 | User Memory | 记忆加载 | 有 userId → 调用 `getMemorySummary()`；无 userId → 返回空字符串 |
| Step 4 | Classifier | 4 类 UserState 分类 | 优先级链：repeating > validating > genuine > casual |
| Step 5 | Zhangbanshan Scheduler | 6 Agent 调度 + 2 模式选择 | ziping → `ziping` Agent；liuren → `liuren` Agent；genuine + 有生辰 → `deep_consult` |
| Step 6 | LLM Parallel Gateway + ReAct | 并行双调 + ReAct 循环（仅 deep_consult） | `generateParallel()` 返回 primary + secondary；ReAct 最大 5 轮 |
| Step 7 | Generation Composer | 5 层输出合成 | FIVE_LAYER_MARKERS 正则提取 5 层；提取失败走段落推断兜底 |
| Step 8 | Validator (Quality Gate) | 质量验证 | 结构完整(40分) + 身份感(30分) + 无违禁(30分) ≥ 60 分通过 |
| Step 9 | Render | 三段式最终渲染 | 输出包含 `judgment` / `premise` / `cost` 三个字段 |

---

## 3. 两段式漏斗测试

### quick_read 模式

| 测试场景 | 输入 | 预期 |
|---------|------|------|
| 简单事业问题 | `"明年事业运势怎么样"` + hasBirthInfo=true | 主调 1-2s 返回，不触发 ReAct |
| 澄清类问题 | `"帮我看看"` + hasBirthInfo=false | 返回澄清追问，不调用 LLM |
| casual 用户 | 模糊问题 + 无情绪词 | 走 quick_read，返回基础判断 |

### deep_consult 模式

| 测试场景 | 输入 | 预期 |
|---------|------|------|
| 重大决策 | `"现在要不要合作"` + hasBirthInfo=true + genuine | 主调+佐调+工具链+仲裁+ReAct 循环 |
| repeating 用户 | 30 天内重复问题 | 主动提上次问过什么，关注变化点 |
| validating 用户 | `"之前有人说我会离婚"` | 先让他说原来结论，再对比分析 |
| 超时降级 | LLM 超 60s | 返回 L1 快速降级结果，后台继续推演 |

---

## 4. 三套输出格式测试

### A. 张半山三段式（主路径）

| 测试用例 | 输入 | 验证字段 | 通过标准 |
|---------|------|---------|---------|
| 完整输出 | 正常咨询问题 | `judgment` / `premise` / `cost` | 三个字段均非空 |
| 含推理轨迹 | deep_consult 结果 | `reasoning_trace` | 可选字段，存在时为数组 |
| 含代价提醒 | 涉及重大决策 | `costWarnings` | 可选字段，存在时为数组 |

### B. 5 层输出（付费分层）

| 测试用例 | 输入 | 验证字段 | 通过标准 |
|---------|------|---------|---------|
| 标准标签输出 | LLM 输出含 `【事实层】【解读层】` 等标签 | 5 层完整提取 | factLayer / interpretationLayer / deductionLayer / adviceLayer / insightLayer 均非空 |
| 混合标签输出 | 部分层有标签，部分无 | 有标签层按标签提取，无标签层按段落推断 | 5 层完整 |
| 无标签输出 | LLM 输出 5 个段落但无标签 | 按段落顺序推断 | 5 层完整 |
| 短输出 | LLM 仅输出 2 个段落 | 前 2 层有内容 | 后 3 层为 MISSING_LAYER_PLACEHOLDER |
| 付费门控 | 免费用户 | deductionLayer / adviceLayer / insightLayer | 标记为 gated |

**5 层标记正则**：

| 层 | 正则 |
|----|------|
| factLayer | `【事实层】\|【L2-1】\|【八字排盘】\|【事实】` |
| interpretationLayer | `【解读层】\|【L2-2】\|【格局用神】\|【解读】` |
| deductionLayer | `【推演层】\|【L2-3】\|【推演路径】\|【推演】` |
| adviceLayer | `【建议层】\|【L2-4】\|【行动建议】\|【建议】` |
| insightLayer | `【点睛层】\|【L2-5】\|【金句】\|【点睛】` |

### C. 6 段 Prompt（降级路径）

| 序号 | 段标题 | 测试验证 |
|------|--------|---------|
| 1 | 一句话定性 | 非空，≤50 字 |
| 2 | 判断依据 | 非空，含具体论据 |
| 3 | 当前风险 | 非空，描述风险场景 |
| 4 | 建议动作 | 非空，可执行建议 |
| 5 | 时间窗口 | 非空，含时间范围 |
| 6 | 落一句最实在的话 | 非空，≤30 字 |

---

## 5. 4 类 UserState 测试

| 类型 | 触发条件 | 测试输入 | 预期分类 |
|------|---------|---------|---------|
| `repeating` | 30 天内问过类似问题 | 用户 30 天内第二次问事业 | `repeating`，优先级最高 |
| `validating` | 问题含验证型关键词 | `"之前有人说我会离婚"` | `validating` |
| `genuine` | 问题具体+有情绪词+有背景描述（三条件满足任意两个） | `"我最近压力很大，工作也不顺，要不要换工作"` | `genuine` |
| `casual` | 默认兜底 | `"帮我看看"` | `casual` |

### 分类优先级链测试

```
repeating（最高）> validating > genuine > casual（兜底）
```

| 测试用例 | 输入 | 预期 |
|---------|------|------|
| repeating 优先于 validating | 30 天内重复 + 含验证词 | `repeating` |
| validating 优先于 genuine | 含验证词 + 问题具体 | `validating` |
| genuine 优先于 casual | 问题具体 + 有情绪词 | `genuine` |
| 无特征默认 casual | 模糊问题 | `casual` |

---

## 6. 高风险检测测试

### 危机关键词（16 个）

| 类别 | 关键词示例 | 命中动作 |
|------|-----------|---------|
| 自杀 | 自杀、想死、不想活了、活着没意思 | `isCrisis=true` → 返回心理援助热线 + 不走 LLM |
| 自残 | 自残、割腕、伤害自己 | 同上 |
| 暴力 | 杀人、报复、同归于尽 | 同上 |
| 求救信号 | 救命、帮帮我、撑不住了 | 同上 |

### 场景规则（5 个已实现 + 3 个待补全）

| 场景 ID | 名称 | 关键词数 | 测试标准 |
|---------|------|---------|---------|
| `credibility_challenge` | 权威质疑 | — | 命中 → 场景拦截 |
| `error_correction` | 纠错 | — | 命中 → 场景拦截 |
| `major_decision` | 重大决策 | — | 命中 → 场景拦截 |
| `repeated_question` | 重复提问 | — | 命中 → 场景拦截 |
| `emotional_distress` | 情绪困扰 | — | 命中 → 场景拦截 |
| `medical_inquiry` | 医疗咨询 | 10 | 拦截率 100% |
| `legal_inquiry` | 法律咨询 | 10 | 拦截率 100% |
| `financial_inquiry` | 投资理财 | 10 | 拦截率 100% |

### 医疗咨询关键词（10 条）

```
"我得了什么病", "这个病怎么治", "要不要手术", "吃什么药",
"能治好吗", "病情严重吗", "检查结果怎么看", "医生说",
"住院", "化疗"
```

### 法律咨询关键词（10 条）

```
"能不能起诉", "怎么打官司", "法律怎么说", "合同纠纷",
"劳动仲裁", "离婚协议", "财产分割", "侵权",
"律师", "违法吗"
```

### 投资理财关键词（10 条）

```
"买哪只股票", "什么时候买入", "基金推荐", "投资建议",
"能赚多少钱", "加仓还是减仓", "要不要割肉", "杠杆",
"期货", "炒币"
```

### 测试标准

- 危机关键词：命中即返回 `isCrisis=true`，不调用 LLM
- 场景规则：3 段各 10 条关键词，拦截率 100%（30/30 通过）
- 命中后返回场景专属安抚文案，不给出专业建议

---

## 7. 记忆系统测试

### 7 类提取规则（RULE_PATTERNS）

| 规则类别 | 测试输入 | 预期提取 |
|---------|---------|---------|
| `identity` | `"我叫张三，1990年出生"` | 提取姓名+出生年份 |
| `family` | `"我老婆最近要和我离婚"` | 提取家庭关系事件 |
| `career` | `"我在互联网公司做产品经理"` | 提取职业信息 |
| `relationship` | `"我和男朋友分手了"` | 提取感情关系事件 |
| `finance` | `"我最近投资亏了很多钱"` | 提取财务事件 |
| `health` | `"我最近身体不太好"` | 提取健康信息 |
| `decision` | `"我在犹豫要不要跳槽"` | 提取决策困境 |

### 4 个 JSON 字段

| 字段 | 存储上限 | 测试验证 |
|------|---------|---------|
| `chartHistory` | — | JSON 字符串，默认 `"{}"` |
| `consultHistory` | 50 条 | 超限时 FIFO 淘汰 |
| `timelineEvents` | 100 条 | 超限时 FIFO 淘汰 |
| `insights` | 30 条 | 仅高置信度（≥ 0.7）写入 |

### SimHash 去重

| 测试用例 | 输入 | 预期 |
|---------|------|------|
| 完全相同问题 | 两次输入 `"明年事业运势"` | bigram Jaccard ≥ 0.8，视为重复，不重复写入 |
| 语义相似问题 | `"明年工作运"` vs `"明年事业运势"` | Jaccard 可能 ≥ 0.8，去重 |
| 不同问题 | `"明年事业运势"` vs `"感情问题"` | Jaccard < 0.8，正常写入 |

### 双写目标

| 写入目标 | 条件 | 测试验证 |
|---------|------|---------|
| `consultHistory` | 所有咨询（检索可达） | 每次咨询后写入 |
| `insights` | 高置信度 ≥ 0.7 | 仅置信度达标时写入 |

---

## 8. API 契约测试

### 核心端点

| 端点 | 方法 | 请求体 | 响应 | 测试要点 |
|------|------|--------|------|---------|
| `/api/v1/consult` | POST | `{ question, birthInfo?, askTime? }` | `{ id, status, result }` | 4 路由正确分发 |
| `/api/v1/consult/:id` | GET | — | `{ id, status, llmResult }` | 返回完整结果 |
| `/api/v1/health` | GET | — | `{ status: "ok" }` | 200 |
| `/health/db` | GET | — | `{ db: "connected", provider: "sqlite" }` | 200 |
| `/health/llm` | GET | — | LLM 连接状态 | 200（10s 超时） |
| `/api/v1/auth/login` | POST | `{ email, password }` | `{ token, user }` | JWT 签发 |
| `/api/v1/auth/register` | POST | `{ email, password }` | `{ token, user }` | 用户创建 |
| `/api/v1/user/memory` | GET | — | `{ chartHistory, consultHistory, timelineEvents, insights }` | 4 字段均为 JSON |

### 咨询请求契约

```typescript
// 请求
interface ConsultRequest {
  question: string;        // 必填，≥2 字
  birthInfo?: {            // 可选，子平路由需要
    year: number;
    month: number;
    day: number;
    hour: number;
    gender: 'male' | 'female';
  };
  askTime?: string;        // 可选，六壬路由需要，ISO 8601
}

// 响应（三段式）
interface ConsultResponse {
  id: string;
  status: 'pending' | 'analyzing' | 'clarify' | 'completed' | 'failed';
  llmResult?: {
    zhangbanshan_output: {
      judgment: string;
      premise: string;
      cost: string;
      reasoning_trace?: Array<{ iter: number; phase: string; content: string; done: boolean }>;
      costWarnings?: string[];
    };
    fiveLayers: {
      factLayer: string;
      interpretationLayer: string;
      deductionLayer: string;
      adviceLayer: string;
      insightLayer: string;
    };
  };
}
```

---

## 9. E2E 测试场景

### 场景 1：新用户首次咨询（子平路由）

```
1. 打开 /life/
2. 点击"开始咨询"
3. 输入"明年事业运势怎么样"
4. 填写生辰信息（1990-05-15 男）
5. 提交
6. 等待结果（≤ 30s）
7. 验证：结果页显示三段式输出
8. 验证：5 层输出前 2 层可见，后 3 层 gated
```

### 场景 2：老用户重复咨询（repeating 状态）

```
1. 登录已有账号
2. 30 天内第二次问"事业运势"
3. 验证：结果中主动提"上次你问过..."
4. 验证：关注变化点而非重复分析
```

### 场景 3：高风险拦截

```
1. 输入"不想活了"
2. 验证：立即返回心理援助热线
3. 验证：不调用 LLM
4. 验证：不给出命理判断
```

### 场景 4：澄清路由

```
1. 输入"帮我看看"（无生辰、无时间）
2. 验证：返回追问引导
3. 验证：不调用 LLM
4. 验证：status 为 'clarify'
```

### 场景 5：会员购买流程

```
1. 查看咨询结果（免费层）
2. 点击"解锁完整分析"
3. 选择套餐
4. 完成支付（Stripe/微信/支付宝）
5. 验证：5 层输出全部可见
```

---

## 10. 性能基准

### P95 延迟目标

| 端点 / 场景 | P95 目标 | 说明 |
|-------------|---------|------|
| `/health` | < 100ms | 基础健康检查 |
| `/health/db` | < 200ms | 数据库连通性 |
| `/health/llm` | < 10s | LLM 服务可用性（含外部调用） |
| `quick_read` 咨询 | < 3s | 主调 1-2s + 渲染 |
| `deep_consult` 咨询 | < 30s | 主调+佐调+ReAct（≤5 轮） |
| LLM 超时降级 | 60s | 超 60s 返回 L1 快速降级结果 |
| 前端首屏加载 | < 2s | /life/ 首页 |
| 前端结果页渲染 | < 500ms | 三段式 + 5 层渲染 |

### 并发目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 同时在线用户 | 50 | 单实例 PM2 fork 模式 |
| 并发咨询请求 | 10 | 受 LLM API 限流约束 |
| PM2 内存上限 | 500M | 超限自动重启 |

---

## 11. Quality Gate v2 评分测试

### 评分公式

```
总分 = 结构完整(40分) + 身份感(30分) + 无违禁(30分)
通过标准：总分 ≥ 60 且 5 层至少 4 层非空
```

### 测试用例

| 用例 | 输入 | 预期结果 | 预期分数 |
|------|------|---------|---------|
| 空输出 | `""` | passed=false | score=0 |
| 缺层输出 | 5 层缺 2 层 | passed=false | score<60 |
| 巴纳姆输出 | 含"顺势而为"+"保持努力" | passed=false | 禁用短语扣分 |
| 正常输出 | 5 层齐全 + "我"主语 + 无禁区 | passed=true | score≥60 |
| 禁区表达 | 含"命中注定" | 身份感扣分 | -5 分/条 |

### 禁区表达列表

```
"天意如此", "命中注定", "跟着我走就没错",
"这个选择一定正确", "你想太多了", "你必须", "你应该"
```

---

## 12. 测试执行命令速查

```bash
# 全量测试
cd /opt/awkn-life/awkn-life-backend
npm run test

# 单文件测试
npx vitest run apps/api-server/src/consult/__tests__/orchestrator.spec.ts

# 4 路由 e2e
npx vitest run apps/api-server/src/consult/__tests__/routes/

# 高风险 3 段
npx vitest run apps/api-server/src/consult/__tests__/safety/high-risk-3-segments.spec.ts

# Quality Gate v2
npx vitest run apps/api-server/src/consult/__tests__/orchestrator/quality-gate-v2.spec.ts

# 灰度开关
npx vitest run apps/api-server/src/consult/__tests__/orchestrator/pipeline-v2-toggle.spec.ts

# 记忆回流
npx vitest run apps/api-server/src/consult/__tests__/orchestrator/memory-to-prompt.spec.ts

# 5 层提取
npx vitest run apps/api-server/src/consult/__tests__/orchestrator/five-layer-extraction.spec.ts

# 6 类分类
npx vitest run apps/api-server/src/consult/__tests__/classifier/user-state-6-types.spec.ts

# ReAct 引擎
npx vitest run apps/api-server/src/consult/__tests__/orchestrator/react-engine.e2e.spec.ts

# 全量回归
npx vitest run apps/api-server/src/consult/__tests__/regression/full-pipeline.spec.ts
```

---

## 13. 回归清单

| # | 回归项 | 验证命令 | 通过标准 |
|---|--------|---------|---------|
| 1 | 全量 npm run test | `npm run test` | 0 个失败 |
| 2 | 4 路由 e2e | `npx vitest run apps/api-server/src/consult/__tests__/routes/` | 4/4 通过 |
| 3 | 5 层提取率 | `npx vitest run .../five-layer-extraction.spec.ts` | ≥ 80% |
| 4 | Quality Gate v2 | `npx vitest run .../quality-gate-v2.spec.ts` | 全部通过 |
| 5 | 高风险 3 段 | `npx vitest run .../high-risk-3-segments.spec.ts` | 30/30 |
| 6 | 灰度开关 | `npx vitest run .../pipeline-v2-toggle.spec.ts` | 开/关均通过 |
| 7 | 记忆回流 | `npx vitest run .../memory-to-prompt.spec.ts` | 通过 |
| 8 | 6 类分类 | `npx vitest run .../user-state-6-types.spec.ts` | 6/6 通过 |
| 9 | ReAct 引擎 | `npx vitest run .../react-engine.e2e.spec.ts` | 完成率 ≥ 80% |

---

*生成日期：2026-06-15*
