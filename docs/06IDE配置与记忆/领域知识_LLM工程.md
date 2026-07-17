# LLM 工程领域知识

> **日期**：2026-06-25

## 多 Provider Failover

| Provider | 模型 | 用途 |
|----------|------|------|
| DeepSeek | deepseek-chat | 默认 |
| Doubao | — | 备选 |
| Kimi | — | 备选 |
| MiniMax | — | 备选 |
| SenseNova | — | 备选 |
| OpenAI | — | 备选 |

## 输出质量控制

1. 去模板残渣（JSON 残渣、英文异常、半成品字段）
2. 三段输出口径统一（初步结论、深入推演、追问回复）
3. 错误重试 + 超时兜底

## 风格注入

- 角色：张半山
- 风格层：5 种 UI 风格（data-style）
- 约束：输出格式规范 + 反驳规则 + 矛盾检测
