# 工程文档：5层漏斗推导 + 折叠交互 + 传统命理图形可视化

> 版本：v1.0 | 日期：2026-06-10
> 状态：SPEC FROZEN | 关联计划：implement-5layer-funnel-ziwei-fold.md

---

## 1. 概述

对标天府Agent，对人生决策宗师结果页进行三项核心改进：
1. **5层漏斗推导结构**：大运基调→流年吉凶→宫位交叉→具体要素→总结收束
2. **折叠交互**：所有报告段落默认折叠，减少信息过载
3. **传统命理图形可视化**：大六壬课盘图 + 八字排盘图

**不做**：ZiweiCardMessage（不为显得专业而做）

---

## 2. 现有架构

### 2.1 消息类型（12种）

```typescript
// app/src/components/result/chat-messages/index.ts
type: 'text' | 'bazi-card' | 'liuren-card' | 'quming-card' | 'zhangbanshan'
   | 'report-section' | 'action-list' | 'risk-list' | 'vip-prompt'
   | 'tool-result' | 'timeline' | 'typing'
```

### 2.2 当前编排时序（3段式）

```
300ms   — 开场白 (text)
600ms   — 用户问题 (text)
1000ms  — summary_line (text)
2000ms  — 张半山三段式 (zhangbanshan)
2200ms  — 工具调用 (tool-result)
2400ms  — 人生关键节点 (timeline)
2600ms+ — 6个报告段落 (report-section × 6, 间隔400ms)
2800ms+ — 行动建议 (action-list)
3000ms+ — 风险提醒 (risk-list)
3400ms+ — VIP深度服务 (vip-prompt)
4000ms+ — 互动提示
```

### 2.3 现有折叠能力

| 组件 | 折叠 | 状态变量 |
|------|------|---------|
| ZhangbanshanMessage | ✅ 推理溯源 | `reasoningExpanded` |
| ToolResultMessage | ✅ 每个工具独立 | `expandedIdx` |
| BaziCardMessage | ✅ 详细排盘+大运流年 | `showDetailedPan` / `detailExpanded` |
| LiurenCardMessage | ✅ 详细课盘 | `detailExpanded` |
| ReportSectionMessage | ❌ | — |
| ActionListMessage | ❌ | — |
| RiskListMessage | ❌ | — |
| TimelineMessage | ❌ | — |

---

## 3. Phase 1：折叠交互 + 5层漏斗

### 3.1 ReportSectionMessage 增加折叠

**文件**：`app/src/components/result/chat-messages/ReportSectionMessage.tsx`

**改动前**（26行）：
```tsx
export function ReportSectionMessage({ data }: { data: ReportSectionData }) {
  return (
    <div className="space-y-2 w-full">
      <h3 className="text-primary/90 text-sm font-medium flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary/60" />
        {data.title}
      </h3>
      <p className="text-white/65 text-sm leading-relaxed whitespace-pre-line">{data.content}</p>
      {data.score !== undefined && (...)}
    </div>
  );
}
```

**改动后**：
```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportSectionData {
  title: string;
  content: string;
  score?: number;
  scoreLabel?: string;
}

export function ReportSectionMessage({ data }: { data: ReportSectionData }) {
  const [collapsed, setCollapsed] = useState(true);
  const summary = data.content.length > 80
    ? data.content.slice(0, 80) + '...'
    : data.content;

  return (
    <div className="space-y-1 w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left flex items-center gap-2 group"
      >
        <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
        <h3 className="text-primary/90 text-sm font-medium flex-1">{data.title}</h3>
        <span className="material-symbols-outlined text-sm text-white/30 group-hover:text-white/60 transition-colors">
          {collapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>
      <AnimatePresence>
        {collapsed ? (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-white/40 text-xs leading-relaxed pl-3"
          >
            {summary}
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-white/65 text-sm leading-relaxed whitespace-pre-line pl-3">{data.content}</p>
            {data.score !== undefined && (
              <div className="flex items-center gap-2 mt-1 pl-3">
                <span className="text-xs text-white/40">{data.scoreLabel || '评分'}</span>
                <span className="text-primary text-sm font-semibold">{data.score}/10</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 3.2 ActionListMessage 增加折叠

**文件**：`app/src/components/result/chat-messages/ActionListMessage.tsx`

**改动后**：
```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';

export function ActionListMessage({ actions }: { actions: string[] }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="space-y-2 w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left flex items-center gap-2 group"
      >
        <span className="material-symbols-outlined text-emerald-400 text-sm">checklist</span>
        <span className="text-emerald-300/80 text-xs font-medium">{actions.length} 条行动建议</span>
        <span className="material-symbols-outlined text-sm text-white/30 group-hover:text-white/60 ml-auto transition-colors">
          {collapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>
      <AnimatePresence>
        {!collapsed && actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2.5"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center mt-0.5">
              <span className="text-[10px] text-emerald-300 font-medium">{i + 1}</span>
            </span>
            <p className="text-sm text-white/80 leading-relaxed">{action}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### 3.3 RiskListMessage 增加折叠

**文件**：`app/src/components/result/chat-messages/RiskListMessage.tsx`

**改动后**：同 ActionListMessage 模式，默认折叠，摘要行显示 `{risks.length} 条风险提醒`，展开后显示完整风险列表 + 门控提示。

### 3.4 TimelineMessage 增加折叠

**文件**：`app/src/components/result/chat-messages/TimelineMessage.tsx`

**改动后**：同上，默认折叠，摘要行显示 `{events.length} 个关键节点`，展开后显示时间线。

### 3.5 ResultChat 5层漏斗编排

**文件**：`app/src/components/result/ResultChat.tsx`

**改动**：修改 useEffect 中的消息编排时序：

```typescript
// Layer 1: 大运基调 (0-2s)
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'text', content: '正在为您推演...' }), 300));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'text', content: result.summary_line }), 1000));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'zhangbanshan', content: '张半山推演', metadata: { ... } }), 2000));

// Layer 2: 流年吉凶 (2.5-3.5s)
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'text', content: '── 流年吉凶 ──', metadata: { layer: 2 } }), 2500));
// 前2个report-section作为流年分析
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'report-section', ... }), 2800));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'report-section', ... }), 3200));

// Layer 3: 宫位交叉 (3.5-4.5s)
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'text', content: '── 多体系交叉验证 ──', metadata: { layer: 3 } }), 3500));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'tool-result', ... }), 3800));

// Layer 4: 具体要素 (4.5-6s)
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'text', content: '── 具体分析 ──', metadata: { layer: 4 } }), 4500));
// 后4个report-section作为具体要素
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'report-section', ... }), 4800));
// ... 间隔400ms

// Layer 5: 总结收束 (6-7s)
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'text', content: '── 总结与建议 ──', metadata: { layer: 5 } }), 6000));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'timeline', ... }), 6200));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'action-list', ... }), 6500));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'risk-list', ... }), 6800));
timers.push(setTimeout(() => addMessage({ role: 'system', type: 'vip-prompt', ... }), 7200));
```

Layer 分隔标记渲染：在 `renderMessageContent` 中添加 `layer` metadata 检测，渲染为居中的分隔线 + 层级标题。

---

## 4. Phase 2：传统命理图形可视化

### 4.1 大六壬课盘图组件

**新建文件**：`app/src/components/consult/LiurenChartPanel.tsx`

**数据来源**：`result.engine_data`（六壬路由已有）

**接口设计**：
```typescript
interface LiurenChartPanelProps {
  engineData: {
    monthGeneral: string;    // 月将
    dayPillar: string;       // 日辰
    hourBranch: string;      // 占时
    skyPlate: string[];      // 天盘12地支
    earthPlate: string[];    // 地盘12地支
    fourLessons: {           // 四课
      first: { heaven: string; earth: string };
      second: { heaven: string; earth: string };
      third: { heaven: string; earth: string };
      fourth: { heaven: string; earth: string };
    };
    threeTransmissions: {    // 三传
      initial: { heaven: string; earth: string; god: string };
      middle: { heaven: string; earth: string; god: string };
      final: { heaven: string; earth: string; god: string };
    };
    nobleGod: string;        // 贵神
    humanElement: string;    // 人元
    earthBranch: string;     // 地分
  };
}
```

**布局设计**（简化版，先列表式）：
```
┌─────────────────────────────┐
│ 日辰：甲子  占时：子  月将：神后 │
├─────────────────────────────┤
│ 三传                         │
│  初传：寅+甲+贵人             │
│  中传：卯+乙+腾蛇             │
│  末传：辰+丙+朱雀             │
├─────────────────────────────┤
│ 四课                         │
│  一课：天盘寅/地盘丑           │
│  二课：天盘卯/地盘寅           │
│  三课：天盘辰/地盘卯           │
│  四课：天盘巳/地盘辰           │
├─────────────────────────────┤
│ 天地盘（折叠）                 │
│  子→丑 丑→寅 ...             │
└─────────────────────────────┘
```

### 4.2 八字排盘图组件

**新建文件**：`app/src/components/consult/BaziChartPanel.tsx`

**数据来源**：`result.calc_result`（八字路由已有）

**接口设计**：
```typescript
interface BaziChartPanelProps {
  calcResult: {
    yearPillar: { stem: string; branch: string };
    monthPillar: { stem: string; branch: string };
    dayPillar: { stem: string; branch: string };
    hourPillar: { stem: string; branch: string };
    dayMaster: string;
    dayMasterStrength: string;
    hiddenStems: { [pillar: string]: string[] };
    tenGods: { [pillar: string]: { stem: string; branch: string } };
    nayin: { [pillar: string]: string };
    wuxing: { metal: number; wood: number; water: number; fire: number; earth: number };
    dayun: { range: string; stem: string; branch: string; }[];
    liunian: { year: number; stem: string; branch: string; }[];
  };
}
```

**布局设计**：
```
┌──────────────────────────────────┐
│        年柱   月柱   日柱   时柱    │
│ 天干    丁     癸     戊     丁     │
│ 地支    巳     丑     申     巳     │
│ 藏干   丙戊庚  己癸辛  庚壬戊  丙戊庚 │
│ 十神   正印   正财   比肩   正印    │
│ 纳音   沙中土  桑柘木  大驿土  沙中土  │
├──────────────────────────────────┤
│ 五行分布                          │
│ 金 ████░░░░ 25%                  │
│ 木 ██░░░░░░ 12%                  │
│ 水 ██████░░ 38%                  │
│ 火 ████░░░░ 15%                  │
│ 土 ██░░░░░░ 10%                  │
├──────────────────────────────────┤
│ 大运（折叠）                       │
│ 2017-2026 癸丑 | 2027-2036 壬子   │
└──────────────────────────────────┘
```

### 4.3 恢复 bazi-card 和 liuren-card

**文件**：`ResultChat.tsx`

恢复之前删除的 import 和 case 分支：
```typescript
import { BaziCardMessage } from './chat-messages/BaziCardMessage';
import { LiurenCardMessage } from './chat-messages/LiurenCardMessage';
```

在 renderMessageContent 中恢复：
```typescript
case 'bazi-card':
  return <BaziCardMessage calcResult={msg.metadata?.calcResult} ... />;
case 'liuren-card':
  return <LiurenCardMessage engineData={msg.metadata?.engineData} ... />;
```

在5层漏斗编排中：
- Layer 1 末尾：当 `route_type === 'ziping'` 时推送 bazi-card
- Layer 3 末尾：当 `route_type === 'liuren'` 时推送 liuren-card

---

## 5. Phase 3：追问系统 + 重大决策分析

### 5.1 FollowUpQuestions 集成

**文件**：`ResultChat.tsx`

在聊天流末尾（VIP prompt 之后）添加：
```tsx
{phase === 'interacting' && (
  <FollowUpQuestions
    result={result}
    suggestedQuestions={followUpQuestions}
    onFollowUpClick={handleFollowUpInChat}
  />
)}
```

`handleFollowUpInChat` 逻辑：
1. 追加用户消息到聊天流
2. 显示 typing 指示器
3. 1.5s 后追加 mock AI 回复（后续接入后端 API）

### 5.2 MajorDecisionAnalysis 集成

**文件**：`ResultPage.tsx`

在报告模式（`viewMode === 'report'`）中添加：
```tsx
{viewMode === 'report' && result && (
  <MajorDecisionAnalysis result={result} />
)}
```

修复置信度硬编码：从 `result.analysis?.confidence` 取值，默认 72% 作为 fallback。

---

## 6. 验收标准

| Phase | 验收项 | 通过标准 |
|-------|--------|---------|
| 1 | 报告段落折叠 | 默认折叠，点击展开，显示摘要行 |
| 1 | 5层漏斗 | 5个层级分隔线清晰可见，推导逐层深入 |
| 2 | 大六壬课盘图 | 六壬路由结果中显示课盘可视化 |
| 2 | 八字排盘图 | 八字路由结果中显示排盘可视化 |
| 3 | 追问推荐 | 聊天流末尾显示3条推荐问题，点击可追问 |
| 3 | 重大决策 | 报告模式中5个section可交互展开 |

---

## 7. 风险与回滚

| 风险 | 等级 | 缓解 |
|------|------|------|
| 课盘图/排盘图布局复杂 | 中 | 先做简化版（列表式），后续迭代图形化 |
| 5层漏斗编排打乱现有体验 | 中 | 保留原有消息内容，只调整时序和分组 |
| 追问回复仍是 mock | 中 | 先上线交互，后续接入后端 API |
| BaziCardMessage/LiurenCardMessage 恢复后与右侧重复 | 低 | 左侧卡片改为可视化图形，右侧保持摘要 |

**回滚**：前端改动，重新部署上一版本 dist。

---

## 8. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-10 | v1.0 | 初始创建，SPEC FROZEN |
