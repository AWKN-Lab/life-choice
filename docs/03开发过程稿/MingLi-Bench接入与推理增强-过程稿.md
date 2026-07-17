# MingLi-Bench接入与推理增强 — 过程稿

> 归档时间：2026-05-28
> 状态：Phase 1 + Phase 2 已完成，Phase 3 待启动

## 一、已完成工作

### Phase 1：方法学对齐
1. ✅ 截尾均值准确率实现
2. ✅ 5轮多数投票机制
3. ✅ 12分类映射与MingLi-Bench官方数据集对齐
4. ✅ 分类筛选功能
5. ✅ 紫微斗数排盘数据接入

### Phase 2：推理增强
1. ✅ 多步推理Prompt（八字分析→紫微分析→综合推理三阶段）
2. ✅ 紫微斗数数据结构化增强（四化星曜分析）
3. ✅ 答案解析增强（支持[ANSWER]X格式）
4. ✅ 依赖注入修复（BaziCalculatorWrapper、LiurenCalculator、LlmGatewayService）
5. ✅ @yhjs/dunjia依赖问题修复（创建本地stub）
6. ✅ 后端服务成功启动
7. ✅ 初步功能验证（3题样本测试通过）

### 关键代码变更
- `mingli-bench.service.ts`：多步推理Prompt + 紫微数据结构化
- `mingli-bench.module.ts`：导入CalcEngineModule
- `qimen-agent.service.ts`：条件导入dunjia-stub
- `liuren-agent.module.ts`：添加LiurenCalculator provider
- `shumiyuan.module.ts`：导入LlmGatewayModule
- `lib/dunjia-stub.ts`：新建奇门遁甲排盘stub

### 测试结果（3题样本）
- 后端服务：✅ 启动成功
- 多步推理：✅ 生效
- Token消耗：约2000-2500 completion tokens/题
- 准确率：0%（样本太小，不具统计意义）

## 二、遗留问题
1. Redis未启动（ioredis连接失败），不影响HTTP API
2. 准确率测试需扩大样本量
3. 答案提取逻辑需优化
