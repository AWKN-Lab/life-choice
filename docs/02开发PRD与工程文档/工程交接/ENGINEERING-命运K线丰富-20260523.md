# 命运K线丰富 — 工程文档

> 阶段：B-Build（DSPBRSE v2.3）
> 上游：命运K线丰富方案 v2.0（Spec）
> 生成：2026-05-23
> 工程范围：destinyKline 引擎从 v2 → v3 升级

---

## 1. 架构概览

### 1.1 当前架构 (v2)

```
                    ┌──────────────────────┐
                    │    MainLayout.test     │
                    │  calc_result (JSON)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  deriveDestinyKline  │
                    │  ┌─────────────────┐ │
                    │  │ evidenceTags    │ │ → 字符串匹配 ruleFactors
                    │  │ daYun gan/zhi   │ │ → 天干地支字面匹配
                    │  │ yearCycle       │ │ → point.score * 0.85
                    │  │ baseChart       │ │ → 前置固定值
                    │  └─────────────────┘ │
                    │          ↓           │
                    │   OHLCV = 6 因子     │
                    │   (baseChart +       │
                    │    daYun + yearly +  │
                    │    aspect +          │
                    │    knowledge - risk) │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  DestinyKlineBundle  │
                    │  4 aspects × N 年份  │
                    └──────────────────────┘
```

### 1.2 升级架构 (v3)

```
                    ┌──────────────────────────────────────────┐
                    │            calc_result (JSON)             │
                    │  ┌────┬────┬────┬────┬────┬────┬──────┐ │
                    │  │四柱│十神│纳音│长生│藏干│刑冲│ 紫微 │ │
                    │  │    │    │    │    │    │合害│      │ │
                    │  └────┴────┴────┴────┴────┴────┴──────┘ │
                    └──────────────────┬───────────────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        │              │               │               │              │
  ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
  │shiShen     │ │xingChong   │ │naYin       │ │ziwei       │ │celebrity   │
  │Modulator   │ │HeHaiPenalty│ │Zanggan     │ │Modulator   │ │Modulator   │
  │            │ │            │ │Modulator   │ │            │ │            │
  │十神→aspect │ │刑冲→risk   │ │纳音→wuxing │ │紫微→12宫  │ │名人→对标   │
  │权重映射    │ │合害→vol    │ │藏干→隐性   │ │四化→吉凶   │ │相似度→调节 │
  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
        │              │               │               │              │
        └──────────────┴───────────────┼───────────────┴──────────────┘
                                       │
                    ┌──────────────────▼───────────────────┐
                    │    deriveDestinyKline (升级)          │
                    │                                      │
                    │  OHLCV = baseChart*0.12              │
                    │        + daYun*0.20                  │
                    │        + yearly*0.18                 │
                    │        + shiShen*0.12   ← NEW        │
                    │        + ziwei*0.10     ← NEW        │
                    │        + aspect*0.12                 │
                    │        + knowledge*0.08              │
                    │        + celebrity*0.08 ← NEW        │
                    │        - riskPenalty*1.0             │
                    └──────────────────┬───────────────────┘
                                       │
                    ┌──────────────────▼───────────────────┐
                    │  DestinyKlineBundle (v3)              │
                    │  4 aspects × N 年份                   │
                    │  + KlineFactorBreakdownV2 (9 因子)    │
                    │  + celebrityReference (对标数据)       │
                    └──────────────────────────────────────┘
```

---

## 2. 模块规格

### 2.1 文件结构

```
app/src/lib/destinyKline/
├── types.ts                       # 类型定义（升级）
├── deriveDestinyKline.ts          # 核心派生函数（升级）
├── ruleFactors.ts                 # 规则因子（12→42）
├── deterministicRandom.ts         # 确定性随机数 [NEW]
├── shiShenModulator.ts            # 十神→K线映射 [NEW]
├── xingChongHeHaiPenalty.ts       # 刑冲合害→风险/量 [NEW]
├── naYinZangganModulator.ts       # 纳音+藏干→aspect [NEW]
├── ziweiModulator.ts             # 紫微→K线映射 [NEW]
├── celebrityModulator.ts         # 名人→对标调节 [NEW]
├── wuxingUtils.ts                # 五行工具（天干→五行）[NEW]
└── __tests__/                    # 单元测试目录 [NEW]
    ├── shiShenModulator.test.ts
    ├── xingChongHeHaiPenalty.test.ts
    ├── naYinZangganModulator.test.ts
    ├── ziweiModulator.test.ts
    ├── celebrityModulator.test.ts
    └── deriveDestinyKline.test.ts
```

### 2.2 核心类型升级

```typescript
// types.ts — 新增/修改类型

/** 因子分解 V2（从 6 → 9 项） */
interface KlineFactorBreakdownV2 {
  baseChart: number;
  daYun: number;
  yearly: number;
  shiShen: number;      // NEW
  ziwei: number;        // NEW
  aspect: number;
  knowledge: number;
  celebrity: number;    // NEW
  riskPenalty: number;
}

/** K线 bundle V3 */
interface DestinyKlineBundleV3 extends DestinyKlineBundle {
  factorBreakdown: KlineFactorBreakdownV2[];  // 每条K线的因子分解
  celebrityRef?: CelebrityReference;           // NEW
}

/** 名人参考 */
interface CelebrityReference {
  topMatches: {
    name: string;
    wuxingSimilarity: number;
    scores: { overall: number; career: number; wealth: number; personality: number; marriage: number; health: number };
  }[];
  averageAspectScores: { overall: number; career: number; wealth: number; relationship: number };
}

/** 十神效果映射 */
interface ShiShenEffect {
  aspect: KlineAspect;
  baseWeight: number;
  direction: 'positive' | 'negative' | 'mixed';
}

/** 刑冲合害风险包 */
interface XCHHRiskBundle {
  riskPenalty: number;
  opportunityBonus: number;
  volumeBoost: number;
}

/** 纳音类别 */
type NaYinCategory = '金' | '木' | '水' | '火' | '土';

/** 藏干条目 */
interface ZangganEntry {
  gan: string;
  shishen: string;
}

/** 紫微宫位 */
interface ZiweiPalace {
  name: string;
  majorStars: string[];
  minorStars?: string[];
}
```

---

## 3. 模块详细设计

### 3.1 shiShenModulator.ts

**职责**：将四柱十神字符串映射为 K线 4 aspect 的数值调节。

**输入**：
```typescript
deriveShiShenMod(
  yearShishen: string,   // "食神"
  monthShishen: string,  // "偏印"
  dayShishen: string,    // "比肩"
  hourShishen: string,   // "正官"
  aspect: KlineAspect    // 'career' | 'wealth' | 'overall' | 'relationship'
): number
```

**映射表**：
| 十神 | aspect | 权重 | 方向 |
|------|--------|------|------|
| 正官 | career | 8 | positive |
| 七杀 | career | 12 | mixed |
| 正财 | wealth | 10 | positive |
| 偏财 | wealth | 12 | mixed |
| 食神 | career,wealth | 8 | positive |
| 伤官 | career,relationship | 10 | mixed |
| 正印 | overall | 8 | positive |
| 偏印 | overall | 6 | mixed |
| 比肩 | overall | 5 | mixed |
| 劫财 | wealth | -8 | negative |

**算法**：
```
total = 0
for each pillar shishen:
  effect = SHISHEN_MAP[shishen]
  if effect.aspect == aspect:
    total += effect.baseWeight * (effect.direction == 'mixed' ? 0.5 : 1.0)
return normalize(total)  // 归一化到 0-100
```

---

### 3.2 xingChongHeHaiPenalty.ts

**职责**：从结构化刑冲合害数据计算风险惩罚/机会加分/成交量。

**输入**：
```typescript
deriveXCHHRisk(
  xchh: {
    he: { pillars: string[]; relation: string }[];
    chong: { pillars: string[]; relation: string }[];
    hai: { pillars: string[]; relation: string }[];
    xing: { pillars: string[]; relation: string }[];
  },
  liuNianDetail: LiuNianDetail[],
  yearIndex: number
): XCHHRiskBundle
```

**规则表**：
| 关系 | 本命盘 | 流年叠加 | 影响 |
|------|--------|---------|------|
| 合 | +5 opp, +3 vol | +5 opp/合 | 好事成局 |
| 冲 | +8 risk, +5 vol | +10 risk/冲 | 变动冲突 |
| 害 | +4 risk | — | 暗中破坏 |
| 刑 | +6 risk | — | 是非官司 |

---

### 3.3 naYinZangganModulator.ts

**职责**：纳音五行 → aspect 倾向 + 藏干十神 → 隐性信号。

**纳音映射（30种→aspect）**：
```typescript
const NAYIN_ASPECT_MAP: Record<string, { aspect: KlineAspect; weight: number }> = {
  // 金类
  '海中金': { aspect: 'wealth', weight: 4 },
  '剑锋金': { aspect: 'career', weight: 4 },
  '钗钏金': { aspect: 'career', weight: 3 },
  '沙中金': { aspect: 'wealth', weight: 3 },
  '白蜡金': { aspect: 'career', weight: 3 },
  '金箔金': { aspect: 'wealth', weight: 2 },
  // 木类
  '大林木': { aspect: 'overall', weight: 3 },
  '杨柳木': { aspect: 'overall', weight: 2 },
  '松柏木': { aspect: 'overall', weight: 4 },
  '平地木': { aspect: 'overall', weight: 2 },
  '桑柘木': { aspect: 'career', weight: 3 },
  '石榴木': { aspect: 'wealth', weight: 3 },
  // 水类
  '涧下水': { aspect: 'relationship', weight: 3 },
  '大溪水': { aspect: 'career', weight: 4 },
  '长流水': { aspect: 'overall', weight: 3 },
  '天河水': { aspect: 'overall', weight: 5 },
  '泉中水': { aspect: 'relationship', weight: 2 },
  '大海水': { aspect: 'career', weight: 5 },
  // 火类
  '炉中火': { aspect: 'career', weight: 4 },
  '山头火': { aspect: 'career', weight: 3 },
  '霹雳火': { aspect: 'career', weight: 5 },
  '覆灯火': { aspect: 'overall', weight: 3 },
  '天上火': { aspect: 'career', weight: 4 },
  '山下火': { aspect: 'wealth', weight: 3 },
  // 土类
  '路旁土': { aspect: 'overall', weight: 3 },
  '城头土': { aspect: 'wealth', weight: 4 },
  '屋上土': { aspect: 'wealth', weight: 4 },
  '壁上土': { aspect: 'overall', weight: 2 },
  '大驿土': { aspect: 'career', weight: 3 },
  '沙中土': { aspect: 'wealth', weight: 2 },
};
```

**藏干规则**：
```typescript
function deriveZangganMod(
  zangganShishen: { year: ZangganEntry[]; month: ZangganEntry[]; day: ZangganEntry[]; hour: ZangganEntry[] },
  aspect: KlineAspect
): number {
  let score = 0;
  for (const [pillar, entries] of Object.entries(zangganShishen)) {
    for (const entry of entries) {
      const effect = SHISHEN_MAP[entry.shishen];
      if (effect && effect.aspect === aspect) {
        score += effect.baseWeight * 0.6; // 隐性 = 60% 显性
      }
    }
    // 日支藏干（配偶宫）特殊规则
    if (pillar === 'day' && aspect === 'relationship') {
      const hasGuanKill = entries.some(e => e.shishen === '正官' || e.shishen === '七杀');
      if (hasGuanKill) score += 5;
    }
  }
  return score;
}
```

---

### 3.4 ziweiModulator.ts

**职责**：紫微斗数盘面 → K线 4 aspect 调节。

**输入**：
```typescript
deriveZiweiMod(
  ziweiSummary: {
    mingGong: { ganZhi: string; majorStars: string[] };
    shenGongName: string;
    sihua: { lu: StarPalace[]; quan: StarPalace[]; ke: StarPalace[]; ji: StarPalace[] };
    palaces: ZiweiPalace[];
  },
  aspect: KlineAspect
): number
```

**宫位→aspect 映射**：
```typescript
const PALACE_ASPECT_MAP: Record<string, KlineAspect> = {
  '命宫': 'overall',
  '官禄': 'career',
  '财帛': 'wealth',
  '夫妻': 'relationship',
  '迁移': 'career',
  '福德': 'overall',
  '田宅': 'wealth',
  '父母': 'overall',
  '兄弟': 'relationship',
  '子女': 'relationship',
  '交友': 'relationship',
  '疾厄': 'overall',
};
```

**算法**：
```
score = 0

// 1. 命宫主星
for star in mingGong.majorStars:
  if star in ['紫微', '天府']: score += 12
  if star in ['七杀', '破军', '贪狼']: score += 10  // 杀破狼
  if star in ['天机', '太阴', '天同', '天梁']: score += 6  // 机月同梁

// 2. 四化
for hua in sihua:
  if hua.type == '禄' && PALACE_ASPECT_MAP[hua.palace] == aspect: score += 12
  if hua.type == '忌' && PALACE_ASPECT_MAP[hua.palace] == aspect: score -= 8
  if hua.type == '权' && PALACE_ASPECT_MAP[hua.palace] == aspect: score += 6
  if hua.type == '科' && PALACE_ASPECT_MAP[hua.palace] == aspect: score += 4

// 3. 身宫
if PALACE_ASPECT_MAP[shenGongName] == aspect: score += 8

// 4. 各宫主星
for palace in palaces:
  if PALACE_ASPECT_MAP[palace.name] == aspect:
    score += palace.majorStars.length * 3

return normalize(score)
```

---

### 3.5 celebrityModulator.ts

**职责**：名人案例对标 → K线调节。

**输入**：
```typescript
deriveCelebrityMod(
  celebrityCases: CelebrityCase[],       // API 返回的 12 位名人
  userWuxing: { wood: number; fire: number; earth: number; metal: number; water: number },
  aspect: KlineAspect
): { modifier: number; reference: CelebrityReference }
```

**算法**：
```
// 1. 五行余弦相似度排序
similarities = celebrityCases.map(c =>
  cosineSimilarity(userWuxing, c.wuxing || estimateWuxing(c.birth_date))
)
top3 = sortBySimilarity(similarities).slice(0, 3)

// 2. 名人 scores → aspect 映射
celebrityAspectMap = {
  'overall': 'overall',
  'career': 'career',
  'wealth': 'wealth',
  'marriage': 'relationship',
}

// 3. 加权平均
modifier = 0
for (name, sim) in top3:
  celebrityScore = name.scores[celebrityAspectMap[aspect]]
  modifier += celebrityScore * sim

// 4. 如果相似度 > 0.8 且有同柱名人
if top3[0].sim > 0.8 && hasSamePillar(user, top3[0].person):
  modifier += 10

return normalize(modifier / 100 * 12)  // 缩放到合理范围
```

---

## 4. deriveDestinyKline 升级

### 4.1 函数签名升级

```typescript
// 旧
function deriveDestinyKline(
  points: KLinePoint[],
  klineMeta: KlineMeta
): DestinyKlineBundle

// 新
function deriveDestinyKline(
  points: KLinePoint[],
  klineMeta: KlineMeta,
  calcResult: CalcResult,            // NEW: 全量 calc_result
  celebrityData?: CelebrityCase[]    // NEW: 名人案例
): DestinyKlineBundleV3
```

### 4.2 OHLCV 计算公式升级

```typescript
function deriveAspectOHLCV(
  points: KLinePoint[],
  klineMeta: KlineMeta,
  calcResult: CalcResult,
  celebrityData: CelebrityCase[] | undefined,
  aspect: KlineAspect
): AspectOHLCV[] {
  const { yongShen, jiShen, shishen, naYin, changsheng, zangganShishen,
          xingChongHeHai, ziweiSummary, liuNianDetail, shenShaByPillar } = calcResult;

  // 预处理：非 aspect 依赖的调节器
  const naYinMod = deriveNaYinMod(naYin, aspect);
  const zangganMod = deriveZangganMod(zangganShishen, aspect);
  const shiShenStatic = deriveShiShenMod(shishen, aspect);
  const ziweiStatic = deriveZiweiMod(ziweiSummary, aspect);
  const celebrityMod = celebrityData
    ? deriveCelebrityMod(celebrityData, calcResult.wuxing, aspect).modifier
    : 0;

  return points.map((point, i) => {
    // 本命盘静态调节
    const baseChart = point.score * 0.20;            // ↓ 0.20→0.12

    // 大运：用神/忌神调节 (+10/-8)
    const daYun = deriveDaYunScore(point, klineMeta, aspect, yongShen, jiShen) * 0.20;

    // 流年：直接用 liuNianDetail.score + 用神调节
    const yearly = liuNianDetail[i]
      ? liuNianDetail[i].score * 0.18            // 直接取值
      : point.score * 0.85 * 0.18;               // 降级：旧算法

    // 十神
    const shiShen = shiShenStatic * 0.12;

    // 紫微
    const ziwei = ziweiStatic * 0.10;

    // aspect：纳音+藏干
    const aspectMod = (point.score * 0.6 + naYinMod + zangganMod) * 0.12;

    // knowledge：神煞分柱精确化
    const knowledge = deriveKnowledgeMod(point, shenShaByPillar, aspect) * 0.08;

    // 名人
    const celebrity = celebrityMod * 0.08;

    // 风险：刑冲合害结构化
    const { riskPenalty } = deriveXCHHRisk(xingChongHeHai, liuNianDetail, i);

    const close = baseChart + daYun + yearly + shiShen + ziwei + aspectMod + knowledge + celebrity - riskPenalty;

    return {
      open: calculateOpen(close, point.volatility),
      high: calculateHigh(close, point.volatility),
      low: calculateLow(close, point.volatility),
      close: clamp(close, 0, 100),
      volume: point.volume + riskPenalty,  // 刑冲增加成交量
      factorBreakdown: { baseChart, daYun, yearly, shiShen, ziwei, aspect: aspectMod, knowledge, celebrity, riskPenalty },
    };
  });
}
```

---

## 5. 数据流

### 5.1 完整数据流

```
ResultPage.tsx
  │
  ├─ fetch: POST /life/api/v1/consult/analyze
  │   → 返回 { ...result, calc_result }
  │
  ├─ store: useConsultStore.setState({ result, calcResult })
  │
  └─ 渲染 LifeKLineChart
       │
       ├─ 读取 calc_result
       ├─ 调用 deriveDestinyKline(points, meta, calcResult, celebrityData)
       │   ├─ shiShenModulator(calcResult.shishen)
       │   ├─ xingChongHeHaiPenalty(calcResult.xingChongHeHai)
       │   ├─ naYinZangganModulator(calcResult.naYin, calcResult.zangganShishen)
       │   ├─ ziweiModulator(calcResult.ziweiSummary)
       │   └─ celebrityModulator(celebrityCases, calcResult.wuxing)
       │
       ├─ 输出 DestinyKlineBundleV3
       │   ├─ 4 aspects × N 年份 OHLCV
       │   ├─ 每条含 9 因子分解 (KlineFactorBreakdownV2)
       │   └─ 名人参考 (CelebrityReference)
       │
       └─ ECharts 渲染
            ├─ K线图 (candlestick series)
            ├─ 名人 reference line (line series × 3, dashed)
            └─ 关键节点标注 (markPoint)
```

### 5.2 名人数据加载路径

```
ResultPage.tsx
  │
  ├─ useEffect: fetch celebrity cases [L556]
  │   GET /life/api/v1/consult/celebrity-cases
  │   → CelebrityCase[]
  │
  ├─ useEffect: calculate similarity [L568]
  │   POST /life/api/v1/consult/celebrity-cases/:id/similarity
  │   → CelebritySimilarityResult
  │
  └─ 传递到 deriveDestinyKline
```

---

## 6. ruleFactors 升级

### 6.1 从 12 → 42 因子

文件：`app/src/lib/destinyKline/ruleFactors.ts`

**现有因子保留**（12条，ID 不变）：
- 食伤生财、比劫夺财、财星透出、官印相生、食伤制杀
- 文昌助业、桃花触发、夫妻宫冲动、红鸾天喜
- 空亡回撤、冲刑破位、用神回归

**新增因子**（30条）：

```typescript
// 十神类 (+8)
{ id: 'SHI-001', name: '正官透干', aspect: 'career', direction: 'positive', weight: 10 },
{ id: 'SHI-002', name: '七杀攻身', aspect: 'career', direction: 'mixed', weight: 12 },
{ id: 'SHI-003', name: '正财合身', aspect: 'wealth', direction: 'positive', weight: 10 },
{ id: 'SHI-004', name: '偏财透出', aspect: 'wealth', direction: 'mixed', weight: 10 },
{ id: 'SHI-005', name: '食神吐秀', aspect: 'career', direction: 'positive', weight: 8 },
{ id: 'SHI-006', name: '伤官见官', aspect: 'career', direction: 'negative', weight: 10 },
{ id: 'SHI-007', name: '比劫林立', aspect: 'wealth', direction: 'negative', weight: 8 },
{ id: 'SHI-008', name: '印星护身', aspect: 'overall', direction: 'positive', weight: 8 },

// 刑冲合害类 (+6)
{ id: 'XC-001', name: '三合局成', aspect: 'overall', direction: 'positive', weight: 12 },
{ id: 'XC-002', name: '六合局成', aspect: 'overall', direction: 'positive', weight: 8 },
{ id: 'XC-003', name: '天克地冲', aspect: 'overall', direction: 'negative', weight: 12 },
{ id: 'XC-004', name: '刑害并见', aspect: 'overall', direction: 'negative', weight: 8 },
{ id: 'XC-005', name: '三刑全', aspect: 'relationship', direction: 'negative', weight: 15 },
{ id: 'XC-006', name: '暗合', aspect: 'relationship', direction: 'mixed', weight: 5 },

// 神煞类 (+6)
{ id: 'SS-001', name: '天乙贵人临', aspect: 'overall', direction: 'positive', weight: 10 },
{ id: 'SS-002', name: '文昌入命', aspect: 'career', direction: 'positive', weight: 8 },
{ id: 'SS-003', name: '驿马发动', aspect: 'career', direction: 'mixed', weight: 6 },
{ id: 'SS-004', name: '羊刃驾杀', aspect: 'career', direction: 'mixed', weight: 10 },
{ id: 'SS-005', name: '孤辰寡宿', aspect: 'relationship', direction: 'negative', weight: 8 },
{ id: 'SS-006', name: '劫煞亡神', aspect: 'overall', direction: 'negative', weight: 10 },

// 大运类 (+4)
{ id: 'DY-001', name: '换运交接', aspect: 'overall', direction: 'mixed', weight: 10 },
{ id: 'DY-002', name: '用神大运', aspect: 'overall', direction: 'positive', weight: 15 },
{ id: 'DY-003', name: '忌神大运', aspect: 'overall', direction: 'negative', weight: 12 },
{ id: 'DY-004', name: '墓库运', aspect: 'overall', direction: 'negative', weight: 8 },

// 紫微类 (+6)
{ id: 'ZW-001', name: '紫微在命', aspect: 'overall', direction: 'positive', weight: 12 },
{ id: 'ZW-002', name: '杀破狼格', aspect: 'career', direction: 'mixed', weight: 15 },
{ id: 'ZW-003', name: '禄在财帛', aspect: 'wealth', direction: 'positive', weight: 12 },
{ id: 'ZW-004', name: '忌在夫妻', aspect: 'relationship', direction: 'negative', weight: 10 },
{ id: 'ZW-005', name: '府相朝垣', aspect: 'overall', direction: 'positive', weight: 10 },
{ id: 'ZW-006', name: '火铃夹命', aspect: 'overall', direction: 'negative', weight: 12 },
```

---

## 7. 集成检查清单

### 7.1 ResultPage.tsx 改动

| 行号 | 改动 | 说明 |
|------|------|------|
| ~L556 | 新增 celebrity cases fetch | 首次加载时获取名人数据 |
| ~L570 | 新增 wuxing similarity calc | 用户有 calc_result 后计算相似度 |
| ~L580 | 修改 deriveDestinyKline 调用 | 传入 calcResult + celebrityData |
| ~L590 | 新增 factorBreakdown 消费 | tooltip/详情面板读取 9 因子 |

### 7.2 types.ts 改动

| 改动 | 说明 |
|------|------|
| 新增 `KlineFactorBreakdownV2` | 9 因子接口 |
| 新增 `DestinyKlineBundleV3` | 扩展 bundle |
| 新增 `CelebrityReference` | 名人参考数据 |
| 新增 `ShiShenEffect` / `XCHHRiskBundle` | 模块内部类型 |
| 修改 `AspectOHLCV` | 新增 `factorBreakdown` 字段 |

### 7.3 构建验证

```bash
# 前端
cd app && npm run build     # 必须通过
cd app && npm run typecheck # 零错误

# 测试
cd app && npx vitest run    # 所有新增模块测试通过
```

---

## 8. 依赖关系

```
wuxingUtils.ts           ← 无依赖（纯工具）
    │
    ├──→ shiShenModulator.ts      ← 依赖 wuxingUtils
    ├──→ xingChongHeHaiPenalty.ts ← 依赖 types.ts
    ├──→ naYinZangganModulator.ts ← 依赖 wuxingUtils + shiShenModulator
    ├──→ ziweiModulator.ts        ← 依赖 types.ts
    └──→ celebrityModulator.ts    ← 依赖 celebrity API types
              │
              └──→ deriveDestinyKline.ts ← 依赖以上全部 + ruleFactors.ts
```

---

## 9. 不做清单

| 项目 | 原因 |
|------|------|
| 后端 calc_result 结构修改 | calc_result 已有全部数据，纯粹是前端利用不足 |
| 新增后端 API 端点 | 名人案例 API 已存在，无需新增 |
| 修改数据库 Schema | 不涉及持久化 |
| 移动端适配 | 不在当前范围 |
| K线图中期"动态"化 | Phase 4 可选，当前非必需 |
| OHLCV 权重自动调参 | 先用硬编码，后续可做 AB 测试 |