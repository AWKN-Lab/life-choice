# 事后洞察：Edit 工具持久化失败

> **编号**：H-001  
> **日期**：2026-06-25  
> **来源**：authStore.ts Login/Logout 401 静默修复

## 事件

Edit 工具对 authStore.ts Login/Logout 两次 Edit 调用返回成功，但实际未持久化。

## 根因

- Edit 时机：上次 Edit 之前已有 Read 超时，IDE 可能丢盘
- old_str 与文件实际内容不匹配（看似匹配但有空白字符差异）

## 教训

1. Edit 后必须 Read 验证持久化
2. 不能信任 Edit 工具的"成功"返回值
3. 关键修改后用 Grep 交叉验证

## 防护

- 每次 Edit 后立即 Read 目标行确认
- 对账率 = Read 验证数 / Edit 调用数，必须 = 100%
