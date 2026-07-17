# DOD · 开发整改计划验收标准

> **文档用途**：为《开发整改计划.html》14 个任务定义验收标准（Definition of Done）
> **关联文档**：[批判性分析-开发整改计划.md](../../批判性分析-开发整改计划.md) · [RACI-开发整改计划.md](./RACI-开发整改计划.md)
> **生成日期**：2026-06-13

---

## 验收标准格式说明

每条验收标准采用 **Given-When-Then** 格式：

- **Given** 前置条件
- **When** 触发动作
- **Then** 期望结果
- **And** 附加断言（可多个）

每条任务至少包含：
1. **功能验收**（Given-When-Then）：行为是否正确
2. **量化指标**（必须 ≥1 条）：用户感知/性能/数据指标
3. **灰度标准**：发布节奏（参考 M6 Feature Flag）

---

## P1 · 速赢（4 任务）

### P1-1 张半山头像替换

**功能验收**：
- **Given** 项目代码中存在紫色 psychology 图标
- **When** 用户访问 ResultChat / FrontdeskChat / HeroBanner
- **Then** 图标被替换为张半山头像（中山领+罗盘+执笔）
- **And** 头像为圆形，64×64（消息气泡）/ 128×128（侧栏）/ 300×400（首页 HeroBanner）

**量化指标**：
- 头像加载时间 ≤500ms（首屏）
- 用户访谈 ≥5 人中，≥4 人提到"有真人在说话"
- 紫色 psychology 图标残留数 = 0（grep 验证）

**灰度标准**：1% → 10% → 100%，每阶段 24h 观察

### P1-2 仪式动画接入 ResultPage

**功能验收**：
- **Given** 用户提交咨询，routeType=ziping/liuren/qimen/ziwei/liuyao/general
- **When** ResultPage 进入等待阶段
- **Then** 显示 DivinationRitualLoader 替代简单 spinner
- **And** type 参数正确传入（ziping→bazi 8 步 / liuren→7 步 / qimen→8 步）
- **And** LLM 流式首 token 到达时触发 complete 阶段 → "命书已成" 动画 → 淡出

**量化指标**：
- 用户停留时间 ≥30s 的比例 ≥70%
- 仪式动画与 LLM 进度的偏差 ≤2 步（埋点统计）
- 用户截图分享率 ≥5%（核心增长指标）

**灰度标准**：1% → 10% → 50% → 100%，每阶段 48h（含周末观察）

### P1-3 期望管理开场白

**功能验收**：
- **Given** 用户首次咨询（userProfileStore.hasSeenExpectationManagement=false）
- **When** 进入 FrontdeskChat 提交问题前
- **Then** 显示张半山系统消息：「我不是给你答案的人……」
- **And** 用户点击"我知道了"或输入问题后才继续
- **And** userProfileStore.hasSeenExpectationManagement 持久化（localStorage）

**量化指标**：
- 期望管理消息阅读率 ≥80%（埋点：曝光 → 阅读完整文案）
- 退款率（首问即退款）≤3%
- 老用户升级路径 0 报错（数据迁移测试用例全通过）

**灰度标准**：5% → 30% → 100%，重点观察退款率变化

### P1-4 算法话术层

**功能验收**：
- **Given** ResultChat 准备展示某个 Agent 面板
- **When** 切换到对应算法
- **Then** 在 Agent 面板之前插入 3 段话术（opening + process + setup）
- **And** 使用 TypingIndicator 过渡
- **And** 话术参考 [agent-intro-messages.ts](../../../apps/AWKN-LABlife/app/src/data/agent-intro-messages.ts) 的"去算法名"原则

**量化指标**：
- 6 个算法全覆盖（ziping / liuren / qimen / ziwei / liuyao / quming）
- 文案 review 通过（产品 + CEO + 5 用户抽样）
- 用户反馈"张半山在跟我说话"比例 ≥70%

**灰度标准**：A/B 测试（控制组 = 原版话术 / 实验组 = 新版），观察停留时间 + 完成率

---

## P2 · 体验纵深（3 任务）

### P2-1 蛐蛐代价提醒

**功能验收**：
- **Given** LLM 输出包含 ⚠️ 代价提醒前缀（或 cost_warning 字段，参考 M4 Schema）
- **When** ResultChat 渲染 Agent 输出
- **Then** 解析 ⚠️ 前缀并渲染为带背景色的提醒条
- **And** 4 种提醒类型轮换（代价标注 / 边界标注 / 记忆锚点 / 框架纠偏）
- **And** 每轮最多 2 条，超出折叠为"查看更多代价提醒"

**量化指标**：
- LLM 输出格式异常率 ≤5%（埋点：⚠️ 缺失率）
- 提醒渲染成功率 ≥99%
- 4 种类型分布相对均衡（每种 20%~30%）
- 用户对"代价提醒"的回访意愿 ≥40%

**灰度标准**：10% → 50% → 100%，重点观察 LLM 格式异常率

### P2-2 代价确认环

**功能验收**：
- **Given** 三段式输出已展示完毕
- **When** ResultChat 切换到 cost-confirmation 阶段
- **Then** 插入张半山消息：「我说完了。你能不能用自己的话告诉我，你将要承担的最坏情况是什么？」
- **And** 输入框 placeholder 变为「写出你理解的最坏情况...」
- **And** 用户回复后张半山确认（"对，就是这样" / "不完全对，我补充一下——"）
- **And** 确认完成后开放后续追问

**降级路径（必测 ≥5 次）**：
- 用户沉默 30s → 引导："可以慢慢想"
- 用户说"不知道" → 张半山给 1-2 句锚点
- 用户反复纠结 → 引导回原点

**量化指标**：
- 代价确认完成率 ≥60%
- 降级路径触发次数（埋点）≤30%（即 70% 用户能自我表达）
- 用户对"代价理解"的访谈评分 ≥4/5

**灰度标准**：1% → 10% → 50% → 100%，每阶段 48h

### P2-3 高风险场景检测

**功能验收**：
- **Given** 用户输入触发高风险关键词（"准吗"、"上次说错了"、"该不该离婚/辞职"等）
- **When** ConsultService.analyze 前置 high-risk-detector
- **Then** 命中 5 种场景时返回脚本化回复（不调 LLM）
- **And** 5 步纠错协议对"上次说错了"完整生效
- **And** "重复问同一问题"触发记忆锚点

**量化指标**：
- 5 种场景脚本化覆盖率 100%
- 命中响应延迟 ≤100ms（脚本化 vs LLM 2~3s）
- 用户对"被认真听到"的反馈 ≥80%
- 误命中率（不该脚本化却脚本化）≤2%

**灰度标准**：脚本化 vs LLM 自由发挥 A/B 测试，重点观察用户感知差异

---

## P3 · 闭环引擎（3 任务）

### P3-1 回访系统

**功能验收**：
- **Given** 咨询完成 7 天后
- **When** 后端定时任务运行
- **Then** 生成"回访提醒"记录
- **And** 用户下次打开 App 时，首页/历史记录显示回访入口
- **And** 回访对话写入 ConsultRecord.closedLoopResult
- **And** HomePage 有"待回访"卡片

**量化指标**：
- 回访触发率 ≥30%（7 天后主动回访用户占比）
- 回访完成率 ≥50%（看到入口 → 完成对话）
- 闭环数据完整率 ≥80%
- 定时任务执行成功率 ≥99%

**灰度标准**：内测 5% → 公测 30% → 全量，需要时间回拨机制支持开发/测试

### P3-2 记忆锚定

**功能验收**：
- **Given** 用户历史上咨询过类似话题
- **When** ZhangbanshanScheduler 检测到重复问
- **Then** 在 Prompt Layer 3 注入历史记忆摘要
- **And** 自动触发记忆锚点：「上次你说 XX，现在情况变了吗？」
- **And** ResultChat 显示"记忆锚点"卡片（半透明）

**量化指标**：
- 记忆锚点召回准确率 ≥70%（人工抽样）
- 召回时延 ≤200ms
- 用户对"他记得我"的反馈 ≥75%
- 记忆摘要不超 200 字（避免 LLM token 浪费）

**灰度标准**：10% → 50% → 100%，重点观察召回准确率

### P3-3 用户状态分类器

**功能验收**：
- **Given** RouterService 收到新咨询
- **When** 调用 classifyUserState()
- **Then** 输出 4 类之一：随便逛逛 / 真有问题 / 重复问 / 来验证的
- **And** 不同类型对应不同 Prompt 策略
- **And** 分类结果缓存（同 session 不重复分类）

**量化指标**：
- 4 类分布合理（每类 ≥15%）
- 分类准确率 ≥75%（人工抽样 100 条）
- 分类 LLM 调用 ≤1 次/咨询（成本控制）
- 4 类用户的回访率/付费率差异显著

**灰度标准**：后台分类先灰度 → 前端体验再灰度

---

## P4 · 多轮对话架构（4 任务）

### P4-1 SSE 基础设施

**功能验收**：
- **Given** Nginx 已配置 proxy_buffering off
- **When** 客户端调用 GET /consult/dialogue/:id/stream
- **Then** SSE 连接建立，事件类型包含 state_change / agent_progress / token / result_ready
- **And** 与现有 WebSocket LLM 流式共存不冲突

**量化指标**：
- SSE 连接稳定性 ≥99.5%（断线率 < 0.5%）
- 事件推送延迟 ≤500ms
- Nginx 并发 SSE 连接 ≥1000（压测）
- 心跳间隔 15s，重连策略指数退避最多 5 次

**灰度标准**：内测环境先稳定 → 生产 10% → 100%

### P4-2 6 态状态机 + 数据模型

**功能验收**：
- **Given** Prisma schema 新增 ConsultDialogue 模型
- **When** 状态机从 IDLE 流转
- **Then** 支持 IDLE → SCHEDULING → CLARIFYING → GENERATING → RESPONDING → COMPLETED 6 态
- **And** CLARIFYING 状态支持张半山反问，max 2 轮
- **And** 3 个 API：POST /dialogue/start · POST /dialogue/:id/reply · GET /dialogue/:id/result

**量化指标**：
- 状态机单元测试覆盖率 ≥90%
- 状态切换时延 ≤50ms
- 数据库写入成功率 ≥99%
- CLARIFYING 状态反问命中率 ≥30%

**灰度标准**：状态机先内测 → API 文档先行 1 周 → 前端集成

### P4-3 多轮对话前端 UI

**功能验收**：
- **Given** SSE 连接建立
- **When** 张半山进入 CLARIFYING 状态
- **Then** 显示气泡 + 快捷回复选项
- **And** 对话中途可取消/修正
- **And** 对话历史侧边栏可折叠
- **And** SSE 自动重连 + 心跳

**量化指标**：
- 用户满意度 ≥4/5（10 人抽样访谈）
- 取消率 ≤20%
- SSE 重连成功率 ≥95%
- 多轮对话完成率 ≥60%

**灰度标准**：内测 1% → 公测 10% → 全量，重点观察用户学习曲线

### P4-4 张半山 SKILL Prompt 升级

**功能验收**：
- **Given** 多轮对话解锁
- **When** ZhangbanshanScheduler 调度 Node 0~6
- **Then** 每个 Node 行为规则真正激活
- **And** Node 0 期望管理 → 首轮自动触发
- **And** Node 1 破冰 → 复述问题 + 1 个关键背景问题
- **And** Node 2 背景收集 → 按用户类型表问不同问题
- **And** Node 3 判断输出 → 三段式 + 蛐蛐提醒
- **And** Node 4 收尾 → 代价确认环
- **And** Node 5-6 回访 → P3-1 系统触发

**量化指标**：
- 6 个 Node 全部可被真实用户访谈触发
- 张半山口吻一致性人工 review ≥90%
- 多轮对话完成率 ≥60%
- 用户付费率（多轮 vs 单轮）提升 ≥30%

**灰度标准**：先在测试环境跑脚本验证 → 灰度 1% → 100%

---

## 通用验收（所有任务）

### 代码质量
- ✅ TypeScript strict 模式零 `any`、零 `@ts-ignore`
- ✅ ESLint 零错误
- ✅ 单元测试覆盖核心逻辑（覆盖率 ≥80%）
- ✅ 所有外部输入用 zod 验证

### 部署质量
- ✅ 所有面向用户改动走 Feature Flag（M6）
- ✅ 灰度发布 1% → 10% → 50% → 100%
- ✅ 一级回滚 ≤30s（关 Flag）/ 二级 ≤5min（Nginx）/ 三级 DB down 脚本

### 可观测性
- ✅ 关键路径埋点（用户停留 / 渲染成功率 / 异常率）
- ✅ 监控指标接入告警系统
- ✅ 错误日志结构化（带 traceId）

### 文档
- ✅ 涉及 API 变更 → OpenAPI 同步
- ✅ 涉及 Schema 变更 → Prisma migration 文档
- ✅ 涉及用户文案 → 经过文案 review（M5 script-style-guide.md）

---

## 验收方式总结

| 验收方式 | 适用 | 工具 |
|---------|------|------|
| **自动化测试** | 功能正确性 | Jest / Playwright |
| **埋点统计** | 量化指标 | 自建埋点 / GA |
| **人工抽样** | 文案 / 口吻 | 5~10 人访谈 |
| **A/B 测试** | 体验对比 | Feature Flag 控制组/实验组 |
| **Code Review** | 代码质量 | PR 评审 |

---

*文档结束。14 任务全部覆盖。任何新加任务必须按此格式补充 DOD。*