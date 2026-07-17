# 张半山竞品对标升级 Spec

## Why
当前张半山系统仅依赖 LLM 语料"背诵"推理命理，缺少确定性计算工具层，导致准确率无法验证、推理不可溯源。竞品 Tianfu Agent 已有 200+ 原子工具并在 2025 大赛达到 50% 准确率。我们需要：跑通 MingLi-Bench 获取基线 → 建立确定性工具层 → 改造编排层让 LLM 基于工具输出推理而非凭空推理。

## What Changes
- 修复 MingLi-Bench 评测 API 阻塞问题，跑通三组评测获取基线准确率
- 新建 18 个确定性原子计算工具（八字6 + 紫微7 + 决策辅助5）
- 改造 orchestrator 调度层：schedule → dispatch → synthesize 三阶段
- 新增 UserMemory 长期记忆模型与时间线锚定
- 新增 ReasoningSteps 前端可视化推理链组件
- 集成奇门遁甲到编排层交叉验证
- 首页入口重新定位为人格化决策顾问

## Impact
- Affected specs: destiny-kline-v1（首页改造有交集，Phase 7 需协调）
- Affected code:
  - `mingli-bench.service.ts`（Phase 1 修复阻塞）
  - `zhangbanshan-scheduler.service.ts`（Phase 3 改造调度层）
  - `orchestrator.service.ts`（Phase 3 改造编排流程）
  - `qimen-agent.service.ts`（Phase 6 集成）
  - `prisma/schema.prisma`（Phase 4 新增 UserMemory）
  - 前端 `ResultPage`（Phase 5 推理链可视化）
  - 前端 `HomePage`（Phase 7 入口重定位）

## ADDED Requirements

### Requirement: MingLi-Bench 评测基线
系统 SHALL 能跑通三组 MingLi-Bench 评测（A: CoT+Astro单轮 / B: CoT+Astro+5轮投票 / C: 张半山Prompt），输出截尾准确率与分类别准确率报告。

#### Scenario: 评测API正常响应
- **WHEN** 调用 `POST /api/mingli-bench/run` 指定组别和配置
- **THEN** 返回 runId，评测任务入队，结果写入 DB
- **AND** 三组评测全部完成，输出准确率报告

#### Scenario: 评测API阻塞修复
- **WHEN** 后端日志显示路由缺失或数据加载失败
- **THEN** 修复模块注册或数据路径，重新验证端点可用

### Requirement: 确定性原子计算工具层
系统 SHALL 提供 18 个纯函数原子计算工具，每个工具零 LLM 参与，输入→计算→输出确定性结果，并通过 `toPromptOutput()` 序列化为 LLM 可读格式。

#### Scenario: 八字工具调用
- **WHEN** orchestrator 调用 `analyze_rizhu_strength({ pillars })` 
- **THEN** 返回日主强弱判断（得令/得地/得势），无 LLM 参与
- **AND** `toPromptOutput()` 输出人类可读的判断文本

#### Scenario: 紫微工具调用
- **WHEN** orchestrator 调用 `analyze_minggong_master({ ziweiData })`
- **THEN** 返回命宫主星 + 庙旺分析，无 LLM 参与

#### Scenario: 决策辅助工具调用
- **WHEN** orchestrator 调用 `cross_validate_zp_zw({ baziResult, ziweiResult })`
- **THEN** 返回紫微×八字交叉验证结论

### Requirement: 工具编排层改造
系统 SHALL 将 orchestrator 改造为三阶段调度：schedule（问题分类→选工具组合）→ dispatch（并行调用3-5个原子工具）→ synthesize（聚合工具输出+LLM语义解读→三段式输出）。

#### Scenario: 事业决策编排
- **WHEN** 用户问事业相关问题
- **THEN** schedule 选择 [T1, T3, T4, T7, T14, T18] 工具组合
- **AND** dispatch 并行调用，超时30s/工具，失败降级跳过
- **AND** synthesize 输出引用至少 2 个工具结果的判语+代价+推理溯源

#### Scenario: 工具调用失败降级
- **WHEN** 某个原子工具超时或异常
- **THEN** 跳过该工具，不阻塞主流程，synthesize 基于可用工具输出

### Requirement: 长期记忆与时间线锚定
系统 SHALL 为用户维护 UserMemory（命盘历史+对话历史+时间线事件+认知洞察），新对话开始时注入记忆摘要到 System Prompt。

#### Scenario: 连续对话引用
- **WHEN** 用户第二次对话
- **THEN** 张半山引用第一次对话的关键判断和用户自述事件

#### Scenario: 时间线锚定
- **WHEN** 用户说"2023年我换了工作"
- **THEN** 系统自动关联到对应大运/流年区间，下次分析时引用

### Requirement: 可视化推理链
系统 SHALL 在结果页展示分步骤推理链，每步关联一个工具，用户可选"快速看结果"或"看详细推理"。

#### Scenario: 推理链展示
- **WHEN** 用户查看结果页
- **THEN** 展示至少3步推理链，每步包含：工具名+原始输出+LLM解读+置信度
- **AND** 用户可折叠/展开每步详情

### Requirement: 奇门遁甲集成
系统 SHALL 将奇门遁甲加入编排层，与紫微/八字交叉验证，主要用于"特定时空截面决策"。

#### Scenario: 奇门调度
- **WHEN** 用户问时机/方向类问题
- **THEN** schedule 包含 qimen agent，cross_validate 升级为三方交叉验证

### Requirement: 首页入口重新定位
系统 SHALL 将首页从"AI决策工具"重新定位为"人格化决策顾问"，首页第一屏呈现张半山人格语调，入口流程从"先填表单"变为"先说问题"。

#### Scenario: 新首页体验
- **WHEN** 用户首次访问
- **THEN** 第一屏看到张半山人格文案，直接输入问题
- **AND** 需要命理分析时才问生辰，降低门槛

## MODIFIED Requirements

### Requirement: orchestrator 编排流程
原流程：用户问题 → LLM Prompt（含排盘数据）→ LLM 推理 → 输出
改为：用户问题 → schedule（选工具）→ dispatch（并行调用原子工具）→ synthesize（工具输出+LLM解读）→ 三段式输出

### Requirement: 张半山调度器
原 `ZhangbanshanSchedulerService` 仅做 Agent 类型选择（liuren/qimen/ziping/ziwei）
改为：schedule() 问题分类+工具组合选择 → dispatch() 并行工具调用 → synthesize() 聚合输出

## REMOVED Requirements

### Requirement: 纯 LLM 推理路径
**Reason**: 当前完全依赖 LLM 语料"背诵"推理命理，准确率不可验证、推理不可溯源
**Migration**: 保留 LLM 语义解读能力，但推理必须基于工具输出的 facts，不基于训练语料背诵
