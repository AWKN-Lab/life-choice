# 人生决策宗师 — 全栈技术详细说明

> **原始日期**：2026-06-10
> **生产校准日期**：2026-07-07
> **当前生产技术入口**：[`ENGINEERING-当前生产技术基线-20260707.md`](../工程交接/ENGINEERING-当前生产技术基线-20260707.md)

本文保留全栈设计与功能背景。当前运行代码、端口、路径、Schema、知识库规模和发布风险采用 2026-07-07 生产技术基线。

---

## 目录

1. [产品全貌与用户旅程](#一产品全貌与用户旅程)
2. [技术架构总览](#二技术架构总览)
3. [用户旅程 1：咨询分析（核心闭环）](#三用户旅程-1咨询分析核心闭环)
4. [用户旅程 2：结果展示（5层漏斗编排）](#四用户旅程-2结果展示5层漏斗编排)
5. [用户旅程 3：人生K线图](#五用户旅程-3人生k线图)
6. [用户旅程 4：潮汐图](#六用户旅程-4潮汐图)
7. [用户旅程 5：取名](#七用户旅程-5取名)
8. [用户旅程 6：枢密院（深度咨询）](#八用户旅程-6枢密院深度咨询)
9. [计算引擎详解](#九计算引擎详解)
10. [API 接口完整清单](#十api-接口完整清单)
11. [数据类型映射](#十一数据类型映射)
12. [WebSocket 实时通信](#十二websocket-实时通信)
13. [LLM 编排与多模型网关](#十三llm-编排与多模型网关)
14. [部署架构](#十四部署架构)

---

## 一、产品全貌与用户旅程

### 产品定位

面向对东方术数感兴趣的用户，在"人生决策"场景下，通过八字/六壬/紫微/取名等术数体系，结合 LLM 智能解读，提供可量化的命理分析。

### 六大用户旅程

```
┌─────────────────────────────────────────────────────────────┐
│                    人生决策宗师 · 用户旅程                      │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  旅程1       │  旅程2       │  旅程3       │  旅程4            │
│  咨询分析    │  结果展示    │  人生K线图   │  潮汐图           │
│  输入→路由   │  5层漏斗     │  7线+蜡烛    │  雷达+相位        │
│  →补充信息   │  编排展示    │  月度OHLCV   │  12维状态         │
├─────────────┼─────────────┴─────────────┴──────────────────┤
│  旅程5       │  旅程6                                           │
│  取名        │  枢密院（深度咨询）                                │
│  五格+品牌   │  说→摆→底→通鉴/妙算/星途                          │
└─────────────┴─────────────────────────────────────────────────┘
```

### 前端路由映射

| 路径 | 页面组件 | 用户旅程 |
|------|---------|---------|
| `/` | HomePage | 首页入口 |
| `/consult` | ConsultPage | 旅程1：输入问题 |
| `/info` | InfoPage | 旅程1：补充出生/起卦信息 |
| `/result` | ResultPage | 旅程2：结果展示 |
| `/tide` | TidePage | 旅程3+4：K线+潮汐 |
| `/naming` | FrontdeskChat(mode="naming") | 旅程5：取名 |
| `/question` | FrontdeskChat(mode="question") | 追问 |

---

## 二、技术架构总览

```
┌──────────────────────────────────────────────────────────┐
│                     前端 (React + Vite)                    │
│  BrowserRouter → 7个页面 → Recharts/iziwei/自定义组件       │
│  API Client: /life/api/v1 (PROD) / localhost:30001 (DEV)  │
├──────────────────────────────────────────────────────────┤
│                     Nginx 反向代理                         │
│  /life/ → 静态文件    /life/api/v1/ → proxy_pass :3000    │
├──────────────────────────────────────────────────────────┤
│                  后端 (NestJS + PM2 Cluster)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Consult  │  │KlineTide │  │Shumiyuan │  │StarChart │ │
│  │Controller│  │Controller│  │Controller│  │Controller│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │              │              │              │       │
│  ┌────▼──────────────▼──────────────▼──────────────▼────┐ │
│  │              Orchestrator (BullMQ 队列)                │ │
│  │  排班→证据→知识检索→并行LLM→仲裁→ReAct→三阶段综合      │ │
│  └────┬──────────────┬──────────────┬───────────────────┘ │
│       │              │              │                      │
│  ┌────▼────┐  ┌──────▼──────┐  ┌───▼───────┐             │
│  │CalcEngine│  │LLM Gateway  │  │Knowledge  │             │
│  │八字/取名 │  │MiniMax/Doubao│  │Retriever  │             │
│  │紫微/六壬 │  │DeepSeek/... │  │向量检索    │             │
│  └─────────┘  └─────────────┘  └───────────┘             │
│       │                                                      │
│  ┌────▼──────────────────────────────────────────────────┐ │
│  │  SQLite (Prisma) + JSON Data Files (13个)              │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 三、用户旅程 1：咨询分析（核心闭环）

### 3.1 页面流程

```
ConsultPage                    InfoPage                     ResultPage
┌──────────┐    route_type    ┌──────────┐    analyze     ┌──────────┐
│ 输入问题  │ ──────────────→ │ 补充信息  │ ────────────→ │ 结果展示  │
│          │   ziping/liuren  │ 出生时间  │   API调用     │ 5层漏斗   │
│          │   /quming        │ 起卦时间  │               │ 报告模式  │
└──────────┘                  └──────────┘               └──────────┘
```

### 3.2 前端数据流

**Step 1：意图路由** — `ConsultPage.tsx`

```typescript
// 用户输入问题 → 调用路由接口
const response = await consultApi.route({ question, birth_info });
// response.route_type: 'liuren' | 'ziping' | 'quming' | 'clarify'
// response.next_step: 描述下一步操作
```

**Step 2：补充信息** — `InfoPage.tsx`

| 路由类型 | 收集信息 | 存储位置 |
|---------|---------|---------|
| `liuren` | 起卦时间 + 城市 | `sessionStorage('awkn_consult_data')` |
| `ziping` | 出生日期 + 时间 + 性别 | `userProfileStore` + `sessionStorage` |
| `quming` | 姓氏 + 性别 + 行业 | `sessionStorage` |

**Step 3：分析请求** — `ResultPage.tsx`

```typescript
// 两条路径：
// 路径A：历史记录 → GET /consult/result/:recordId
// 路径B：新咨询 → POST /consult/analyze

const result = await consultApi.analyze({
  question,
  birth_info: { year, month, day, hour, minute, gender },
  ask_time: { year, month, day, hour, minute, city },
  route_type
});
```

### 3.3 后端编排流程（Orchestrator 13步）

```
POST /consult/analyze
    │
    ▼
┌─ Step 1: 排班决策 ──────────── schedule() → mode/primaryAgent/secondaryAgent
│
├─ Step 2: 读取已有计算结果 ──── Prisma consultRecord.calcResult
│
├─ Step 3: 构建证据包 ────────── evidenceBuilder.build()
│   └─ routeType + 问题 + 出生信息 + 八字证据 + 六壬证据
│
├─ Step 4: 知识检索 ──────────── knowledgeRetriever.retrieve() → 最多6条
│
├─ Step 5: clarify分支 ──────── 若routeType=clarify，返回澄清问题
│
├─ Step 6: 并行LLM调用 ──────── llmGateway.generateParallel()
│   ├─ quick_read: 只跑主调
│   └─ deep_consult: 并行跑主调+佐调
│
├─ Step 7: 仲裁 ─────────────── 若佐调不一致，zhangbanshanScheduler.arbitrate()
│
├─ Step 8: 流式推送 ──────────── websocketGateway.sendLLMToken()
│
├─ Step 9: ReAct推理 ─────────── reactEngine.run() → 最多5轮（仅deep_consult）
│
├─ Step 10: 三阶段综合 ──────── synthesizeThreeStage()
│
├─ Step 11: 持久化 ──────────── 更新consultRecord状态为completed
│
├─ Step 12: 记忆提取 ─────────── memoryExtractor.extractAndPersist()（异步）
│
└─ Step 13: fallback ────────── generationComposer.generate()（非quick/deep时）
```

---

## 四、用户旅程 2：结果展示（5层漏斗编排）

### 4.1 两种视图模式

| 模式 | 组件 | 适用场景 |
|------|------|---------|
| 聊天模式 | `ResultChat` | 默认，渐进式展示 |
| 报告模式 | `ReportDashboard` | 6个Section结构化展示 |

### 4.2 ResultChat 5层漏斗

```
时间轴    层级      内容
─────────────────────────────────────────────
0-2s     Layer 1   推演提示 → 用户问题 → summary_line → zhangbanshan_output → bazi-card
2.5-3.5s Layer 2   流年吉凶 → 前2个report-section
3.5-4.5s Layer 3   多体系交叉验证 → toolResults → liuren-card
4.5-6s   Layer 4   具体分析 → 后4个report-section
6-7s+    Layer 5   总结与建议 → timeline → actions → risks → vip-prompt → 追问引导
```

**消息类型**：

| type | 说明 | 数据来源 |
|------|------|---------|
| `text` | 纯文本 | LLM输出 |
| `zhangbanshan` | 张半山三段式 | `zhangbanshan_output` |
| `bazi-card` | 八字命盘卡片 | `calc_result` |
| `liuren-card` | 六壬课盘卡片 | `calc_result` |
| `report-section` | 分析段落 | LLM输出 |
| `action-list` | 行动建议 | `actions[]` |
| `risk-list` | 风险提示 | `risks[]` |
| `vip-prompt` | VIP引导 | `paywall_modules[]` |
| `tool-result` | 工具结果 | `toolResults[]` |
| `timeline` | 时间线 | `timelineEvents[]` |

### 4.3 ReportDashboard 6个Section

| Section ID | 标签 | 八字展示 | 六壬展示 | 取名展示 |
|-----------|------|---------|---------|---------|
| OVERVIEW | 命盘总览 | BaziOverviewCard | 六壬课盘摘要 | 取名分析 |
| CHARACTER | 性格画像 | CharacterCard | 核心推理 | — |
| CAREER | 事业财运 | CareerWealthCard | — | — |
| DAYUN | 大运流年 | DaYunLiuNianTable | — | — |
| SHENSHA | 神煞解析 | ShenShaCard | — | — |
| SUGGESTIONS | 综合建议 | SuggestionsCard | SuggestionsCard | SuggestionsCard |

---

## 五、用户旅程 3：人生K线图

### 5.1 用户体验

用户在结果页点击"命运K线图"VIP模块，或直接访问 `/tide` 页面K线Tab。

**展示内容**：
- 上半区：7条生命线折线图（career/wealth/health/relationship/growth/freedom/buffer）
- 下半区：综合生命资本 OHLCV 蜡烛图 + Volume 柱状图
- 支持周期切换：12/24/36/48个月

### 5.2 数据来源（双引擎）

| 引擎 | 文件 | 说明 |
|------|------|------|
| **KlineGenerator** | `consult/generators/kline.generator.ts` | 基于八字计算的真实K线（4种视图模式） |
| **KlineTideService** | `kline-tide/kline-tide.service.ts` | 独立的7维模拟K线（内存生成+SQLite持久化） |

### 5.3 KlineGenerator（八字驱动K线）

**4种视图模式**：

| viewMode | 说明 | 数据范围 |
|----------|------|---------|
| `life` | 全人生年K线 | 0-100岁，每年1点 |
| `decade` | 当前大运10年 | 10年，每年1点 |
| `monthly` | 当前年起12月 | 12个月，每月1点 |
| `yearMonth` | 全人生月K线 | 每年12个月 |

**5维评分体系**：

```
总分 = 大运(35%) + 流年(30%) + 用神(20%) + 冲合(10%) + 神煞(5%)
```

| 维度 | 评分逻辑 | 权重 |
|------|---------|------|
| 大运 | 天干地支五行 vs 八字日主 | 35% |
| 流年 | 流年干支 vs 大运+原局 | 30% |
| 用神 | 补最弱五行+20，遇最强-10 | 20% |
| 冲合 | 天干合+68/冲38，地支合+70/冲35 | 10% |
| 神煞 | 天乙+12/文昌+8/太极+8/羊刃-10 | 5% |

**趋势判定**：≥74上升 / ≤48调整 / |close-open|≥10转折 / 否则蓄势

**置信度**：无时辰68 / 子时72 / 有时辰86

### 5.4 KlineTideService（7维模拟K线）

**7维种子配置**：

| 维度 | 英文 | 均值 | 振幅 | 趋势 |
|------|------|------|------|------|
| 事业 | career | 60 | 20 | 0.3 |
| 财运 | wealth | 55 | 25 | 0.2 |
| 健康 | health | 70 | 15 | -0.1 |
| 感情 | relationship | 50 | 30 | 0.1 |
| 成长 | growth | 65 | 18 | 0.4 |
| 自由 | freedom | 55 | 22 | 0.15 |
| 缓冲 | buffer | 60 | 12 | 0 |

**生成算法**：趋势分量 + 季节分量 + 噪声 + 前值平滑

### 5.5 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/kline-tide/bars` | 获取K线OHLCV数据 |
| GET | `/kline-tide/package` | 一次性获取完整数据包 |
| POST | `/kline-tide/seed` | 强制重新生成 |

**前端调用**：

```typescript
// services/klineTideApi.ts
const package = await klineTideApi.fetchPackage({
  startYear, startMonth, klineMonths, tideMonths
});
// package.klineBars: MonthlyKlineBar[]
// package.stateSnapshots: StateSnapshot[]
// package.phasePoints: PhasePoint[]
```

### 5.6 前端组件

**LifeKLineChart** — `app/src/components/LifeKLineChart.tsx`

```
┌─────────────────────────────────────────┐
│  七线走势图 (Recharts ComposedChart)      │
│  ── career ── wealth ── health ── ...    │
├─────────────────────────────────────────┤
│  综合生命资本K线                           │
│  ▓▓ Volume柱  █ 蜡烛图(红涨绿跌)          │
│  ── 50分参考线                            │
└─────────────────────────────────────────┘
  [12月] [24月] [36月] [48月]  周期切换
```

---

## 六、用户旅程 4：潮汐图

### 6.1 用户体验

访问 `/tide` 页面，三个Tab切换：

| Tab | 组件 | 展示内容 |
|-----|------|---------|
| K线 | LifeKLineChart | 7线+蜡烛图（见旅程3） |
| 雷达 | StateRadarChart | 12维状态向量雷达图 |
| 相位 | TidePhaseChart | 容量×熵四象限散点图 |

### 6.2 12维状态向量

```
STATE_DIMS = [
  'energy',      // 精力
  'recovery',    // 恢复力
  'liquidity',   // 流动性
  'support',     // 支撑
  'buffer',      // 缓冲
  'stress',      // 压力
  'uncertainty', // 不确定性
  'conflict',    // 冲突
  'entropy',     // 熵
  'momentum',    // 动量
  'resilience',  // 韧性
  'adaptability' // 适应性
]
```

### 6.3 四象限模型

```
        高容量
          │
   Ⅰ 稳健  │  Ⅱ 活力
          │
 ─────────┼─────────
          │
  Ⅲ 蓄势  │  Ⅳ 调整
          │
        低容量
   低熵        高熵
```

| 象限 | 条件 | 含义 |
|------|------|------|
| Ⅰ 稳健 | 高容量 + 低熵 | 状态稳定，适合长期规划 |
| Ⅱ 活力 | 高容量 + 高熵 | 能量充沛但变化大，适合突破 |
| Ⅲ 蓄势 | 低容量 + 低熵 | 能量低但稳定，适合休整 |
| Ⅳ 调整 | 低容量 + 高熵 | 需要调整，避免重大决策 |

**容量计算**：5维均值（energy/recovery/liquidity/support/buffer）
**熵计算**：12维变异系数

### 6.4 数据类型

```typescript
// types/lifekline.ts
interface StateSnapshot {
  date: string;           // YYYY-MM
  values: Record<string, number>;  // 12维数值
  capacity: number;       // 容量 (0-100)
  entropy: number;        // 熵 (0-1)
  quadrant: 'robust' | 'vital' | 'accumulating' | 'adjusting';
  labels: string[];       // 标签
}

interface PhasePoint {
  id: string;
  date: string;
  capacity: number;
  entropy: number;
  bubbleSize: number;
  quadrant: string;
  label: string;
}
```

---

## 七、用户旅程 5：取名

### 7.1 用户体验

访问 `/naming`，进入 FrontdeskChat(mode="naming") 对话式取名。

**结果页展示4个子组件**：

| 组件 | 功能 |
|------|------|
| MultiRoundFilter | 多轮筛选（五行/字数过滤 + 收藏/排除 + 重新生成） |
| BrandStrategy | 品牌策略分析（市场定位/记忆度/品牌故事/商标建议） |
| RenameComparison | 改名前后对比（原名 vs 新名 五行/笔画/评分） |
| NamingPDFExport | PDF导出（完整取名报告） |

### 7.2 取名计算引擎

**文件**：`calc-engine/naming-engine/naming-calculator.ts`

**输入**：

```typescript
interface NamingInput {
  surname: string;           // 姓氏
  givenName: string;         // 名字
  isCompoundSurname?: boolean; // 是否复姓
}
```

**输出**：

```typescript
interface WugeResult {
  tianGe: { value: number; wuxing: string; jixiong: string };  // 天格
  renGe:  { value: number; wuxing: string; jixiong: string };  // 人格
  diGe:   { value: number; wuxing: string; jixiong: string };  // 地格
  waiGe:  { value: number; wuxing: string; jixiong: string };  // 外格
  zongGe: { value: number; wuxing: string; jixiong: string };  // 总格
  sancai: { config: string; jixiong: string; description: string }; // 三才配置
  score: number;             // 综合评分
  details: WugeDetail[];     // 各格详情
}
```

**五格计算规则**：

| 格 | 单姓单名 | 单姓双名 | 复姓单名 | 复姓双名 |
|----|---------|---------|---------|---------|
| 天格 | 姓笔画+1 | 姓笔画+1 | 姓总笔画 | 姓总笔画 |
| 人格 | 姓笔画+名第1字 | 姓笔画+名第1字 | 姓末字+名第1字 | 姓末字+名第1字 |
| 地格 | 名笔画+1 | 名两字笔画和 | 名笔画+1 | 名两字笔画和 |
| 外格 | 天格+地格-人格 | 总格-人格+1 | 总格-人格+1 | 总格-人格+1 |
| 总格 | 姓+名笔画和 | 姓+名笔画和 | 姓+名笔画和 | 姓+名笔画和 |

**评分权重**：天格10% + 人格40% + 地格20% + 外格10% + 总格10% + 三才10%

**笔画→五行**：尾数1-2→木, 3-4→火, 5-6→土, 7-8→金, 9-0→水

**康熙笔画**：`kangxi-strokes.ts` 收录 300+ 常用汉字

### 7.3 前端交互流程

```
用户输入姓氏+性别+行业
    ↓
FrontdeskChat(mode="naming") → POST /consult/analyze (route_type=quming)
    ↓
后端返回 name_suggestions[] + calc_result
    ↓
MultiRoundFilter 展示名字卡片
    ├─ 五行筛选 (metal/wood/water/fire/earth)
    ├─ 字数筛选 (2字/3字)
    ├─ 收藏/排除
    └─ 重新生成 (round+1)
    ↓
BrandStrategy → 品牌故事 + 市场定位
RenameComparison → 原名 vs 新名对比
NamingPDFExport → 打印/导出PDF
```

---

## 八、用户旅程 6：枢密院（深度咨询）

### 8.1 三步流程 + 四路分流

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Step 1   │    │  Step 2   │    │  Step 3   │
│  说出来   │───→│  摆开     │───→│  这事底   │
│  /speak   │    │  /spread  │    │  /bottom  │
└──────────┘    └──────────┘    └─────┬─────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              ┌─────▼─────┐   ┌──────▼──────┐  ┌──────▼──────┐
              │  通鉴      │   │  妙算        │  │  星途        │
              │  chronicle │   │  miaosuan    │  │  xingtu     │
              │  历史纵深   │   │  精准推演    │  │  人物关系    │
              └───────────┘   └─────────────┘  └─────────────┘
                    │
              ┌─────▼─────┐
              │  重新摆开   │
              │  respread  │
              └───────────┘
```

### 8.2 状态机

```
speaking → spreading → bottomed → chronicled → reviewed
    ↑          │           │           │
    └──────────┘───────────┘───────────┘  (可回退到speaking)
```

| 状态 | 含义 | 允许转移 |
|------|------|---------|
| speaking | 用户正在描述问题 | → spreading |
| spreading | 生成卡片/展开 | → bottomed, speaking |
| bottomed | 底层分析完成 | → chronicled, speaking |
| chronicled | 深度通鉴完成 | → reviewed, speaking |
| reviewed | 审阅完成 | → speaking |

### 8.3 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/shumiyuan/speak` | 说出来（创建flow state） |
| GET | `/shumiyuan/spread/:id` | 获取摆开卡片 |
| POST | `/shumiyuan/spread/:id` | 确认卡片 |
| GET | `/shumiyuan/bottom/:id` | 获取底层分析 |
| POST | `/shumiyuan/bottom/:id/dispatch` | 分流（chronicle/respread/miaosuan/xingtu） |

---

## 九、计算引擎详解

### 9.1 八字计算引擎

**入口**：`calc-engine/bazi-calculator-wrapper.ts`（805行）

**输入**：

```typescript
interface BaziInput {
  year: number;    // 公历年
  month: number;   // 0-11
  day: number;
  hour: number;    // 0-23
  minute: number;
  gender: 'male' | 'female';
}
```

**输出**：`BaziFullResult`（20+字段）

```
BaziFullResult
├── 四柱: yearPillar / monthPillar / dayPillar / hourPillar
├── 十神: yearShishen / monthShishen / dayShishen / hourShishen
├── 五行: wuxing { wood, fire, earth, metal, water }
├── 大运: daYun[8] { index, gan, zhi, full, startAge, endAge }
├── 起运年龄: qiYunAge { years, months, days, direction }
├── 流年: liuNian[10] { year, ganZhi, shishen }
├── 流年详情: liuNianDetail[] { he, chong, hai, xing, yongJi, score, theme }
├── 神煞: shenSha { [name]: string[] }
├── 纳音: naYin / 空亡: kongWang
├── 胎元: taiYuan / 命宫: mingGong / 身宫: shenGong
├── 藏干十神: zangganShishen
├── 十二长生: changsheng
├── 刑冲合害: xingChongHeHai
├── 自坐: selfSeat
└── 按柱神煞: shenShaByPillar
```

**计算流程**：

```
1. 年柱 → getCorrectYearPillar()（真节气立春校正）
2. 月柱 → getMonthZhiIndex()（真节气）+ 五虎遁推天干
3. 日柱 → 儒略日数(JDN)算法（精确无远期限制）
4. 时柱 → 五鼠遁
5. 十神 → getShishen()（日干 vs 各天干）
6. 五行 → countWeightedWuxing()（天干0.35/本气0.3/中气0.2/余气0.15）
7. 大运 → 阳年男/阴年女顺排，否则逆排，8步
8. 流年 → 1984甲子基准，推10年
9. 流年详情 → computeRelations() + scoreLiuNian() + getLiuNianTheme()
10. 神煞 → computeBaziShensha()（数据驱动，13个JSON文件）
11. 纳音/空亡 → getNayin()/getKongWang()
12. 胎元/命宫/身宫 → 传统公式
13. 刑冲合害 → 六合/三合/三会/六冲/六害/自刑/天干五合
```

### 9.2 取名计算引擎

见 [七、用户旅程 5：取名](#七用户旅程-5取名)

### 9.3 运势计算引擎

**文件**：`consult/generators/fortune.service.ts`

| 方法 | 输出 | 核心逻辑 |
|------|------|---------|
| `calculateDaily()` | DailyFortune | 日干支+月干支+年干支 → 基础50分+合冲修正+季节修正+确定性哈希 |
| `calculateMonthly()` | MonthlyFortune | 月干支 → 十神关系修正 → 幸运日/月度建议 |
| `calculateYearly()` | YearlyFortune | 年干支 → 12月遍历 → 最佳/最差3月 → 危机期/机遇期 → 生肖兼容度 |

**四维评分**：事业 / 财运 / 感情 / 健康

**幸运数字**：日干索引+日期偏移 → 3个数字
**幸运颜色**：日主五行+生我五行 → 3个颜色

### 9.4 数据文件清单

`calc-engine/data/` 下13个JSON数据文件：

| 文件 | 用途 |
|------|------|
| `shishen.json` | 十神查找表 |
| `zanggan.json` | 藏干数据 |
| `nayin.json` | 纳音数据 |
| `kongwang.json` | 空亡数据 |
| `changsheng.json` | 十二长生数据 |
| `shensha.json` | 神煞数据 |
| `dayun.json` | 大运排法 |
| `wuhudun.json` | 五虎遁（月干推算） |
| `wushudun.json` | 五鼠遁（时干推算） |
| `tiangandizhi.json` | 天干地支基础 |
| `tiangan_detail.json` | 天干详细属性 |
| `dizhi_detail.json` | 地支详细属性 |
| `dihe_relation.json` | 地支合关系 |

---

## 十、API 接口完整清单

### 10.1 咨询接口 (`/consult`)

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/consult/analyze` | 无 | 主分析接口（算法+知识库+LLM） |
| POST | `/consult/route` | 无 | 意图路由 |
| POST | `/consult/clarify` | 无 | 澄清问题生成 |
| POST | `/consult/info` | 无 | 提交用户信息 |
| GET | `/consult/result/:recordId` | Optional | 获取结果 |
| POST | `/consult/save` | JWT | 保存记录到用户 |
| GET | `/consult/records` | JWT | 获取用户记录列表 |
| POST | `/consult/records/delete` | JWT | 软删除记录 |
| GET | `/consult/person-profiles` | JWT | 获取人物档案列表 |
| GET | `/consult/person-profiles/:profileId/records` | JWT | 获取档案关联记录 |
| DELETE | `/consult/person-profiles/:profileId` | JWT | 删除人物档案 |
| GET | `/consult/fortune/daily` | 无 | 每日运势 |
| GET | `/consult/fortune/monthly/:year/:month` | 无 | 月度运势 |
| GET | `/consult/fortune/yearly/:year` | 无 | 年度运势 |
| GET | `/consult/celebrity-cases` | 无 | 名人案例列表 |
| GET | `/consult/celebrity-cases/:id` | 无 | 名人案例详情 |
| POST | `/consult/celebrity-cases/:id/similarity` | 无 | 计算名人相似度 |
| POST | `/consult/records/:recordId/modules/:moduleId/destiny-snapshot` | 无 | 保存命盘快照 |
| GET | `/consult/records/:recordId/modules/:moduleId` | 无 | 获取模块状态 |
| POST | `/consult/records/:id/behavior` | 无 | 保存行为记录 |
| POST | `/consult/records/:recordId/modules/:moduleId/retry` | 无 | 重试失败模块 |
| GET | `/consult/admin/asset-overview` | JWT(admin) | 管理员资产总览 |
| POST | `/consult/preview` | 无 | 实验接口-固定样例预览 |

### 10.2 K线潮汐接口 (`/kline-tide`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/kline-tide/bars` | 获取K线OHLCV数据 |
| GET | `/kline-tide/snapshots` | 获取状态快照 |
| GET | `/kline-tide/phase-points` | 获取相位空间点 |
| GET | `/kline-tide/package` | 一次性获取完整数据包 |
| POST | `/kline-tide/seed` | 强制重新生成 |

### 10.3 枢密院接口 (`/shumiyuan`)

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/shumiyuan/speak` | JWT | 说出来 |
| GET | `/shumiyuan/spread/:id` | JWT | 获取摆开卡片 |
| POST | `/shumiyuan/spread/:id` | JWT | 确认卡片 |
| GET | `/shumiyuan/bottom/:id` | JWT | 获取底层分析 |
| POST | `/shumiyuan/bottom/:id/dispatch` | JWT | 分流操作 |

### 10.4 星图接口 (`/star-chart`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/star-chart/persons` | 创建人物档案 |
| GET | `/star-chart/persons` | 列出人物档案 |
| GET | `/star-chart/persons/:id` | 获取特定人物 |
| PATCH | `/star-chart/persons/:id` | 更新人物档案 |
| DELETE | `/star-chart/persons/:id` | 删除人物档案 |
| POST | `/star-chart/persons/:id/dimensions` | 更新八维维度 |
| GET | `/star-chart/persons/:id/dimensions` | 获取八维维度 |
| GET | `/star-chart/network` | 获取关系网络 |
| GET | `/star-chart/network/stats` | 获取网络统计 |
| POST | `/star-chart/persons/:id/cases` | 添加相关事项 |
| GET | `/star-chart/persons/:id/cases` | 列出相关事项 |

### 10.5 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/refresh` | 刷新Token |
| GET | `/auth/profile` | 获取用户信息 |

---

## 十一、数据类型映射

### 11.1 前端核心类型

```typescript
// types/api.ts — API请求/响应
RouteRequest  → { question, birth_info? }
RouteResponse → { route_type, next_step, confidence }
ResultResponse → { summary_line, summary_body, risks[], actions[],
                   calc_result, zhangbanshan_output, toolResults[],
                   timelineEvents[], module_content, paywall_modules[] }

// types/lifekline.ts — K线/潮汐
MonthlyKlineBar → { year, month, monthLabel, open, high, low, close,
                    volume, volatility, dimensions: Record<LifeDimension, number>,
                    compositeScore, eventSummary? }
StateSnapshot → { date, values: Record<string,number>, capacity, entropy, quadrant, labels }
PhasePoint → { id, date, capacity, entropy, bubbleSize, quadrant, label }

// resultTypes.ts — 统一结果
UnifiedResult → { route_type, summary_line, summary_body, risks[], actions[],
                  time_window, calc_result, zhangbanshan_output, toolResults[],
                  timelineEvents[], module_content, paywall_modules[],
                  name_suggestions? }
```

### 11.2 后端核心类型

```typescript
// calc-engine/bazi-calculator-wrapper.ts
BaziInput → { year, month(0-11), day, hour, minute, gender }
BaziFullResult → { 四柱, 十神, 五行, 大运[8], 流年[10], 神煞, 纳音, 空亡, ... }

// calc-engine/naming-engine/naming-calculator.ts
NamingInput → { surname, givenName, isCompoundSurname? }
WugeResult → { 天格, 人格, 地格, 外格, 总格, 三才, score, details }

// consult/generators/kline.generator.ts
KlinePoint → { age, year, month?, ganZhi, daYun, liuNian, open, close,
               high, low, score, volatility, reason, evidenceTags, confidence,
               viewMode, trend, advice }
KlineMeta → { currentAge, currentDaYun, confidence, bestWindow, riskWindow }

// kline-tide/kline-tide.service.ts
KlineBar → { year, month, monthLabel, open, high, low, close, volume,
             volatility, dimensions, compositeScore }
StateSnapshot → { date, values, capacity, entropy, quadrant, labels }
PhasePoint → { id, date, capacity, entropy, bubbleSize, quadrant, label }
```

### 11.3 前后端字段映射

| 前端字段 | 后端来源 | 说明 |
|---------|---------|------|
| `result.calc_result` | `BaziFullResult` | 八字完整命盘 |
| `result.zhangbanshan_output` | Orchestrator 三阶段综合 | 张半山输出 |
| `result.name_suggestions` | LLM生成 + NamingCalculator评分 | 取名建议 |
| `result.module_content.kline` | KlineGenerator | 命运K线VIP模块 |
| `klineData` | KlineTideService | 潮汐页K线数据 |
| `snapshots` | KlineTideService | 12维状态快照 |
| `phasePoints` | KlineTideService | 相位空间点 |

---

## 十二、WebSocket 实时通信

**网关**：`websocket/websocket.gateway.ts`

### 事件清单

| 事件 | 方向 | 说明 |
|------|------|------|
| `ping/pong` | 双向 | 心跳检测 |
| `authenticate` | 客户端→服务端 | JWT认证 |
| `progress` | 服务端→客户端 | 进度更新 |
| `result` | 服务端→客户端 | 结果更新 |
| `error` | 服务端→客户端 | 错误更新 |
| `llm_token` | 服务端→客户端 | LLM流式token推送 |

### LLM流式推送流程

```
Orchestrator Step 8
    ↓
llmGateway.generateParallel() → 流式响应
    ↓
websocketGateway.sendLLMToken(recordId, token)
    ↓
前端 ResultChat 实时拼接显示
```

---

## 十三、LLM 编排与多模型网关

### 13.1 多模型支持

**文件**：`llm-providers/llm-providers.service.ts`

| 提供商 | 模型 | 用途 |
|--------|------|------|
| MiniMax | MiniMax-Text-01 | 主力模型 |
| Doubao | doubao-1.5-pro | 备选 |
| DeepSeek | deepseek-chat | 备选 |
| SenseNova | sensenova-v4 | 备选 |
| Spark | spark-v4 | 备选 |

### 13.2 故障转移机制

```
主提供商调用
    ↓ 失败
自动切换到备选提供商
    ↓ 失败
再切换下一个
    ↓ 全部失败
返回错误 + 降级到本地引擎
```

### 13.3 排班调度

**文件**：`consult/orchestrator/zhangbanshan-scheduler.service.ts`

| 模式 | 说明 | LLM调用 |
|------|------|---------|
| `quick_read` | 快速解读 | 只跑主调 |
| `deep_consult` | 深度咨询 | 并行主调+佐调 → 仲裁 → ReAct推理 |

**仲裁逻辑**：主调与佐调结果不一致时，由仲裁器判定信任哪个

**ReAct推理**：最多5轮"行动→观察→反思"闭环，仅deep_consult模式

---

## 十四、部署架构

### 14.1 服务器配置

| 项目 | 值 |
|------|-----|
| 服务器 | 阿里云 8.148.245.29 |
| 内存 | 2GB |
| Node.js | v22.22.2 |
| 进程管理 | PM2 cluster模式，2实例 |
| 端口 | 3000（后端API） |
| 前端 | Nginx 静态文件 `/life/` |

### 14.2 Nginx 路由

```nginx
location /life/ {
    alias /path/to/dist/;         # 前端静态文件
    try_files $uri $uri/ /life/index.html;
}

location /life/api/v1/ {
    proxy_pass http://127.0.0.1:3000/api/v1/;  # 后端API
}
```

### 14.3 PM2 配置（服务器端）

```javascript
// ecosystem.config.js (服务器版本)
{
  script: 'apps/api-server/dist/main.js',
  instances: 2,
  exec_mode: 'cluster',
  env: { PORT: 3000 }
}
```

### 14.4 健康检查

```bash
curl http://localhost:3000/api/v1/health
# → {"code":0,"message":"ok"}
```

---

## 附录 A：关键文件索引

### 前端

| 文件 | 说明 |
|------|------|
| `app/src/App.tsx` | 路由配置 |
| `app/src/pages/ConsultPage.tsx` | 咨询输入页 |
| `app/src/pages/InfoPage.tsx` | 补充信息页 |
| `app/src/pages/ResultPage.tsx` | 结果展示页（1274行） |
| `app/src/pages/TidePage.tsx` | 潮汐图页 |
| `app/src/components/LifeKLineChart.tsx` | K线图组件 |
| `app/src/components/result/ResultChat.tsx` | 聊天模式结果 |
| `app/src/components/result/ReportDashboard.tsx` | 报告模式结果 |
| `app/src/components/naming/MultiRoundFilter.tsx` | 取名多轮筛选 |
| `app/src/components/naming/BrandStrategy.tsx` | 品牌策略 |
| `app/src/components/naming/RenameComparison.tsx` | 改名对比 |
| `app/src/components/naming/NamingPDFExport.tsx` | PDF导出 |
| `app/src/api/client.ts` | API客户端 |
| `app/src/api/consult.ts` | 咨询API |
| `app/src/services/klineTideApi.ts` | K线潮汐API |
| `app/src/types/api.ts` | API类型定义 |
| `app/src/types/lifekline.ts` | K线/潮汐类型 |

### 后端

| 文件 | 说明 |
|------|------|
| `src/consult/consult.controller.ts` | 咨询API控制器（427行） |
| `src/consult/orchestrator/orchestrator.service.ts` | 核心编排器 |
| `src/consult/generators/kline.generator.ts` | K线生成器（460行） |
| `src/consult/generators/fortune.service.ts` | 运势计算 |
| `src/calc-engine/bazi-calculator-wrapper.ts` | 八字计算入口（805行） |
| `src/calc-engine/naming-engine/naming-calculator.ts` | 取名计算 |
| `src/kline-tide/kline-tide.service.ts` | K线潮汐服务（498行） |
| `src/kline-tide/kline-tide.controller.ts` | K线潮汐API |
| `src/shumiyuan/shumiyuan.controller.ts` | 枢密院API |
| `src/shumiyuan/flow-state.service.ts` | 枢密院状态机 |
| `src/star-chart/star-chart.controller.ts` | 星图API |
| `src/llm-providers/llm-providers.service.ts` | LLM多模型网关 |
| `src/websocket/websocket.gateway.ts` | WebSocket网关 |

---

## 附录 B：VIP模块映射

| module_id | 前端展示名 | 后端数据来源 |
|-----------|----------|------------|
| `kline` | 命运K线图 | KlineGenerator.generateKLineData() |
| `breakthrough` | 突破分析 | LLM深度解读 |
| `morning` | 晨间提示 | FortuneService.calculateDaily() |

---

## 附录 C：路由类型与引擎映射

| route_type | 中文名 | 计算引擎 | LLM Agent |
|-----------|-------|---------|-----------|
| `ziping` | 子平八字 | BaziCalculatorWrapper | ziping-agent |
| `liuren` | 六壬断事 | （前端iziwei库） | liuren-agent |
| `quming` | 取名 | NamingCalculator | quming-agent |
| `ziwei` | 紫微斗数 | lib/atom-tools/ziwei/ | ziwei-agent |
| `meihua` | 梅花易数 | （待实现） | meihua-agent |
| `clarify` | 澄清问题 | 无 | 通用LLM |
