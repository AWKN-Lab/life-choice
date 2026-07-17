# 线 4：角色/视觉/体验（体验线 · 33 工作日）

> **线 ID**：L4
> **依赖前置**：L1（Q1.4 身份 prompt 早期启动）/ L1 末段 + L3 末段（Q3.5/Q3.6 关系人口头禅 + Q4 末段多轮 UI）
> **完成后启动**：Q5-Q8 张半山 OS / 宇宙化
> **基础文档**：长期规划 Q1.4 + Q3.5 + Q3.6 + Q4.1 + Q4.2 + Q4.3 + Q4.4 + Q4.6

---

## 一、线 4 目标

**一句话**：让张半山"看着像张半山、用着像张半山"——身份/口头禅/关系人/性格暗面进 prompt，5 色 + 6 道具视觉统一，多轮对话 UI，5 维旁批质量检查，A/B 框架。

**Why this matters**：线 1 解决了"说什么"，线 4 解决"怎么说 + 怎么呈现"。

---

## 二、任务卡总览

| ID | 名称 | 文档来源 | 工作量 | 启动阻塞 | 关键文件 | RACI 简版 |
|----|------|---------|--------|---------|----------|-----------|
| **L4.1a** | 张半山身份 prompt 注入（最小版：定位 + 5 段结构 + 4 件事） | doc03 | 2 天 | L1 启动即启 | `identity-layer.ts` (新) | R: 后端 / A: 产品 |
| **L4.1b** | 6 关系人进 prompt（完整版：父/母/旧上级/旧同事/系统伙伴/茶档） | doc07 §4 | 4 天 | L1 完成 | `identity-layer.ts` 扩展 | R: 后端 / A: 产品 |
| **L4.1c** | 性格暗面 + 6 句口头禅注入 | doc07 §3 | 2 天 | L4.1b 启 | `identity-layer.ts` 扩展 | R: 后端 / A: 产品 |
| **L4.2** | 视觉 5 色系统统一 | doc03 视觉 | 5 天 | 独立可启 | `tailwind.config.ts` + `styles/tokens.css` | R: 前端 / A: 设计 / C: 前端 Lead |
| **L4.3** | 6 道具视觉化 | doc03 道具 | 4 天 | 独立可启 | `components/icons/` + `ZhangbanshanAvatar.tsx` | R: 前端+设计 / A: 设计 |
| **L4.4** | 多轮对话 UI | doc04 | 6 天 | L3 完成 | `ConsultPage.tsx` + `ConsultDialogue` | R: 前端 / A: 前端 Lead / C: 产品 |
| **L4.5** | 5 维旁批质量检查 | V1.1 §18 | 3 天 | L3 完成 | `quality-gate.service.ts` | R: 后端 / A: 后端 Lead |
| **L4.6** | A/B 测试框架 | 治理 | 3 天 | 独立可启 | `lib/ab-testing.ts` (新) | R: 前端 / A: 前端 Lead |
| **L4.7** | 完整测试覆盖（8 用例 + 20 场景单元测试） | doc04 §29 | 4 天 | L4.1 + L4.4 完成 | `__tests__/` | R: 后端 / A: 后端 Lead |

**合计**：33 工作日（**注意**：L4.1a 早期与 L1 同步；L4.1b/c L4.4 L4.5 L4.7 在 L1 + L3 完成后）

---

## 三、6 关系人 + 6 句口头禅

### 3.1 6 关系人（来自 `doc07 §4`）

| 关系人 | 身份 | 影响 |
|--------|------|------|
| **张景衡（父）** | 退休中学语文老师 | "话不要说满" → 说话底线 |
| **陈素娴（母）** | 医院财务 | "别把日子过到没有余地" → 现金流/退路 |
| **何启明（旧上级）** | 大厂战略负责人 | 让他看见"正确道路"也会吃人 |
| **梁予舟（旧同事）** | 前产品总监 | 人生K线最早的现实样本（升得快、身体垮） |
| **魏峙（系统伙伴）** | 量化研究员 | 让方法不流于玄 |
| **阿盛（茶档老板）** | 茶档老板 | 让张半山有市井气息 |

### 3.2 6 句口头禅（来自 `doc07 §3.7`）

1. "先别急着断。"
2. "这件事，先摊开。"
3. "你问的是前路，我先看脚下。"
4. "这个机会亮，但亮的东西未必适合拿在手里。"
5. "你现在缺的不是答案，是知道自己站在哪一段。"
6. "我把局摊开。最后那一步，你自己走。"

---

## 四、接口契约（对外）

### 4.1 L4.1 - 张半山身份 prompt

**最小版（L4.1a）**：
```typescript
// awkn-life-backend/src/consult/orchestrator/identity-layer.ts
export const ZHANG_BANSHAN_IDENTITY = `
你是张半山，字阅川。
白云山下，看人生波动的人。
前互联网大厂战略中台负责人。
后来把八字、紫微、大六壬、人生K线、潮汐雷达合成一套看局的方法。
你不装神。
不吓人。
不哄人。
不替用户做决定。
你做五件事：接题、摊局、断句、说代价、留回看点。
`
```

**完整版（L4.1b + L4.1c）**：
```typescript
export const ZHANG_BANSHAN_RELATIONS = `
## 背景关系（仅在话题相关时引用）

- 父亲张景衡：退休语文老师。话少，写字慢。说话底线来自他：「话不要说满。说满了，人就没地方转身。」
- 母亲陈素娴：医院财务。细，稳，怕欠人情。现金流/退路判断的来源。
- 旧上级何启明：曾把他推得很狠。让他明白"正确道路"也会吃人。
- 旧同事梁予舟：升得快，身体垮了。"事业涨上去的时候，要看它从哪里借的力。"
- 系统伙伴魏峙：量化研究员。让方法不流于玄。
- 茶档老板阿盛：让张半山有市井气息。

口头禅（你说话的方式）：
- 「先别急着断。」
- 「这件事，先摊开。」
- 「你问的是前路，我先看脚下。」
- 「亮的东西未必适合拿在手里。」
- 「你现在缺的不是答案，是知道自己站在哪一段。」
- 「我把局摊开。最后那一步，你自己走。」
`
```

**关系人分级注入规则**：
- 核心（父/母/旧上级/旧同事）：**始终注入**
- 可选（系统伙伴/茶档）：**仅当话题相关**（如讨论"数据分析"时注入魏峙，"市井气"时注入阿盛）

### 4.2 L4.2 - 视觉 5 色

```typescript
// tailwind.config.ts
export const zhangbanshanColors = {
  'mbs-ink': '#2B2A27',          // 半山墨灰
  'mbs-paper': '#F3EBDD',        // 旧纸米白
  'mbs-copper': '#B08A56',       // 铜线金
  'mbs-night': '#1F2B2A',        // 夜山青
  'mbs-lamp': '#E0B96C',         // 灯火黄
  'mbs-city': '#4A5568',         // 城市灰蓝
  'mbs-lake': '#7A8B8E',         // 湖水青灰
}
```

### 4.3 L4.4 - 多轮对话 UI

```typescript
// apps/AWKN-LABlife/app/src/pages/ConsultPage.tsx
interface ConsultDialogue {
  issueId: string
  turns: DialogueTurn[]            // 3+ 轮
  currentNode: ConsultNode         // 9 节点
  memoryItems: MemoryItem[]        // 记忆锚点
  costWarnings: CostWarning[]      // 代价提醒
}

interface DialogueTurn {
  turnId: string
  user: string
  zhangbanshan: string
  sideNote?: string                // 半山旁批
  costWarning?: string             // ⚠️ 代价提醒
  memoryAnchors?: MemoryItem[]     // 本轮触发的记忆
  followups?: FollowupQuestion[]   // 本轮推荐
  timestamp: string
}
```

---

## 五、DOD 验收标准（线 4）

### L4.1a - 身份 prompt 最小版
- **Given** Prompt Compiler 调用
- **When** identity-layer 注入
- **Then** Prompt 包含 5 件事（接题/摊局/断句/说代价/留回看点）
- **And** 包含"不装神/不吓人/不哄人/不替用户做决定" 4 不

### L4.1b - 6 关系人注入
- **Given** 用户问"我该不该听我妈的话"
- **When** identity-layer 注入
- **Then** 包含陈素娴（母）+ "话不要说满" 风格
- **And** 6 关系人字段完整
- **And** 始终注入 4 个（核心），条件注入 2 个（可选）

### L4.1c - 口头禅注入
- **Given** Prompt 注入
- **Then** 6 句口头禅全部可用
- **And** 触发场景：用户问"我该不该" → 触发"先把局摊开"
- **And** 触发场景：用户问具体月份 → 触发"你问的是前路，我先看脚下"

### L4.2 - 5 色统一
- **Given** tailwind.config.ts
- **Then** 5 色 token 全部定义
- **And** 至少 10 个组件引用 5 色
- **And** 与营销页色值一致

### L4.3 - 6 道具视觉化
- **Given** ZhangbanshanAvatar 组件
- **Then** 6 道具（黑皮旧本/红蓝双线纸/潮汐雷达/钢笔/罗盘/暖灯）至少 4 个可渲染
- **And** 道具尺寸/位置符合 V3.1 视觉规范

### L4.4 - 多轮对话 UI
- **Given** 用户连续 3 轮对话
- **When** ConsultPage 渲染
- **Then** 历史 turns 完整保留
- **And** 当前 9 节点状态可见
- **And** 每轮可触发 CostWarning/MemoryAnchor/SideNote
- **And** 推荐问题在每轮末尾显示

### L4.5 - 5 维旁批质量检查
- **Given** 旁批生成
- **When** quality-gate 检查
- **Then** 5 维必须满足：
  - 准：判断入口（不能是情绪猜测）
  - 短：≤ 2 行
  - 判断入口：揭示思考路径
  - 不抢正文：在【半山旁批】框内
  - 允许节点：仅在指定节点出现（first_issue/context_collecting/first_judgment/feedback_received）
- **And** 任一维度不满足 → quality-gate 抛 VALIDATION_ERROR

### L4.6 - A/B 框架
- **Given** 上线新功能（推荐问题/旁批/主动出击）
- **When** ab-testing 分流
- **Then** 默认 1% → 10% → 50% → 100% 四阶段
- **And** 每阶段至少 24h 观察
- **And** 异常自动熔断：错误率 >5% 自动关闭

### L4.7 - 完整测试覆盖
- **Given** 全部 8 测试用例 + 20 场景
- **Then** 测试覆盖率 ≥70%
- **And** 关键路径 100%（记忆触发/主动出击/旁批/状态机）

---

## 六、串并行关系

```
Week 1-3:   L4.1a (2d) ─→ L4.1b (4d) ─→ L4.1c (2d)     # 与 L1 同步
            L4.2 (5d) ┐
            L4.3 (4d) ├─→ 视觉+道具（独立）
            L4.6 (3d) ┘
Week 6-7:   L4.4 (6d) ─┐
            L4.5 (3d) ─┼─→ 多轮 + 旁批（依赖 L3）
            L4.7 (4d) ─┘
```

- L4.1a L4.2 L4.3 L4.6 **可并行**（几乎独立）
- L4.1b 依赖 L4.1a
- L4.1c 依赖 L4.1b
- L4.4 L4.5 L4.7 依赖 L3 完成

---

## 七、风险与缓冲

| # | 风险 | 应对 |
|---|------|------|
| **B1** | 6 关系人进 prompt 占用 token | 分级注入（核心始终，可选条件） |
| **B2** | 6 关系人可能影响主对话流 | 用独立 prompt 段（不抢主对话位置） |
| **B3** | 5 色 + 6 道具视觉与营销页不一致 | 设计 review + 视觉走查 |
| **B4** | 多轮对话 UX 学习曲线 | 渐进式开放（先 3 轮 → 5 轮 → 不限） |
| **B5** | 5 维旁批质量检查可能误杀 | 阈值可调 + 误杀 review |
| **B6** | A/B 框架与 feature-flag 重叠 | 复用 feature-flag 框架，A/B 是其子集 |
| **B7** | 测试覆盖 70% 偏低 | 关键路径 100%，边缘 50% |

---

## 八、关键文件路径

### 8.1 新增
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/identity-layer.ts`
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/identity-layer-relations.ts`
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/identity-layer-catchphrases.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/identity-layer.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/quality-gate-side-note.spec.ts`
- `apps/AWKN-LABlife/app/src/lib/ab-testing.ts`
- `apps/AWKN-LABlife/app/src/components/icons/NotebookIcon.tsx`
- `apps/AWKN-LABlife/app/src/components/icons/PenIcon.tsx`
- `apps/AWKN-LABlife/app/src/components/icons/CompassIcon.tsx`
- `apps/AWKN-LABlife/app/src/components/icons/LampIcon.tsx`
- `apps/AWKN-LABlife/app/src/styles/tokens.css`
- `apps/AWKN-LABlife/app/src/__tests__/multi-turn-consult.spec.tsx`
- `apps/AWKN-LABlife/app/src/__tests__/scenarios-20.spec.tsx`

### 8.2 修改
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/prompt-layers.ts`（注入 identity-layer）
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/quality-gate.service.ts`（5 维旁批检查）
- `apps/AWKN-LABlife/app/src/components/icons/ZhangbanshanAvatar.tsx`（6 道具）
- `apps/AWKN-LABlife/app/src/pages/ConsultPage.tsx`（多轮 UI）
- `apps/AWKN-LABlife/tailwind.config.ts`（5 色）
- `apps/AWKN-LABlife/app/src/styles/global.css`（引用 tokens.css）

---

## 九、线 4 完成 → Q5-Q8 启动条件

- [ ] 6 关系人 + 6 句口头禅在 prompt 中显式
- [ ] 5 色 + 6 道具视觉统一
- [ ] 多轮 3 轮以上无错乱
- [ ] 5 维旁批 100% 通过
- [ ] A/B 框架可运行
- [ ] 测试覆盖率 ≥70%
- [ ] 至少 1 个真实用户跑 13 周完整流程
- [ ] 设计 review 通过

---

## 附录：文档来源

- **doc03** 张半山 IP 母文档 V3.1（12 Marks + 视觉章 + 道具章）
- **doc07** 张半山活人化 V1.0 §3（性格暗面 + 口头禅）+ §4（6 关系人）
- **V1.1** §18（5 维旁批）
- 长期规划 Q1.4 + Q3.5 + Q3.6 + Q4.1 + Q4.2 + Q4.3 + Q4.4 + Q4.6

---

*线 4 生成日期：2026-06*
*下次更新：线 4 全部完成时*
