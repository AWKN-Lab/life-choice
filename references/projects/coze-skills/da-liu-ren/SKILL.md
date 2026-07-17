---
name: da-liu-ren
description: 大六壬预测 - 基于《六壬毕法赋》《大六壬指南》等经典典籍，提供三传四课、神煞推断、毕法赋解卦、大六壬指南占断。作为人生决策命盘系统的问事预测底层组件，不直接面向用户，只输出结构化JSON数据，由ren-sheng-jue-ce-ming-pan自动调用。
dependency:
  python:
    - lunar-python==1.4.8
---

# 大六壬预测

## 技能定位

大六壬预测是**问事预测底层组件**，不直接面向用户。

**主要功能**：
- 三传四课起课（初传、中传、末传）
- 神煞推断（十二神将分布）
- 毕法赋口诀匹配（100条口诀）
- 大六壬指南占断规则查询
- 输出结构化决策信号（JSON格式）

**调用方式**：由 `ren-sheng-jue-ce-ming-pan` 调用，接收日干日支和问题类型，输出结构化预测结果

**输出目标**：仅输出技术数据（JSON），不直接面向用户

---

## 脚本参数

```bash
python scripts/day_liu_ren.py \
  --year=2024 \
  --month=3 \
  --day=15 \
  --hour=14 \
  --question="换工作" \
  --day-gan="甲" \
  --day-zhi="申"
```

**参数说明**：
- `--year/month/day/hour`: 占卜时间（年/月/日/时）
- `--question`: 问题类型（投资/合作/升迁/出行等）
- `--day-gan`: 日干（来自八字排盘）
- `--day-zhi`: 日支（来自八字排盘）

---

## 核心算法

### Phase 1: 基础公理
- 五行生克关系
- 地支序列（1-12）
- 十干寄宫（严格校验表）

### Phase 2: 天地盘定位
- 位移法：Shift = 月将索引 - 占时索引
- 强制验证：计算完Shift后必须回测验证

### Phase 3: 起四课
- 一课(干阳)：地盘=[日干寄宫]，天盘=[地盘+Shift]
- 二课(干阴)：地盘=[一课天盘]，天盘=[地盘+Shift]
- 三课(支阳)：地盘=[日支]，天盘=[地盘+Shift]
- 四课(支阴)：地盘=[三课天盘]，天盘=[地盘+Shift]

### Phase 4: 发三传（熔断机制）
按顺序扫描逻辑树，一旦匹配立即停止：
- 路径A: 伏吟/返吟（特殊局）
- 路径B: 贼克法（常规局）：重审、元首、比用、知一
- 路径C: 涉害/无克（复杂局）

### Phase 5: 毕法赋解卦（核心依据）
- 读取 `references/六壬毕法赋.md`
- 结构格局：前后引从、首尾相见、进茹退茹等
- 神煞格局：金日逢丁、水日逢丁、闭口卦等
- 干支关系：交车相合、干支皆败、旺禄临身等
- 匹配课象，提取对应口诀

### Phase 6: 大六壬指南占断（实战验证）
- 读取 `references/大六壬指南.md`（五卷）
- 按问题类型查占断规则（卷二至卷四）
- 问官运、问求财、问合作、问安危
- 与毕法赋口诀交叉验证

### Phase 7: 决策信号映射（技术输出）
- 读取 `references/decision-mapping-rules.md`
- 系统稳健性信号（空亡、截路、玄武内战）
- 长期复利信号（干支相生、德合、旺禄临身）
- 非对称风险信号（鬼动、金日逢丁、三刑）
- 人品与本分信号（日干与日支/类神的关系）
- 输出结构化决策信号（JSON格式），供 `ren-sheng-jue-ce-ming-pan` 翻译为用户语言

详见 `references/decision-mapping-rules.md`

---

## 输入输出格式

### 输入参数（由 ren-sheng-jue-ce-ming-pan 调用时传入）
```json
{
  "year": 2024,
  "month": 3,
  "day": 15,
  "hour": 14,
  "question": "换工作",
  "day_gan": "甲",
  "day_zhi": "申"
}
```

### 输出格式（结构化JSON数据）
```json
{
  "decision_signals": {
    "system_stability": "low",
    "long_term_compound": "medium",
    "asymmetric_risk": "high",
    "character_duty": "neutral"
  },
  "shensha": {
    "bai_hu": true,
    "zhu_que": false,
    "xuan_wu": true
  },
  "chuan_guan": ["初传: 空", "中传: 白虎", "末传: 吉"],
  "bi_fa_kou_jue": [
    "空亡+截路=逻辑断层",
    "干支皆败=资源枯竭"
  ]
}
```

---

## 资源索引

- **决策信号映射规则**：见 [references/decision-mapping-rules.md](references/decision-mapping-rules.md)
  - 用途：定义决策信号的技术映射逻辑
  - 使用时机：Phase 7，生成决策信号时

- **六壬毕法赋**：见 [references/六壬毕法赋.md](references/六壬毕法赋.md)
  - 用途：毕法赋口诀参考
  - 使用时机：Phase 5，匹配课象口诀时

- **大六壬指南**：见 [references/大六壬指南.md](references/大六壬指南.md)
  - 用途：按问题类型查询占断规则
  - 使用时机：Phase 6，实战验证时

---

## 注意事项

- 本技能是**底层技术组件**，不直接面向用户
- 只输出结构化JSON数据，不输出到前台
- 所有的用户交互和翻译由 `ren-sheng-jue-ce-ming-pan` 负责
