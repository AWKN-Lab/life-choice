# 术数计算引擎技术索引

> 最后更新：2026-06-22
> 覆盖范围：八字、子平、六壬、六爻、紫薇、奇门、梅花、太乙，以及相关计算引擎/知识库现状
> 代码根目录：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/`

---

## 0. 术数知识库现状盘点（2026-06-22）

> 本节只记录当前仓库内实际可见的资料与代码落点，不把 PRD、规划文档中的“应有目录”视为现货。

### 0.1 总结

- 当前真正还成体系的活跃知识库，主要是八字与六壬。
- 紫薇、奇门的资料主要落在 `_archive/data-dumps/md_converted/东方术数/`。
- 六爻保留了 Agent 代码与规则，但未见成体系的独立 `knowledge/` 知识库。
- 子平保留了参考资料，但更多是附着在八字体系与 `references/` 中。
- 梅花、太乙目前只在历史文档中反复出现，未检到明确的现货知识库或实现目录。

### 0.2 分类清单

| 术数类别 | 活跃知识库 | 归档资料 | 参考资料 | 代码实现 | 当前判断 |
|------|------|------|------|------|------|
| 八字 | `knowledge/eastern-metaphysics/八字命理/`（约 43 文件） | `东方术数/八字命理/` 仅见少量转换稿 | `references/projects/coze-skills/bazi-paipan/`、`bazi-master/` | `calc-engine/bazi-engine/`、`ziping-agent/`、`knowledge-base/bazi-calculator.ts` | 最完整，可视为当前主知识库 |
| 子平 | 无独立活跃目录，主要附着于八字 | 未单独检到完整归档树 | `references/projects/coze-skills/zi-ping-zhen-quan/references/`（2 文件） | `ziping-agent/` | 有资料，但偏参考层，不是独立活跃库 |
| 六壬 | `src/knowledge-base/liuren/`（11+ JSON 规则） | `_archive/data-dumps/md_converted/东方术数/六壬/`（约 32 文件） | `references/projects/coze-skills/da-liu-ren/references/` | `liuren-agent/`、`knowledge-base/liuren-calculator.ts` | 完整度高，活跃规则库仍可用 |
| 六爻 | 未检到独立活跃知识库目录 | 只明确检到 `六爻正道.md` | 未检到独立参考目录 | `liuyao-agent/`、`shared/rule-engine/rules/liuyao-*.json` | 代码壳在，资料库不成体系 |
| 紫薇 | 未检到活跃 `knowledge/` 目录 | `_archive/data-dumps/md_converted/东方术数/紫薇/`（约 4 文件） | 无明确独立参考目录 | `ziwei-agent/`、`calc-engine/ziwei-engine/`、`lib/atom-tools/ziwei/` | 算法/代码还在，文档主要转入归档 |
| 奇门 | 未检到活跃 `knowledge/` 目录 | `_archive/data-dumps/md_converted/东方术数/奇门/`（约 3 文件） | 无明确独立参考目录 | `qimen-agent/` | 代码在，文档主要转入归档 |
| 梅花 | 未检到 | 未检到 | 未检到 | 未检到明确实现目录 | 当前更像规划残留 |
| 太乙 | 未检到 | 未检到 | 未检到 | 未检到明确实现目录 | 当前更像规划残留 |

### 0.3 关键路径

- 八字主知识库：`knowledge/eastern-metaphysics/八字命理/bazi-knowledge-base/`
- 六壬归档原文：`_archive/data-dumps/md_converted/东方术数/六壬/`
- 紫薇归档原文：`_archive/data-dumps/md_converted/东方术数/紫薇/`
- 奇门归档原文：`_archive/data-dumps/md_converted/东方术数/奇门/`
- 子平参考资料：`references/projects/coze-skills/zi-ping-zhen-quan/references/`
- 六壬参考资料：`references/projects/coze-skills/da-liu-ren/references/`
- 六壬活跃规则库：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/knowledge-base/liuren/`
- 六爻规则：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/shared/rule-engine/rules/liuyao-yongshen.json`、`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/shared/rule-engine/rules/liuyao-duangua.json`

### 0.4 与历史文档的偏差

- 多份历史文档仍把 `knowledge/eastern-metaphysics/` 描述为“八字/六壬/周易/奇门/紫薇等原始资料总入口”。
- 但按 2026-06-22 实盘核对，当前 `knowledge/eastern-metaphysics/` 下仅明确保留了 `八字命理/` 活跃目录。
- 这意味着“知识库不见了”的真实原因更接近目录迁移与分层拆散，而不是单纯文件删除。

### 0.5 后续整理建议

1. 先补统一索引，不急着移动文件，避免再次打散引用关系。
2. 若要恢复统一入口，优先把紫薇/奇门/六壬归档资料映射回 `knowledge/eastern-metaphysics/`。
3. 六爻需要单独确认是否曾存在完整原始文献目录，当前只看到规则文件与单篇归档稿。
4. 梅花、太乙需要按历史盘点文档反查来源，再决定是否恢复。

---

## 一、架构总览

```
calc-engine/                          # 计算引擎根
├── bazi-engine/                      # 八字核心引擎
│   ├── core/
│   │   ├── bazi-data.service.ts      # 数据驱动服务（十神/藏干/神煞/纳音/空亡/长生）
│   │   └── solar-terms.ts            # 节气精确计算（年柱/月柱/起运年龄）
│   └── __tests__/                    # 黄金用例 & 节气验证
├── naming-engine/                    # 姓名学引擎（康熙笔画/五行评分）
├── data/                             # JSON 数据文件（13个）
├── bazi-calculator-wrapper.ts        # 八字完整排盘入口（BaziFullResult）
├── calculators.ts                    # 基础计算函数（节气/农历/四柱/五行/十神）
├── calc-engine.service.ts            # NestJS 服务层（统一对外接口）
├── python-bridge.service.ts          # Python 桥接（大六壬/奇门遁甲）
├── translation.service.ts            # 术数术语翻译
├── divination-dictionary.ts          # 占卜术语词典
├── types.ts                          # 类型定义
└── calc-engine.module.ts             # NestJS 模块

lib/atom-tools/                       # 原子工具层（LLM 可调用的结构化分析工具）
├── ziwei/                            # 紫微斗数工具集
│   ├── ziwei-types.ts                # 紫微类型定义（十二宫/星曜/庙旺/格局）
│   ├── minggong-master.ts            # 命宫主星推算
│   ├── sihua-distribution.ts         # 四化飞星分布
│   ├── palace-combination.ts         # 宫位组合分析
│   ├── star-interaction.ts           # 星曜互动（会/冲/夹/同宫）
│   ├── feigong.ts                    # 飞宫逻辑
│   ├── triple-alignment.ts           # 三合局分析
│   ├── dayun-overlay.ts              # 大运叠加分析
│   └── index.ts                      # 统一导出
├── decision/                         # 决策辅助工具
│   ├── career-fit.ts                 # 职业适配
│   ├── relationship.ts              # 关系分析
│   ├── risk.ts                       # 风险评估
│   ├── timing.ts                     # 时机判断
│   └── cross-validate.ts             # 交叉验证
└── types.ts                          # 通用工具类型

ziwei-agent/                          # 紫微斗数 LLM Agent
├── ziwei-agent.service.ts            # Agent 服务
└── prompts/
    ├── ziwei-system-prompt.md        # 中文系统提示词
    └── ziwei-system-prompt-en.md     # 英文系统提示词
```

---

## 二、八字核心计算

### 2.1 四柱排盘

**入口**：`bazi-calculator-wrapper.ts` → `calculateBaZiFull()`

| 柱 | 算法 | 关键函数/数据 |
|-----|------|-------------|
| **年柱** | 以立春为界，立春前属上一年 | `getCorrectYearPillar()` — 精确到小时 |
| **月柱** | 以节气为界（非农历月），五虎遁起天干 | `getMonthZhiIndex()` + `wuhudun.json` |
| **日柱** | 儒略日数（JDN）算法，无远期年份限制 | `jdn()` 公式：`((JDN + 49) % 60)` |
| **时柱** | 五鼠遁起天干 | `wushudun.json` + `hourZhiIndex = floor((hour+1)/2) % 12` |

**精度**：
- 年柱/月柱：基于真节气时刻，精确到分钟
- 日柱：JDN 算法，与万年历一致
- 时柱：五鼠遁法，支持 24 小时制

### 2.2 五行统计

**两种模式**：

| 模式 | 函数 | 算法 | 用途 |
|------|------|------|------|
| 主气统计 | `countMainQiWuxing()` | 天干+地支主气各计 1 | 快速概览 |
| 加权统计 | `countWeightedWuxing()` | 天干 0.35 + 本气 0.3 + 中气 0.2 + 余气 0.15 | 精确分析（默认） |

**五行映射**：
```
甲乙→木  丙丁→火  戊己→土  庚辛→金  壬癸→水
子→水   丑→土   寅→木   卯→木   辰→土   巳→火
午→火   未→土   申→金   酉→金   戌→土   亥→水
```

**数据文件**：`tiangan_detail.json`、`dizhi_detail.json`

### 2.3 十神

**算法**：以日干为基准，查目标天干的五行+阴阳关系

| 日干 vs 目标 | 同五行同阴阳 | 同五行异阴阳 | 生我同阴阳 | 生我异阴阳 | 我生同阴阳 | 我生异阴阳 | 克我同阴阳 | 克我异阴阳 | 我克同阴阳 | 我克异阴阳 |
|-------------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|
| 十神 | 比肩 | 劫财 | 偏印(枭) | 正印 | 食神 | 伤官 | 七杀 | 正官 | 偏财 | 正财 |

**数据文件**：`shishen.json` — `lookup_table[日干][目标五行] → [同阴阳, 异阴阳]`

**输出字段**：
- 四柱天干十神：`yearShishen` / `monthShishen` / `dayShishen`(日主) / `hourShishen`
- 藏干十神：`zangganShishen.{year,month,day,hour}[]` — 每柱地支藏干分别配十神

### 2.4 大运

**算法**：
1. 判顺逆：阳年男命/阴年女命 → 顺排；反之逆排
2. 起运年龄：`getQiYunAge()` — 基于出生日到最近节气的天数，精确到年月日
3. 排 8 步大运：从月柱起顺/逆推

```typescript
// 顺排：月柱天干+1, 地支+1
// 逆排：月柱天干-1, 地支-1
daYun[i] = { gan, zhi, full: gan+zhi, startAge, endAge }
```

**数据文件**：`dayun.json` — 大运规则

**输出**：`daYun[]` — 8 步大运，每步含起止年龄

### 2.5 流年

**算法**：
1. 以 1984 年（甲子年）为基准，偏移计算任意年干支
2. 计算流年天干对日主的十神
3. 计算流年 vs 原局四柱的刑冲合害关系
4. 计算流年 vs 当前活跃大运的刑冲合害关系
5. 综合评分 + 主题判定

**输出**：
- `liuNian[]` — 最近 10 年，含 `{ year, ganZhi, shishen }`
- `liuNianDetail[]` — 详细分析，含：
  - `he/chong/hai/xing` — 合/冲/害/刑关系
  - `yongJi` — 用忌判定
  - `score` — 0-100 综合评分
  - `theme` — 年度主题描述

**评分算法**（`scoreLiuNian`）：
```
基础分 60
合 +10/个, 冲 -15/个, 害 -8/个, 刑 -10/个
吉神(正印/正官/食神/正财/偏财) +5
凶神(七杀/伤官/劫财/枭神) -5
用神年 +10, 忌神年 -15
最终 clamp(0, 100)
```

**主题判定**（`getLiuNianTheme`）：
- ≥80: 大吉之年
- ≥65: 平稳发展
- ≥50: 运势平平
- 有冲: 变动之年
- 有合: 合化之年
- 七杀/伤官/劫财: 挑战之年
- 正官/正财/正印: 事业之年

### 2.6 流月

**当前状态**：`calc-engine` 中无独立流月计算模块。流月逻辑分散在：
- `ziping-agent/prompts/ziping-system-prompt.md` — LLM Prompt 中指导流月分析
- `consult/consult.service.ts` — 咨询服务中引用流月概念
- `knowledge-base/bazi-calculator.ts` — 知识库中的八字计算器有流月提及

**流月基本算法**（待实现为独立模块）：
```
流月天干 = 年干五虎遁 → 12 个月柱
流月地支 = 固定寅月起正月
流月十神 = 流月天干 vs 日干
流月与原局/大运关系 = 刑冲合害
```

### 2.7 刑冲合害

**算法**：`computeRelations()` — 地支 + 天干全面关系扫描

| 关系 | 规则 | 数据 |
|------|------|------|
| **六合** | 子丑/寅亥/卯戌/辰酉/巳申/午未 | `HE_PAIRS` |
| **三合局** | 申子辰水/巳酉丑金/寅午戌火/亥卯未木 | `SAN_HE` |
| **三会局** | 寅卯辰木/巳午未火/申酉戌金/亥子丑水 | `SAN_HUI` |
| **六冲** | 子午/丑未/寅申/卯酉/辰戌/巳亥 | `CHONG_PAIRS` |
| **六害** | 子未/丑午/寅巳/卯辰/申亥/酉戌 | `HAI_PAIRS` |
| **自刑** | 辰辰/午午/酉酉/亥亥 | `ziXing` |
| **天干合** | 甲己土/乙庚金/丙辛水/丁壬木/戊癸火 | `GAN_HE` |

**数据文件**：`dihe_relation.json` — 地支合关系

### 2.8 其他八字要素

| 要素 | 算法 | 数据文件 | 输出字段 |
|------|------|---------|---------|
| **藏干** | 地支→本气/中气/余气 | `zanggan.json` | `zangganShishen` |
| **纳音** | 干支组合→纳音五行 | `nayin.json` | `naYin.{year,month,day,hour}` |
| **空亡** | 日柱所在旬→空亡地支 | `kongwang.json` | `kongWang[]` |
| **十二长生** | 日干+地支→长生/沐浴/冠带/.../养 | `changsheng.json` | `changsheng.{year,month,day,hour}` |
| **胎元** | 月干+1, 月支+3 | 算法计算 | `taiYuan` |
| **命宫** | `(14 - 月支 - 时支) % 12` | 算法计算 | `mingGong` |
| **身宫** | `(月支 + 时支) % 12` | 算法计算 | `shenGong` |
| **自坐** | 天干坐地支的五行关系 | 算法计算 | `selfSeat.{year,month,day,hour}` |
| **用忌** | 日主旺衰+五行统计综合判定 | `determineYongJi()` | `liuNianDetail[].yongJi` |

---

## 三、神煞

### 3.1 数据驱动架构

**数据文件**：`shensha.json`

**查询方式**（`lookup_by` 字段）：

| lookup_by | 说明 | 示例神煞 |
|-----------|------|---------|
| `日干查四柱地支` | 以日干查四柱地支 | 天乙贵人、文昌、驿马、羊刃 |
| `年支或日支查` | 年支或日支均可查 | 华盖、桃花、将星 |
| `年支查` | 仅以年支查 | 孤辰/寡宿（特殊结构 `{gu, gua}`） |
| `月令查` | 以月令（月支对应月份）查天干 | 天月德（月德合） |
| `月支查天干` | 以月支查四柱天干 | 部分贵人 |
| `日柱查` | 以日柱干支组合查 | 十灵 |

### 3.2 计算函数

```typescript
computeBaziShensha(yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi)
→ Record<string, Array<{ name: string; type: string; pillar: string }>>
```

**输出**：
- `shenSha` — 按神煞名分组，值为出现该神煞的地支列表
- `shenShaByPillar` — 按柱分组，值为该柱所带神煞名列表

### 3.3 已覆盖神煞清单

（从 `shensha.json` 的 `shensha[]` 数组读取，包含但不限于）

| 类别 | 神煞 |
|------|------|
| 贵人 | 天乙贵人、天德贵人、月德贵人 |
| 文星 | 文昌、学堂 |
| 驿马 | 驿马 |
| 桃花 | 咸池(桃花) |
| 刑刃 | 羊刃、飞刃 |
| 将星 | 将星 |
| 华盖 | 华盖 |
| 孤寡 | 孤辰、寡宿 |
| 其他 | 十灵、天罗地网 |

---

## 四、紫微斗数

### 4.1 数据来源

紫微斗数排盘数据由前端 `iziwei` 库计算，通过 API 传入后端。后端 `lib/atom-tools/ziwei/` 提供结构化分析工具。

### 4.2 十二宫

**定义**：`ziwei-types.ts` → `PALACE_NAMES`

```
命宫 → 兄弟宫 → 夫妻宫 → 子女宫 → 财帛宫 → 疾厄宫
  ↑                                                        ↓
父母宫 ← 福德宫 ← 田宅宫 ← 官禄宫 ← 仆役宫 ← 迁移宫
```

**宫位数据结构**（`ZiweiPalaceData`）：
```typescript
{
  index: number;           // 0-11 宫位序号
  name: string;            // 宫名
  isBodyPalace: boolean;   // 是否身宫
  heavenlyStem: string;    // 宫干
  earthlyBranch: string;   // 宫支
  majorStars: Array<{      // 主星
    name: string;
    type: string;
    brightness?: string;   // 庙旺利平陷
    mutagen?: string;      // 四化（禄/权/科/忌）
  }>;
  minorStars: Array<{...}>;    // 辅星
  adjectiveStars: Array<{...}>; // 杂曜
  decadal?: {              // 大限
    range: [number, number];
    heavenlyStem: string;
    earthlyBranch: string;
  };
  ages?: number[];         // 大限年龄范围
}
```

### 4.3 星曜体系

**主星 14 颗**（`STAR_WUXING` 映射）：

| 星曜 | 五行 | 星曜 | 五行 | 星曜 | 五行 | 星曜 | 五行 |
|------|------|------|------|------|------|------|------|
| 紫微 | 土 | 天机 | 木 | 太阳 | 火 | 武曲 | 金 |
| 天同 | 水 | 廉贞 | 火 | 天府 | 土 | 太阴 | 水 |
| 贪狼 | 木 | 巨门 | 土 | 天相 | 水 | 天梁 | 土 |
| 七杀 | 金 | 破军 | 水 | | | | |

**辅星**：文昌(金)/文曲(水)/左辅(土)/右弼(水)/天魁(火)/天钺(火)/禄存(土)/天马(火)

**煞星**：擎羊(金)/陀罗(金)/火星(火)/铃星(火)/地空(火)/地劫(火)

### 4.4 庙旺利陷

**等级**：`MIAOWANG_ORDER = ['庙', '旺', '得', '利', '平', '不', '陷']`

| 等级 | 含义 | `describeMiaowang()` 输出 |
|------|------|--------------------------|
| 庙/旺 | 极强 | 庙旺 |
| 得/利 | 较强 | 平利 |
| 平 | 一般 | 平平 |
| 不/陷 | 弱 | 落陷 |

### 4.5 格局组合

**定义**：`COMBINATION_PATTERNS` — 20 种双星同宫格局

| 格局 | 星曜组合 | 特征 |
|------|---------|------|
| 紫府同宫 | 紫微+天府 | 主贵气，格局宏大 |
| 紫贪同宫 | 紫微+贪狼 | 欲望与权力并存 |
| 日月同宫 | 太阳+太阴 | 阴阳调和 |
| 武贪同宫 | 武曲+贪狼 | 晚发格局 |
| 廉杀同宫 | 廉贞+七杀 | 刚烈果断 |
| ... | ... | ... |

### 4.6 四化飞星

**模块**：`sihua-distribution.ts`

四化（禄/权/科/忌）按年干分配到各宫主星，是紫微斗数动态分析的核心。

### 4.7 分析工具

| 模块 | 功能 |
|------|------|
| `minggong-master.ts` | 命宫主星推算与性格分析 |
| `palace-combination.ts` | 宫位组合（三合/对宫/夹宫）分析 |
| `star-interaction.ts` | 星曜互动（会/冲/夹/同宫） |
| `feigong.ts` | 飞宫逻辑（宫干飞化） |
| `triple-alignment.ts` | 三合局分析 |
| `dayun-overlay.ts` | 大运叠加到命盘的分析 |

### 4.8 三方四正

**算法**：`getSanfangPalaceIndices(palaceIndex)`

```typescript
// 三方四正 = 本宫 + 4宫后 + 8宫后 + 对宫(6宫后)
[palaceIndex, (palaceIndex+4)%12, (palaceIndex+8)%12, (palaceIndex+6)%12]
```

---

## 五、数据文件索引

| 文件 | 内容 | 被引用 |
|------|------|--------|
| `shishen.json` | 十神查表（日干→目标五行→[同阴阳,异阴阳]） | `getShishen()` |
| `zanggan.json` | 地支藏干（本气/中气/余气） | `getZanggan()` |
| `nayin.json` | 六十甲子纳音 | `getNayin()` / `getNayinElement()` |
| `kongwang.json` | 旬空亡（10个旬×6个空亡地支） | `getKongWang()` |
| `changsheng.json` | 十二长生表（10天干×12阶段→地支） | `getChangshengStage()` |
| `shensha.json` | 神煞定义与查表规则 | `computeBaziShensha()` |
| `dayun.json` | 大运规则 | `getDaYunRules()` |
| `wuhudun.json` | 五虎遁（年干→月干序列） | `getMonthGan()` |
| `wushudun.json` | 五鼠遁（日干→时干序列） | `getHourGan()` |
| `tiangandizhi.json` | 天干地支组合 | 基础数据 |
| `tiangan_detail.json` | 天干详细属性 | 五行/阴阳 |
| `dizhi_detail.json` | 地支详细属性 | 五行/藏干/纳音 |
| `dihe_relation.json` | 地支合关系 | `getDiHeRelations()` |

---

## 六、Agent 与 Prompt 体系

| Agent | 对应模块 | Prompt 位置 |
|-------|---------|------------|
| 八字(子平) | `ziping-agent/` | `prompts/ziping-system-prompt.md` |
| 紫微斗数 | `ziwei-agent/` | `prompts/ziwei-system-prompt.md` |
| 大六壬 | `liuren-agent/` | `prompts/tuiming-prompt.md` |
| 奇门遁甲 | `qimen-agent/` | `prompts/qimen-system-prompt.md` |
| 六爻 | `liuyao-agent/` | — |
| 起名 | `quming-agent/` | — |

**Orchestrator**：`consult/orchestrator/orchestrator.service.ts` — 根据问题类型路由到对应 Agent

---

## 七、前端展示组件

| 组件 | 路径 | 功能 |
|------|------|------|
| `MetaphysicsShowcase` | `app/src/components/home/` | 首页玄学展示模块 |
| `BaguaDiagram` | `app/src/components/home/` | 八卦图可视化 |
| `StarmapDiagram` | `app/src/components/home/` | 星盘/星图可视化 |
| `WuxingDiagram` | `app/src/components/home/` | 五行图可视化 |
| `ResultChat` | `app/src/components/result/` | 结果对话交互界面 |

---

## 八、待完善项

| 项目 | 当前状态 | 优先级 |
|------|---------|--------|
| 流月独立计算模块 | 逻辑分散在 Prompt 和知识库中 | 高 |
| 紫微排盘引擎后端化 | 当前依赖前端 iziwei 库 | 中 |
| 神煞覆盖度补全 | `shensha.json` 已有核心神煞，可扩展 | 低 |
| 大运流年交互细化 | 大运+流年叠加分析已有，可加深 | 低 |
| 十二长生与命宫身宫的深度解读 | 计算已有，解读在 Prompt 层 | 低 |
