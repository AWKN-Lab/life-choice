# Tasks

## Phase 1: 跑通 MingLi-Bench 评测 🔴 P0

- [x] Task 1.1: 修复 MingLi-Bench API 阻塞问题
  - [x] SSH 到服务器查看 pm2 日志，定位 `POST /api/mingli-bench/run` 返回空响应的根因
  - [x] 检查 `MingliBenchModule` 是否在 `AppModule` 中正确导入
  - [x] 检查数据文件路径配置（`MINGLI_BENCH_DATA_PATH` + `MINGLI_BENCH_FORTUNE_PATH`）
  - [x] 修复后验证端点返回正常 runId

- [ ] Task 1.2: 跑三组评测
  - [ ] 组A: CoT + Astro + 单轮，160题
  - [ ] 组B: CoT + Astro + 5轮投票，160题
  - [ ] 组C: 张半山 Prompt，160题

- [ ] Task 1.3: 分析评测结果
  - [ ] 计算截尾准确率，与 Tianfu(50%) 和人类Top20(53.5%) 对比
  - [ ] 分类别准确率（事业/婚姻/财运...）
  - [ ] 标记弱项类别（准确率 < 40%）
  - [ ] 输出分析报告

## Phase 2: 确定性计算工具层 🔴 P0

- [x] Task 2.1: 建立工具层基础设施
  - [x] 创建 `src/lib/atom-tools/` 目录结构
  - [x] 定义 `AtomTool<TInput, TOutput>` 接口（name, description, category, execute, toPromptOutput）
  - [x] 实现 `ToolRegistry` 统一注册与查询

- [x] Task 2.2: 实现八字类工具 T1-T4（基础，基于现有 BaziCalculator）
  - [x] T1 `analyze_rizhu_strength`: 日主强弱判断（得令/得地/得势）
  - [x] T2 `analyze_wuxing_balance`: 五行分布统计 + 喜忌用神
  - [x] T3 `analyze_shishen`: 十神分析（事业/财/官/印）
  - [x] T4 `analyze_dayun_stage`: 大运阶段分析

- [x] Task 2.3: 实现紫微类工具 T7-T10（基础，基于 fortune_api_results.json）
  - [x] T7 `analyze_minggong_master`: 命宫主星 + 庙旺分析
  - [x] T8 `analyze_sihua_distribution`: 四化星分布
  - [x] T9 `analyze_palace_combination`: 重点宫位组合分析
  - [x] T10 `analyze_star_interaction`: 星曜生克关系

- [x] Task 2.4: 实现决策辅助工具 T14-T18
  - [x] T14 `assess_decision_timing`: 决策时机适宜度评分
  - [x] T15 `assess_risk_signals`: 风险信号提取
  - [x] T16 `assess_career_fit`: 职业适配度评分
  - [x] T17 `assess_relationship_compat`: 关系契合度评分
  - [x] T18 `cross_validate_zp_zw`: 紫微×八字交叉验证

- [x] Task 2.5: 实现高级工具 T5-T6, T11-T13
  - [x] T5 `analyze_liunian_interaction`: 流年与命局交互
  - [x] T6 `detect_chong_he`: 冲合关系检测
  - [x] T11 `analyze_feigong_path`: 飞宫路径推演
  - [x] T12 `analyze_dayun_overlay`: 大限叠宫分析
  - [x] T13 `calculate_triple_alignment`: 三方四正关系

- [ ] Task 2.6: 工具层单元测试
  - [ ] 每个工具至少 2 个测试用例（正常+边界）
  - [ ] `toPromptOutput()` 输出格式验证

## Phase 3: 工具编排层改造 🔴 P0

- [x] Task 3.1: 增强 schedule() 问题分类+工具组合选择
  - [x] 问题分类（事业/婚姻/财运/健康/综合）
  - [x] 映射→推荐工具组合（至少3组预置：事业/婚姻/综合）
  - [x] 集成到 `ZhangbanshanSchedulerService`

- [x] Task 3.2: 实现 dispatch() 并行工具调用
  - [x] 所有工具纯函数，完全并行执行
  - [x] 超时 30s/工具
  - [x] 失败降级：跳过该工具，不阻塞主流程

- [x] Task 3.3: 实现 synthesize() 三段式合成
  - [x] 工具输出作为 facts → LLM 基于 facts 推理
  - [x] 判语 derive from facts
  - [x] 代价 derive from facts + risk tool output
  - [x] 推理溯源引用具体工具输出

- [ ] Task 3.4: 重新跑 MingLi-Bench 对比
  - [ ] 对比 Phase 1 基线 vs 工具层加持后准确率
  - [ ] 预期 +5~10% 提升

## Phase 4: 长期记忆 + 时间线锚定 🟡 P1

- [x] Task 4.1: 新增 UserMemory Prisma model
  - [x] 定义 ChartHistory / ConsultationHistory / TimelineEvent / Insight 数据结构
  - [x] 数据库迁移

- [x] Task 4.2: 记忆自动更新
  - [x] 每次 consult 结束后自动提取关键信息更新记忆
  - [x] 时间线事件自动关联大运/流年区间

- [x] Task 4.3: 记忆注入 System Prompt
  - [x] 新对话开始时注入记忆摘要
  - [x] 连续对话验证：第二次引用第一次内容

- [x] Task 4.4: Timeline 前端可视化
  - [x] 新增 Timeline 组件展示用户人生事件

## Phase 5: 可视化推理链 🟡 P1

- [x] Task 5.1: 后端分步输出
  - [x] synthesize 阶段分步输出（每个工具调用→一个步骤）
  - [x] 每步：工具名+原始输出+LLM解读+置信度

- [x] Task 5.2: 前端 ReasoningSteps 组件
  - [x] 分步骤可视化展示推理链
  - [x] 用户可选"快速看结果"或"看详细推理"
  - [x] 每步可折叠/展开

## Phase 6: 奇门遁甲集成 🟡 P1

- [x] Task 6.1: 确认 qimen-agent 可用性
  - [x] 验证 `qimen-agent.service.ts` 可正常调用
  - [x] 验证 `@yhjs/dunjia` 或 stub 可用

- [x] Task 6.2: 编排层加入奇门调度
  - [x] schedule() 增加奇门场景映射
  - [x] 奇门用于"特定时空截面决策"

- [x] Task 6.3: 三方交叉验证
  - [x] `cross_validate_zp_zw` 升级为 `cross_validate_zp_zw_qm`

## Phase 7: 入口重新定位 🟡 P1

- [x] Task 7.1: 首页文案重写
  - [x] 第一屏张半山人格语调文案
  - [x] "先说问题"替代"先填表单"

- [x] Task 7.2: 入口流程优化
  - [x] 第一步：用户说问题（不需要生辰）
  - [x] 第二步：需要命理分析时再问生辰

- [x] Task 7.3: 人格一致性校验
  - [x] 首页/对话/结果页张半山语感统一

- [x] Task 2.6: 工具层单元测试
  - [x] 每个工具至少 2 个测试用例（正常+边界）
  - [x] `toPromptOutput()` 输出格式验证

# Task Dependencies
- [Task 1.2] depends on [Task 1.1]
- [Task 1.3] depends on [Task 1.2]
- [Task 2.2] depends on [Task 2.1]
- [Task 2.3] depends on [Task 2.1]
- [Task 2.4] depends on [Task 2.1]
- [Task 2.5] depends on [Task 2.1]
- [Task 2.6] depends on [Task 2.2, Task 2.3, Task 2.4, Task 2.5]
- [Task 3.1] depends on [Task 2.1]
- [Task 3.2] depends on [Task 3.1, Task 2.6]
- [Task 3.3] depends on [Task 3.2]
- [Task 3.4] depends on [Task 3.3, Task 1.3]
- [Task 4.2] depends on [Task 4.1]
- [Task 4.3] depends on [Task 4.2]
- [Task 4.4] depends on [Task 4.2]
- [Task 5.1] depends on [Task 3.3]
- [Task 5.2] depends on [Task 5.1]
- [Task 6.2] depends on [Task 6.1]
- [Task 6.3] depends on [Task 6.2, Task 2.4]
- [Task 7.2] depends on [Task 7.1]
- [Task 7.3] depends on [Task 7.2]

# Parallelizable Work
- Phase 1 (Task 1.1-1.3) 和 Phase 2 (Task 2.1-2.6) 可并行
- Phase 4 (Task 4.1-4.4) 和 Phase 6 (Task 6.1-6.3) 可并行
- Phase 7 (Task 7.1-7.3) 可与 Phase 2-3 并行
