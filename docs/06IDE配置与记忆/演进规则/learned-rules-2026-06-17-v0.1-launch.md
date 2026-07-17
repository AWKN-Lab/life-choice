---
type: reference
title: 进化沉淀 — 2026-06-17 v0.1 上线冲刺补丁
created: 2026-06-17T13:30:00+08:00
tags: [evolution, rules, v0.1-launch]
status: active
supersedes: null
related: [learned-rules.md]
---

# Learned Rules — 2026-06-17 v0.1 上线冲刺补丁

> 本文件是 `learned-rules.md` 的补丁，新增 8 条规则。
> 同步到主记忆系统后，本文件可归档。

## 新增规则

### E-DEPLOY-1 TSC rootDir + outDir 决定输出路径（2026-06-17 沉淀）
- **场景**：bootstrap-production.js 写死 `dist/src/main.js`，但实际编译输出 `dist/main.js`
- **根因**：tsconfig 是 `{ outDir: "./dist", rootDir: "./src" }` → tsc 直接输出到 dist/main.js
- **规则**：任何 TS 后端部署脚本，必须先本地 `npx tsc && ls dist/` 确认输出路径，再写 bootstrap 脚本
- **触发词**：TSC 路径、PM2 启动失败、bootstrap、dist/main.js

### E-DEPLOY-2 scp 部署必须先 tar 排除（2026-06-17 沉淀）
- **场景**：直接 `scp -r apps/ root@server:/opt/awkn-life/` 超时 2+ 分钟
- **根因**：未排除 node_modules，单目录可能含 10000+ 文件
- **规则**：scp 部署前必须 `tar --exclude={node_modules,.git,dist} -czf app.tar.gz .` 单文件传输
- **触发词**：scp 超时、远程部署、tar 排除

### E-DEPLOY-3 PM2 启动前先 node 试跑（2026-06-17 沉淀）
- **场景**：PM2 启动失败要看 `pm2 logs`，等待 5-10 秒才能定位路径错误
- **根因**：PM2 启动链路长（fork + daemonize + logrotate）
- **规则**：PM2 启动前先 `node dist/main.js` 试跑 1 秒，能比 pm2 logs 快 5x 暴露路径/语法错误
- **触发词**：PM2 启动失败、pm2 logs、node 试跑

### E-DEPLOY-4 远程编辑一律本地编辑 + scp 上传（2026-06-17 沉淀）
- **场景**：SSH 远程用 sed 编辑 bootstrap-production.js，PowerShell heredoc 转义 3 次才成功
- **根因**：PowerShell 转义规则复杂（`$(date)`、单引号、双引号嵌套）
- **规则**：任何远程配置修改，本地编辑器 → scp 上传 → 远程 restart。禁止 SSH 远程 sed
- **触发词**：SSH 远程编辑、PowerShell 转义、scp 上传

### E-WIP-1 累积修改必须 WIP commit（2026-06-17 沉淀）
- **场景**：本次累积 121 文件 / 15620 行一起 commit，回滚粒度极粗
- **根因**：违反"小步修改"原则
- **规则**：UI/功能修复累计 >30 文件或 >50 行，必须 WIP commit（git commit -m "WIP"）
- **触发词**：累积修改、大 commit、回滚粒度

### E-AUDIT-1 空 try-catch 是隐性技术债（2026-06-17 沉淀）
- **场景**：FrontdeskChat.tsx 27 处 `catch (e) {}`，错误被静默吞掉
- **风险**：线上排障时无法追溯
- **规则**：审计时遇到空 try-catch 必须标记 P0 风险，建议至少加 `console.warn('[<context>]', e)`
- **触发词**：空 try-catch、silent error、排障噩梦

### E-AUDIT-2 用户输入→LLM 必须 sanitize（2026-06-17 沉淀）
- **场景**：用户输入直接流入 LLM prompt 模板变量，无 sanitize 函数
- **风险**：prompt 注入 → LLM 输出不可信
- **规则**：审计 AI 应用时，必须检查用户输入是否过 `sanitizeUserInput()`（过滤 ignore/system:/assistant: 等关键词 + 长度限制）
- **触发词**：prompt 注入、用户输入、LLM 安全

### E-PROCESS-1 多阶段任务必须分阶段门禁（2026-06-17 沉淀）
- **场景**：本次 UI 修复+部署+审计一口气做完，中间出错需从头排查
- **根因**：缺乏"每阶段完成→结果单→用户确认→下一阶段"协议
- **规则**：>3 阶段的任务，每阶段完成必须输出结果单 + 暂停等用户确认
- **触发词**：分阶段门禁、结果单、多阶段任务

---

## 候选观察规则（待 3 次验证）

### O-1 并行任务结果必须全部到达才输出
- **现象**：6 个并行扫描，5 个回来，1 个漏掉，需用户说 "Continue" 补齐
- **观察**：并行调用没有"all-or-nothing"机制
- **候选规则**：并行扫描任务的结果必须全部到达才输出，否则告警"结果不完整"

### O-2 用户"修改指令"应立刻追加到 in-progress 任务
- **现象**：用户在阶段 A 后给反馈，但直到阶段 D 才部署，期间又改代码
- **观察**：用户反馈未及时同步到当前任务列表
- **候选规则**：用户每次"修改指令"立刻追加到 TodoWrite in_progress 列表

### O-3 技能调用失败时 AI 应手动按框架输出
- **现象**：`AWKN 复盘总结` 技能调用超时（IDE Command timeout），AI 仍按框架完成
- **观察**：技能失败时缺乏 fallback 路径
- **候选规则**：审计/复盘类技能调用失败时，AI 应手动按 Skill 框架输出，标记"⚠️ 技能降级"

### E-AUDIT-3 审计数字必须本地 grep 二次验证（2026-06-17 沉淀）
- **场景**：审计报告说 `FrontdeskChat.tsx 有 27 处空 try-catch`，用户要求修复。实际 grep 验证：3 处 catch，0 处空
- **根因**：审计时未对数字做二次验证，或扫描正则与实际模式不匹配，或引用了旧数据
- **规则**：审计输出的具体数字（如"X 处空 try-catch"），执行修复前必须用以下任一命令本地二次验证：
  - PowerShell：`Select-String -Path <file> -Pattern "catch\s*\([^)]*\)\s*\{\s*\}" -AllMatches | Measure-Object`
  - ripgrep：`rg -n "catch\s*\([^)]*\)\s*\{\s*\}" <file>`
- **触发词**：审计数字、空 try-catch、catch count、二次验证

---

## 维护说明

- 同步到主记忆系统后，删除本文件
- 主记忆系统路径：`C:\Users\10919\Desktop\AWKN-Lab\记忆系统\02-evolution\learned-rules.md`
- 同步方式：在主文件中追加上述 E-DEPLOY-*、E-WIP-*、E-AUDIT-*、E-PROCESS-* 章节