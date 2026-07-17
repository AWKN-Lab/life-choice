# 人生决策宗师 — LLM审核修复与质量优化计划

> 版本：v1 | 日期：2026-05-14 | 状态：计划阶段

---

## A. 目标与边界

### 目标一句话
补齐审核报告3条建议改进 + 将LLM输出质量提升到参考案例水平 + 建立项目文档遗产索引

### 本轮做（5项）
1. 审核报告3条建议改进：LLM调用结构化日志、成功率监控告警、Prompt A/B测试框架
2. 子平(八字)Agent Prompt深度优化：对齐六壬Agent的分析深度与叙事质量
3. 模块生成Prompt升级：`generateFastModuleJson` 的 breakthrough/morning 输出从纯JSON改为自然叙述 + JSON混合
4. 建立 `docs/legacy/INDEX.md` 文档遗产索引，复刻凌扬健身模式
5. 案例库整合：将参考案例作为Prompt中的few-shot示例嵌入

### 本轮不做（5项）
1. 不修改六壬Agent的 liuren-analysis-prompt.md（已足够好）
2. 不修改前端展示逻辑
3. 不修改数据库Schema
4. 不修改算法引擎计算逻辑
5. 不做大规模代码重构

### 约束与假设
- 当前6个LLM Provider（doubao/moonshot/minimax/qwen/deepseek/sensenova）均保持
- 不改变现有API接口契约
- 所有Prompt变更需向后兼容现有JSON解析逻辑
- 索引不移动现有文件，只新增索引文件
- A/B测试框架为轻量级实现，不引入第三方服务

---

## B. 选定拆解视角

**刀法选择**：模块边界

**为什么选它**：
- 三个任务（日志监控、Prompt优化、文档索引）分属不同模块
- 可以独立并行推进，互不阻塞
- 每个模块有清晰的验收标准

---

## C. 当前状态分析

### C.1 审核报告修复状态

| 修复项 | 状态 | 证据位置 |
|--------|------|---------|
| 2.1 统一字段映射 `mergeOptionalFields` | ✅ 已实装 | consult.service.ts:L1136-L1152 |
| 2.2 升级K线LLM Prompt（风格铁律） | ✅ 已实装 | consult.service.ts:L1525-L1541 |
| 2.3 真实质量评分 `computeQualityScore` | ✅ 已实装 | consult.service.ts:L1470-L1487 |
| 2.4 五行幸运色方位 `WUXING_LUCKY_MAP` | ✅ 已实装 | consult.service.ts:L1154-L1168 |
| **建议1：日志增强** | ❌ 未做 | 仅有 `this.logger.log()` 基础日志 |
| **建议2：监控告警** | ❌ 未做 | 无LLM成功率追踪 |
| **建议3：A/B测试** | ❌ 未做 | 无Prompt版本管理 |

### C.2 LLM输出质量差距分析

**参考案例特征**（案例.txt / 命理案例.txt）：
- 结论先行，一句话定性有记忆点（"偏能赚钱，但不是轻松钱"）
- 自然叙述风格，术语紧跟白话翻译
- 详细推导过程（真太阳时校正 → 课体分析 → 三传解读 → 风险判断）
- 具体时间窗口（精确到干支日）
- 行动建议分"该做/不该做"，每条具体可执行
- 结尾有温度（"落一句最实在的话"）
- 补充说明（六壬主断/八字辅助、校正说明）

**当前系统现状**：
- 六壬Agent (`liuren-analysis-prompt.md`) 已非常接近参考案例水平——有详细的八门断事体系、毕法赋、神煞表、占类映射、输出示范
- 子平Agent (`ziping-system-prompt.md`) 有详细的Phase结构但输出格式较JSON化
- 模块生成 (`generateFastModuleJson`) 的breakthrough/morning Prompt 较简短，缺少案例参考

**核心差距**：
1. 子平Agent输出缺少"自然叙述"层——当前输出偏JSON字段堆砌
2. 模块生成Prompt缺少few-shot示例和详细推导模板
3. 所有LLM输出缺少"结尾金句"（"落一句最实在的话"）

### C.3 文档索引现状

- 已有 `AWKN-LABlife/INDEX.md`（项目级索引，覆盖前端/后端/知识库/部署）
- 缺少凌扬健身式的 `docs/legacy/INDEX.md`（状态追踪、权威替代、MIGRATE_TO）
- 项目根目录有大量 .md 文档散落（审核报告、README、ONBOARDING等）
- `docs/` 下有复盘报告和经验总结但无统一索引

---

## D. 分步清单

### Step 1｜LLM调用结构化日志

**动作**：在 `llm-providers.service.ts` 中添加 `LlmCallLogger` 工具类

**产出**：
- 新增 `src/shared/logger/llm-call-logger.ts`
- 在 `llm-providers.service.ts` 的 `chatWithUser` 方法中注入日志记录

**验收标准**：
- 每次LLM调用自动记录：时间戳、provider、model、routeType、耗时、成功/失败、token数（如有）、重试次数
- 日志输出到独立文件 `logs/llm-calls-YYYY-MM-DD.log`
- 可通过 `grep` 按 provider/routeType/status 过滤

**验证方法**：
1. 触发一次八字咨询 → 检查 `logs/` 下是否生成日志文件
2. `grep "doubao" logs/llm-calls-*.log` 能看到完整调用记录
3. 模拟LLM超时 → 日志中应有 `status=failed, reason=timeout`

**回滚方式**：删除 `llm-call-logger.ts`，移除 `llm-providers.service.ts` 中的注入代码

---

### Step 2｜LLM成功率监控告警

**动作**：在 `llm-providers.service.ts` 或新建 `src/shared/monitor/llm-health.service.ts` 中实现滑动窗口成功率计算

**产出**：
- 新增 `src/shared/monitor/llm-health.service.ts`
- 在 `health.controller.ts` 中添加 `/health/llm` 端点
- 在 `consult.service.ts` 的超时处理中触发告警日志

**验收标准**：
- 最近100次调用的成功率可通过 `/health/llm` 查询
- 成功率 < 80% 时，日志输出 `[LLM-ALERT]` 级别告警
- 单provider连续失败3次，日志输出 `[LLM-ALERT] provider=xxx consecutive failures=3`
- 不影响正常业务流程（告警为旁路逻辑）

**验证方法**：
1. `curl /health/llm` → 返回 `{ successRate: 0.95, totalCalls: 100, byProvider: {...} }`
2. 手动触发3次失败 → 日志中出现 `[LLM-ALERT]` 
3. 正常调用不产生告警

**回滚方式**：删除 `llm-health.service.ts`，移除 `health.controller.ts` 中的新增端点

---

### Step 3｜Prompt A/B测试框架

**动作**：在 `llm-providers.service.ts` 中实现轻量级Prompt版本管理

**产出**：
- 新增 `src/shared/prompt-registry/prompt-registry.service.ts`
- Prompt版本定义文件 `src/shared/prompt-registry/versions.ts`
- 在 `llm-providers.service.ts` 中支持 `promptVersion` 参数

**验收标准**：
- 可定义多版本Prompt（如 `v1`, `v2`），通过 `promptVersion` 参数切换
- 每次调用记录使用的prompt版本到日志
- 支持通过环境变量 `LLM_PROMPT_VERSION` 全局切换默认版本
- 不传 `promptVersion` 时使用默认版本

**验证方法**：
1. 设置 `LLM_PROMPT_VERSION=v2` → 日志中 `promptVersion=v2`
2. 调用时传 `promptVersion: 'v1'` → 覆盖全局设置
3. 两个版本可独立工作，不互相影响

**回滚方式**：设置 `LLM_PROMPT_VERSION=v1` 恢复原始版本

---

### Step 4｜子平Agent Prompt深度优化

**动作**：增强 `ziping-agent/prompts/ziping-system-prompt.md`，对齐六壬Agent的分析深度

**产出**：
- 修改 `ziping-system-prompt.md`
- 新增 `ziping-agent/prompts/ziping-analysis-prompt.md`（对应六壬的 liuren-analysis-prompt.md）
- 在 `ziping-agent.service.ts` 中加载新Prompt

**验收标准**：
- 新Prompt包含：
  1. 知识库参考区块（经典引用白名单、格局速查表、十神现代解读表）
  2. 输出风格铁律（结论先行、术语翻译、禁止巴纳姆效应）
  3. Few-shot示例（从命理案例.txt提取2-3个完整示例）
  4. 输出Schema增强（增加 `closingLine` "落一句最实在的话"字段）
  5. 分阶段推演框架（排盘校验 → 格局判定 → 大运流年 → 模块断事 → 行动建议）
- 新Prompt输出质量与命理案例.txt可比（由人工review判定）

**验证方法**：
1. 用案例.txt中的陈先生八字（1983-05-20 00:30）测试 → 输出应包含格局判定、大运解读、月度节奏
2. 检查输出是否包含"落一句最实在的话"结语
3. 检查是否有巴纳姆效应语句（用VAGUE_PHRASES过滤）
4. 检查术语后是否紧跟白话翻译

**回滚方式**：恢复原 `ziping-system-prompt.md`，删除新增的 `ziping-analysis-prompt.md`

---

### Step 5｜模块生成Prompt升级（breakthrough/morning）

**动作**：升级 `consult.service.ts` 中 `generateFastModuleJson` 的system prompt和user prompt

**产出**：
- 修改 `consult.service.ts` 中的 `generateFastModuleJson` 方法
- 增强 breakthrough 和 morning 的 system prompt 和 schema

**验收标准**：
- breakthrough schema 增加：
  1. `closing_line`：落一句最实在的话（30字以内）
  2. `derivation_steps`：推导步骤数组（每步含step + reasoning）
  3. `few_shot_reference`：引用的案例编号
- morning schema 增加：
  1. `today_verdict`：今日一句话定性
  2. `ganzhi_analysis`：今日干支与日主关系详解
- Prompt中嵌入1-2个few-shot示例
- 禁止巴纳姆效应语句检测不变

**验证方法**：
1. 触发breakthrough模块 → 输出包含 `closing_line` 和 `derivation_steps`
2. 触发morning模块 → 输出包含 `today_verdict` 和 `ganzhi_analysis`
3. 质量评分 `computeQualityScore` 对新字段正确计分

**回滚方式**：Git revert `consult.service.ts` 的修改

---

### Step 6｜案例库整合为Few-Shot资源

**动作**：将 `东方术数/六壬/案例库/案例.txt` 和 `东方术数/八字命理/命理案例.txt` 结构化后嵌入Prompt

**产出**：
- 新增 `src/shared/case-library/case-library.service.ts`
- 结构化案例JSON文件 `src/shared/case-library/cases.json`
- 在相关Prompt中引用案例

**验收标准**：
- 案例库包含至少3个六壬案例 + 3个八字案例的结构化版本
- 每个案例包含：问题、排盘摘要、输出示范（完整JSON）
- Prompt中可通过 `{{caseExample}}` 变量注入相关案例
- 案例注入不超过token预算的30%

**验证方法**：
1. 检查 `cases.json` 格式正确，可被 `JSON.parse` 解析
2. 六壬Agent prompt中包含六壬案例的few-shot
3. 子平Agent prompt中包含八字案例的few-shot

**回滚方式**：删除 `case-library/` 目录，移除Prompt中的案例变量引用

---

### Step 7｜建立 docs/legacy/INDEX.md 文档遗产索引

**动作**：创建 `AWKN-LABlife/docs/legacy/INDEX.md`，复刻凌扬健身的索引模式

**产出**：
- 新增 `AWKN-LABlife/docs/legacy/INDEX.md`
- 项目根目录 `docs/legacy/` 目录结构

**验收标准**：
- 索引包含以下区块：
  1. 索引表（文档路径 | 主题 | 状态 | 权威替代 | 适用版本 | 责任人 | 最后核验）
  2. 状态统计（ACTIVE/REFERENCE/DEPRECATED/MIGRATE_TO 数量与占比）
  3. 状态块格式说明
  4. 版本历史
- 状态标签：ACTIVE=仍有效 | REFERENCE=历史参考 | DEPRECATED=已废弃 | MIGRATE_TO=已有替代
- 覆盖范围：
  - 项目根目录 .md 文件（README.md, ONBOARDING.md, 审核报告等）
  - AWKN-LABlife/docs/ 下所有文档
  - AWKN-LABlife/ 根目录 .md 文件（CLAUDE.md, TechSpec.md, Design_v2.md 等）
  - 东方术数/ 下的案例和README
  - knowledge-base/ 下的README
- 每篇文档头部建议添加状态块（仅索引记录，不修改原文件）
- 至少覆盖30篇文档

**验证方法**：
1. 打开 `docs/legacy/INDEX.md` → 表格完整，状态标签正确
2. 统计行数与实际文档数一致
3. 每个 DEPRECATED 文档标注了替代文档或原因

**回滚方式**：删除 `docs/legacy/INDEX.md`

---

## E. 高风险清单

| Step | 风险项 | 风险等级 | 原因 |
|------|--------|---------|------|
| Step 4 | 修改子平Agent Prompt | **高** | 改协议/数据格式，可能影响现有用户输出质量 |
| Step 5 | 修改模块生成Prompt | **高** | 改协议/数据格式，breakthrough/morning schema变更 |
| Step 1 | 新增日志模块 | 低 | 新增文件，不影响现有逻辑 |
| Step 2 | 新增监控端点 | 低 | 新增旁路功能 |
| Step 3 | Prompt版本管理 | 中 | 修改llm-providers核心逻辑 |
| Step 6 | 案例库结构化 | 低 | 新增资源文件 |
| Step 7 | 文档索引 | 低 | 纯文档操作 |

### Step 4 & Step 5 高风险应对

**Plan B（降级策略）**：
- 新Prompt通过 `promptVersion` 参数控制，默认仍用 `v1`
- 先在 `v2` 版本中测试新Prompt，验证通过后再切换默认
- 保留旧Prompt文件不删除，可随时回滚
- 失败信号：qualityScore < 60 或 VAGUE_PHRASES 命中率上升
- 兜底方案：自动降级到 `v1` Prompt + 算法兜底模板

---

## F. 最终验收（DoD）

### 用户可见体验
1. 八字命理输出包含格局判定 + 经典引用 + 白话翻译 + 落一句实在话
2. 六壬输出保持现有高质量，不受改动影响
3. 深入推演/醒神早贴输出更自然、更有逻辑

### 系统可观测性
4. `logs/llm-calls-*.log` 可追踪每次LLM调用
5. `/health/llm` 可查询各provider成功率
6. 成功率 < 80% 时日志输出 `[LLM-ALERT]`

### 稳定性
7. 所有现有测试通过（`npm test`）
8. A/B测试框架不影响默认行为
9. 文档索引覆盖所有已知文档

### 回归清单
1. 六壬断事：输入案例.txt中的问题 → 输出质量不下降
2. 八字命理：输入命理案例.txt中的八字 → 输出质量提升
3. 深入推演：点击展开 → 返回完整breakthrough内容
4. 醒神早贴：点击展开 → 返回完整morning内容
5. 人生K线：点击展开 → K线图正常渲染
6. 取名：输入出生信息 → 返回名字候选
7. 奇门/六爻/紫微：各自正常返回
8. 历史记录：正常加载和展示
9. 会员/支付：不受影响
10. 多Provider切换：doubao/minimax/deepseek等均可正常工作

---

## G. 执行顺序建议

```
Step 1 (日志) → Step 2 (监控) → Step 3 (A/B框架)
                                      ↓
Step 6 (案例库) → Step 4 (子平Prompt) → Step 5 (模块Prompt)
                                      ↓
                               Step 7 (文档索引)
```

- Step 1-3 可并行，Step 1-2 先做
- Step 6 为 Step 4-5 提供素材，需先完成
- Step 4-5 依赖 Step 3 的A/B框架做安全切换
- Step 7 独立，可随时进行

---

## H. 复盘记录模板

- 本轮做了哪些Step（通过/未通过）
- 卡点是什么（根因假设）
- 下轮第一步是什么（最小下一口）
- 下次遇到类似情况，先做哪3件事：
  1. 查看当前状态（git status / 文件版本）
  2. 备份当前版本（git commit WIP备份）
  3. 读取完整文件并确认修改位置