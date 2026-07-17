# 张半山 4 线工程交接总览

> **版本**：v2.0
> **生成日期**：2026-06-14 | **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)（全文档集唯一真相源，矛盾处以口径源为准）
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
> **核心战略**（CEO 原话）：**先把 L2 管道修稳，这是真正的瓶颈，其他线都排在它后面。**
> **目标读者**：天火（架构）、程序员（实施）、CEO（验收）
> **工期基准**：26 周 / 半年（按 40-50% 实际工程时间）

---

## 〇、阅读路径

```
本文档 §一  ←  4 线 RACI 全局矩阵         ← 责任人分配
        §二  ←  4 线技术约束共享             ← 数据库/框架/版本
        §三  ←  4 线接口契约全景             ← 接触点与依赖
        §四  ←  26 周工期甘特图（修订）     ← L2 优先
        §五  ←  C6/C9 全局硬规则             ← 2 项新规则
        §六  ←  4 份分线文档索引             ← L1/L2/L3/L4 链接
```

---

## 一、RACI 全局矩阵

> 4 条线 + L0 画师对接 + C6/C9 全局检查的完整 RACI 分配

| 任务类别 | 责任 (R) | 问责 (A) | 咨询 (C) | 知情 (I) |
|---------|---------|---------|---------|---------|
| **L0 画师对接** | 设计 Lead | CEO | 天火 / 程序员 | 全部 |
| **L1 内容入代码** | 程序员 | 产品 Lead | 天火 / CEO | 全部 |
| **L2 Pipeline 修稳** | 天火 | CEO | 程序员 / 前端 Lead | 全部 |
| **L3 9 节点状态机** | 天火 | CEO | 程序员 | 全部 |
| **L4 角色体验** | 前端 Lead | CEO | 设计 Lead / 天火 | 全部 |
| **C6 成本审计** | CEO | CEO | 天火 | 全部 |
| **C9 停滞检测** | CEO（自动） | CEO | 天火 | 全部 |
| **上线灰度** | 后端 Lead | CEO | 前端 Lead / 程序员 | 全部 |
| **紧急回滚** | 后端 Lead | CEO | 天火 | 全部 |

---

## 二、4 线技术约束共享

### 2.1 数据库

| 约束 | 值 | 适用线 |
|------|-----|--------|
| 数据库类型 | PostgreSQL 16（生产）/ SQLite（开发） | L2 / L3 |
| ORM | Prisma 5.x | L2 / L3 |
| 迁移 | `npx prisma migrate deploy`（生产）/ `npx prisma db push`（开发） | L2 / L3 |
| 表名约定 | PascalCase 单数（`UserMemory` 而非 `user_memories`） | L2 / L3 |
| 字符集 | UTF-8 | 全线 |
| 时区 | UTC 存储 + Asia/Shanghai 展示 | 全线 |

### 2.2 后端框架

| 约束 | 值 | 适用线 |
|------|-----|--------|
| 框架 | NestJS 10.x | L2 / L3 |
| 语言 | TypeScript 5.x strict 模式 | 全线 |
| 进程 | PM2 1 实例 fork 模式（500M 内存上限） | L2 / L3 |
| API 协议 | REST + zod 验证 | L2 / L3 |
| 错误格式 | `{ data: T \| null, error: { code, message } \| null }` | L2 / L3 |

### 2.3 前端框架

| 约束 | 值 | 适用线 |
|------|-----|--------|
| 框架 | React 18 + Vite 5 | L4 |
| UI 库 | shadcn/ui + Tailwind 3.x | L4 |
| 状态管理 | Zustand | L4 |
| 5 色 token | 当前：AETHERIA 设计系统（primary/secondary/tertiary + CSS 变量 hsl）；规划：mbs-* 5 色（P2-7） | L4 |
| 国际化 | `app/public/locales/zh-CN.json` | L4 |

### 2.4 LLM Provider（7+ 通道 + 自动 failover）

| 优先级 | Provider | 环境变量前缀 | 用途 |
|--------|----------|-------------|------|
| 1 | doubao（火山引擎） | DOUBAO_* | 容灾 1 |
| 2 | Moonshot (Kimi) | MOONSHOT_* / KIMI_* | 主力 |
| 3 | DeepSeek | DEEPSEEK_* | 容灾 2 |
| 4 | MiniMax | MINIMAX_* | 容灾 3 |
| 5 | SensyNova（商汤） | SENSENOVA_* | 辅助任务（CHEAP_LLM_PROVIDER） |
| 6 | DeepSeek-Direct | DEEPSEEK_DIRECT_* | **默认主力**（ecosystem.config.js DEFAULT_LLM_PROVIDER） |
| 7 | Spark（讯飞） | SPARK_* / XFYUN_* | 容灾 4 |
| 8 | OpenAI（兼容） | OPENAI_* | 容灾 5 |
| 9 | 兜底文案 | — | 全部失败时启用降级 |

### 2.5 部署

| 约束 | 值 |
|------|-----|
| 服务器 | 8.148.245.29 |
| 部署目录 | `/opt/awkn-life` |
| 健康检查 | `curl http://8.148.245.29:3000/health` |
| 部署方式 | git pull → npm ci → npx prisma migrate deploy → pm2 reload |

---

## 三、4 线接口契约全景

### 3.1 接触点矩阵

| 提供方 ↓ / 消费方 → | L1 内容 | L2 Pipeline | L3 记忆 | L4 体验 |
|---------------------|---------|-------------|---------|---------|
| **L0 画师** | — | — | — | 提供 7 PNG + 1 源文件（白底透明立绘）|
| **L1 内容** | — | 提供 5 类断句库（career/wealth/noble/timing/relationship 内容分类）+ 20 对话样例 | 提供 4 类用户状态分类（casual/genuine/repeating/validating） | 提供对话样例给渲染层 |
| **L2 Pipeline** | 消费 L1 断句库 | — | 提供 ConsultRecord + 三套输出（三段式 judgment/premise/cost + 5 层 factLayer~insightLayer + 6 段 Prompt） | 提供 orchestrator 调用入口（4 路由：ziping/liuren/mixed/clarify） |
| **L3 记忆** | — | 消费 ConsultRecord（含 4 JSON 字段：chartHistory/consultHistory/timelineEvents/insights） | — | 提供 4 JSON 字段给 L4 渲染层（无独立 MemoryAnchor 类型，字段直读） |
| **L4 体验** | — | 消费三套输出（三段式 + 5 层 + 6 段 Prompt） | 消费 4 JSON 字段 | — |

### 3.2 关键 TypeScript 契约

```typescript
// L1 → L2 接触点：5 类断句（内容分类，不强求代码分类——5 类只在 L1 内容层用，L2 走 4 路由）
type Clause = {
  category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship';
  text: string;           // 张半山口吻原句
  halfMountain: string;   // 半山注（不直白，给一寸）
  fit: string[];          // 适合人群
  cost: string;           // 代价
  action: string;         // 下一步
};

// L1 → L3 接触点：4 类用户状态（与 user-state-classifier.service.ts:4 一致）
// ⚠️ 原 6 类（real_issue/verification/emotional_pressure/high_risk）未实现，当前仅 4 类
type UserState = 'casual' | 'genuine' | 'repeating' | 'validating';

// L2 → L3 接触点：ConsultRecord（Prisma 实际模型，无独立 DecisionIssue 类型）
// 实际字段参考 prisma/schema.prisma ConsultRecord 模型
// 关键字段：id, userId, question, flowStatus, contentJson, llmProvider, elapsedMs, createdAt
// status 枚举：analyzing | clarify | completed | failed（ConsultRecord.status 字符串）

// L2 → L4 接触点：三套输出格式并存（详见 _ground-truth.md §2）
// A. 张半山三段式（主路径）：judgment / premise / cost + 可选 reasoning_trace / costWarnings
// B. 5 层输出（付费分层）：factLayer / interpretationLayer / deductionLayer / adviceLayer / insightLayer
// C. 6 段 Prompt（降级路径）：一句话定性 / 判断依据 / 当前风险 / 建议动作 / 时间窗口 / 落一句最实在的话
// 前端 llmResult JSON 同时包含 zhangbanshan_output（三段式）和 fiveLayers（5 层）

type ZhangbanshanOutput = {
  judgment: string;        // 我的判断
  premise: string;         // 前提
  cost: string;            // 代价
  reasoning_trace?: string; // 推理轨迹
  costWarnings?: string[];  // 代价提醒
};

type FiveLayerOutput = {
  factLayer: string;           // L2-1 事实层
  interpretationLayer: string; // L2-2 解读层
  deductionLayer: string;      // L2-3 推演层（免费用户 gated）
  adviceLayer: string;         // L2-4 建议层（免费用户 gated）
  insightLayer: string;        // L2-5 点睛层（免费用户 gated）
};

type Report = {
  zhangbanshan_output: ZhangbanshanOutput;  // 三段式（主路径）
  fiveLayers: FiveLayerOutput;               // 5 层（付费分层）
  rawText: string;                           // 完整文本（含 6 段 Prompt 降级路径）
};

// L3 → L4 接触点：UserMemory 4 JSON 字段（Prisma 实际模型，无独立 MemoryAnchor 类型）
// 实际字段参考 prisma/schema.prisma UserMemory 模型
// 关键字段：chartHistory | consultHistory | timelineEvents | insights
// 1:1 with User（@unique on userId）
// ⚠️ 原 5 类记忆触发（identity/preference/issue/feedback/timing）未实现，当前仅 4 JSON 字段
```

---

## 四、26 周工期甘特图（修订）

> **核心战略**：L2 优先启动，L4 与 L2 部分并行

```
Week:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
       ──────────────────────────────────────────────────────────────────────────────
L2     ████████ P0 修管                            维护期                              🔴 最高优先级
L0       ████████████ P3 画师外包 (并行)                                                  与 L2 并行
L1                    ████████████ P1 入码                                               依赖 L2
L3                       ████████████████████ P2 记忆+9节点                            灰度 1%→10%→50%
L4                    ████████████████████████ P3 角色体验                             L4.3/L4.5 等 L0
P4 放量                                              ████████ P4 灰度放量 50%→100%     全量上线
```

### 4.1 4 阶段定义

| 阶段 | 周次 | 关键任务 | 验收 |
|------|------|---------|------|
| **P0 修管** | 1-4 | L2.1a + L2.1b + L2.2 + L2.3 | 9 步流程 e2e 100%，三套输出格式 100% |
| **P1 入码** | 5-12 | L1.1 + L1.2-L1.4 | 4 类用户状态 ≥80% |
| **P2 记忆** | 8-16 | L3.1-L3.6 + 7 类正则提取 | 4 JSON 字段记忆 ≥80%，1% 灰度 |
| **P3 角色** | 5-20 | L4.1-L4.7 + L0 | 3 项 IP 锚点 100% |
| **P4 放量** | 17-26 | L3 灰度 10%→50%→100% + L4 完整体验 | 全量上线 |

### 4.2 关键里程碑

- **Week 2**：L2.1a 完结汇报
- **Week 4**：🔴 P0 修管完成，进入 P1
- **Week 8**：L0 部分产出到位，L4.3 道具组件化启动
- **Week 12**：P1 入码完成
- **Week 16**：P2 记忆完成
- **Week 20**：P3 角色完成
- **Week 24**：灰度 50% → 100%
- **Week 26**：全量上线 + 复盘

---

## 五、C6/C9 全局硬规则

### 5.1 C6 — LLM Token 成本审计（D1 拍板）

**触发**：第 1 个月跑完后（预计 2026-07-14）

**审计内容**：
- 7+ 通道实际 token 消耗分布
- 每月 LLM 成本实测
- L4 关系人注入对成本的影响占比

**审计输出**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\ops\token-audit-2026-07.md`

**审计决策矩阵**：

| 实测月成本 | 决策 |
|-----------|------|
| < 2000 元 | 维持现状，3 个月后再审 |
| 2000-5000 元 | 切换更便宜的 Provider 优先级 |
| > 5000 元 | 砍 L4 关系人注入 + 全量重审 L3 记忆策略 |

### 5.2 C9 — 整线叫停机制（最高优先级硬规则）

**触发器**：每周一上午 10:00 自动检查

**检查项**：
- 上一周 PR 数（> 0 才算有进展）
- 上一周测试通过率（> 80% 才算合格）
- 上一周 Demo 视频（仅 L4 需要）

**触发动作**：
1. 连续 2 周无进展 → 自动在 `00-overview.md` 末尾追加"⚠️ 停滞告警"
2. 通知 CEO（飞书/邮件）
3. CEO 决策三选一：继续（延 1 周）/ 暂停（冻结任务卡）/ 砍掉（标记 cancelled）

**4 线停滞响应阈值**：

| 线 | 2 周无进展动作 | 4 周无进展动作 |
|----|--------------|--------------|
| L2 | 自动 CEO review + 现场 debug | 砍 L2，全线降级到 mini |
| L1 | CEO 复盘 20 对话样例 | 砍 L1，L2 直出原文 |
| L3 | 暂停 9 节点，回 mini 3 态 | 砍 L3，记忆降级本地存储 |
| L4 | 与画师沟通 | 砍 L4 视觉，留 5 维旁批 |

---

## 六、文档索引

### 6.1 口径源

| 文档 | 路径 | 用途 |
|------|------|------|
| **唯一口径源** | `_ground-truth.md` | 全文档集唯一真相源，矛盾处以本文件为准 |

### 6.2 分线文档

| 文档 | 路径 | 优先级 | 关键决策 |
|------|------|--------|---------|
| **L1 内容线** | `engineering-handoff-L1-content.md` | P1 | D1（入代码 + 人读参考 md） |
| **🔴 L2 Pipeline** | `engineering-handoff-L2-pipeline.md` | **🔴 P0 最高** | D2（启动 + 拆 1a/1b） |
| **L3 记忆线** | `engineering-handoff-L3-memory.md` | P2 | D3（灰度 1%→10%→50%）/ D4（RELATIONS_TIER=core_only 写死） |
| **L4 角色体验** | `engineering-handoff-L4-character.md` | P3（与 L2 并行） | D7（8 道具）/ D8（5 色）/ D9（C 级 IP 锚点）/ D10（L0 并行） |

### 6.3 战线文档

| 文档 | 路径 | 优先级 |
|------|------|--------|
| **P0 生产稳定** | `engineering-handoff-P0-production-stability.md` | 🔴 P0 |
| **P1 收入链路** | `engineering-handoff-P1-revenue-pipeline.md` | P1 |
| **P2 能力增强** | `engineering-handoff-P2-capability-enhancement.md` | P2 |

---

## 附录 A：完整文件路径

- 拍板文件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
- 计划源文件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-overview.md`
- 4 线详情：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-01-content.md` / `line-02-pipeline.md` / `line-03-memory.md` / `line-04-character-experience.md`
- 6 项 P1 补缺：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\DOD-开发整改计划.md` / `RACI-开发整改计划.md` / `mini-state-machine-design.md` / `rollback-sop.md` / `p1-1-psychology-audit.md` / `docs/product/privacy-framework.md`
- 上游基础文档：`C:\Users\10919\Downloads\张半山角色设定.docx`（V1.1，doc-IP-V1.1）
- 工程交接包：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\`（8 份 + 1 口径源）

---

*生成日期：2026-06-14 | 修订日期：2026-06-15（v2.0 代码态修正）*
*下次更新：Week 4 P0 修管完成时*
