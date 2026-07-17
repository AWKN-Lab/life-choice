# 决策映射规则

## 目录
- [系统稳健性信号](#系统稳健性信号)
- [长期复利信号](#长期复利信号)
- [非对称风险信号](#非对称风险信号)
- [人品与本分信号](#人品与本分信号)
- [信号输出格式](#信号输出格式)

---

## 系统稳健性信号

### 信号定义
判断课象底层逻辑是否闭环，是否存在信息不对称或路径受阻。

### 触发条件
出现以下课象时，判定为 `system_stability: low`：
- **空亡**：关键信息缺失
- **截路**：路径受阻
- **玄武内战**：内部矛盾

### 输出规则
- 高稳健性：`system_stability: high`
- 中等稳健性：`system_stability: medium`
- 低稳健性：`system_stability: low`

### 对应课象示例
```json
{
  "signal": "system_stability",
  "value": "low",
  "reason": "财神落空亡，信息不对称",
  "课象": "财神=午火，落空亡"
}
```

---

## 长期复利信号

### 信号定义
判断课象是否具备安全边际或复利潜力。

### 触发条件
出现以下课象时，判定为 `long_term_compound: high`：
- **干支相生**：内外和谐
- **德合**：关系稳固
- **旺禄临身**：天赋所在

### 输出规则
- 高复利潜力：`long_term_compound: high`
- 中等复利潜力：`long_term_compound: medium`
- 低复利潜力：`long_term_compound: low`

### 对应课象示例
```json
{
  "signal": "long_term_compound",
  "value": "high",
  "reason": "日禄临身且不空亡",
  "课象": "日禄=庚金，临中传，旺相不空"
}
```

---

## 非对称风险信号

### 信号定义
判断课象是否存在不可控的系统性风险。

### 触发条件
出现以下课象时，判定为 `asymmetric_risk: high`：
- **鬼动**：官鬼发动，克身
- **金日逢丁**：突发凶灾
- **三刑**：多方冲突

### 输出规则
- 高风险：`asymmetric_risk: high`
- 中等风险：`asymmetric_risk: medium`
- 低风险：`asymmetric_risk: low`

### 对应课象示例
```json
{
  "signal": "asymmetric_risk",
  "value": "high",
  "reason": "官鬼临身乘白虎",
  "课象": "官鬼=子水，临末传，乘白虎"
}
```

---

## 人品与本分信号

### 信号定义
判断日干与日支/类神的关系，评估合作者的可靠性。

### 触发条件
根据日干与日支/类神的关系判断：
- **相生**：`character_duty: good`
- **相克**：`character_duty: bad`
- **无生克**：`character_duty: neutral`

### 输出规则
- 靠谱：`character_duty: good`
- 中立：`character_duty: neutral`
- 不靠谱：`character_duty: bad`

### 对应课象示例
```json
{
  "signal": "character_duty",
  "value": "good",
  "reason": "干上神生支上神",
  "课象": "干上神=丙火，生支上神=午土"
}
```

---

## 信号输出格式

### JSON 格式
```json
{
  "decision_signals": {
    "system_stability": "low",
    "long_term_compound": "medium",
    "asymmetric_risk": "high",
    "character_duty": "good"
  }
}
```

### 字段说明
| 字段 | 值 | 说明 |
|------|-----|------|
| system_stability | high/medium/low | 系统稳健性 |
| long_term_compound | high/medium/low | 长期复利潜力 |
| asymmetric_risk | high/medium/low | 非对称风险 |
| character_duty | good/neutral/bad | 人品与本分 |

---

## 使用说明

### 调用方
- 由 `ren-sheng-jue-ce-ming-pan` 调用 `da-liu-ren` 脚本
- 脚本读取本文件中的映射规则
- 根据课象匹配对应信号
- 输出结构化 JSON 供总入口翻译为用户语言

### 不负责
- 不负责用户交互（由总入口负责）
- 不负责"黑话翻译"（由总入口负责）
- 不负责场景自适应（由总入口负责）
- 只负责技术映射和结构化输出

---

**注意**：这是底层技术文档，不直接面向用户。用户语言翻译由 `ren-sheng-jue-ce-ming-pan` 负责。
