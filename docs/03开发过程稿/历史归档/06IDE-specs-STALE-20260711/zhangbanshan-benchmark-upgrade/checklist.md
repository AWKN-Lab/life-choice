# Checklist

## Phase 1: MingLi-Bench 评测
- [x] `POST /api/mingli-bench/run` 端点正常返回 runId
- [ ] 三组评测（A/B/C）全部跑完，结果写入 DB（需服务器部署后执行）
- [ ] 输出准确率报告（含截尾准确率 + 分类别）（需服务器部署后执行）
- [ ] 标记弱项类别（准确率 < 40%）（需服务器部署后执行）
- [ ] 与 Tianfu(50%) 和人类Top20(53.5%) 对比数据（需服务器部署后执行）

## Phase 2: 确定性计算工具层
- [x] `AtomTool<TInput, TOutput>` 接口定义完成
- [x] `ToolRegistry` 可注册、查询、调用工具
- [x] 18 个工具全部实现（T1-T18）
- [x] 每个工具 `toPromptOutput()` 输出 LLM 可读格式
- [x] 每个工具至少 2 个单元测试通过（16个测试用例全部通过）
- [x] 工具调用零 LLM 参与（纯函数验证）

## Phase 3: 工具编排层改造
- [x] schedule() 含至少 4 组预置工具组合（事业/婚姻/综合/时机）
- [x] dispatch() 一次完整查询调度 ≤ 5 个工具，全并行执行
- [x] dispatch() 单工具超时30s降级，不阻塞主流程
- [x] synthesize() 输出引用至少 2 个工具结果
- [x] synthesize() 输出三段式：判语+前提+代价+推理溯源
- [ ] 重新跑 MingLi-Bench，准确率 ≥ Phase 1 基线（需服务器部署后执行）

## Phase 4: 长期记忆
- [x] UserMemory Prisma model 已创建并迁移
- [x] consult 结束后自动更新记忆
- [x] 连续两次对话，第二次引用第一次的内容（记忆注入 System Prompt）
- [x] Timeline 至少有用户自述的 1 个事件（前端组件已创建）
- [x] 记忆不重复不冲突（上限控制：50条对话/100条事件/30条洞察）

## Phase 5: 可视化推理链
- [x] 后端 synthesize 分步输出，每步关联一个工具
- [x] 前端 ReasoningSteps 组件展示至少 3 步推理链
- [x] 用户可选"快速看结果"或"看详细推理"
- [x] 每步可折叠/展开

## Phase 6: 奇门遁甲集成
- [x] qimen-agent 可正常调用（dunjia stub 可用，@yhjs/dunjia 未安装时自动降级）
- [x] 至少 1 个 Agent prompt 包含奇门分析（时机场景自动调度 qimen）
- [x] cross_validate 升级为三方交叉验证（紫微×八字×奇门）

## Phase 7: 入口重新定位
- [x] 首页第一屏有张半山的"人格语调"文案（半山先生 + 帮你看清代价）
- [x] 入口流程从"先填表单"变成"先说问题"（首页问题输入框 + 咨询页跳过生辰）
- [x] 首页/对话/结果页张半山语感统一（17处修复：AI→半山、宗师→半山、算法→推演）
