# L4 角色/视觉/体验工程交接

> ⚠️ **DEPRECATED（2026-06-25）**：本文件已被 [`engineering-handoff-L4-character-v2.md`](./engineering-handoff-L4-character-v2.md) 取代。本文件仅作历史参考，不再维护。权威版本请查阅 -v2.md。

> **版本**：v2.0
> **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **生成日期**：2026-06-14
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md` §一 D7/D8/D9/D10/D12 + §三 战略
> **优先级**：🟡 **P3**（与 L2 部分并行启动，Week 5-20）
> **工期**：16 周（与画师外包并行）
> **目标读者**：前端 Lead、设计师、程序员
> **依赖阻塞**：L0 画师对接（与 L4 并行，仅 L4.3/L4.5 等 L0）

---

## 〇、阅读路径

```
本文档 §一  ←  4 项关键修正（D7/D8/D9/D10）  ← 必看
        §二  ←  5 色 token（D8）              ← 设计师必看
        §三  ←  8 道具（D7）+ 3 级 IP 锚点（D9）← 画师对接
        §四  ←  6 关系人（D4）+ 5 维旁批     ← 体验
        §五  ←  L0 画师对接并行（D10）       ← 时间线
        §六  ←  RACI + 技术约束              ← 责任到人
```

---

## 一、4 项关键修正（D7 / D8 / D9 / D10）

### 1.1 D7 拍板：采纳 docx 8 道具

> ✅ **采纳 docx 8 道具**（原 4 线计划是 6 道具，早期估算偏差）

**8 道具清单**（来源：`C:\Users\10919\Downloads\张半山角色设定.docx` §25/§30）：

| # | 道具 | 用途 | 组件路径 |
|---|------|------|----------|
| 1 | **白鹿瓷领针** | S 级人物符号（左胸） | `app/src/components/icons/WhiteDeerPin.tsx` |
| 2 | **青花蓝细框眼镜** | 镜腿内侧青花蓝 | `app/src/components/icons/BlueGlasses.tsx` |
| 3 | **黑皮铜角本** | 旧笔记本 | `app/src/components/icons/LeatherBook.tsx` |
| 4 | **白鹿瓷镇** | 桌面摆件 | `app/src/components/icons/WhiteDeerPaperweight.tsx` |
| 5 | **青花线人生K线** | 视觉化报告 | `app/src/components/icons/KLineChart.tsx` |
| 6 | **鄱湖水位潮汐雷达图** | 时机判断 | `app/src/components/icons/TidalRadar.tsx` |
| 7 | **窑火暖灯** | 氛围光 | `app/src/components/icons/WarmLamp.tsx` |
| 8 | **小罗盘** | 决策辅助 | `app/src/components/icons/Compass.tsx` |

**L4.3 工作量**：4 天 → **5 天**（多 2 个道具组件）

### 1.2 D8 拍板：采纳 docx 5 色

> ✅ **采纳 docx 5 色**（原 tailwind.config.js 是 7 色，开发时随手加的）

> ⚠️ **当前使用 AETHERIA Neo-Mysticism Design System**（primary/secondary/tertiary + CSS 变量 `hsl(var(--xxx))`）。mbs-* 5 色（mbs-ink/mbs-paper/mbs-blue/mbs-white/mbs-copper）为 **P2-7 规划目标**，当前阶段不替换 AETHERIA 变量。

**5 色 token**（P2-7 规划，替换 `tailwind.config.js` 的 `zhangbanshanColors`）：

```typescript
// tailwind.config.js — P2-7 规划目标（当前阶段使用 AETHERIA 变量 hsl(var(--xxx))）
const zhangbanshanColors = {
  // 5 色（D8 拍板，P2-7 迁移目标）
  'mbs-ink': '#1A1A1A',      // 半山墨黑（背景主色）
  'mbs-paper': '#F5F0E8',    // 米白（纸面）
  'mbs-blue': '#3A5F8F',     // 青花瓷蓝（强调）
  'mbs-white': '#FFFFFF',    // 瓷白（亮面）
  'mbs-copper': '#B8956A',   // 铜线金（点缀）

  // ❌ 删除（原 7 色里的 mbs-city / mbs-lake）
  // 'mbs-city': '#...',     // 删除
  // 'mbs-lake': '#...',     // 删除
};
```

**L4.2 工作量**：5 天不变

### 1.3 D9 拍板：C 级 3 项 IP 锚点强制

> ✅ **C 级 3 项 IP 锚点 100% 命中**（作为 DOD 强制项）

**3 项 IP 锚点**（画师交付必须包含，缺一未锁定）：

| 锚点 | 描述 | 验收 |
|------|------|------|
| **半山痣** | 左眼下极淡 | 100% 命中 |
| **青花蓝细框眼镜** | 镜腿内侧青花蓝 | 100% 命中 |
| **白鹿瓷领针** | 素白瓷小鹿 + 一只鹿角极淡裂纹 | 100% 命中 |

**A/B 级验收**（不进 DOD，画师对接规范）：
- A 级 8 项（人物脸）：8 项以上通过，低于 8 项重生
- B 级 8 项（服装配饰）：8 项以上通过，低于 8 项重生或局部重绘

### 1.4 D10 拍板：L0 与 L4 并行推进

> 🔄 **L0 不是前置任务**（原推荐错误，CEO 修正）

**修正要点**：
- L4 的代码工作（5 色 token、组件结构、5 维旁批逻辑）**不依赖**画师 PNG
- L0（画师对接）与 L4 代码工作**并行推进**
- **只在 L4.3（道具组件化）+ L4.5（IP 锚点验收）两个节点等 L0 产出**

**L0 交付物**（7 PNG + 1 源文件 + 1 立绘）：

| # | 交付物 | 文件 | 用途 |
|---|--------|------|------|
| 1 | 完整角色设定图 | `zhangbanshan-full.png` | 主视觉源 |
| 2 | 三视图 | `zhangbanshan-3view.png` | 角色一致性 |
| 3 | 头像定型 | `zhangbanshan-avatar.png` | 头像组件 |
| 4 | 五表情差分 | `zhangbanshan-emotions.png` | 5 维旁批 |
| 5 | 服装细节 | `zhangbanshan-clothing.png` | 服装组件 |
| 6 | 鞋子细节 | `zhangbanshan-shoes.png` | 鞋组件 |
| 7 | 配饰核心道具 + 色卡 | `zhangbanshan-props.png` + `palette.png` | 8 道具 + 5 色 |
| 8 | PSD/Procreate/CSP 分层源文件 | `zhangbanshan-source.psd` | 二次编辑 |
| 9 | 白底透明 PNG 立绘 | `zhangbanshan-render.png` | L4.3 道具组件化 |

---

## 二、5 色 token（D8）

> ⚠️ **当前使用 AETHERIA Neo-Mysticism Design System**（primary/secondary/tertiary + CSS 变量 `hsl(var(--xxx))`）。以下 mbs-* 5 色为 **P2-7 规划目标**，当前阶段不替换 AETHERIA 变量。

### 2.1 5 色使用规范

| Token | 颜色 | 使用场景 | 禁用场景 |
|-------|------|---------|---------|
| `mbs-ink` | #1A1A1A | 主背景、按钮主色 | 不能用于警示（与红色混淆） |
| `mbs-paper` | #F5F0E8 | 卡片背景、文本输入 | 不能用于强调（与白底混淆） |
| `mbs-blue` | #3A5F8F | 强调（按钮 hover、链接） | 不能用作背景（大面积沉） |
| `mbs-white` | #FFFFFF | 亮面、卡片前景 | 不能用作背景（与纸色混淆） |
| `mbs-copper` | #B8956A | 点缀（IP 锚点、装饰） | 不能用作主色（与金色混淆） |

### 2.2 迁移清单（P2-7 规划）

> 当前阶段使用 AETHERIA CSS 变量 `hsl(var(--primary))` 等，以下迁移在 P2-7 阶段执行。

| 文件 | 改动 |
|------|------|
| `apps/AWKN-LABlife/app/tailwind.config.js` | 删除 `mbs-city` / `mbs-lake` |
| `app/src/**/*.tsx` | 把 `bg-mbs-city` / `bg-mbs-lake` 替换为新 5 色 |
| 营销页 | 一致改用 mbs-* token |

**回滚开关**：`LEGACY_COLORS_ALLOWED=false`（强制 5 色）

---

## 三、8 道具 + 3 级 IP 锚点（D7 + D9）

### 3.1 8 道具组件化

**L4.3 任务卡**：8 个道具组件（5 天）

```typescript
// app/src/components/icons/WhiteDeerPin.tsx (示例)
import React from 'react';

export const WhiteDeerPin: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    {/* 白鹿瓷领针 - 素白瓷小鹿 + 一只鹿角极淡裂纹 */}
    <path d="..." fill="#F5F0E8" stroke="#1A1A1A" strokeWidth="0.5" />
    <path d="..." fill="none" stroke="#B8956A" strokeWidth="0.3" opacity="0.6" /> {/* 裂纹 */}
  </svg>
);
```

### 3.2 3 级验收表（来自 docx §27）

| 等级 | 范围 | 通过线 | 不通过动作 |
|------|------|--------|----------|
| **A 级** | 人物脸 8 项 | ≥8 项通过 | 低于 8 项重生 |
| **B 级** | 服装配饰 8 项 | ≥8 项通过 | 低于 8 项重生或局部重绘 |
| **C 级** | IP 锚点 3 项 | **3/3 命中** | 缺一未锁定 |

**A/B 级验收**：画师对接规范，不进 L4 任务卡
**C 级验收**：进 L4.5 的 DOD 强制项

---

## 四、6 关系人 + 5 维旁批

### 4.1 6 关系人（与 L3 共享）

> ⚠️ **无独立 `relations.config.ts`**，关系逻辑在 `atom-tools/decision/relationship.ts` 硬编码（五行生克映射、十神互补/冲突映射、夫妻宫吉凶星曜）。

```typescript
// 仅注入核心 4（D4 拍板）
const RELATIONS_CORE = ['父', '母', '旧上级', '旧同事'];
// 可选 2（永远不打开）
const RELATIONS_OPTIONAL = ['系统伙伴', '茶档']; // 永不使用
```

详见 `engineering-handoff-L3-memory.md` §1.2

### 4.2 5 维旁批

> ⚠️ **前端旁批组件需基于 Zustand 状态管理 + shadcn/ui 组件库实现**。

| 维度 | 触发 | 展示 |
|------|------|------|
| **场景还原** | 报告输出 | 头部卡片：当前场景简述 |
| **时令提示** | 时间相关 | 顶部小条：当前节气/季节 |
| **风险提示** | 高风险 | 红色边框：风险等级 + 建议 |
| **人情洞察** | 关系人触发 | 侧边小框：相关关系人视角 |
| **下一步引导** | 报告后 | 底部按钮：3 个可执行下一步 |

**L4.5 测试集**：100 条（每维 20 条），验收质量 100% 通过

### 4.3 身份层（Identity Layer）

> ⚠️ **已实现（`prompt-layers.ts` `buildIdentityLayer()`）**，非独立 `identity-layer.ts` 文件。
> 5 层 Prompt 架构：**Identity → Capability → Context → Dynamic → Confirmation**

### 4.4 6 句口头禅（D12 引用 docx）

> ⚠️ **6 句口头禅已嵌入 `prompt-layers.ts` `buildIdentityLayer()`**

> "涨 30% 听着好看，但你得想清楚：是地方不对，还是人不对。"
> "时机这事急不来，但也不能等。"
> "这种事不能问别人，得问自己。"
> "代价不是不做，是做之前先想清楚最坏。"
> "你心里已经有答案了，只是想找人点头。"
> "先走 30 天，再回来看。"

### 4.5 输出格式（三套输出）

> ⚠️ 输出格式为**三套**，非单一 5 段式：
> 1. **三段式**：场景还原 → 核心判断 → 下一步引导（面向用户阅读）
> 2. **5 层 Prompt**：Identity → Capability → Context → Dynamic → Confirmation（面向 LLM 推理）
> 3. **6 段 Prompt**：完整结构化输出模板（面向 API/前端解析）

---

## 五、L0 画师对接并行（D10）

### 5.1 10 步施工顺序（来自 docx §29）

> **铁律**：角色设定图没定，不进入首页主视觉

```
1. 头像定型 → 2. 半身定型 → 3. 全身定型 → 4. 三视图
                                                ↓
                                            5. 表情差分
                                                ↓
   6. 服装细节 → 7. 鞋子细节 → 8. 配饰道具
                                       ↓
   9. 完整角色设定图 → 10. 主视觉与产品页面
```

### 5.2 并行时间线

```
Week 1:  L0 启动（发送画师对接规范）
         L4.1 5 色 token（与 L0 无关，先做）
         L4.2 组件结构（与 L0 无关，先做）
         L4.4 5 维旁批逻辑（与 L0 无关，先做）
Week 5:  L0 头像定型完成
         L4.3 启动（等 L0 部分产出：头像 + 表情）
Week 8:  L0 三视图 + 表情差分完成
         L4.5 IP 锚点验收启动
Week 12: L0 完整 7 PNG + 1 源文件交付
         L4.7 主视觉与产品页面
Week 16: L0 验收通过
         L4 全线完结
```

### 5.3 L0 与 L4 的接触点

| 接触点 | L0 产出 | L4 消费 |
|--------|---------|---------|
| 头像 | `avatar.png` | `app/src/components/Avatar.tsx` |
| 表情 | `emotions.png`（5 表情） | 5 维旁批的"人情洞察" |
| 道具 | `props.png`（8 道具） | `app/src/components/icons/*.tsx` |
| 色卡 | `palette.png` | 与 L4.2 的 mbs-* token 校验 |
| 立绘 | `render.png`（白底透明） | `ConsultPage` / `ResultPage` 头部 |

---

## 六、RACI + 技术约束

### 6.1 RACI

| 任务 | R | A | C | I |
|------|---|---|---|---|
| L0 画师对接 | 设计 Lead | CEO | 天火 / 程序员 | 全部 |
| L4.1 5 色 token | 前端 Lead | CEO | 设计 Lead | 全部 |
| L4.2 组件结构 | 前端 Lead | CEO | 设计 Lead / 程序员 | 全部 |
| L4.3 8 道具组件化 | 前端 Lead | 设计 Lead | 程序员 | 全部 |
| L4.4 5 维旁批 | 前端 Lead | 产品 Lead | 程序员 | 全部 |
| L4.5 IP 锚点验收 | 设计 Lead | CEO | 前端 Lead | 全部 |
| L4.6 A/B 框架 | 前端 Lead | 产品 Lead | 程序员 | 全部 |
| L4.7 主视觉 | 前端 Lead | CEO | 设计 Lead | 全部 |

### 6.2 技术约束

| 约束 | 值 |
|------|-----|
| 框架 | React 18 + Vite 5 |
| UI 库 | shadcn/ui + Tailwind 3.x |
| 状态管理 | Zustand |
| 5 色 token | 当前使用 AETHERIA Neo-Mysticism Design System（`hsl(var(--xxx))`）；mbs-* 5 色为 P2-7 规划目标（D8） |
| UserState | 4 类：`casual` / `genuine` / `repeating` / `validating` |
| 前端 base path | `/life/`（开发和生产一致） |
| 动画 | GSAP + Framer Motion + Three.js |
| 国际化 | `app/public/locales/zh-CN.json` |
| 字符集 | UTF-8 |

---

## 附录 A：关键文件路径

- L0 画师对接规范：`C:\Users\10919\Downloads\张半山角色设定.docx`（V1.1，doc-IP-V1.1）
- 5 色配置：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\app\tailwind.config.js`
- 8 道具组件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\components\icons\*.tsx`
- 5 维旁批：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\components\SideNote*.tsx`
- 心理咨询对齐：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\p1-1-psychology-audit.md`
- 拍板文件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
- 计划详情：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-04-character-experience.md`
- 总览：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-overview.md`
- L2 部分并行：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L2-pipeline.md`
- L3 关系人共享：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L3-memory.md`

---

*生成日期：2026-06-14*
*修订日期：2026-06-15（v2.0）*
*下次更新：Week 5 L4.1 启动时*
