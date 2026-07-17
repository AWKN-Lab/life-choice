# Engineering Checks

本目录存放工程级执行检查的产出报告。

## 命名规范

```
YYYYMMDD_检查类型_范围.格式
```

示例：
- `20260612_baseline_main.md` — 主线基线检查
- `20260612_security_api-server.md` — API 服务安全扫描
- `20260612_performance_kline-tide.md` — K线潮汐模块性能回归

## 检查类型

| 类型 | 说明 |
|------|------|
| baseline | 基线检查（修改前快照） |
| security | 安全扫描 |
| performance | 性能回归 |
| quality | 代码质量 |
| compliance | 合规检查 |

## 规则

1. 每次工程检查必须产出报告并提交到本目录
2. 报告随代码一起版本化，任何人 clone 仓库即可查看历史
3. 报告格式：Markdown（.md）
4. 禁止删除历史报告，只能追加
