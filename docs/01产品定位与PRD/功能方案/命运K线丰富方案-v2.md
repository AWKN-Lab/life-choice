# 命运K线丰富方案 v2.0

> 基于 `calc_result` 全维度命理数据 + 名人案例对标 + API 实测验证
> 日期：2026-05-23 | 当前K线版本：destiny-kline-v2

---

## 一、现状诊断

### 1.1 当前K线数据利用度

```
calc_result 提供 16+ 维度 ──→  deriveDestinyKline 仅利用 ~3 维度
                                     ↓
                              12条规则因子 ← 仅做 evidenceTag 匹配
```

**OHLCV 计算公式（当前）：**

```
close = baseChart*0.20 + daYunScore*0.25 + yearlyMod*0.25 + aspectMod*0.20 + knowledgeMod*0.10 - riskPenalty
```

**问题：**
- `baseChart` 是前置计算的固定值（非实时命理推演）
- `daYunScore` 仅根据天干地支字面匹配（忽略十神/纳音/长生/藏干/刑冲合害）
- `yearlyMod` 仅用 `point.score * 0.85 + yearCycle`（极度简化）
- `knowledgeMod` 仅做 evidenceTag 字符串匹配
- **十神/纳音/长生/藏干/刑冲合害/紫微/用神/神煞分柱等 10+ 维度完全未参与计算**

### 1.2 名人案例未集成

名人案例 API 返回 12 位名人，每个有 6 维度评分（overall/personality/career/wealth/marriage/health），但目前 `BaziComparisonPanel` 仅做视觉展示，未参与 K线计算。

### 1.3 API 实测验证

通过 `POST /life/api/v1/consult/analyze` 测试了以下场景：

| 测试案例 | 四柱 | 日主 | 身强弱 | 用神 | 大运 |
|---------|------|------|--------|------|------|
| 1990-05-23 (随机) | 庚午/辛巳/戊子/丙辰 | 戊 | 中和(60) | 金木水 | 乙酉(34-43) |
| 1955-02-24 (Jobs) | 乙未/戊寅/丙辰/癸巳 | 丙 | 中和(58) | 土水金 | 辛未(66-75) |

---

## 二、分维度利用方案

### 2.1 十神 (shiShen) → K线映射

**现状**：未利用。十神是八字最核心的六亲/人事关系，直接映射到 K线 4 个 aspect。

| 十神 | 映射 Aspect | 信号方向 | 权重 | 说明 |
|------|------------|---------|------|------|
| 正官 | career | ±8 | 吉则升职，凶则压力 |
| 七杀 | career | ±12 | 高波动，创业/竞争/突破 |
| 正财 | wealth | +10 | 稳定收入，节俭聚财 |
| 偏财 | wealth | ±12 | 高波动，投机/意外财 |
| 正印 | overall | +8 | 贵人/学习/保护 |
| 偏印 | overall | ±6 | 灵感/非标/孤独 |
| 食神 | career/wealth | +8 | 创造/表达/生财之源 |
| 伤官 | career/relationship | ±10 | 才华外露/制度冲突 |
| 比肩 | overall | ±5 | 同辈助力/竞争 |
| 劫财 | wealth | -8 | 分财/消耗/合伙风险 |

**实现方式**：
```ts
// 新增：deriveShiShenMod(yearPillar, monthPillar, dayPillar, hourPillar, aspect)
// 从 calc_result.yearShishen / monthShishen / dayShishen / hourShishen 读取
// 按 aspect 匹配上表权重，参与 OHLCV 计算
```

### 2.2 刑冲合害 (xingChongHeHai) → riskPenalty + volume

**现状**：仅通过 evidenceTag 字符串包含 "冲/刑/害/破" 来增加 volume 和 riskPenalty。

**增强方案**：使用结构化数据 `calc_result.xingChongHeHai`：

```json
{
  "he": [{"pillars": ["month", "hour"], "relation": "丙辛合水"}],
  "chong": [{"pillars": ["year", "day"], "relation": "子午冲"}],
  "hai": [],
  "xing": []
}
```

| 关系类型 | 影响 | 数值调整 |
|---------|------|---------|
| 合 (he) | 好事成局 | opportunityScore +5/合，volume +3 |
| 冲 (chong) | 变动/冲突 | riskPenalty +8/冲，high-low spread +5 |
| 害 (hai) | 暗中破坏 | riskPenalty +4/害 |
| 刑 (xing) | 是非/官司 | riskPenalty +6/刑 |

### 2.3 纳音 (naYin) → 五行深度化

**现状**：未利用。

**增强方案**：纳音提供柱位级别的五行属性（不同于天干地支的五行）。

```json
{ "year": "路旁土", "month": "白蜡金", "day": "霹雳火", "hour": "沙中土" }
```

| 纳音映射 | aspect | 调节 |
|---------|--------|------|
| 剑锋金/钗钏金 → career | +3 | 锐气/进取 |
| 海中金/沙中金 → wealth | +3 | 藏财/储备 |
| 大林木/杨柳木 → overall | +2 | 生机/成长 |
| 霹雳火/天上火 → career | +4 | 爆发力 |
| 屋上土/城墙土 → wealth | +3 | 稳固/积累 |

### 2.4 长生十二宫 (changsheng) → 生命周期阶段

**现状**：未利用。

**增强方案**：

```json
{ "year": "帝旺", "month": "临官", "day": "胎", "hour": "冠带" }
```

| 长生阶段 | 信号 | 分数调节 |
|---------|------|---------|
| 长生/冠带/临官/帝旺 | 上升期 | +5 ~ +12 |
| 衰/病/死/墓/绝 | 下行期 | -3 ~ -10 |
| 胎/养 | 蓄力期 | neutral, +volume |

### 2.5 藏干十神 (zangganShishen) → 隐性信号

**现状**：未利用。

**增强方案**：藏干是地支中隐藏的天干，代表潜在特质/隐性助力。

```json
{
  "year": [{"gan": "丁", "shishen": "正印"}, {"gan": "己", "shishen": "劫财"}],
  "month": [{"gan": "丙", "shishen": "偏印"}, {"gan": "庚", "shishen": "食神"}, {"gan": "戊", "shishen": "比肩"}],
  "day": [{"gan": "癸", "shishen": "正财"}],
  "hour": [{"gan": "戊", "shishen": "比肩"}, {"gan": "乙", "shishen": "正官"}, {"gan": "癸", "shishen": "正财"}]
}
```

应用规则：
- 藏干中出现的十神按 2.1 表权重 * 0.6（隐性 = 60% 显性效力）
- 藏干有 正财 → wealth baseline +3
- 藏干有 正官/七杀 → career baseline +3
- 日支藏干（配偶宫）中 正官/七杀 → relationship +5

### 2.6 神煞分柱 (shenShaByPillar) → 分aspect精确化

**现状**：仅用合并后的 shenSha，且只做字符串匹配。

**增强方案**：利用分柱神煞做更精确的 aspect 分配：

```json
{
  "year": ["羊刃", "将星", "月德贵人"],
  "month": ["天德贵人", "禄神", "亡神", "病符"],
  "day": ["灾煞"],
  "hour": ["太极贵人", "寡宿", "吊客"]
}
```

| 宫位 | 神煞 | aspect | 调节 |
|------|------|--------|------|
| 日柱（配偶宫）| 桃花/红鸾/天喜 | relationship | +8~12 |
| 月柱（事业宫）| 将星/文昌/禄神 | career | +6~10 |
| 时柱（晚运）| 太极贵人/福星 | overall | +5 |
| 年柱（祖上）| 天乙贵人/天德 | overall | +4 |
| 任意柱 | 羊刃/劫煞/灾煞 | riskPenalty | +5~10 |

### 2.7 紫微斗数 (ziweiSummary) → 全新命理维度

**现状**：完全未利用。紫微提供了独立于八字的完整盘面。

**增强方案**：

```json
{
  "mingGong": {"ganZhi": "己丑", "majorStars": ["武曲", "贪狼"]},
  "shenGongName": "财帛",
  "sihua": {
    "lu": [{"star": "太阳", "palace": "父母"}],
    "quan": [{"star": "武曲", "palace": "命宫"}],
    "ke": [{"star": "太阴", "palace": "兄弟"}],
    "ji": [{"star": "天同", "palace": "兄弟"}]
  },
  "palaces": [
    {"name": "官禄", "majorStars": ["紫微", "七杀"]},
    {"name": "财帛", "majorStars": ["廉贞", "破军"]},
    {"name": "夫妻", "majorStars": ["天府"]}
  ]
}
```

**紫微 → K线映射规则**：

| 紫微元素 | aspect | 信号 | 说明 |
|---------|--------|------|------|
| 命宫主星 | overall | +5~15 | 杀破狼/紫府/机月同梁 各有权重 |
| 官禄宫主星 | career | +5~12 | 紫微+七杀 = 创业型 +12 |
| 财帛宫主星 | wealth | +5~12 | 武曲+天府 = 理财型 +10 |
| 夫妻宫主星 | relationship | +5~10 |  |
| 四化-禄在何宫 | 对应aspect | +8~15 | 禄在哪宫哪方面好 |
| 四化-忌在何宫 | 对应aspect | -5~10 | 忌在哪宫哪方面差 |
| 身宫在财帛 | wealth | +8 | 一生重心在财 |
| 身宫在官禄 | career | +8 | 一生重心在事业 |
| 身宫在夫妻 | relationship | +8 | 一生重心在感情 |

### 2.8 流年详情 (liuNianDetail) → yearlyMod 精确化

**现状**：yearlyMod 仅用 `point.score * 0.85 + yearCycle`。

**增强方案**：使用 calc_result 返回的流年详情（已含 he/chong/hai/xing/yongJi/score/theme）：

```json
{
  "year": 2026, "ganZhi": "丙午", "shishen": "偏印",
  "he": [{"with": "丙午+辛巳", "relation": "丙辛合水"}],
  "chong": [{"with": "午+子", "relation": "子午冲"}],
  "hai": [], "xing": [{"with": "午+午", "relation": "午自刑"}],
  "yongJi": "闲神", "score": 40, "theme": "变动之年，注意冲击"
}
```

直接用 `liuNianDetail[i].score` 替代当前的 `yearlyMod` 计算，精度提升 3-5 倍。

### 2.9 用神/忌神 (yongShen/jiShen) → 全局倾向

**现状**：未利用。

**增强方案**：用神忌神决定了命局喜什么五行、忌什么五行。在 daYun/liuNian 匹配时：
- 大运天干/地支五行是 `yongShen` → daYunScore +10
- 大运天干/地支五行是 `jiShen` → daYunScore -8
- 流年天干/地支五行是 `yongShen` → yearlyMod +8
- 流年天干/地支五行是 `jiShen` → yearlyMod -6

### 2.10 五行分布 (wuxing) → 命局倾向 + 名人对标

**现状**：未利用。

**增强方案**：

```json
{ "wood": 0.2, "fire": 0.95, "earth": 1, "metal": 0.9, "water": 0.45 }
```

- 五行分布映射到 aspect：
  - 金 → career/business
  - 木 → growth/learning
  - 水 → wisdom/communication
  - 火 → passion/leadership
  - 土 → stability/wealth
  
- 与名人案例做五行相似度对比，生成 "与XX名人五行相似度" 指标

---

## 三、名人案例对标集成

### 3.1 对标维度设计

名人案例已有的 6 维度评分可转化为 K线参考基准：

```
名人 scores: overall(92) personality(95) career(96) wealth(88) marriage(55) health(35)
```

### 3.2 同盘名人对标

当用户输入出生数据后：
1. 调用 `calc_result` 获取四柱
2. 匹配名人案例中相同或相似四柱的名人
3. 将名人 scores 作为 K线 reference line

### 3.3 五行相似度对标

计算用户五行分布与各位名人的余弦相似度，输出 Top 3 最相似名人：
- 用作 K线"标杆线" overlay
- 展示相似名人的命运轨迹作为参考

### 3.4 八字相似度对标

利用已有 API `calculateCelebritySimilarity`：
- 返回 `overall_score` + 四柱分别相似度 + `wuxing_balance_score`
- 将此数据集成到 K线 bundle 中

---

## 四、OHLCV 公式升级方案

### 4.1 当前公式

```
close = baseChart*0.20 + daYun*0.25 + yearly*0.25 + aspect*0.20 + knowledge*0.10 - risk
```

### 4.2 升级公式

```
close =  baseChart      * 0.12    (↓ 降低固定权重)
       + daYunScore     * 0.20    (↓ 加入用神/忌神/十神/纳音精细调节)
       + yearlyMod      * 0.18    (↓ 改用 liuNianDetail.score 直接取值)
       + shiShenMod     * 0.12    (NEW: 十神映射)
       + ziweiMod       * 0.10    (NEW: 紫微盘面)
       + aspectMod      * 0.12    (↑ 加入纳音/藏干调节)
       + knowledgeMod   * 0.08    (↑ 加入神煞分柱精确化)
       + celebrityMod   * 0.08    (NEW: 名人对标调节)
       - riskPenalty    * 1.0     (↑ 加入刑冲合害结构数据)
```

### 4.3 因子分解扩展

```ts
interface KlineFactorBreakdownV2 {
  baseChart: number;       // 保留
  daYun: number;            // 升级：用神/忌神/十神/纳音调节
  yearly: number;           // 升级：liuNianDetail.score 直接取值
  shiShen: number;          // NEW
  ziwei: number;            // NEW
  aspect: number;           // 升级：纳音/藏干调节
  knowledge: number;        // 升级：分柱神煞
  celebrity: number;        // NEW
  riskPenalty: number;      // 升级：xingChongHeHai 结构化
}
```

---

## 五、新增信号因子（规则因子从 12 → 30+）

### 5.1 十神类（+8 因子）

| ID | 因子 | Aspect | 方向 | 权重 |
|----|------|--------|------|------|
| SHI-001 | 正官透干 | career | positive | +10 |
| SHI-002 | 七杀攻身 | career/overall | mixed | ±12 |
| SHI-003 | 正财合身 | wealth | positive | +10 |
| SHI-004 | 偏财透出 | wealth | mixed | ±10 |
| SHI-005 | 食神吐秀 | career/wealth | positive | +8 |
| SHI-006 | 伤官见官 | career/rel | negative | -10 |
| SHI-007 | 比劫林立 | wealth | negative | -8 |
| SHI-008 | 印星护身 | overall | positive | +8 |

### 5.2 刑冲合害类（+6 因子）

| ID | 因子 | Aspect | 方向 | 权重 |
|----|------|--------|------|------|
| XC-001 | 三合局成 | 全aspect | positive | +12 |
| XC-002 | 六合局成 | 全aspect | positive | +8 |
| XC-003 | 天克地冲 | overall | negative | -12 |
| XC-004 | 刑害并见 | overall | negative | -8 |
| XC-005 | 三刑全 | relationship | negative | -15 |
| XC-006 | 暗合 | relationship | mixed | ±5 |

### 5.3 神煞类（+6 因子）

| ID | 因子 | Aspect | 方向 | 权重 |
|----|------|--------|------|------|
| SS-001 | 天乙贵人临 | overall | positive | +10 |
| SS-002 | 文昌入命 | career | positive | +8 |
| SS-003 | 驿马发动 | career/overall | mixed | ±6 |
| SS-004 | 羊刃驾杀 | career | mixed | ±10 |
| SS-005 | 孤辰寡宿 | relationship | negative | -8 |
| SS-006 | 劫煞亡神 | overall | negative | -10 |

### 5.4 大运类（+4 因子）

| ID | 因子 | Aspect | 方向 | 权重 |
|----|------|--------|------|------|
| DY-001 | 换运交接 | overall | mixed | ±10 |
| DY-002 | 用神大运 | overall | positive | +15 |
| DY-003 | 忌神大运 | overall | negative | -12 |
| DY-004 | 墓库运 | overall | negative | -8 |

### 5.5 紫微类（+6 因子）

| ID | 因子 | Aspect | 方向 | 权重 |
|----|------|--------|------|------|
| ZW-001 | 紫微在命 | overall | positive | +12 |
| ZW-002 | 杀破狼格 | career | mixed | ±15 |
| ZW-003 | 禄在财帛 | wealth | positive | +12 |
| ZW-004 | 忌在夫妻 | relationship | negative | -10 |
| ZW-005 | 府相朝垣 | overall | positive | +10 |
| ZW-006 | 火铃夹命 | overall | negative | -12 |

**总计：从 12 因子 → 42 因子，覆盖率提升 3.5 倍**

---

## 六、实施路线图

### Phase 1（最小可行，2-3天）
1. **流年分数替换**：yearlyMod → liuNianDetail.score 直接取值
2. **用神/忌神调节**：daYunScore 加入用神忌神匹配
3. **神煞分柱映射**：shenShaByPillar 替代合并神煞

### Phase 2（丰富信号，3-5天）
4. **十神映射模块**：新增 8 个十神类因子
5. **刑冲合害结构化**：xingChongHeHai 替代字符串匹配
6. **纳音/藏干模块**：naYin + zangganShishen 参与计算

### Phase 3（紫微集成，3-5天）
7. **紫微盘面映射**：ziweiSummary 全部 12 宫 + 四化
8. **名人案例对标**：celebrityMod 权重融入
9. **新增信号因子**：因子从 12 → 30 首批上线

### Phase 4（可视化升级，3-5天）
10. **K线 overlay**：名人标杆线 + 五行相似度
11. **因子分解可视化**：每个 OHLCV 柱展示 9 因子分解
12. **阶段关键点标注**：用神大运/换运/三合/六冲 在 K线上标记

---

## 七、验证标准

### 7.1 数据利用度
- [ ] calc_result 16 维度中至少 12 个参与 K线计算（当前 3 个）
- [ ] 规则因子从 12 条增至 30+ 条

### 7.2 名人对标
- [ ] 至少 3 位名人数据在 K线中作为 reference line
- [ ] 五行/八字相似度可量化展示

### 7.3 准确性
- [ ] 用神大运年份 K线 score > 65
- [ ] 忌神大运年份 K线 score < 55
- [ ] 三合/六合年份 K线有明显的 positive spike

### 7.4 用户可感知
- [ ] 因子分解从 6 项扩展到 9 项
- [ ] 信号标签丰富度提升（从"贵人放量"到"天乙贵人临+文昌入命"）
- [ ] K线能与名人案例做横向对比