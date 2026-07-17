# 工程交接文档唯一口径源（Ground Truth）

> **版本**：v3.0
> **最后校准**：2026-07-07
> **用途**：统一项目技术口径。当前生产事实优先，历史设计和旧代码基线作为上下文参考。
> **最新取证依据**：2026-07-07 对生产源码、运行进程、数据库、知识索引、Nginx 与公开入口的只读取证。

## 0. 2026-07-07 生产覆盖层

当前事实入口：

1. [`ENGINEERING-当前生产技术基线-20260707.md`](./ENGINEERING-当前生产技术基线-20260707.md)
2. [`API-当前生产接口基线-20260707.md`](../接口文档/API-当前生产接口基线-20260707.md)
3. [`DATABASE-当前生产Schema基线-20260707.md`](../数据库文档/DATABASE-当前生产Schema基线-20260707.md)
4. [`DEPLOY-当前生产基线-20260707.md`](../部署文档/DEPLOY-当前生产基线-20260707.md)
5. [`TEST-当前生产烟测基线-20260707.md`](../测试用例/TEST-当前生产烟测基线-20260707.md)

生产关键口径：

```text
生产 HEAD：4bbcd7c563e6525aaf6d14ff73d3f010840bb71e
实际版本：HEAD + 521 个已跟踪变更 + 19 个未跟踪项 + dist + SQLite + 知识索引
后端：PM2 → bootstrap-production.js → dist/main.js，端口 30000
前端：/www/wwwroot/awkn.cn/life
知识服务：Python 3.11，127.0.0.1:8701
数据库：SQLite dev.db，完整性 ok
知识库：1,135 books / 329,577 passages
```

本文件第 1 节及以后保留 2026-06-15 的代码基线。与上述生产覆盖层冲突时，采用 2026-07-07 口径。

---

## 1. Pipeline 架构

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 架构模式 | **4 路由 + 两段式漏斗 + ReAct 循环** | `orchestrator.service.ts` processJob 方法 |
| 路由类型 | `ziping` / `liuren` / `mixed` / `clarify` | `intent-router.service.ts:3` |
| Agent 类型 | `liuren` / `qimen` / `ziping` / `ziwei` / `liuyao` / `quming` | `zhangbanshan-scheduler.service.ts:11` |
| 调度模式 | `quick_read`（主调 1-2s） / `deep_consult`（主+佐调+工具链+仲裁+ReAct） | `zhangbanshan-scheduler.service.ts` |
| ReAct 循环 | 最大 5 轮（THINK→ACT→OBSERVE→REFLECT→DONE） | `react-engine.service.ts` |
| 超时降级 | L2 超 60s 返回 L1 快速降级结果，后台继续推演 | `orchestrator.service.ts` |

**9 步流程**：
```
Step 1: Intent Router（4 路由分类）
Step 2: High-Risk Detector（命中即返回）
Step 3: User Memory（记忆加载）
Step 4: Classifier（4 类 UserState）
Step 5: Zhangbanshan Scheduler（6 Agent 调度 + 2 模式选择）
Step 6: Prompt Layers + LLM Parallel Gateway + ReAct 循环（仅 deep_consult）
Step 7: Generation Composer（5 层输出合成）
Step 8: Validator（质量验证）
Step 9: Render（三段式最终渲染）
```

---

## 2. 输出格式

**三套并存**，不同路径使用不同格式：

### A. 张半山三段式（主路径，quick_read + deep_consult 最终渲染）

| 字段 | 含义 |
|------|------|
| `judgment` | 我的判断 |
| `premise` | 前提 |
| `cost` | 代价 |
| `reasoning_trace` | 推理轨迹（可选） |
| `costWarnings` | 代价提醒（可选） |

代码来源：`orchestrator.service.ts` renderOutput 方法

### B. 5 层输出（付费分层，Generation Composer 合成）

| 字段 | 含义 | 标记正则 |
|------|------|---------|
| `factLayer` | L2-1 事实层 | `【事实层】\|【L2-1】\|【八字排盘】\|【事实】` |
| `interpretationLayer` | L2-2 解读层 | `【解读层】\|【L2-2】\|【格局用神】\|【解读】` |
| `deductionLayer` | L2-3 推演层 | `【建议层】\|【L2-3】\|【推演路径】\|【推演】` |
| `adviceLayer` | L2-4 建议层 | `【建议层】\|【L2-4】\|【行动建议】\|【建议】` |
| `insightLayer` | L2-5 点睛层 | `【点睛层】\|【L2-5】\|【金句】\|【点睛】` |

代码来源：`generation-composer.service.ts:9-44`

**付费分层**：免费用户后 3 层（deductionLayer/adviceLayer/insightLayer）标记为 gated。

### C. 6 段 Prompt（降级路径，Generation Composer buildPrompt）

| 序号 | 段标题 |
|------|--------|
| 1 | 一句话定性 |
| 2 | 判断依据 |
| 3 | 当前风险 |
| 4 | 建议动作 |
| 5 | 时间窗口 |
| 6 | 落一句最实在的话 |

代码来源：`generation-composer.service.ts:282-288`

### 前端消费方式

`llmResult` JSON 同时包含 `zhangbanshan_output`（三段式）和 `fiveLayers`（5 层）。

---

## 3. 用户状态分类

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 类型数量 | **4 类** | `user-state-classifier.service.ts:4` |
| 枚举 | `casual` / `genuine` / `repeating` / `validating` | 同上 |
| 分类方式 | 纯规则（不调 LLM） | 同上 |

**优先级链**：
1. `repeating`：30 天内问过类似问题（优先级最高）
2. `validating`：问题含验证型关键词（"之前有人说"/"别的师傅说"等）
3. `genuine`：问题具体 + 有情绪词 + 有背景描述（三条件满足任意两个）
4. `casual`：默认兜底

**⚠️ 原文档 6 类（real_issue/verification/emotional_pressure/high_risk）未实现，已废弃。**

---

## 4. 用户记忆结构

### 数据库模型（Prisma）

```prisma
model UserMemory {
  id              String   @id @default(cuid())
  userId          String   @unique
  chartHistory    String?  @default("{}")   // 命盘历史（JSON）
  consultHistory  String?  @default("{}")   // 咨询历史（JSON）
  timelineEvents  String?  @default("{}")   // 时间线事件（JSON）
  insights        String?  @default("{}")   // 洞察记录（JSON）
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

代码来源：`schema.prisma:71-85`

**4 个业务字段全部是 JSON 字符串存储**，默认值为空对象 `"{}"`。与 User 是 1:1 关系。

### 记忆提取规则

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 提取方式 | 规则优先 + LLM 降级 | `memory-extractor.service.ts` |
| 规则类别 | **7 类**：identity / family / career / relationship / finance / health / decision | 同上 RULE_PATTERNS |
| 去重机制 | SimHash（bigram Jaccard ≥ 0.8 视为重复） | 同上 |
| 双写目标 | consultHistory（检索可达）+ insights（高置信度 ≥ 0.7） | 同上 |

**存储上限**：consultHistory 50 条 / timelineEvents 100 条 / insights 30 条

**⚠️ 原文档 5 类触发（identity/preference/issue/feedback/timing）未实现，已废弃。**

---

## 5. 高风险检测

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 实现状态 | **已完整实现** | `safety/high-risk-detector.service.ts` |
| 检测方式 | 两级：危机关键词优先 + 场景规则匹配 | 同上 |
| 危机关键词 | 自杀/自残/暴力/求救信号共 16 个 | `crisis-keywords.ts` |
| 场景规则 | YAML 配置，支持关键词 + 正则 | `scenario-rules.yaml` |
| 命中动作 | isCrisis=true → 返回心理援助热线 + 不走 LLM | 同上 |

**⚠️ 无独立 risk-classifier.service.ts，分类逻辑内嵌在 HighRiskDetectorService 中。**

---

## 6. 身份层

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 实现状态 | **已实现**（嵌入式） | `prompt-layers.ts` buildIdentityLayer() |
| 独立文件 | **不存在** identity-layer.ts | — |
| Prompt 架构 | 5 层：Identity → Capability → Context → Dynamic → Confirmation | `prompt-layers.ts` |

**Layer 1 Identity 内容**（~800 token）：身份内核、五件事（始终做）、四不做（绝不犯）、人格、说话风格、禁区表达、输出校验三问、免责声明

---

## 7. 关系人

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 独立配置 | **不存在** relations.config.ts | — |
| 实际实现 | 关系契合度评分 AtomTool | `atom-tools/decision/relationship.ts` |
| 关系规则 | 五行生克映射、十神互补/冲突映射、夫妻宫吉凶星曜 | 同上（硬编码） |

**D4 拍板（核心 4 + 可选 2 永不开）**：这是规划目标，当前代码中无此配置结构。

---

## 8. 状态机

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 后端独立状态机 | **不存在** | — |
| XState 依赖 | **不存在** | package.json 无 xstate |
| 隐含对话逻辑 | 7 节点（Node 0-6） | `zhangbanshan-scheduler.service.ts` synthesizeByNode() |
| EmotionState | 3 维（gravity/warmth/caution） | `emotion-state.ts` |
| 前端状态机 | Zustand + persist 配置驱动 | `stateMachineStore.ts` |
| mini-state-machine.service.ts | **不存在**（仅有设计文档） | — |
| ConsultRecord.status | pending / analyzing / clarify / completed / failed | `schema.prisma:152` |
| ConsultRecord.flowStatus | speaking / spreading / bottomed / chronicled / reviewed（枢密院流程） | `schema.prisma:153` |

**9 节点状态机（cold_start→...→long_memory_update）为 P2-5 规划目标，当前未实现。**

---

## 9. 颜色系统

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| 当前系统 | **AETHERIA Neo-Mysticism Design System** | `tailwind.config.js` |
| Token 体系 | CSS 变量（hsl(var(--xxx))），非硬编码色值 | 同上 |
| Brand Colors | primary / secondary / tertiary | 同上 |
| Surface Colors | surface-base / surface-container / surface-container-low 等 | 同上 |
| mbs-* 5 色 | **不存在**，为 P2-7 规划目标 | — |

**mbs-ink / mbs-paper / mbs-blue / mbs-white / mbs-copper 为规划目标，当前未实现。**

---

## 10. 部署配置

| 属性 | 值 | 代码来源 |
|------|-----|---------|
| PM2 实例数 | **1**（fork 模式） | `ecosystem.config.js` |
| PM2 内存上限 | 500M | 同上 |
| 默认 LLM Provider | deepseek-direct | 同上 |
| 辅助 LLM Provider | sensenova | 同上 |
| Redis | 强制禁用（REDIS_ENABLED=false） | 同上 |
| 前端 base path | /life/（开发+生产） | `vite.config.ts` |
| /health/db | 已安全，返回 `{ db: "connected", provider: "sqlite" }` | `health.controller.ts` |
| deploy.sh | 3 种模式（Docker/PM2+Nginx/仅后端），deploy_docker 有备份，deploy_pm2 无备份 | `deploy.sh` |

---

## 11. LLM Provider

| 优先级 | Provider | 环境变量前缀 | 代码来源 |
|--------|----------|-------------|---------|
| 1 | doubao（火山引擎） | DOUBAO_* | .env.example |
| 2 | moonshot（Kimi） | MOONSHOT_* / KIMI_* | 同上 |
| 3 | deepseek | DEEPSEEK_* | 同上 |
| 4 | minimax | MINIMAX_* | 同上 |
| 5 | sensenova（商汤） | SENSENOVA_* | 同上 |
| 6 | deepseek-direct | DEEPSEEK_DIRECT_* | 同上 |
| 7 | spark（讯飞） | SPARK_* / XFYUN_* | 同上 |
| 8 | openai（兼容） | OPENAI_* | 同上 |

**默认 Provider**：`deepseek-direct`（ecosystem.config.js）
**辅助 Provider**：`sensenova`（ecosystem.config.js CHEAP_LLM_PROVIDER）

---

## 修订记录

| 日期 | 版本 | 修订内容 | 依据 |
|------|------|---------|------|
| 2026-06-14 | v1.0 | 初版（规划态） | 文档作者 |
| 2026-06-15 | v2.0 | 全面修正为代码态 | 代码探查：orchestrator.service.ts / generation-composer.service.ts / user-state-classifier.service.ts / schema.prisma / memory-extractor.service.ts / high-risk-detector.service.ts / prompt-layers.ts / tailwind.config.js / ecosystem.config.js / deploy.sh / health.controller.ts / vite.config.ts / .env.example |
