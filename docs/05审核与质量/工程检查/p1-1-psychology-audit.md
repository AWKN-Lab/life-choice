# P1-1 Psychology 图标审计报告

> **作者**：P1-1 cleanup session
> **日期**：2026-06-14
> **范围**：在 P1-1（张半山头像替换）完成后，审计所有 `psychology` 字符串出现，决定保留 vs 替换

---

## 1. 背景

P1-1 实施后，所有"用户咨询流内 + 张半山在分析"的图标从 MUI `psychology` Material Symbol 改为 `<ZhangbanshanAvatar />` 组件。但仍有 5 处 `psychology` 出现未处理，本报告审计其判断是否正确。

---

## 2. 总览

**总出现**：14 处
- 9 处：注释/文档/feature flag 描述（保留，无功能影响）
- 5 处：用户可见的运行时使用 → **审计对象**

| # | 文件:行 | 上下文 | 决策 | 关键理由 |
|---|---------|--------|------|---------|
| 1 | AnalysisResult.tsx:184 | "性格分析" Card (9 维度之一) | ✅ 保留 | 概念图标（非张半山），保持 9 维度风格统一 |
| 2 | ReportDashboard.tsx:43 | NAV_ITEMS["性格画像"] | ✅ 保留 | NAV_ITEMS 是 string config，14-16px 小图标 Material Symbol 更清晰 |
| 3 | MajorDecisionAnalysis.tsx:84 | "decision recommendation" section | ✅ 保留 | 5 个并列 section 全部 Material Symbol 概念图标 |
| 4 | ProcessSection.tsx:24, 99 | 营销页"咨询流程"步骤 + header | ✅ 保留 | 营销页 text-gold 装饰，非用户咨询流 |
| 5 | AboutSection.tsx:113 | 营销页"特色"列表项 | ✅ 保留 | 营销页 14px text-gold 小图标 |

**结果**：5/5 全部保留，全部加 inline 注释防止未来误清理。

---

## 3. 判定准则

| 准则 | 张半山标识（替换） | 概念图标（保留） |
|------|-------------------|-----------------|
| **位置** | 用户咨询流（结果/聊天/会员） | 营销页（首页/关于/流程） |
| **语义** | 表示"张半山在分析/说话" | 表示"心理/思维/AI"概念 |
| **风格** | 单独出现或与 character/头像并列 | 与同组其他 Material Symbol 概念图标并列 |
| **尺寸** | ≥18px（section header / 头像） | <18px（导航/列表/装饰） |
| **配色** | text-primary / 默认 | text-gold / text-amber-400 等装饰色 |

**判定公式**：
```
is_zhangbanshan = (in_consultation_flow) 
              AND (represents_zhangbanshan_speaking)
              AND (not_concept_icon_in_group)
```

**简化为业务规则**：
- 在用户咨询流（结果/聊天/会员）+ 单独出现 + ≥18px → **替换**
- 否则 → **保留**（保持并列元素风格统一）

---

## 4. 详细分析

### 4.1 AnalysisResult.tsx:184

```tsx
// 9 个并列分析维度之一
<Card iconName="currency_bitcoin" title="币圈交易运势" />
<Card iconName="psychology" title="性格分析" />
<Card iconName="work" title="事业行业" />
<Card iconName="explore" title="发展风水" />
<Card iconName="paid" title="财富层级" />
// ... 4 more
```

**判定**：保留
**理由**：
- 这是"性格分析"维度，用紫色 psychology 表示"思维/性格"概念
- 不是张半山在分析，而是"性格"这个分析维度的图标
- 其他 8 个维度全部用 Material Symbol（currency_bitcoin/work/explore/paid/insights/visibility/healing/group），保持统一
- 替换会破坏维度卡片的视觉一致性

---

### 4.2 ReportDashboard.tsx:43

```tsx
const NAV_ITEMS = [
  { id: 'overview', label: '命盘总览', icon: 'visibility' },
  { id: 'character', label: '性格画像', icon: 'psychology' },  // ← 此处
  { id: 'career', label: '事业财运', icon: 'trending_up' },
  { id: 'dayun', label: '大运流年', icon: 'schedule' },
  { id: 'shensha', label: '神煞解析', icon: 'auto_awesome' },
  { id: 'suggestions', label: '综合建议', icon: 'lightbulb' },
];
```

**渲染位置**：
- 移动端（14px）：`<Icon name={item.icon} size={14} />`
- 桌面端 AnchorNav（16px）：`<Icon name={item.icon} size={16} />`

**判定**：保留
**理由**：
- `NAV_ITEMS` 是 `string[]` 配置，AnchorNav 通过 `NavItem` 接口约束
- 改为 JSX 元素需要重构 AnchorNav API（接受 ReactNode 而非 string）
- 14-16px 小图标用 Material Symbol 视觉清晰度更高（小尺寸下头像容易糊）
- 其他 5 个 nav 项全部用 Material Symbol，保持统一
- 性格画像 section 内容区已用 `<ZhangbanshanAvatar size={18} />`（CharacterCard.tsx:20），用户点进去会看到张半山头像

**已知权衡**：用户从 nav 的紫色"心理"图标 → 进入 section 的张半山头像，过渡略不一致。但这是 nav 风格统一 vs 内容区头像一致性的取舍，本审计选择 nav 统一。

---

### 4.3 MajorDecisionAnalysis.tsx:84

```tsx
const sections = [
  { id: 'prosCons', icon: 'compare_arrows', title: '利弊分析' },
  { id: 'timing', icon: 'schedule', title: '时机' },
  { id: 'keyVariables', icon: 'tune', title: '关键变量' },
  { id: 'worstCase', icon: 'shield', title: '最坏情况' },
  { id: 'recommendation', icon: 'psychology', title: '决策建议' },  // ← 此处
];
```

**判定**：保留
**理由**：
- 5 个并列 section 全部用 Material Symbol 概念图标（compare_arrows/schedule/tune/shield/psychology）
- "决策建议"section 内容是 `result.action_strategy || result.one_line_conclusion` 等文本，不是"张半山"在给建议
- 与同文件其他 4 个 section 保持风格统一

**已知权衡**："决策建议"是张半山的核心输出，但视觉上用紫色"思维"图标而非头像。Reason：5 个并列 section 风格统一更重要。

---

### 4.4 ProcessSection.tsx:24, 99

**位置 1**（步骤 icon）：
```tsx
const steps = [
  { id: 1, title: '提交问题', icon: 'chat' },
  { id: 2, title: '智能分析', icon: 'psychology' },  // ← 此处
  { id: 3, title: '获得指引', icon: 'description' },
];
```

**位置 2**（section header 装饰）：
```tsx
<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 mb-6">
  <span className="material-symbols-outlined text-gold" style={...}>psychology</span>  // ← 此处
</div>
```

**判定**：保留（×2）
**理由**：
- ProcessSection 在首页（`/`），属于营销页
- text-gold 配色是营销页金色主题
- 流程步骤 chat/psychology/description 是抽象流程标识
- 营销页不需要"张半山"人格化，目标是引导用户进入咨询

---

### 4.5 AboutSection.tsx:113

```tsx
<div className="flex items-start space-x-3">
  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-1">
    <span className="material-symbols-outlined text-gold" style={{ fontSize: '14px' }}>verified</span>
  </div>
  <p>基于经典文献的专业分析</p>
</div>
<div className="flex items-start space-x-3">
  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-1">
    <span className="material-symbols-outlined text-gold" style={{ fontSize: '14px' }}>psychology</span>  // ← 此处
  </div>
  <p>AI驱动的精准度和个性化</p>
</div>
<div className="flex items-start space-x-3">
  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-1">
    <span className="material-symbols-outlined text-gold" style={{ fontSize: '14px' }}>insights</span>
  </div>
  <p>持续学习和改进</p>
</div>
```

**判定**：保留
**理由**：
- AboutSection 在首页（`/`），属于营销页
- 3 个特色列表项：verified（专业）/ psychology（AI）/ insights（学习）
- 14px text-gold 小图标，纯装饰性
- 营销页不需要"张半山"人格化

---

## 5. 与 P1-1 已替换 4 处的对比

| 场景 | 决策 | 文件 |
|------|------|------|
| ReportDashboard section header (line 238, 294) | 替换 | 性格画像、重大决策分析的 section header |
| CharacterCard header (line 20) | 替换 | 性格画像的卡片 header |
| BrandStrategy (line 71) | 替换 | 命名年度报告的 memorability header |

**已替换 4 处的共同特征**：
- 在用户咨询流（结果页）
- section/card 的 header 位置
- 18px 尺寸
- 单独或成对出现（如 性格画像 + 重大决策分析）
- 表示"张半山在分析你"

**未替换 5 处的共同特征**：
- 在营销页 OR 并列图标组中
- 14-16px 小尺寸（除 section header 装饰 12x12 圆角背景）
- 与其他 Material Symbol 概念图标并列
- 表示"概念"而非"张半山"

---

## 6. 实施

每个保留的 `psychology` 出现都加了 inline 注释：

```tsx
{/* psychology: 概念图标（非张半山标识），与 9 个并列分析维度的 work/explore/paid 等 Material Symbol 保持统一。P1-1 cleanup intentionally retained. */}
```

**目的**：防止未来 P1.X cleanup 时被误替换为 ZhangbanshanAvatar。

**未改动**：
- `feature-flags.config.ts:105` 描述文本（保留 `psychology` 作为历史描述）
- `ZhangbanshanAvatar.tsx` 内部 6 处 `psychology`（fallback 渲染 + 注释）
- 9 处其他注释/文档

---

## 7. 验证

### 7.1 Build 验证
`npm run build` 应通过 0 errors（仅添加注释，无 API/行为变化）

### 7.2 视觉一致性
- ✅ 用户咨询流：所有"张半山在分析"位置均显示张半山头像
- ✅ 营销页：保留 Material Symbol 概念图标，营销风格统一
- ✅ 并列图标组：维度/导航/列表内 icon 风格一致

### 7.3 边界
- ReportDashboard.tsx:43 的 nav → section 过渡略不一致（Material Symbol → 头像），但属于已知权衡
- MajorDecisionAnalysis.tsx:84 的"决策建议"用紫色"思维"图标而非头像，已知权衡

---

## 8. 后续

- 如果产品/设计认为 ReportDashboard NAV 的 `psychology` 应该改为头像，需要：
  1. 重构 `NAV_ITEMS` 为 `{ id, label, renderIcon: () => ReactNode }` 结构
  2. AnchorNav 接受 ReactNode 而非 string
  3. 同步移动端导航（line 138-152）
  4. 评估其他 5 个 nav 项是否也改为头像（保持统一）

- 如果产品/设计认为 MajorDecisionAnalysis 的"决策建议"应该用头像，需要：
  1. 5 个并列 section 中只替换 1 个（破坏并列一致性）
  2. 或 5 个全部改为头像（工作量大）

本审计建议保持当前状态。

---

## 9. 变更摘要

| 文件 | 变更 |
|------|------|
| AnalysisResult.tsx | +1 JSX 注释 |
| ReportDashboard.tsx | +1 行内 TS 注释 |
| MajorDecisionAnalysis.tsx | +1 行内 TS 注释 |
| ProcessSection.tsx | +2 JSX 注释（line 24 icon 属性, line 99 span 后） |
| AboutSection.tsx | +1 JSX 注释 |
| docs/dev/p1-1-psychology-audit.md | 新增本文档 |

**总代码变更**：+5 注释字符串（无 API/行为变化）
**预计 build 影响**：0（仅字符串）
