# L4 角色/视觉/体验工程交接 v2（天级执行手册）

> **版本**：v2.1
> **生成日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **上位文档**：[engineering-handoff-L4-character.md](./engineering-handoff-L4-character.md)（v2.0）
> **优先级**：🟡 **P3**（与 L2 部分并行启动）
> **工期**：14 天（7 个天级批次）
> **目标读者**：前端 Lead、程序员
> **完成度基线**：25%

---

## 〇、阅读路径

```
本文档 §一  ←  代码现状基线 + 语义纠偏      ← 必看
        §二  ←  Day 1-2 关系人+口头禅注入   ← 后端
        §三  ←  Day 3-5 CSS 变量 5 色体系   ← 前端
        §四  ←  Day 6-8 8 道具组件化        ← 前端
        §五  ←  Day 9-10 5 维旁批质量检查   ← 后端+前端
        §六  ←  Day 11-12 前端视觉对齐      ← 前端
        §七  ←  Day 13-14 集成测试+回归     ← 全栈
        §八  ←  验收总清单 + 回滚总方案      ← 验收
```

---

## 一、代码现状基线 + 语义纠偏

### 1.1 语义纠偏（强制）

| 禁用词 | 替换为 | 原因 |
|--------|--------|------|
| mbs-* 5 色 token | **CSS 变量体系** | 当前使用 AETHERIA CSS 变量 `hsl(var(--xxx))`，mbs-* 为 P2-7 规划目标 |
| 9 节点状态机 | 不使用 | 当前未实现，用"隐含 7 节点对话逻辑"描述 |
| 9 模块 Pipeline | 不使用 | 用"4 路由 + 两段式漏斗 + ReAct 循环"描述 |

### 1.2 完成度基线

| 模块 | 完成度 | 现状 |
|------|--------|------|
| 身份层（Identity Layer） | ✅ 已实现 | `prompt-layers.ts` buildIdentityLayer()：角色/五件事/四不做/人格/说话风格/禁区表达/输出校验三问/免责声明 |
| 关系人（6 关系人） | ❌ 缺失 | 无 buildRelationsLayer()，关系逻辑在 `atom-tools/decision/relationship.ts` 硬编码 |
| 口头禅（6 句） | ❌ 缺失 | 无 buildCatchphrasesLayer()，口头禅未注入 Prompt |
| CSS 变量体系 | 🔶 部分 | 5 种风格主题（ink-wash/zen/cyber/luxury/mystic-dark）存在，无 zhangbanshan 专属风格 |
| 道具组件 | 🔶 1/8 | icons/ 目录仅 ZhangbanshanAvatar.tsx |
| 5 维旁批 | ❌ 缺失 | Quality Gate 仅关键词过滤，无旁批专用校验 |
| A/B 测试框架 | ❌ 缺失 | 完全未实现 |
| FrontdeskChat.tsx | ✅ 已实现 | 支持多轮对话 |
| KlineShareCard.tsx | ✅ 已实现 | 完整实现 |
| NamingPDFExport.tsx | ✅ 已实现 | 完整实现 |
| PaywallOverlay.tsx | ✅ 已实现 | 完整实现 |

### 1.3 关键文件路径

| 文件 | 路径 | 用途 |
|------|------|------|
| prompt-layers.ts | `awkn-life-backend/apps/api-server/src/prompt-layers.ts` | 5 层 Prompt 架构 |
| relationship.ts | `awkn-life-backend/apps/api-server/src/atom-tools/decision/relationship.ts` | 关系契合度评分 |
| themes.css | `app/src/styles/themes.css` | CSS 变量定义 |
| tailwind.config.js | `app/tailwind.config.js` | 色值映射 |
| icons/ | `app/src/components/icons/` | 道具组件目录 |
| QualityGateService | `awkn-life-backend/apps/api-server/src/quality-gate.service.ts` | 质量检查 |

---

## 二、Day 1-2：关系人 + 口头禅注入

### 2.1 目标

在 `prompt-layers.ts` 中新增 2 个 Layer 构建函数，使关系人和口头禅在 Pipeline 中正确注入。

### 2.2 任务卡

| # | 任务 | 产出文件 | 工时 |
|---|------|---------|------|
| T2-1 | 新增 buildRelationsLayer() | `prompt-layers.ts` | 4h |
| T2-2 | 新增 buildCatchphrasesLayer() | `prompt-layers.ts` | 2h |
| T2-3 | 集成到 5 层 Prompt 架构 | `prompt-layers.ts` | 1h |
| T2-4 | 单元测试 | `prompt-layers.test.ts` | 2h |

### 2.3 buildRelationsLayer() 规格

```typescript
// prompt-layers.ts 新增

/**
 * 关系人层：核心 4 始终注入 + 可选 2 条件注入
 * RELATIONS_TIER=core_only 写死（D4 拍板）
 */
export function buildRelationsLayer(): string {
  const RELATIONS_TIER = 'core_only'; // 写死，3 个月后再评估

  const RELATIONS = {
    core: [
      { role: '师父', desc: '传授命理与做人之道的恩师' },
      { role: '师母', desc: '恩师之妻，待张半山如亲子' },
      { role: '老友', desc: '少年相识的知己，商海中人' },
      { role: '对手', desc: '同行中的劲敌，亦正亦邪' },
    ],
    optional: [
      { role: '徒弟', desc: '跟学半年的年轻人' },
      { role: '故人', desc: '多年未见的旧相识' },
    ],
  };

  const included = RELATIONS_TIER === 'core_only'
    ? RELATIONS.core
    : [...RELATIONS.core, ...RELATIONS.optional];

  // 格式化为 Prompt 片段
  return `【关系人层】
你是张半山，以下是你生命中重要的人，在涉及相关话题时自然提及：
${included.map(r => `- ${r.role}：${r.desc}`).join('\n')}
注意：提及关系人时点到为止，不展开叙述，不编造具体姓名和故事。`;
}
```

**注入策略**：
- 核心 4（师父/师母/老友/对手）：始终注入
- 可选 2（徒弟/故人）：条件注入（RELATIONS_TIER !== 'core_only' 时）
- RELATIONS_TIER 写死为 `core_only`，环境变量不暴露

### 2.4 buildCatchphrasesLayer() 规格

```typescript
// prompt-layers.ts 新增

/**
 * 口头禅层：6 句口头禅
 * 来源：张半山角色设定 docx §D12
 */
export function buildCatchphrasesLayer(): string {
  const CATCHPHRASES = [
    '涨 30% 听着好看，但你得想清楚：是地方不对，还是人不对。',
    '时机这事急不来，但也不能等。',
    '这种事不能问别人，得问自己。',
    '代价不是不做，是做之前先想清楚最坏。',
    '你心里已经有答案了，只是想找人点头。',
    '先走 30 天，再回来看。',
  ];

  return `【口头禅层】
以下是你常说的话，在合适场景自然使用，不生硬插入：
${CATCHPHRASES.map((p, i) => `${i + 1}. "${p}"`).join('\n')}
使用规则：每次输出最多使用 1 句口头禅，不重复使用同一句。`;
}
```

### 2.5 集成到 5 层架构

```
原有：Identity → Capability → Context → Dynamic → Confirmation
新增：Identity → Relations → Catchphrases → Capability → Context → Dynamic → Confirmation
位置：紧跟 Identity 层之后，Capability 层之前
```

### 2.6 验收标准

| # | 验收项 | 通过标准 |
|---|--------|---------|
| A2-1 | 6 关系人字段完整 | 核心 4 始终注入 + 可选 2 条件注入逻辑正确 |
| A2-2 | 6 句口头禅全部可用 | buildCatchphrasesLayer() 返回 6 句 |
| A2-3 | RELATIONS_TIER=core_only 写死 | 无环境变量暴露，代码中硬编码 |
| A2-4 | 单元测试通过 | 2 个函数各 ≥3 条测试用例 |

### 2.7 回滚方案

- 删除 buildRelationsLayer() / buildCatchphrasesLayer() 函数
- 恢复 5 层 Prompt 架构为原始顺序
- 无数据库变更，无前端变更，回滚零风险

---

## 三、Day 3-5：CSS 变量 5 色体系

### 3.1 目标

在 themes.css 新增 `data-style="zhangbanshan"` 风格，定义 5 个 CSS 变量，并在 tailwind.config.js 新增 zb-* 色值映射。

### 3.2 任务卡

| # | 任务 | 产出文件 | 工时 |
|---|------|---------|------|
| T3-1 | themes.css 新增 zhangbanshan 风格 | `app/src/styles/themes.css` | 2h |
| T3-2 | tailwind.config.js 新增 zb-* 映射 | `app/tailwind.config.js` | 1h |
| T3-3 | 至少 5 个组件引用 zb-* 色值 | 多个组件文件 | 3h |
| T3-4 | 视觉验证 | 浏览器 | 1h |

### 3.3 5 色定义

| CSS 变量 | 色名 | 色值 | 用途 |
|----------|------|------|------|
| `--zb-ink` | 半山墨黑 | #2B2A27 | 主背景、标题、按钮主色 |
| `--zb-paper` | 米白 | #F3EBDD | 卡片背景、文本输入区 |
| `--zb-blue` | 青花瓷蓝 | #4A7C9B | 强调（按钮 hover、链接、IP 锚点） |
| `--zb-white` | 瓷白 | #F5F0E8 | 亮面、卡片前景、正文背景 |
| `--zb-copper` | 铜线金 | #B08A56 | 点缀（IP 锚点装饰、分割线） |

### 3.4 themes.css 新增内容

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

### 3.5 tailwind.config.js 新增映射

```javascript
// tailwind.config.js — 新增 zb-* 色值映射
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

### 3.6 组件引用清单（至少 5 个）

| 组件 | 引用色值 | 用途 |
|------|---------|------|
| ZhangbanshanAvatar.tsx | zb-ink / zb-copper | 头像边框 + 装饰 |
| ConsultPage.tsx | zb-ink / zb-paper | 咨询页主背景 + 卡片 |
| KlineShareCard.tsx | zb-blue / zb-copper | K线卡片强调 + 点缀 |
| NamingPDFExport.tsx | zb-ink / zb-white | PDF 导出主色 + 背景 |
| PaywallOverlay.tsx | zb-copper / zb-blue | 付费墙装饰 + 按钮 |

### 3.7 验收标准

| # | 验收项 | 通过标准 |
|---|--------|---------|
| A3-1 | 5 色 CSS 变量全部定义 | themes.css 中 data-style="zhangbanshan" 包含 5 个变量 |
| A3-2 | tailwind zb-* 映射正确 | 5 个 zb-* 色值可在 className 中使用 |
| A3-3 | 至少 5 个组件引用 zb-* | grep "zb-" 命中 ≥5 个组件文件 |
| A3-4 | AETHERIA 变量兼容 | zhangbanshan 风格下原有组件不视觉错乱 |

### 3.8 回滚方案

- 删除 themes.css 中 `[data-style="zhangbanshan"]` 块
- 删除 tailwind.config.js 中 zb-* 映射
- 组件中 zb-* 引用回退为 AETHERIA 变量
- 无数据库变更，回滚零风险

---

## 四、Day 6-8：8 道具组件化

### 4.1 目标

新增 7 个道具图标组件（ZhangbanshanAvatar 已有），每个 SVG 组件化，支持 size/color prop。

### 4.2 任务卡

| # | 任务 | 产出文件 | 工时 |
|---|------|---------|------|
| T4-1 | WhiteDeerPin 白鹿瓷领针 | `icons/WhiteDeerPin.tsx` | 2h |
| T4-2 | BlueGlasses 青花蓝眼镜 | `icons/BlueGlasses.tsx` | 2h |
| T4-3 | LeatherBook 黑皮铜角本 | `icons/LeatherBook.tsx` | 1.5h |
| T4-4 | WhiteDeerPaperweight 白鹿瓷镇 | `icons/WhiteDeerPaperweight.tsx` | 1.5h |
| T4-5 | KLineChart 青花线K线 | `icons/KLineChart.tsx` | 1.5h |
| T4-6 | TidalRadar 潮汐雷达 | `icons/TidalRadar.tsx` | 1.5h |
| T4-7 | WarmLamp 窑火暖灯 | `icons/WarmLamp.tsx` | 1h |
| T4-8 | Compass 小罗盘 | `icons/Compass.tsx` | 1h |
| T4-9 | ZhangbanshanAvatar 集成道具 | `icons/ZhangbanshanAvatar.tsx` | 2h |
| T4-10 | 组件测试 | `icons/__tests__/` | 2h |

### 4.3 组件规格

```typescript
// 统一接口
interface PropIconProps {
  size?: number;   // 默认 32
  color?: string;  // 默认 'currentColor'
  className?: string;
}

// 示例：WhiteDeerPin.tsx
export const WhiteDeerPin: React.FC<PropIconProps> = ({
  size = 32,
  color = 'currentColor',
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
  >
    {/* 白鹿瓷领针 — 素白瓷小鹿 + 一只鹿角极淡裂纹 */}
    <path d="..." fill={color} />
    <path d="..." stroke="var(--zb-copper)" strokeWidth="0.3" opacity="0.6" />
  </svg>
);
```

### 4.4 8 道具清单

| # | 道具 | 组件名 | IP 锚点 | SVG 要点 |
|---|------|--------|---------|---------|
| 1 | 白鹿瓷领针 | WhiteDeerPin | 🔴 C 级 | 素白瓷小鹿 + 一只鹿角极淡裂纹 |
| 2 | 青花蓝眼镜 | BlueGlasses | 🔴 C 级 | 细框 + 镜腿内侧青花蓝 |
| 3 | 黑皮铜角本 | LeatherBook | — | 旧笔记本 + 铜角 |
| 4 | 白鹿瓷镇 | WhiteDeerPaperweight | — | 桌面摆件 |
| 5 | 青花线K线 | KLineChart | — | 视觉化报告 |
| 6 | 潮汐雷达 | TidalRadar | — | 时机判断 |
| 7 | 窑火暖灯 | WarmLamp | — | 氛围光 |
| 8 | 小罗盘 | Compass | — | 决策辅助 |

### 4.5 ZhangbanshanAvatar 集成

```typescript
// ZhangbanshanAvatar.tsx 扩展
interface ZhangbanshanAvatarProps {
  size?: number;
  showProps?: PropName[];  // 显示哪些道具
  style?: 'zhangbanshan' | 'ink-wash' | 'zen' | 'cyber' | 'luxury' | 'mystic-dark';
}

type PropName = 'whiteDeerPin' | 'blueGlasses' | 'leatherBook'
  | 'whiteDeerPaperweight' | 'kLineChart' | 'tidalRadar' | 'warmLamp' | 'compass';
```

### 4.6 IP 锚点 3 项（C 级强制）

| 锚点 | 组件 | 验收标准 |
|------|------|---------|
| 半山痣 | ZhangbanshanAvatar | 左眼下极淡标记 100% 渲染 |
| 青花蓝眼镜 | BlueGlasses | 镜腿内侧青花蓝 100% 渲染 |
| 白鹿瓷领针 | WhiteDeerPin | 素白瓷小鹿 + 鹿角裂纹 100% 渲染 |

### 4.7 验收标准

| # | 验收项 | 通过标准 |
|---|--------|---------|
| A4-1 | 8 道具至少 6 个可渲染 | 浏览器中无 SVG 报错 |
| A4-2 | IP 锚点 3 项 100% 命中 | 半山痣/青花蓝眼镜/白鹿瓷领针全部渲染 |
| A4-3 | size/color prop 生效 | 不同 size/color 参数下正确渲染 |
| A4-4 | ZhangbanshanAvatar 集成 | showProps 参数控制道具显示 |

### 4.8 回滚方案

- 删除 icons/ 下 7 个新增组件文件
- 恢复 ZhangbanshanAvatar.tsx 为原始版本
- 无数据库变更，无后端变更，回滚零风险

---

## 五、Day 9-10：5 维旁批质量检查

### 5.1 目标

新增旁批专用校验逻辑，集成到 QualityGateService，确保旁批仅在允许节点出现且符合格式约束。

### 5.2 任务卡

| # | 任务 | 产出文件 | 工时 |
|---|------|---------|------|
| T5-1 | 定义 5 维旁批校验规则 | `quality-gate.service.ts` | 2h |
| T5-2 | 旁批节点白名单 | `quality-gate.service.ts` | 1h |
| T5-3 | 旁批长度限制（≤2 行） | `quality-gate.service.ts` | 1h |
| T5-4 | 集成到 QualityGateService | `quality-gate.service.ts` | 2h |
| T5-5 | 测试集（100 条） | `quality-gate.test.ts` | 3h |

### 5.3 5 维旁批校验规则

| 维度 | 校验规则 | 违规动作 |
|------|---------|---------|
| **准** | 旁批内容必须与当前节点上下文相关 | 剔除 |
| **短** | 旁批 ≤ 2 行（≤ 80 字） | 截断 |
| **判断入口** | 旁批仅在 4 个允许节点出现 | 剔除 |
| **不抢正文** | 旁批不包含判断结论（结论归正文） | 剔除 |
| **允许节点** | first_issue / context_collecting / first_judgment / feedback_received | 非允许节点剔除 |

### 5.4 旁批节点白名单

```typescript
// 旁批仅在这 4 个节点出现
const SIDENOTE_ALLOWED_NODES = new Set([
  'first_issue',         // 首次问题：场景还原旁批
  'context_collecting',  // 上下文收集：时令提示旁批
  'first_judgment',      // 首次判断：风险提示旁批
  'feedback_received',   // 收到反馈：下一步引导旁批
]);
```

### 5.5 旁批格式约束

```typescript
interface SidenoteCheck {
  maxLength: 80;           // ≤ 80 字
  maxLines: 2;             // ≤ 2 行
  allowedNodes: Set<string>; // 4 个允许节点
  noConclusion: true;      // 不包含判断结论
}
```

### 5.6 验收标准

| # | 验收项 | 通过标准 |
|---|--------|---------|
| A5-1 | 5 维旁批 100% 触发 | 100 条测试集全部经过 5 维校验 |
| A5-2 | 误杀率 < 5% | 合法旁批被误剔 ≤ 5 条 |
| A5-3 | 非允许节点旁批 100% 剔除 | 非白名单节点旁批全部拦截 |
| A5-4 | 超长旁批 100% 截断 | >2 行或 >80 字旁批全部截断 |

### 5.7 回滚方案

- 删除 QualityGateService 中旁批校验逻辑
- 恢复为仅关键词过滤
- 旁批校验为纯加法逻辑，回滚零风险

---

## 六、Day 11-12：前端视觉对齐

### 6.1 目标

3 个核心页面使用 zb-* 色值，ZhangbanshanAvatar 默认使用 zhangbanshan 风格，确保视觉一致。

### 6.2 任务卡

| # | 任务 | 产出文件 | 工时 |
|---|------|---------|------|
| T6-1 | ConsultPage 使用 zb-* 色值 | `ConsultPage.tsx` | 2h |
| T6-2 | TidePage 使用 zb-* 色值 | `TidePage.tsx` | 2h |
| T6-3 | NamingPage 使用 zb-* 色值 | `NamingPage.tsx` | 2h |
| T6-4 | ZhangbanshanAvatar 默认 zhangbanshan 风格 | `ZhangbanshanAvatar.tsx` | 1h |
| T6-5 | 视觉走查 | 浏览器 | 2h |

### 6.3 色值替换清单

| 页面 | 原色值 | 替换为 | 位置 |
|------|--------|--------|------|
| ConsultPage | bg-primary / text-primary | bg-zb-ink / text-zb-paper | 主背景 + 标题 |
| ConsultPage | border-secondary | border-zb-blue | 卡片边框 |
| TidePage | bg-surface-base | bg-zb-white | 页面背景 |
| TidePage | text-tertiary | text-zb-blue | 强调文字 |
| NamingPage | bg-primary | bg-zb-ink | 主背景 |
| NamingPage | accent | zb-copper | 装饰线 |
| ZhangbanshanAvatar | style="ink-wash" | style="zhangbanshan" | 默认风格 |

### 6.4 验收标准

| # | 验收项 | 通过标准 |
|---|--------|---------|
| A6-1 | 3 个页面视觉一致 | 同一风格下无色值跳变 |
| A6-2 | ZhangbanshanAvatar 默认 zhangbanshan 风格 | 无 style prop 时自动使用 zhangbanshan |
| A6-3 | 其他风格不受影响 | ink-wash/zen/cyber/luxury/mystic-dark 仍正常渲染 |
| A6-4 | 移动端适配 | 3 个页面在 375px 宽度下无溢出 |

### 6.5 回滚方案

- 3 个页面 zb-* 引用回退为 AETHERIA 变量
- ZhangbanshanAvatar 默认风格改回 ink-wash
- 纯 CSS/className 变更，回滚零风险

---

## 七、Day 13-14：集成测试 + 回归

### 7.1 目标

端到端验证关系人+口头禅注入、5 色体系渲染、8 道具组件、5 维旁批的集成正确性。

### 7.2 任务卡

| # | 任务 | 产出文件 | 工时 |
|---|------|---------|------|
| T7-1 | 关系人+口头禅 Pipeline 集成测试 | `integration/prompt-layers.integration.test.ts` | 2h |
| T7-2 | 5 色体系前端渲染测试 | `integration/css-variables.integration.test.ts` | 2h |
| T7-3 | 8 道具组件渲染测试 | `integration/prop-icons.integration.test.ts` | 2h |
| T7-4 | 5 维旁批端到端测试 | `integration/sidenote-e2e.test.ts` | 2h |
| T7-5 | 回归测试（已有功能） | `regression/` | 2h |

### 7.3 集成测试用例

| # | 测试场景 | 预期结果 |
|---|---------|---------|
| IT-1 | 发送咨询请求 → 检查 Prompt 包含关系人层 | buildRelationsLayer() 输出在 Prompt 中 |
| IT-2 | 发送咨询请求 → 检查 Prompt 包含口头禅层 | buildCatchphrasesLayer() 输出在 Prompt 中 |
| IT-3 | data-style="zhangbanshan" → 检查 5 个 CSS 变量 | getComputedStyle 返回正确色值 |
| IT-4 | 渲染 8 道具组件 → 检查无 SVG 报错 | 8 个组件全部渲染成功 |
| IT-5 | first_issue 节点 → 旁批出现 | 旁批在输出中可见 |
| IT-6 | cold_start 节点 → 旁批不出现 | 旁批被剔除 |
| IT-7 | 超长旁批 → 截断为 ≤2 行 | 输出旁批 ≤2 行 |

### 7.4 回归测试清单

| # | 回归项 | 预期结果 |
|---|--------|---------|
| RT-1 | FrontdeskChat 多轮对话 | 正常工作 |
| RT-2 | KlineShareCard 分享 | 正常渲染 |
| RT-3 | NamingPDFExport 导出 | PDF 正常生成 |
| RT-4 | PaywallOverlay 付费墙 | 正常拦截 |
| RT-5 | 高风险拦截 | 命中即返回 |
| RT-6 | AETHERIA 其他风格 | ink-wash/zen/cyber/luxury/mystic-dark 不受影响 |

### 7.5 验收标准

| # | 验收项 | 通过标准 |
|---|--------|---------|
| A7-1 | 0 个测试失败 | 集成测试 + 回归测试全部 PASS |
| A7-2 | 无 console 报错 | 浏览器控制台无 SVG/CSS 错误 |
| A7-3 | 已有功能不受影响 | RT-1 ~ RT-6 全部 PASS |

---

## 八、验收总清单 + 回滚总方案

### 8.1 验收总清单

| 批次 | 天数 | 验收项 | 通过标准 | 状态 |
|------|------|--------|---------|------|
| Day 1-2 | 关系人+口头禅 | A2-1 ~ A2-4 | 6 关系人 + 6 口头禅 + core_only + 测试通过 | ⬜ |
| Day 3-5 | CSS 变量 5 色 | A3-1 ~ A3-4 | 5 色 token + zb-* 映射 + 5 组件引用 + 兼容 | ⬜ |
| Day 6-8 | 8 道具组件化 | A4-1 ~ A4-4 | 6/8 可渲染 + IP 锚点 3/3 + prop 生效 + 集成 | ⬜ |
| Day 9-10 | 5 维旁批 | A5-1 ~ A5-4 | 100% 触发 + 误杀 <5% + 节点拦截 + 截断 | ⬜ |
| Day 11-12 | 前端视觉对齐 | A6-1 ~ A6-4 | 3 页面一致 + 默认风格 + 其他风格不受影响 + 移动端 | ⬜ |
| Day 13-14 | 集成测试 | A7-1 ~ A7-3 | 0 失败 + 无报错 + 回归通过 | ⬜ |

**总验收门槛**：全部 18 项验收项 PASS，否则不进入下一阶段。

### 8.2 回滚总方案

| 层级 | 回滚范围 | 回滚方式 | 风险 |
|------|---------|---------|------|
| **后端 Prompt** | buildRelationsLayer() / buildCatchphrasesLayer() | 删除函数 + 恢复 5 层原始顺序 | 零风险 |
| **CSS 变量** | themes.css zhangbanshan 块 + tailwind zb-* | 删除 CSS 块 + 删除映射 + 组件回退 AETHERIA | 零风险 |
| **道具组件** | icons/ 下 7 个新文件 + Avatar 改动 | 删除 7 文件 + 恢复 Avatar 原版 | 零风险 |
| **旁批校验** | QualityGateService 旁批逻辑 | 删除旁批校验 + 恢复仅关键词过滤 | 零风险 |
| **前端视觉** | 3 页面 zb-* 引用 | 回退为 AETHERIA 变量 | 零风险 |

**全量回滚 SOP**：

```bash
# 1. 后端回滚
git checkout HEAD -- awkn-life-backend/apps/api-server/src/prompt-layers.ts
git checkout HEAD -- awkn-life-backend/apps/api-server/src/quality-gate.service.ts

# 2. 前端回滚
git checkout HEAD -- app/src/styles/themes.css
git checkout HEAD -- app/tailwind.config.js
git checkout HEAD -- app/src/components/icons/ZhangbanshanAvatar.tsx
git checkout HEAD -- app/src/pages/ConsultPage.tsx
git checkout HEAD -- app/src/pages/TidePage.tsx
git checkout HEAD -- app/src/pages/NamingPage.tsx

# 3. 删除新增道具组件
rm app/src/components/icons/WhiteDeerPin.tsx
rm app/src/components/icons/BlueGlasses.tsx
rm app/src/components/icons/LeatherBook.tsx
rm app/src/components/icons/WhiteDeerPaperweight.tsx
rm app/src/components/icons/KLineChart.tsx
rm app/src/components/icons/TidalRadar.tsx
rm app/src/components/icons/WarmLamp.tsx
rm app/src/components/icons/Compass.tsx

# 4. 重启服务
cd awkn-life-backend && npx prisma generate
cd app && npm run build

# 5. 健康检查
curl http://localhost:3000/health
```

**回滚耗时**：≤ 10 分钟（纯代码回退，无数据库变更）

---

*生成日期：2026-06-15 · v2.1*
*上位文档：engineering-handoff-L4-character.md v2.0*
*下次更新：Day 2 完成时更新验收状态*
