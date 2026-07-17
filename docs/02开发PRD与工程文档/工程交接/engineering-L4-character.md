# L4 角色/视觉技术参考文档

> **版本**：v1.0
> **生成日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **上位文档**：[engineering-handoff-L4-character-v2.md](./engineering-handoff-L4-character-v2.md)
> **语义纠偏**：不使用"9 模块 Pipeline"，使用"4 路由 + scheduler + parallel gateway + ReAct"；不使用"9 节点状态机"，使用"ConsultRecord.status 字符串"；不使用"mbs-*"，使用"CSS 变量体系"；用户状态分类器当前只有 4 类

---

## 一、身份系统

### 1.1 prompt-layers.ts — buildIdentityLayer()（当前内容）

**文件**：`awkn-life-backend/apps/api-server/src/prompt-layers.ts`

**当前已实现的身份层内容**：

| 模块 | 内容 |
|------|------|
| 角色 | 张半山身份定义 |
| 五件事 | 核心职责 |
| 四不做 | 行为禁区 |
| 人格 | 性格特征 |
| 说话风格 | 口吻规范 |
| 禁区表达 | 不允许的表达方式 |
| 输出校验三问 | 生成后自检 |
| 免责声明 | 法律边界 |

**5 层 Prompt 架构**：

```
Identity → Capability → Context → Dynamic → Confirmation
```

### 1.2 计划新增 buildRelationsLayer() — 6 关系人

**注入位置**：紧跟 Identity 层之后，Capability 层之前

**更新后架构**：

```
Identity → Relations → Catchphrases → Capability → Context → Dynamic → Confirmation
```

**6 关系人定义**：

| 层级 | 角色 | 描述 | 注入策略 |
|------|------|------|---------|
| 核心 | 师父 | 传授命理与做人之道的恩师 | 始终注入 |
| 核心 | 师母 | 恩师之妻，待张半山如亲子 | 始终注入 |
| 核心 | 老友 | 少年相识的知己，商海中人 | 始终注入 |
| 核心 | 对手 | 同行中的劲敌，亦正亦邪 | 始终注入 |
| 可选 | 徒弟 | 跟学半年的年轻人 | 条件注入 |
| 可选 | 故人 | 多年未见的旧相识 | 条件注入 |

**RELATIONS_TIER=core_only**：写死为 `core_only`，环境变量不暴露。3 个月后再评估是否开放可选 2。

**注入规则**：
- 核心 4（师父/师母/老友/对手）：始终注入
- 可选 2（徒弟/故人）：条件注入（RELATIONS_TIER !== 'core_only' 时）
- 提及关系人时点到为止，不展开叙述，不编造具体姓名和故事

### 1.3 计划新增 buildCatchphrasesLayer() — 6 句口头禅

**6 句口头禅**：

| # | 口头禅 | 适用场景 |
|---|--------|---------|
| 1 | "涨 30% 听着好看，但你得想清楚：是地方不对，还是人不对。" | 事业/财富判断 |
| 2 | "时机这事急不来，但也不能等。" | 时机判断 |
| 3 | "这种事不能问别人，得问自己。" | 决策类 |
| 4 | "代价不是不做，是做之前先想清楚最坏。" | 代价确认 |
| 5 | "你心里已经有答案了，只是想找人点头。" | 求证类 |
| 6 | "先走 30 天，再回来看。" | 行动建议 |

**使用规则**：每次输出最多使用 1 句口头禅，不重复使用同一句。

---

## 二、视觉系统

### 2.1 CSS 变量体系（5 种风格主题）

**文件**：`apps/AWKN-LABlife/app/src/styles/themes.css`

**当前已有风格**：

| 风格 | data-style 值 | 说明 |
|------|--------------|------|
| 水墨 | `ink-wash` | 默认风格 |
| 禅意 | `zen` | 极简风格 |
| 赛博 | `cyber` | 科技感 |
| 奢华 | `luxury` | 高端感 |
| 暗黑神秘 | `mystic-dark` | 暗色系 |

**变量体系**：AETHERIA CSS 变量 `hsl(var(--xxx))` 格式

### 2.2 计划新增 zhangbanshan 风格（5 色）

| CSS 变量 | 色名 | 色值 | 用途 |
|----------|------|------|------|
| `--zb-ink` | 半山墨黑 | #2B2A27 | 主背景、标题、按钮主色 |
| `--zb-paper` | 米白 | #F3EBDD | 卡片背景、文本输入区 |
| `--zb-blue` | 青花瓷蓝 | #4A7C9B | 强调（按钮 hover、链接、IP 锚点） |
| `--zb-white` | 瓷白 | #F5F0E8 | 亮面、卡片前景、正文背景 |
| `--zb-copper` | 铜线金 | #B08A56 | 点缀（IP 锚点装饰、分割线） |

**themes.css 新增内容**：

```css
/* zhangbanshan 风格 — 张半山专属视觉体系 */
[data-style="zhangbanshan"] {
  --zb-ink: #2B2A27;
  --zb-paper: #F3EBDD;
  --zb-blue: #4A7C9B;
  --zb-white: #F5F0E8;
  --zb-copper: #B08A56;

  /* 映射到 AETHERIA 通用变量（保持兼容） */
  --primary: 30 10% 16%;        /* → --zb-ink */
  --secondary: 30 30% 90%;      /* → --zb-paper */
  --tertiary: 200 35% 44%;      /* → --zb-blue */
  --surface-base: 33 27% 95%;   /* → --zb-white */
  --accent: 33 30% 51%;         /* → --zb-copper */
}
```

### 2.3 tailwind.config.js zb-* 映射

**文件**：`apps/AWKN-LABlife/app/tailwind.config.js`

**新增映射**：

```javascript
colors: {
  // ... 现有 AETHERIA 变量 ...

  // zhangbanshan 专属色值（CSS 变量引用）
  'zb-ink': 'hsl(var(--zb-ink))',
  'zb-paper': 'hsl(var(--zb-paper))',
  'zb-blue': 'hsl(var(--zb-blue))',
  'zb-white': 'hsl(var(--zb-white))',
  'zb-copper': 'hsl(var(--zb-copper))',
}
```

**组件引用清单**（至少 5 个）：

| 组件 | 引用色值 | 用途 |
|------|---------|------|
| ZhangbanshanAvatar.tsx | zb-ink / zb-copper | 头像边框 + 装饰 |
| ConsultPage.tsx | zb-ink / zb-paper | 咨询页主背景 + 卡片 |
| KlineShareCard.tsx | zb-blue / zb-copper | K线卡片强调 + 点缀 |
| NamingPDFExport.tsx | zb-ink / zb-white | PDF 导出主色 + 背景 |
| PaywallOverlay.tsx | zb-copper / zb-blue | 付费墙装饰 + 按钮 |

---

## 三、道具系统

### 3.1 ZhangbanshanAvatar.tsx — 当前唯一组件

**文件**：`apps/AWKN-LABlife/app/src/components/icons/ZhangbanshanAvatar.tsx`

**当前功能**：头像组件，支持 size/style prop

**计划扩展**：

```typescript
interface ZhangbanshanAvatarProps {
  size?: number;
  showProps?: PropName[];  // 显示哪些道具
  style?: 'zhangbanshan' | 'ink-wash' | 'zen' | 'cyber' | 'luxury' | 'mystic-dark';
}

type PropName = 'whiteDeerPin' | 'blueGlasses' | 'leatherBook'
  | 'whiteDeerPaperweight' | 'kLineChart' | 'tidalRadar' | 'warmLamp' | 'compass';
```

### 3.2 计划 8 道具组件（SVG 组件化）

**统一接口**：

```typescript
interface PropIconProps {
  size?: number;   // 默认 32
  color?: string;  // 默认 'currentColor'
  className?: string;
}
```

| # | 道具 | 组件名 | 文件名 | IP 锚点 | SVG 要点 |
|---|------|--------|--------|---------|---------|
| 1 | 白鹿瓷领针 | WhiteDeerPin | `WhiteDeerPin.tsx` | 🔴 C 级 | 素白瓷小鹿 + 一只鹿角极淡裂纹 |
| 2 | 青花蓝眼镜 | BlueGlasses | `BlueGlasses.tsx` | 🔴 C 级 | 细框 + 镜腿内侧青花蓝 |
| 3 | 黑皮铜角本 | LeatherBook | `LeatherBook.tsx` | — | 旧笔记本 + 铜角 |
| 4 | 白鹿瓷镇 | WhiteDeerPaperweight | `WhiteDeerPaperweight.tsx` | — | 桌面摆件 |
| 5 | 青花线K线 | KLineChart | `KLineChart.tsx` | — | 视觉化报告 |
| 6 | 潮汐雷达 | TidalRadar | `TidalRadar.tsx` | — | 时机判断 |
| 7 | 窑火暖灯 | WarmLamp | `WarmLamp.tsx` | — | 氛围光 |
| 8 | 小罗盘 | Compass | `Compass.tsx` | — | 决策辅助 |

### 3.3 IP 锚点 3 项

| 锚点 | 组件 | 验收标准 | 级别 |
|------|------|---------|------|
| 半山痣 | ZhangbanshanAvatar | 左眼下极淡标记 100% 渲染 | 🔴 C 级 |
| 青花蓝眼镜 | BlueGlasses | 镜腿内侧青花蓝 100% 渲染 | 🔴 C 级 |
| 白鹿瓷领针 | WhiteDeerPin | 素白瓷小鹿 + 鹿角裂纹 100% 渲染 | 🔴 C 级 |

> IP 锚点为 C 级强制项，必须 100% 命中，不可省略或简化。

---

## 四、5 维旁批质量检查

### 4.1 5 维校验规则

| 维度 | 校验规则 | 违规动作 |
|------|---------|---------|
| **准** | 旁批内容必须与当前节点上下文相关 | 剔除 |
| **短** | 旁批 ≤ 2 行（≤ 80 字） | 截断 |
| **判断入口** | 旁批仅在 4 个允许节点出现 | 剔除 |
| **不抢正文** | 旁批不包含判断结论（结论归正文） | 剔除 |
| **允许节点** | first_issue / context_collecting / first_judgment / feedback_received | 非允许节点剔除 |

### 4.2 旁批节点白名单

```typescript
const SIDENOTE_ALLOWED_NODES = new Set([
  'first_issue',         // 首次问题：场景还原旁批
  'context_collecting',  // 上下文收集：时令提示旁批
  'first_judgment',      // 首次判断：风险提示旁批
  'feedback_received',   // 收到反馈：下一步引导旁批
]);
```

### 4.3 旁批格式约束

```typescript
interface SidenoteCheck {
  maxLength: 80;           // ≤ 80 字
  maxLines: 2;             // ≤ 2 行
  allowedNodes: Set<string>; // 4 个允许节点
  noConclusion: true;      // 不包含判断结论
}
```

### 4.4 集成到 QualityGateService

**文件**：`awkn-life-backend/apps/api-server/src/quality-gate.service.ts`

**当前功能**：仅关键词过滤

**计划新增**：旁批专用校验逻辑

**集成方式**：在现有 QualityGateService 的校验流程中，新增旁批校验步骤。旁批校验为纯加法逻辑，不影响现有关键词过滤。

---

## 五、测试策略

### 5.1 IP 锚点 100% 命中测试

| 测试项 | 验证内容 | 通过标准 |
|--------|---------|---------|
| 半山痣渲染 | ZhangbanshanAvatar 左眼下极淡标记 | 100% 渲染 |
| 青花蓝眼镜渲染 | BlueGlasses 镜腿内侧青花蓝 | 100% 渲染 |
| 白鹿瓷领针渲染 | WhiteDeerPin 素白瓷小鹿 + 鹿角裂纹 | 100% 渲染 |
| size prop 生效 | 不同 size 参数下正确渲染 | 渲染尺寸匹配 |
| color prop 生效 | 不同 color 参数下正确渲染 | 渲染颜色匹配 |
| ZhangbanshanAvatar 集成 | showProps 参数控制道具显示 | 道具显示/隐藏正确 |

### 5.2 5 维旁批触发测试（100 条）

| 维度 | 测试条数 | 测试内容 | 通过标准 |
|------|---------|---------|---------|
| 准 | 20 | 旁批内容与上下文相关性 | 不相关旁批被剔除 |
| 短 | 20 | 旁批长度限制 | >2 行或 >80 字旁批被截断 |
| 判断入口 | 20 | 旁批仅在允许节点出现 | 非白名单节点旁批被剔除 |
| 不抢正文 | 20 | 旁批不包含判断结论 | 含结论旁批被剔除 |
| 允许节点 | 20 | 4 个允许节点旁批正常通过 | 合法旁批不被误杀 |

**通过标准**：
- 5 维旁批 100% 触发（100 条测试集全部经过 5 维校验）
- 误杀率 < 5%（合法旁批被误剔 ≤ 5 条）
- 非允许节点旁批 100% 剔除
- 超长旁批 100% 截断

---

## 六、关键文件路径索引

| 文件 | 路径 | 用途 |
|------|------|------|
| prompt-layers.ts | `awkn-life-backend/apps/api-server/src/prompt-layers.ts` | 5 层 Prompt 架构 |
| relationship.ts | `awkn-life-backend/apps/api-server/src/atom-tools/decision/relationship.ts` | 关系契合度评分 |
| themes.css | `apps/AWKN-LABlife/app/src/styles/themes.css` | CSS 变量定义 |
| tailwind.config.js | `apps/AWKN-LABlife/app/tailwind.config.js` | 色值映射 |
| icons/ | `apps/AWKN-LABlife/app/src/components/icons/` | 道具组件目录 |
| QualityGateService | `awkn-life-backend/apps/api-server/src/quality-gate.service.ts` | 质量检查 |
| FrontdeskChat.tsx | `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx` | 前端对话组件 |
| KlineShareCard.tsx | `apps/AWKN-LABlife/app/src/components/KlineShareCard.tsx` | K线分享卡片 |
| NamingPDFExport.tsx | `apps/AWKN-LABlife/app/src/components/NamingPDFExport.tsx` | 命名PDF导出 |
| PaywallOverlay.tsx | `apps/AWKN-LABlife/app/src/components/PaywallOverlay.tsx` | 付费墙 |

---

*生成日期：2026-06-15 · v1.0*
