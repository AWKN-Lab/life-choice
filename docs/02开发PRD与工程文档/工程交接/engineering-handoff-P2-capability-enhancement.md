# P2 能力增强战线工程交接

> **版本**：v2.0
> **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **生成日期**：2026-06-14
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md` §一 D1-D12 + §三 战略
> **优先级**：🟠 **P2**（P1 收入主链路跑通后启动，Week 8+）
> **工期**：18 周（P2 阶段，Week 8-26）
> **目标读者**：天火（架构 Lead）、后端 Lead、前端 Lead、程序员
> **依赖阻塞**：P1（L2 Pipeline 串联完成 + 收入主链路跑通）

---

## 〇、阅读路径

```
本文档 §一  ←  变更摘要 + 影响范围（爆炸半径）  ← 天火/程序员先看
        §二  ←  接口契约（8 任务卡 + 跨线接触点） ← 核心交付
        §三  ←  数据变更（Prisma schema + 前端数据）← 后端必看
        §四  ←  测试用例（8 任务卡验收标准）       ← 验收
        §五  ←  部署说明（灰度策略 + 环境变量）    ← 上线
        §六  ←  回滚方案（逐任务回退）             ← 应急
        §七  ←  RACI + 技术约束                   ← 责任到人
```

---

## 一、变更摘要 + 影响范围（爆炸半径）

### 1.1 变更摘要

#### 第二优先级（P1 跑通后立即启动）

| # | 变更 | 价值 | 启动条件 | 预计耗时 |
|---|------|------|---------|---------|
| **P2-1** | L1 内容入码（20 对话样例 + **15 断句** + 20 追问） | 输出质量显著提升 | L2 Pipeline 串联完成 | 13 天 |
| **P2-2** | L3 高风险拦截增强 + 测试集补充 | 安全底线增强 | L2 Pipeline 串联完成 | 3 天 |
| **P2-3** | L3 记忆触发（7 类正则） | "记得住你" | L1 入码完成 | 5 天 |
| **P2-4** | L4 关系人独立配置抽取 + 口头禅场景匹配优化 | "更像张半山" | P1-3 身份注入完成 | 6 天 |

#### 第三优先级（P2-1~4 完成后）

| # | 变更 | 价值 | 启动条件 | 预计耗时 |
|---|------|------|---------|---------|
| **P2-5** | L3 9 节点状态机 | 长期陪伴闭环 | P2-3 记忆触发完成 | 8 天 |
| **P2-6** | L3 主动出击（10 场景） | 回访留存 | P2-5 状态机完成 | 5 天 |
| **P2-7** | L4 视觉 5 色 + 8 道具 | 品牌统一 | P1 收入链路稳定 | 9 天 |
| **P2-8** | L0 画师对接 | IP 视觉资产 | P2-7 启动时并行 | 外包周期 |

#### 明确延后

| 延后项 | 原因 |
|--------|------|
| A/B 测试框架 | 流量不够大时无意义，先用 feature flag |
| 8 道具组件化 | 视觉不是当前付费瓶颈 |
| L3 全量灰度设计 | 先做 mini 3 态 |

### 1.2 影响范围（爆炸半径）

| 影响层 | 涉及文件/目录 | 风险 | 涉及任务 |
|--------|--------------|------|---------|
| **后端核心 — 分类器** | `consult/classifier/user-state-classifier.service.ts` | 🔴 高 | P2-1 |
| **后端核心 — 提示词** | `consult/orchestrator/prompt-layers.ts` | 🔴 高 | P2-1, P2-4 |
| **后端核心 — 记忆** | `consult/memory/user-memory.service.ts` + `memory-extractor.service.ts` | 🔴 高 | P2-3, P2-5 |
| **后端核心 — 回访** | `consult/followup/followup.processor.ts` | 🟠 中 | P2-6 |
| **后端核心 — 安全** | `consult/safety/high-risk-detector.service.ts` + `crisis-keywords.ts` + `scenario-rules.yaml` | 🔴 高 | P2-2（⚠️ 已实现，P2-2 为增强+测试集补充） |
| **后端核心 — 状态机** | `consult/orchestrator/emotion-state.ts` | 🔴 高 | P2-5 |
| **后端核心 — 角色** | `consult/orchestrator/zhangbanshan-scheduler.service.ts` | 🟠 中 | P2-4 |
| **后端核心 — 身份层** | `consult/orchestrator/prompt-layers.ts`（⚠️ 已实现 buildIdentityLayer()） | 🔴 高 | P2-4（关系人独立配置抽取） |
| **数据库** | `prisma/schema.prisma`（UserMemory / ConsultFollowUp 新增字段） | 🔴 高 | P2-3, P2-5, P2-6 |
| **前端数据** | `app/src/data/`（scenarios/clauses/followups 子目录待建） | 🟠 中 | P2-1 |
| **前端配置** | `app/tailwind.config.js`（5 色 token） | 🟡 中 | P2-7 |
| **前端组件** | `app/src/components/`（道具/旁批组件） | 🟡 中 | P2-7 |
| **LLM Provider** | 6 通道 failover（不变） | 🟢 低 | — |
| **部署** | `pm2 reload` + 环境变量 | 🟢 低 | 全部 |

**爆炸半径**：约 45 个文件（含新建），最大风险是 schema 迁移 + 记忆/状态机行为变更 + 高风险拦截误判。

---

## 二、接口契约

### 2.1 8 任务卡明细

| 任务卡 | 名称 | 工期 | 验收 | 依赖 |
|--------|------|------|------|------|
| **P2-1** | L1 内容入码 | 13 天 | 20 对话样例 + 15 断句（5 类 × 3 条精选） + 20 追问（4 类 UserState × 5 条） + 单测 | L2 Pipeline 串联 |
| **P2-2** | L3 高风险拦截增强 + 测试集补充 | 3 天 | 4 段拦截率 100%（40/40）+ 测试集 ≥100 条 | L2 Pipeline 串联 |
| **P2-3** | L3 记忆触发 7 类正则 | 5 天 | 7 类触发准确率 ≥80%（56/70） | P2-1 完成 |
| **P2-4** | L4 关系人独立配置抽取 + 口头禅场景匹配优化 | 6 天 | 关系人独立配置文件 + 口头禅场景匹配 ≥85% | P1-3 身份注入 |
| **P2-5** | L3 9 节点状态机 | 8 天 | 9 节点流转 e2e 100% + 1% 灰度 | P2-3 完成 |
| **P2-6** | L3 主动出击 10 场景 | 5 天 | 10 场景覆盖 + 投诉率 <1% | P2-5 完成 |
| **P2-7** | L4 视觉 5 色 + 8 道具 | 9 天 | 5 色 token + 8 道具组件 + C 级 3 锚点 | P1 收入稳定 |
| **P2-8** | L0 画师对接 | 外包周期 | 7 PNG + 1 PSD + 1 立绘 + C 级验收 | P2-7 启动并行 |

### 2.2 跨线接触点矩阵

| 提供方 ↓ / 消费方 → | P2-1 内容 | P2-2 安全 | P2-3 记忆 | P2-4 角色 | P2-5 状态机 | P2-6 回访 | P2-7 视觉 | P2-8 画师 |
|---------------------|-----------|-----------|-----------|-----------|------------|-----------|-----------|-----------|
| **P2-1 内容** | — | 提供 4 类 UserState | 提供 5 类断句 | 提供对话样例 | — | — | — | — |
| **P2-2 安全** | 消费 UserState | — | — | — | 提供风险检测结果 | — | — | — |
| **P2-3 记忆** | — | — | — | — | 提供 4 JSON 字段 | 提供 7 类记忆 | — | — |
| **P2-4 角色** | 消费对话样例 | — | — | — | — | — | 提供 6 句口头禅 | — |
| **P2-5 状态机** | — | 消费风险检测 | 消费 4 JSON 字段 | — | — | 提供 followup_due 状态 | — | — |
| **P2-6 回访** | — | — | 消费 7 类记忆 | — | 消费 followup_due | — | — | — |
| **P2-7 视觉** | — | — | — | 消费口头禅 | — | — | — | 消费 PNG/PSD |
| **P2-8 画师** | — | — | — | — | — | — | 提供 7 PNG + 1 PSD | — |

### 2.3 关键 TypeScript 契约

#### P2-1：20 对话样例 + 15 断句 + 20 追问

> **引用**：详细设计见 L1 内容线交接文档 `engineering-handoff-L1-content.md` §三
> **P2 差异**：L1 定义了完整数据结构与入码规范，P2-1 仅负责执行入码 + 补充断句量（15 条精选）

```typescript
// === 对话样例 ===
type DialogueSample = {
  id: string;
  category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship';
  scenario: string;
  userState: UserState;
  samples: Array<{
    user: string;          // 用户输入
    halfMountain: string;  // 半山口吻原句
    detail: string;        // 详批
    cost: string;          // 代价
    nextAction: string;    // 下一步
  }>;
};

// === 15 断句（5 类 × 3 条精选） ===
// ⚠️ 50-80 条为长期规划量，P2-1 先做 15 条精选（与 L1 对齐）
type Clause = {
  id: string;
  category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship';
  text: string;           // 张半山口吻原句
  halfMountain: string;   // 半山注（不直白，给一寸）
  fit: string[];          // 适合人群
  cost: string;           // 代价
  action: string;         // 下一步
};

// === 20 追问（4 类 UserState × 5 条） ===
type FollowupQuestion = {
  id: string;
  userState: UserState;
  trigger: string;        // 触发条件描述
  question: string;       // 张半山追问句
  purpose: string;        // 追问目的
};
```

#### P2-2：4 段高风险拦截（⚠️ 已实现，任务改为增强 + 测试集补充）

> **已实现**：`high-risk-detector.service.ts` + `crisis-keywords.ts` + `scenario-rules.yaml`
> P2-2 任务范围：关键词/规则增强 + 测试集补充（≥100 条）+ 误拦截率回归

```typescript
type HighRiskCategory = 'medical' | 'legal' | 'financial' | 'life';

type HighRiskDetection = {
  category: HighRiskCategory;
  confidence: number;     // 0-1
  matchedKeywords: string[];
  action: 'lockdown' | 'redirect' | 'warn';
  redirectMessage: string; // 引导文案
};

// 生命类 → lockdown（立即停止 LLM + 危机热线）
// 医疗/法律/金融 → redirect（提示咨询专业人士 + 不接 LLM 深度分析）
```

#### P2-3：7 类记忆触发正则

> **引用**：详细设计见 L3 记忆线交接文档 `engineering-handoff-L3-memory.md` §三
> **P2 差异**：L3 定义了记忆服务架构，P2-3 将触发类型从 5 类扩展为 7 类正则，存储从单 triggers 字段改为 4 JSON 字段

```typescript
// 7 类正则规则（替代原 5 类：major_issue/time_anchor/person_anchor/bottom_line/repeat_pattern）
type MemoryTriggerType =
  | 'identity'       // 身份识别（职业/角色/身份转变）
  | 'family'         // 家庭关系（婚姻/亲子/家庭矛盾）
  | 'career'         // 职业发展（跳槽/升职/创业/转行）
  | 'relationship'   // 人际关系（合作/背叛/信任/社交）
  | 'finance'        // 财务决策（投资/负债/收入变动）
  | 'health'         // 健康状况（身体/心理/作息）
  | 'decision';      // 关键决策（二选一/重大选择/犹豫不决）

type MemoryTrigger = {
  type: MemoryTriggerType;
  content: string;
  confidence: number;     // 0-1
  matchedPattern: string; // 命中的正则模式
  source: 'user_input' | 'llm_extracted' | 'behavior_inferred';
};

// 存储：4 JSON 字段（替代原 triggers 单字段）
// chartHistory:     起卦历史摘要
// consultHistory:   咨询历史摘要
// timelineEvents:   时间线事件（含 7 类触发）
// insights:         洞察/模式总结
```

#### P2-4：6 关系人 + 6 句口头禅（⚠️ 身份层已实现，任务改为关系人独立配置抽取 + 口头禅场景匹配优化）

> **引用**：详细设计见 L4 角色线交接文档 `engineering-handoff-L4-character.md` §四
> **P2 差异**：L4 定义了身份层架构与关系人/口头禅数据结构，P2-4 将关系人从硬编码抽取为独立配置文件，口头禅匹配从关键词升级为语义匹配
>
> **已实现**：`prompt-layers.ts` `buildIdentityLayer()` — 身份层注入已可用
> P2-4 任务范围：关系人从硬编码抽取为独立配置文件 + 口头禅场景匹配从简单关键词升级为语义匹配

```typescript
// === 关系人（D4 拍板：核心 4 始终注入，可选 2 永远不开） ===
type RelationPerson = {
  key: string;
  name: string;
  role: string;           // 张半山世界中的角色
  influenceScope: string; // 影响范围
  voiceTone: string;      // 说话风格
  tier: 'core' | 'optional'; // core=始终注入, optional=永远不开
};

const RELATIONS: RelationPerson[] = [
  { key: 'father',    name: '张景衡', role: '父',       influenceScope: '家族/传承', voiceTone: '沉稳/隐忍', tier: 'core' },
  { key: 'mother',    name: '陈素娴', role: '母',       influenceScope: '情感/底线', voiceTone: '温柔/坚定', tier: 'core' },
  { key: 'superior',  name: '何启明', role: '旧上级',   influenceScope: '事业/格局', voiceTone: '冷峻/务实', tier: 'core' },
  { key: 'colleague', name: '梁予舟', role: '旧同事',   influenceScope: '人际/信任', voiceTone: '直率/仗义', tier: 'core' },
  { key: 'system',    name: '魏峙',   role: '系统伙伴', influenceScope: '—',         voiceTone: '—',         tier: 'optional' }, // 永不开
  { key: 'tea',       name: '阿盛',   role: '茶档老板', influenceScope: '—',         voiceTone: '—',         tier: 'optional' }, // 永不开
];

// === 6 句口头禅 ===
type Catchphrase = {
  id: string;
  text: string;
  triggerCondition: string; // 触发场景
  priority: number;         // 注入优先级（1 最高）
};

const CATCHPHRASES: Catchphrase[] = [
  { id: 'cp-1', text: '先别急着断。',                           triggerCondition: '用户急于求结论',           priority: 1 },
  { id: 'cp-2', text: '这件事，先摊开。',                       triggerCondition: '用户问题模糊/信息不足',     priority: 2 },
  { id: 'cp-3', text: '你问的是前路，我先看脚下。',             triggerCondition: '用户问远期规划',           priority: 3 },
  { id: 'cp-4', text: '这个机会亮，但亮的东西未必适合拿在手里。', triggerCondition: '用户面对诱惑/好机会',     priority: 4 },
  { id: 'cp-5', text: '你现在缺的不是答案，是知道自己站在哪一段。', triggerCondition: '用户迷茫/反复问',       priority: 5 },
  { id: 'cp-6', text: '我把局摊开。最后那一步，你自己走。',     triggerCondition: '报告输出/行动确认',       priority: 6 },
];
```

#### P2-5：9 节点状态机（🆕 新建）

> **当前状态**：不存在 9 节点状态机。当前隐含 7 节点在 `zhangbanshan-scheduler.service.ts`（Node 0-6）
>
> **迁移路径**：
> 1. 现有 7 节点（Node 0-6）映射到 9 节点：`Node0→cold_start`, `Node1→first_issue`, `Node2→context_collecting`, `Node3→chart_ready`, `Node4→first_judgment`, `Node5→action_confirm`, `Node6→feedback_received`
> 2. 新增 2 节点：`followup_due`（回访到期）、`long_memory_update`（长期记忆更新）
> 3. 迁移步骤：① 新建 `state-machine.service.ts`（XState 5.x 或自研轻量）→ ② 从 `zhangbanshan-scheduler.service.ts` 抽取 Node 0-6 逻辑 → ③ 添加 `followup_due` + `long_memory_update` 节点 → ④ 灰度切换（`USE_9_NODE_MACHINE` 开关）→ ⑤ 验证 e2e 后下线旧 7 节点

```typescript
type NodeState =
  | 'cold_start'          // 冷启动
  | 'first_issue'         // 首次问题
  | 'context_collecting'  // 上下文收集
  | 'chart_ready'         // 起卦就绪
  | 'first_judgment'      // 首次判断
  | 'action_confirm'      // 行动确认
  | 'followup_due'        // 回访到期
  | 'feedback_received'   // 收到反馈
  | 'long_memory_update'; // 长期记忆更新

interface StateMachineContext {
  userId: string;
  currentState: NodeState;
  stateEnteredAt: Date;
  issueId?: string;
  chartData?: any;
  reportId?: string;
  followupScheduledAt?: Date;
  lastFeedbackAt?: Date;
}
```

#### P2-6：10 场景主动出击

```typescript
type ActiveMoveScenario =
  | 'birthday_reminder'       // 生日提醒
  | 'season_change'           // 季节交替
  | '3day_inactive'           // 3 天未活跃
  | '7day_inactive'           // 7 天未活跃
  | 'followup_reminder'       // 回访提醒
  | 'issue_anniversary'       // 问题周年
  | 'lucky_period_hint'       // 运势窗口
  | 'new_feature_intro'       // 新功能介绍
  | 'cost_warning'            // 代价提醒
  | 'encouragement';          // 加油鼓励

type ActiveMove = {
  scenario: ActiveMoveScenario;
  triggerCondition: string;
  messageTemplate: string;   // 张半山口吻模板
  cooldownDays: number;      // 冷却天数
  userCanDisable: boolean;   // 用户可关闭
};
```

#### P2-7：5 色 + 8 道具（⚠️ 5 色 token 从 AETHERIA 迁移到 mbs-*）

> **迁移说明**：5 色 token 命名从 AETHERIA 旧命名体系迁移到 mbs-* 体系
>
> **迁移步骤**：
> 1. 在 `tailwind.config.js` 中添加 mbs-* 新 token（与旧 AETHERIA token 并存）
> 2. 全局搜索替换旧色引用（`mbs-city` → `mbs-blue`，`mbs-lake` → `mbs-copper` 等）
> 3. 确认旧 token 零引用后删除旧 token 定义
> 4. 运行 `LEGACY_COLORS_ALLOWED=false` 构建验证

```typescript
// === 5 色（D8 拍板） ===
const ZHANGBANSHAN_COLORS = {
  'mbs-ink':    '#1A1A1A',  // 半山墨黑（背景主色）
  'mbs-paper':  '#F5F0E8',  // 米白（纸面）
  'mbs-blue':   '#3A5F8F',  // 青花瓷蓝（强调）
  'mbs-white':  '#FFFFFF',  // 瓷白（亮面）
  'mbs-copper': '#B8956A',  // 铜线金（点缀）
} as const;

// === 8 道具（D7 拍板） ===
type PropItem = {
  id: string;
  name: string;
  description: string;
  componentPath: string;
  colorToken: keyof typeof ZHANGBANSHAN_COLORS;
};

const PROPS: PropItem[] = [
  { id: 'white-deer-pin',      name: '白鹿瓷领针',       description: 'S 级人物符号（左胸）',       componentPath: 'icons/WhiteDeerPin.tsx',           colorToken: 'mbs-paper' },
  { id: 'blue-glasses',        name: '青花蓝细框眼镜',   description: '镜腿内侧青花蓝',             componentPath: 'icons/BlueGlasses.tsx',             colorToken: 'mbs-blue' },
  { id: 'leather-book',        name: '黑皮铜角本',       description: '旧笔记本',                   componentPath: 'icons/LeatherBook.tsx',             colorToken: 'mbs-ink' },
  { id: 'white-deer-weight',   name: '白鹿瓷镇',         description: '桌面摆件',                   componentPath: 'icons/WhiteDeerPaperweight.tsx',    colorToken: 'mbs-paper' },
  { id: 'kline-chart',         name: '青花线人生K线',    description: '视觉化报告',                 componentPath: 'icons/KLineChart.tsx',              colorToken: 'mbs-blue' },
  { id: 'tidal-radar',         name: '鄱湖水位潮汐雷达图', description: '时机判断',                 componentPath: 'icons/TidalRadar.tsx',              colorToken: 'mbs-blue' },
  { id: 'warm-lamp',           name: '窑火暖灯',         description: '氛围光',                     componentPath: 'icons/WarmLamp.tsx',                colorToken: 'mbs-copper' },
  { id: 'compass',             name: '小罗盘',           description: '决策辅助',                   componentPath: 'icons/Compass.tsx',                 colorToken: 'mbs-copper' },
];
```

#### P2-8：画师交付物

```typescript
type ArtistDeliverable = {
  id: string;
  filename: string;
  format: 'png' | 'psd';
  description: string;
  acceptanceLevel: 'A' | 'B' | 'C'; // 验收等级
  consumer: string;                  // L4 消费组件
};

const DELIVERABLES: ArtistDeliverable[] = [
  { id: 'd-1', filename: 'zhangbanshan-full.png',       format: 'png', description: '完整角色设定图',     acceptanceLevel: 'A', consumer: '主视觉源' },
  { id: 'd-2', filename: 'zhangbanshan-3view.png',      format: 'png', description: '三视图',             acceptanceLevel: 'A', consumer: '角色一致性' },
  { id: 'd-3', filename: 'zhangbanshan-avatar.png',     format: 'png', description: '头像定型',           acceptanceLevel: 'A', consumer: 'Avatar.tsx' },
  { id: 'd-4', filename: 'zhangbanshan-emotions.png',   format: 'png', description: '五表情差分',         acceptanceLevel: 'B', consumer: '5 维旁批' },
  { id: 'd-5', filename: 'zhangbanshan-clothing.png',   format: 'png', description: '服装细节',           acceptanceLevel: 'B', consumer: '服装组件' },
  { id: 'd-6', filename: 'zhangbanshan-shoes.png',      format: 'png', description: '鞋子细节',           acceptanceLevel: 'B', consumer: '鞋组件' },
  { id: 'd-7', filename: 'zhangbanshan-props.png',      format: 'png', description: '配饰核心道具+色卡',  acceptanceLevel: 'B', consumer: '8 道具组件' },
  { id: 'd-8', filename: 'zhangbanshan-source.psd',     format: 'psd', description: 'PSD 分层源文件',     acceptanceLevel: '—', consumer: '二次编辑' },
  { id: 'd-9', filename: 'zhangbanshan-render.png',     format: 'png', description: '白底透明 PNG 立绘',  acceptanceLevel: 'C', consumer: 'L4.3 道具组件化' },
];

// C 级 3 项 IP 锚点（100% 命中，缺一未锁定）
const IP_ANCHORS = [
  { name: '半山痣',       description: '左眼下极淡',                 mustHit: true },
  { name: '青花蓝细框眼镜', description: '镜腿内侧青花蓝',             mustHit: true },
  { name: '白鹿瓷领针',     description: '素白瓷小鹿 + 一只鹿角极淡裂纹', mustHit: true },
];
```

### 2.4 API 接口变更

#### P2-2：高风险拦截（嵌入现有 Pipeline）

```typescript
// 在 4 路由 + 两段式漏斗 + ReAct 的 Risk 段后增加高风险拦截层
// POST /api/v1/consult — Request 不变，Response 增加 highRisk 字段

// Response（高风险时）
{
  data: null,
  error: {
    code: 'HIGH_RISK_DETECTED',
    message: '检测到高风险内容，已停止分析',
    details: {
      category: 'life',           // HighRiskCategory
      redirectMessage: '如果您正在经历困难时刻，请拨打24小时心理援助热线：400-161-9995',
      matchedKeywords: ['自杀']
    }
  }
}
```

#### P2-3：记忆触发（嵌入现有 Memory 模块）

```typescript
// GET /api/v1/memory/:userId — Response
{
  data: {
    userId: string;
    triggers: MemoryTrigger[];      // 新增：7 类记忆触发
    chartHistory: Json;             // 新增：起卦历史摘要
    consultHistory: Json;           // 新增：咨询历史摘要
    timelineEvents: Json;           // 新增：时间线事件（含 7 类触发）
    insights: Json;                 // 新增：洞察/模式总结
    identity: Json;                 // 已有
    preference: Json;               // 已有
    issues: Json;                   // 已有
  } | null,
  error: { code: string; message: string } | null
}
```

#### P2-5：状态机查询

```typescript
// GET /api/v1/state/:userId — 新增
// Response
{
  data: {
    userId: string;
    currentState: NodeState;
    stateEnteredAt: string;         // ISO 8601
    stateData: StateMachineContext;
    availableTransitions: NodeState[];
  } | null,
  error: { code: string; message: string } | null
}
```

#### P2-6：主动出击

```typescript
// POST /api/v1/active-move — 新增（内部调用，不暴露前端）
// Request
{
  userId: string;
  scenario: ActiveMoveScenario;
  context?: Json;
}

// Response
{
  data: {
    sent: boolean;
    message: string;
    scheduledAt?: string;
  } | null,
  error: { code: string; message: string } | null
}
```

---

## 三、数据变更

### 3.1 Prisma Schema 新增/修改

```prisma
// === P2-3：记忆触发 ===
model UserMemory {
  id            String   @id @default(cuid())
  userId        String

  // 已有字段
  identity      Json?    // { name, gender, age, occupation }
  preference    Json?    // { tone: 'concise' | 'detailed', ... }
  issues        Json?    // [{ id, category, status, ... }]
  feedbacks     Json?    // [{ type, content, at }]
  timings       Json?    // [{ type, date, note }]

  // P2-3 新增：7 类记忆触发 + 4 JSON 字段
  chartHistory    Json?    // 起卦历史摘要
  consultHistory  Json?    // 咨询历史摘要
  timelineEvents  Json?    // 时间线事件（含 7 类 MemoryTrigger）
  insights        Json?    // 洞察/模式总结

  // P2-5 新增：9 节点状态机
  state         String   @default("cold_start")
  stateData     Json?    // StateMachineContext
  stateEnteredAt DateTime @default(now())

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@map("UserMemory")
}

// === P2-5：状态机日志 ===
model StateTransitionLog {
  id            String   @id @default(cuid())
  userId        String
  fromState     String   // NodeState
  toState       String   // NodeState
  triggerEvent  String   // 触发事件
  contextJson   Json?    // StateMachineContext 快照
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
  @@map("StateTransitionLog")
}

// === P2-6：回访/主动出击 ===
model ConsultFollowUp {
  id            String   @id @default(cuid())
  userId        String
  issueId       String
  scenario      String   // ActiveMoveScenario
  scheduledAt   DateTime
  sentAt        DateTime?
  feedbackAt    DateTime?
  feedbackJson  Json?
  status        String   // scheduled/sent/feedback_received/skipped/disabled

  @@index([userId, scheduledAt])
  @@map("ConsultFollowUp")
}

// === P2-2：高风险拦截日志 ===
model HighRiskLog {
  id            String   @id @default(cuid())
  userId        String
  category      String   // HighRiskCategory
  confidence    Float
  matchedKeywords Json   // string[]
  action        String   // lockdown/redirect/warn
  userMessage   String   // 脱敏后的用户输入
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
  @@map("HighRiskLog")
}
```

### 3.2 前端数据目录（P2-1）

```
apps/AWKN-LABlife/app/src/data/
├── dialogueSamples/          ← P2-1 新建
│   ├── types.ts              # DialogueSample 类型定义
│   ├── career.ts             # 4 条 career 样例
│   ├── wealth.ts             # 4 条 wealth 样例
│   ├── noble.ts              # 4 条 noble 样例
│   ├── timing.ts             # 4 条 timing 样例
│   ├── relationship.ts       # 4 条 relationship 样例
│   └── index.ts              # 汇总导出
├── clauses/                  ← P2-1 新建
│   ├── types.ts              # Clause 类型定义
│   ├── career.ts             # 3 条 career 断句
│   ├── wealth.ts             # 3 条 wealth 断句
│   ├── noble.ts              # 3 条 noble 断句
│   ├── timing.ts             # 3 条 timing 断句
│   ├── relationship.ts       # 3 条 relationship 断句
│   └── index.ts              # 汇总导出
└── followups/                ← P2-1 新建
    ├── types.ts              # FollowupQuestion 类型定义
    ├── casual.ts             # 5 条 casual 追问
    ├── genuine.ts            # 5 条 genuine 追问
    ├── repeating.ts          # 5 条 repeating 追问
    ├── validating.ts         # 5 条 validating 追问
    └── index.ts              # 汇总导出
```

### 3.3 迁移策略

| 阶段 | 动作 | 回滚 |
|------|------|------|
| 1 | `npx prisma migrate dev --name add-p2-tables`（开发） | 删除 migration 文件 |
| 2 | `npx prisma migrate deploy`（生产） | `npx prisma migrate resolve --rolled-back add-p2-tables` |
| 3 | 数据回填（UserMemory 4 JSON 字段从已有 issues 提取） | 备份恢复 |

**回滚 SOP**：见 `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\rollback-sop.md`

---

## 四、测试用例

### 4.1 P2-1：L1 内容入码

| 测试类型 | 用例 | 预期 |
|---------|------|------|
| 单测 | 20 对话样例结构完整性 | 每条 5 字段非空 |
| 单测 | 15 断句 zod schema 校验 | 100% 通过 |
| 单测 | 20 追问按 UserState 分组 | 每类 5 条 |
| 单测 | 对话样例 halfMountain 口吻检查 | 含张半山特征词 |
| 集成 | 对话样例 → Prompt Compiler | 编译不报错 |
| 集成 | 断句 → L2 Pipeline clauses 段 | 三套输出 clauses 段非空 |

### 4.2 P2-2：高风险拦截 4 段

| 测试类型 | 用例 | 预期 |
|---------|------|------|
| 单测 | 医疗关键词 10 条 | 10/10 拦截 |
| 单测 | 法律关键词 10 条 | 10/10 拦截 |
| 单测 | 金融关键词 10 条 | 10/10 拦截 |
| 单测 | 生命关键词 10 条 | 10/10 lockdown |
| 单测 | 正常问题 20 条 | 0/20 误拦截 |
| 集成 | 高风险 → Pipeline 停止 → 降级文案 | 不走 LLM |
| e2e | "我想自杀" → 危机热线展示 | 页面显示热线 |

**验收**：拦截率 100%（40/40），误拦截率 0%（0/20）

### 4.3 P2-3：记忆触发 7 类正则

| 测试类型 | 用例 | 预期 |
|---------|------|------|
| 单测 | identity 触发 10 条 | ≥8/10 正确 |
| 单测 | family 触发 10 条 | ≥8/10 正确 |
| 单测 | career 触发 10 条 | ≥8/10 正确 |
| 单测 | relationship 触发 10 条 | ≥8/10 正确 |
| 单测 | finance 触发 10 条 | ≥8/10 正确 |
| 单测 | health 触发 10 条 | ≥8/10 正确 |
| 单测 | decision 触发 10 条 | ≥8/10 正确 |
| 集成 | 记忆触发 → UserMemory.timelineEvents 写入 | JSON 合法 |
| 集成 | 记忆触发 → Prompt Compiler 注入 | prompt 含记忆上下文 |

**验收**：7 类触发准确率 ≥80%（56/70 正确）

### 4.4 P2-4：关系人 + 口头禅注入

| 测试类型 | 用例 | 预期 |
|---------|------|------|
| 单测 | 核心 4 关系人注入 prompt | 4 人全部出现 |
| 单测 | 可选 2 关系人不注入 | 0 人出现 |
| 单测 | 6 句口头禅按场景匹配 | 匹配率 ≥80% |
| 单测 | RELATIONS_TIER=core_only 强制 | 写死 |
| 集成 | 关系人注入 → LLM token 消耗 | ≤2000 token/次 |
| 集成 | 口头禅 → 三套输出 halfMountain 段 | 含口头禅特征 |

**验收**：核心 4 始终注入 + 可选 2 永不注入 + 口头禅匹配 ≥80%

### 4.5 P2-5：9 节点状态机

| 测试类型 | 用例 | 预期 |
|---------|------|------|
| 单测 | cold_start → first_issue | 合法转换 |
| 单测 | 完整 9 节点顺序流转 | 全部成功 |
| 单测 | 非法跳转（cold_start → chart_ready） | 抛错 |
| 单测 | action_confirm → followup_due | 3-7 天后触发 |
| 单测 | long_memory_update → first_issue | 回到下一轮 |
| 集成 | 状态机 + 记忆触发 | 状态转换触发记忆写入 |
| 集成 | 状态机 + 回访调度 | followup_due → BullMQ 调度 |
| e2e | 新用户首次咨询 → 完整流转 | 9 节点全部经过 |

**验收**：9 节点 e2e 流转 100% + 非法跳转 100% 拦截

### 4.6 P2-6：主动出击 10 场景

| 测试类型 | 用例 | 预期 |
|---------|------|------|
| 单测 | 10 场景模板完整性 | 每场景有 messageTemplate |
| 单测 | 冷却天数检查 | 不超频发送 |
| 单测 | 用户关闭后不发送 | disabled 状态跳过 |
| 集成 | BullMQ 调度 → 消息发送 | 定时触发 |
| 集成 | 投诉率监控 | >1% 自动禁发 |
| e2e | 3 天未活跃 → 收到鼓励 | 消息到达 |

**验收**：10 场景覆盖 + 投诉率 <1%

### 4.7 P2-7：5 色 + 8 道具

| 测试类型 | 用例 | 预期 |
|---------|------|------|
| 单测 | 5 色 token 在 tailwind.config.js | 5 个 mbs-* 变量 |
| 单测 | 旧色 mbs-city/mbs-lake 已删除 | 0 引用 |
| 单测 | 8 道具组件渲染 | 无报错 |
| 单测 | 道具颜色匹配 5 色 token | 颜色一致 |
| 集成 | 5 色 → 全页面一致性 | 无非 mbs-* 颜色 |
| 视觉 | C 级 3 锚点在立绘中命中 | 3/3 |

**验收**：5 色 token + 8 道具组件 + C 级 3 锚点 100%

### 4.8 P2-8：画师交付物

| 验收等级 | 范围 | 通过线 | 不通过动作 |
|---------|------|--------|----------|
| **A 级** | 人物脸 8 项 | ≥8 项通过 | 低于 8 项重生 |
| **B 级** | 服装配饰 8 项 | ≥8 项通过 | 低于 8 项重生或局部重绘 |
| **C 级** | IP 锚点 3 项 | **3/3 命中** | 缺一未锁定 |

**10 步施工顺序**：头像定型 → 半身 → 全身 → 三视图 → 表情差分 → 服装 → 鞋子 → 配饰道具 → 完整设定图 → 主视觉

---

## 五、部署说明

### 5.1 灰度策略

#### P2-2 高风险拦截：全量上线（无灰度）

高风险拦截是安全底线，不做灰度，直接全量。但保留开关：

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `HIGH_RISK_MODE` | `lockdown` | 高风险模式（lockdown/redirect/warn） |
| `HIGH_RISK_BLOCKLIST` | `medical,legal,financial,life` | 4 类全开 |

#### P2-3 记忆触发：1% → 10% → 50% → 100%

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `MEMORY_TRIGGER_ENABLED` | `false` | 记忆触发开关 |
| `MEMORY_TRIGGER_PCT` | `0` | 灰度百分比（0/1/10/50/100） |

#### P2-5 9 节点状态机：1% → 10% → 50% → 100%

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `USE_9_NODE_MACHINE` | `false` | 9 节点开关 |
| `USE_9_NODE_MACHINE_PCT` | `0` | 灰度百分比（0/1/10/50/100） |
| `MINI_3_STATE_FALLBACK` | `true` | mini 3 态兜底（必开） |

**灰度顺序**：
```
Week 1: 9 节点 1%（mini 99%）
  ↓ 48h 无 crash
Week 2-3: 9 节点 10%（mini 90%）
  ↓ 无 e2e 失败 > 5%
Week 4-8: 9 节点 50%（mini 50%）
  ↓ 无投诉率 > 1%
Week 9-13: 9 节点 100%（mini 兜底仅故障时）
```

#### P2-6 主动出击：场景逐个灰度

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `ACTIVE_MOVES_ENABLED` | `false` | 主动出击总开关 |
| `ACTIVE_MOVES_TYPE_BLOCKLIST` | `birthday_reminder,season_change,...` | 黑名单（列入的不发） |
| `ACTIVE_MOVES_COMPLAINT_THRESHOLD` | `0.01` | 投诉率阈值（1%） |

#### P2-4 关系人注入：写死 core_only

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `RELATIONS_TIER` | `core_only` | 写死，3 个月后再评估 |
| `CATCHPHRASE_ENABLED` | `true` | 口头禅注入开关 |

#### P2-7 视觉：前端发布，无灰度

5 色 token + 8 道具组件是前端静态资源，随版本发布。

### 5.2 部署步骤

```bash
# 1. 拉取代码
cd /opt/awkn-life && git pull origin main

# 2. 安装依赖
npm ci

# 3. 数据库迁移
cd awkn-life-backend/apps/api-server
npx prisma migrate deploy

# 4. 构建前端
cd ../../../app && npm run build

# 5. 重启后端（不中断）
cd /opt/awkn-life && pm2 reload api-server

# 6. 健康检查
curl http://8.148.245.29:3000/health

# 7. 验证灰度开关
curl http://8.148.245.29:3000/api/v1/config/feature-flags
```

---

## 六、回滚方案

### 6.1 逐任务回退

| 任务 | 故障信号 | 降级动作 | 回滚开关 |
|------|---------|---------|---------|
| **P2-1** | 对话样例/断句导致 Prompt 编译失败 | 移除入码数据，回退到 LLM 直出 | `L1_CONTENT_ENABLED=false` |
| **P2-2** | 高风险误拦截率 >5% | 放宽关键词阈值 + 人工审核 | `HIGH_RISK_MODE=warn` |
| **P2-3** | 记忆触发准确率 <80% | 关闭记忆注入，回退到无记忆 | `MEMORY_TRIGGER_ENABLED=false` |
| **P2-4** | 关系人注入导致 token 溢出 | 关闭关系人注入 | `RELATIONS_TIER=disabled` |
| **P2-5** | 9 节点 e2e 失败率 >5% | 切回 mini 3 态 | `USE_9_NODE_MACHINE=false` |
| **P2-6** | 投诉率 >1% | 禁发全部主动出击 | `ACTIVE_MOVES_ENABLED=false` |
| **P2-7** | 5 色 token 导致视觉异常 | 回退旧色 | `LEGACY_COLORS_ALLOWED=true` |
| **P2-8** | 画师交付物 C 级未通过 | 不上线立绘，用占位图 | — |

### 6.2 紧急回滚 SOP

```bash
# 1. 关停 P2 特性
ssh root@8.148.245.29 'cd /opt/awkn-life && \
  pm2 env set USE_9_NODE_MACHINE false && \
  pm2 env set MEMORY_TRIGGER_ENABLED false && \
  pm2 env set ACTIVE_MOVES_ENABLED false'

# 2. 重载
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 reload api-server'

# 3. 健康检查
curl http://8.148.245.29:3000/health

# 4. 如需回滚 schema
cd /opt/awkn-life/awkn-life-backend/apps/api-server
npx prisma migrate resolve --rolled-back add-p2-tables

# 5. 恢复备份（如数据损坏）
cp /backup/sqlite-latest.db prisma/prod.db

# 6. 重启
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 restart api-server'

# 7. 监控 5 分钟
# 确认无 5xx 后回滚完成
```

### 6.3 数据安全

| 风险 | 预防 | 恢复 |
|------|------|------|
| UserMemory.timelineEvents 数据损坏 | zod schema 强校验 | 删 timelineEvents 字段，从 issues 重建 |
| StateTransitionLog 堆积 | 30 天自动清理 | 清空日志表 |
| HighRiskLog 隐私泄露 | userMessage 脱敏 | 清空日志表 |
| ConsultFollowUp 误发 | 冷却检查 + 用户可关闭 | 标记 skipped |

---

## 七、RACI + 技术约束

### 7.1 RACI

| 任务 | R（执行） | A（问责） | C（咨询） | I（知情） |
|------|----------|----------|----------|----------|
| **P2-1** L1 内容入码 | 程序员 | 产品 Lead | 天火 / CEO | 全部 |
| **P2-2** 高风险拦截 | 后端 Lead | CEO | 程序员 / CEO | 全部 |
| **P2-3** 记忆触发 | 后端 Lead | CEO | 程序员 | 全部 |
| **P2-4** 关系人 + 口头禅 | 天火 | CEO | 程序员 / 产品 Lead | 全部 |
| **P2-5** 9 节点状态机 | 天火 | CEO | 后端 Lead | 全部 |
| **P2-6** 主动出击 | 后端 Lead | 产品 Lead | 程序员 | 全部 |
| **P2-7** 视觉 5 色 + 8 道具 | 前端 Lead | CEO | 设计 Lead | 全部 |
| **P2-8** 画师对接 | 设计 Lead | CEO | 天火 / 程序员 | 全部 |
| 数据迁移 | 后端 Lead | CEO | 天火 | 全部 |
| 灰度放量 | 后端 Lead | CEO | 前端 Lead | 全部 |
| 紧急回滚 | 后端 Lead | CEO | 天火 | 全部 |

### 7.2 技术约束

| 约束 | 值 | 适用任务 |
|------|-----|---------|
| 语言 | TypeScript 5.x strict | 全部 |
| 后端框架 | NestJS 10.x | P2-2~6 |
| ORM | Prisma 5.x | P2-2~6 |
| 数据库 | PostgreSQL 16（生产）/ SQLite（开发） | P2-2~6 |
| 队列 | BullMQ 5.x | P2-5, P2-6 |
| 状态机 | XState 5.x 或自研（轻量） | P2-5 |
| 前端框架 | React 18 + Vite 5 | P2-1, P2-7 |
| UI 库 | shadcn/ui + Tailwind 3.x | P2-7 |
| 状态管理 | Zustand | P2-7 |
| 5 色 token | mbs-ink/mbs-paper/mbs-blue/mbs-white/mbs-copper（D8） | P2-7 |
| 验证 | zod | 全部 |
| 测试 | jest + Playwright | 全部 |
| 日志 | Pino（结构化） | 全部 |
| 关系人注入 | core_only（写死） | P2-4 |
| LLM Token 上限 | 2000/次（开启 core_only 后） | P2-4 |
| 数据格式 | TypeScript 文件（不入 JSON/YAML） | P2-1 |
| 字符集 | UTF-8 | 全部 |
| 时区 | UTC 存储 + Asia/Shanghai 展示 | 全部 |

### 7.3 启动门禁

P2 各任务启动前必须满足：

| 任务 | 前置条件 | 验证方式 |
|------|---------|---------|
| P2-1 | L2 Pipeline 串联完成 | 4 路由 + 两段式漏斗 + ReAct e2e 100% |
| P2-2 | L2 Pipeline 串联完成 | 4 路由 + 两段式漏斗 + ReAct e2e 100% |
| P2-3 | P2-1 完成 | 20 对话样例 + 15 断句 + 20 追问入码 |
| P2-4 | P1-3 身份注入完成 | 身份层 prompt-layers.ts buildIdentityLayer() 可用 |
| P2-5 | P2-3 完成 | 7 类记忆触发 ≥80% |
| P2-6 | P2-5 完成 | 9 节点 e2e 100% |
| P2-7 | P1 收入链路稳定 | 连续 7 天无 P0 故障 |
| P2-8 | P2-7 启动 | 5 色 token 确认 |

---

## 附录 A：关键文件路径

### L1 内容

- 前端数据目录：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\data\`（scenarios/clauses/followups 子目录待建）
- 后端分类器：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\classifier\user-state-classifier.service.ts`
- 提示词层：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\prompt-layers.ts`

### L3 记忆

- 记忆服务：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\memory\user-memory.service.ts`
- 记忆提取：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\memory\memory-extractor.service.ts`
- 回访处理：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\followup\followup.processor.ts`
- 高风险检测：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\safety\high-risk-detector.service.ts`
- 危机关键词：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\safety\crisis-keywords.ts`
- 状态机（mini 3 态）：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\emotion-state.ts`
- Prisma schema：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\prisma\schema.prisma`

### L4 角色

- 身份层（待建）：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\identity-layer.ts`
- 角色调度：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\zhangbanshan-scheduler.service.ts`
- 前端配置：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\tailwind.config.js`
- 前端组件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\components\`

### L0 画师

- 画师对接规范：`C:\Users\10919\Downloads\张半山角色设定.docx`（V1.1，doc-IP-V1.1）

### 上游文档

- 拍板文件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
- 计划详情（4 线）：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-01-content.md` / `line-02-pipeline.md` / `line-03-memory.md` / `line-04-character-experience.md`
- 回滚 SOP：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\rollback-sop.md`
- 心理咨询对齐：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\p1-1-psychology-audit.md`
- 隐私框架：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\product\privacy-framework.md`

### 关联工程交接包

- 总览：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-overview.md`
- L1 内容线：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L1-content.md`
- L2 Pipeline：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L2-pipeline.md`
- L3 记忆线：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L3-memory.md`
- L4 角色线：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L4-character.md`

---

*生成日期：2026-06-14*
*修订日期：2026-06-15（v2.0）*
*下次更新：Week 8 P2 启动时*
