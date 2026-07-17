# PRD：MingLi-Bench准确率提升与Sub-Agent架构

> 版本：v0.1
> 日期：2026-05-28
> 来源：从 mingli-bench-absorption-plan.md、tianfu-benchmark-improvement-plan.md、mingli-bench-engineering-doc.md 中提取的未完成任务

## 一、产品定位
面向MingLi-Bench命理基准测试，通过Sub-Agent架构和推理增强，将截尾均值准确率提升至可竞争水平。

## 二、MVP功能清单

### P0（必须完成）
1. **30题样本准确率对比测试**：运行基准测试（无CoT）vs 增强测试（有CoT），记录准确率差异
2. **答案提取逻辑优化**：确保[ANSWER]X格式稳定提取，增加fallback机制
3. **5轮投票完整测试**：验证多数投票机制降低方差的效果

### P1（应该完成）
4. **Sub-Agent架构实现**：拆分为八字Agent、紫微Agent、综合推理Agent，独立调用
5. **紫微斗数排盘精度提升**：接入更完整的紫微斗数计算库
6. **分类维度分析**：按12分类统计准确率，找出弱项

### P2（可以延后）
7. **Tianfu Agent对标**：分析Tianfu Agent的Sub-Agent结构并借鉴
8. **Prompt A/B测试框架**：支持不同Prompt策略的自动对比
9. **MingLi-Bench官方提交**：达到可提交排名的准确率

## 三、不做清单
1. 不做MingLi-Bench数据集的修改或泄露
2. 不做非命理领域的泛化测试
3. 不做前端UI的基准测试展示页面
4. 不做实时推理流式输出
5. 不做模型微调

## 四、验收用例
1. 运行30题测试，输出完整准确率报告
2. 对比基准vs增强的准确率差异 ≥ 5%
3. 5轮投票后方差降低 ≥ 30%
4. 答案提取成功率 ≥ 95%
5. 每题推理耗时 ≤ 30秒

## 五、约束
- 不修改MingLi-Bench官方数据集
- LLM Provider使用sensenova默认配置
- 后端服务需先解决Redis依赖
