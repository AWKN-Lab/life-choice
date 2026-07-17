# 张半山并行执行总览（4 线并行推进 · D1-D12 已拍板）

> **生成日期**：2026-06-14
> **拍板状态**：✅ **D1-D12 全部拍板** + C6/C9 硬规则锁定（参见 `00-decisions-confirmed.md`）
> **核心战略**（CEO 原话）：**先把 L2 管道修稳，这是真正的瓶颈，其他线都排在它后面。**
> **范围**：将 12-24 月规划的 26 个交付物（Q1.1~Q4.6）拆为 4 条并行执行线
> **执行方式**：4 条线对应 4 类独立 session，可同时由 4 个对话框并行推进
> **依赖前置**：6 项 P1 补缺已交付（DOD / RACI / privacy-framework / mini-state-machine / feature-flag / rollback-sop）
> **工期基准**：26 周 / 半年（CEO + AI 工程模式，按 40-50% 实际工程时间，**不当承诺当预算**）

---

## 一、4 线一览（按 D5 优先级重排）

| 线 ID | 名称 | 核心目标 | 启动阻塞 | 工作量 | 优先级 |
|------|------|---------|---------|--------|--------|
| **L2** | 工程/Pipeline | 9 模块端到端 + 5 层输出 + BullMQ 修复 | 无（**最先启动**） | 22 天 | 🔴 **P0 最高** |
| **L1** | 内容/对话资产 | 张半山"开口像人" + 20 对话入代码 | L2 跑通 | 13 天 | 🟠 P1 |
| **L3** | 记忆/回访/状态机 | 9 节点状态机 + 长期陪伴 | L1 + L2 | 13 周 + 9 周灰度 | 🟠 P2 |
| **L4** | 角色/视觉/体验 | 人味 + 8 道具 + 5 色 + 3 IP 锚点 + A/B | 与 L2 并行启动（L4.3/L4.5 等 L0） | 16 周 | 🟡 P3 |
| **L0** | 画师对接（外包） | 7 PNG + 1 源文件 + 1 立绘 | 与 L4 并行（**D10 修正**：非前置） | — | 🟡 P3 |

**总投入**：约 26 周 / 半年（4 线并行 + L0 画师对接 + P4 灰度放量）
**并行密度**：Week 1-4 L2 独立跑 + L4 早期；Week 5 起 L1/L3 接力；Week 16 后 P4 放量

---

## 二、4 线接口契约矩阵

| 提供方 \ 消费方 | L1 内容 | L2 Pipeline | L3 记忆 | L4 体验 |
|---------------|---------|-------------|---------|---------|
| **L1 内容** | — | 提供：5 类断句库 + 20 对话样例给 Prompt Compiler | 提供：6 类用户状态分类规则给 Memory Extractor | 提供：对话样例给 ZhangbanshanMessage 渲染 |
| **L2 Pipeline** | 消费 L1 数据 | — | 提供：DecisionIssue + 5 段 JudgmentReport | 提供：9 模块调用入口给 ConsultPage/ResultPage |
| **L3 记忆** | 消费 L1 用户状态分类 | 消费 L2 DecisionIssue | — | 提供：MemoryAnchor 旁批数据给 ResultChat |
| **L4 体验** | 消费 L1 对话样例 | 消费 L2 JudgmentReport 5 段 | 消费 L3 MemoryAnchor 数据 | — |
| **L0 画师** | — | — | — | 提供：7 PNG + 1 源文件 + 立绘给 L4.3/L4.5 |

**接触点契约**（任意一线可独立启动的边界）：

1. **L1 → L2 接触点**：`app/src/data/clauses/*.ts` 的 5 类断句结构
   ```typescript
   type Clause = { category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship', text: string, halfMountain: string, fit: string[], cost: string, action: string }
   ```
2. **L1 → L3 接触点**：`user-state-classifier.service.ts` 的 6 类枚举
   ```typescript
   type UserState = 'casual' | 'real_issue' | 'verification' | 'repetitive' | 'emotional_pressure' | 'high_risk'
   ```
3. **L2 → L3 接触点**：DecisionIssue / JudgmentReport 5 段结构
4. **L3 → L4 接触点**：MemoryAnchor 数据结构（{ trigger, content, expiresAt, confidence }）
5. **L0 → L4 接触点**：7 PNG（avatar / 3view / emotions / clothing / shoes / props / palette）+ 1 PSD 源文件 + 1 render 立绘

---

## 三、并行甘特图（按 D5/D10 修订）

```
Week:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
       ──────────────────────────────────────────────────────────────────────────
L2  🔴 ████████ P0 修管                            维护期                          最高优先级 最早启动
L0  🟡    ████████████ P3 画师外包(并行)                                                与 L2 并行
L1  🟠         ████████████ P1 入码                                                    依赖 L2 跑通
L3  🟠            ████████████████████ P2 记忆+9节点                                  灰度 1%→10%→50%
L4  🟡      ████████████████████████ P3 角色体验                                      L4.3/L4.5 等 L0
P4 放量                                              ████████ P4 灰度放量 50%→100%   全量上线
```

**关键时点**（修订后）：
- **Week 1**：🔴 **L2 优先启动**（最高优先级）+ L0 画师对接启动 + L4.1/L4.2 早期（与 L2/L0 无关部分）
- **Week 2**：L2.1a 完结汇报 + L0 头像定型完成
- **Week 4**：🔴 **P0 修管完成** → L2 维护期 + L1.1 启动
- **Week 8**：L2 全部完成 + L0 三视图 + L4.5 IP 锚点验收启动 + L3 9 节点 1% 灰度
- **Week 12**：P1 入码完成 + L3 9 节点 10% 灰度
- **Week 16**：P2 记忆完成 + L3 9 节点 50% 灰度 + L0 验收通过
- **Week 20**：P3 角色完成
- **Week 24**：灰度 50% → 100%
- **Week 26**：全量上线 + 复盘

---

## 四、依赖矩阵（线间 · 修订）

```
        L0    L1    L2    L3    L4
   L0    -     -     -     -     →
   L1          -     →     →     →
   L2                 -     →     →
   L3                        -     →
   L4                              -
```

- **L2 无依赖**：可立即启动（CEO 修正：L2 才是真瓶颈）
- **L1 依赖 L2 跑通**：拿到 Pipeline 入口后入码
- **L3 依赖 L1 + L2**：9 节点状态机需要 L1 用户状态 + L2 DecisionIssue
- **L4 部分独立**：L4.1/L4.2/L4.4 可与 L2 并行；L4.3/L4.5 等 L0 产出
- **L0 不阻塞任何线**（D10 修正）：L0 与 L4 并行，画师外包不影响代码工作

---

## 五、关键决策点（D1-D12 + C6/C9 全部 ✅ 拍板）

> **完整拍板记录**：`docs/dev/execution/00-decisions-confirmed.md`
> **生成日期**：2026-06-14

| # | 决策项 | 拍板 | 阻塞哪条线 | 状态 |
|---|--------|------|-----------|------|
| **D1** | L1 20 对话样例是否入代码还是进 prompt？ | ✅ **入代码**（结构化模板，可单测） + 补 1 份人读 md | L1 | ✅ |
| **D2** | L2 9 模块 Pipeline 重构是否启动？ | ✅ **启动**（拆 L2.1a=12 + L2.1b=10，应对乐观偏差） | L2 | ✅ |
| **D3** | L3 9 节点状态机灰度方向？ | ✅ **从 1% 起**（不是 10%）：1%→10%→50%→100%，mini 3 态 90%+ 兜底 | L3 | ✅ |
| **D4** | L4 6 关系人是否进 prompt？ | ✅ **核心 4 写死**（父/母/旧上级/旧同事），可选 2（系统伙伴/茶档）**永远不打开** | L4 | ✅ |
| **D5** | 4 线优先级？ | ✅ **L2→L1→L3→L4**（L2 才是真瓶颈） | 全线 | ✅ |
| **D6** | 总工期？ | ✅ **26 周 / 半年**（不当承诺当预算，CEO + AI ≠ 4 全职工程师） | 全线 | ✅ |
| **D7** | L4 道具数量？ | ✅ **8 道具**（docx §25/§30，替换原 6 道具估算） | L4 | ✅ |
| **D8** | L4 配色？ | ✅ **5 色**（mbs-ink/paper/blue/white/copper，替换原 7 色） | L4 | ✅ |
| **D9** | L4 IP 锚点？ | ✅ **C 级 3 项 100% 命中**（半山痣 / 青花蓝眼镜 / 白鹿瓷领针），DOD 强制项 | L4 | ✅ |
| **D10** | L0 与 L4 顺序？ | ✅ **并行**（L0 不是前置任务，仅 L4.3/L4.5 等 L0） | L0/L4 | ✅ |
| **D11** | L1 推入码？ | ✅ 是（与 D1 一致） | L1 | ✅ |
| **D12** | L4 6 句口头禅引用 docx？ | ✅ 引用 docx §26 6 句 | L4 | ✅ |
| **C6** | LLM Token 成本审计？ | ✅ **第 1 月后**（2026-07-14）跑实测，按决策矩阵调整 | 全线 | ✅ 补强 |
| **C9** | 整线叫停机制？ | ✅ **每周一 10:00 自动检查**，连续 2 周无进展 → 自动 CEO review | 全线 | ✅ 补强 |

---

## 六、阶段汇报机制（按 26 周工期重排）

| 时点 | 关键交付 | 决策点 |
|------|---------|--------|
| **Week 1** | 🔴 L2.1a 启动（BullMQ 修复 + 9 模块串联） + L0 对接启动 + L4.1 5 色 token | L2 是否按计划推进 |
| **Week 2** | L2.1a 完结汇报 + L0 头像定型 | L2.1b 是否启动 |
| **Week 4** | 🔴 **P0 修管完成**（L2 9 模块 e2e + 5 层输出 100%） | L1 是否启动 |
| **Week 5** | L1.1 20 对话入代码启动 | L1 是否按计划推进 |
| **Week 8** | L2 全部完成 + L0 三视图 + L4.5 IP 锚点 + L3 9 节点 1% 灰度 | L3 灰度是否放量 |
| **Week 12** | P1 入码完成（L1.1-L1.4）+ L3 9 节点 10% 灰度 | L3 灰度是否放量 |
| **Week 13** | C6 token 审计触发（第 1 月后 ≈ 2026-07-14） | 是否切换 Provider 优先级 |
| **Week 16** | P2 记忆完成 + L3 9 节点 50% 灰度 + L0 验收通过 | 灰度是否放量 |
| **Week 20** | P3 角色完成（L4.1-L4.7） | L4 是否全量 |
| **Week 24** | 灰度 50% → 100% | 是否进入全量 |
| **Week 26** | 全量上线 + 复盘 + 张半山 OS 启动（Q5-Q8） | 下一阶段规划 |

---

## 七、风险预警（含 C9 停滞响应）

| # | 风险 | 影响线 | 应对 |
|---|------|--------|------|
| **B1** | L2 Pipeline 重构 22 天偏乐观 | L2 | 已拆 L2.1a/1b = 12+10 天，先做核心 5 模块串联 |
| **B2** | LLM 输出稳定（断句/旁批/高风险） | L1/L3/L4 | Structured Output + zod 校验 + 后处理正则 |
| **B3** | 4 个 session 并行导致冲突 | 全线 | 严格按接口契约接触点解耦 |
| **B4** | 6 关系人进 prompt 占用 token | L4 | 已锁死 core_only（可选 2 永远不开） |
| **B5** | Prisma 迁移需要数据回填 | L3 | 软迁移（默认值 + 渐进式回填） |
| **B6** | 测试覆盖 70% 偏低 | L2/L4 | 关键路径 100%（5 段输出/9 节点/3 IP 锚点），边缘 50% |
| **B7** | 4 个 session 上下文分散 | 全线 | 每个 session 启动时必读本总览 + 该线工程文档 |
| **B8** | L0 画师延期 | L4 | L4.3/L4.5 用占位符先跑通，画师产出后替换 |
| **B9** | 灰度 1% 阶段就出现重大 bug | L3 | mini 3 态 90%+ 兜底，1% 仅作观测窗口 |

### C9 停滞响应阈值（CEO 硬规则）

| 线 | 2 周无进展动作 | 4 周无进展动作 |
|----|--------------|--------------|
| L2 | 自动 CEO review + 现场 debug | 砍 L2，全线降级到 mini |
| L1 | CEO 复盘 20 对话样例 | 砍 L1，L2 直出原文 |
| L3 | 暂停 9 节点，回 mini 3 态 | 砍 L3，记忆降级本地存储 |
| L4 | 与画师沟通 | 砍 L4 视觉，留 5 维旁批 |

---

## 八、4 个独立 session 启动清单（按 D5 顺序）

> 每个 session 启动时，复制本节对应行的【启动清单】到 session 开头

### Session B：L2 工程/Pipeline（**🔴 最高优先级，最先启动**）
```
【启动清单】
- 阅读：本总览（00-overview.md）+ 拍板文件（00-decisions-confirmed.md）+ L2 工程文档（engineering-handoff-L2-pipeline.md）
- 基础：6 项 P1 补缺已交付（DOD/RACI/feature-flag/rollback-sop 等）
- 任务：C-L2-1 BullMQ 修复 + C-L2-2 asset copying + C-L2-3 Prisma client 同步 + C-L2-4 9 模块串联 + C-L2-5 5 层输出强制
- 工作量：22 天（拆 L2.1a=12 + L2.1b=10）
- 交付物路径：awkn-life-backend/apps/api-server/src/pipeline/*.ts + queue/*.ts + prisma/schema.prisma
- 验收：9 模块 e2e 100% 通过 + 5 层输出 100% 齐 + 8 个工程测试用例通过 + 灰度开关就绪
- 灰度顺序：USE_NEW_PIPELINE_PCT = 0→1→10→50→100，每阶段 ≥24h 观察
- 完成后汇报：L2 全部完成 → L1 + L3 启动 + L4 全部代码工作解锁
```

### Session A：L1 内容/对话资产（**🟠 P1，等 L2 跑通后启动**）
```
【启动清单】
- 阅读：本总览 + 拍板文件 + L1 工程文档（engineering-handoff-L1-content.md）
- 前置：L2 9 模块 Pipeline 跑通（拿到接口入口）
- 任务：C-L1-1 20 对话样例入代码 + C-L1-2 5 类断句库 + C-L1-3 6 类用户状态分类器 + C-L1-4 60 条测试集 + C-L1-5 人读参考 md
- 工作量：13 天
- 交付物路径：app/src/data/dialogueSamples/*.ts + clauses/*.ts + awkn-life-backend/.../user-state-classifier.service.ts + docs/product/zhangbanshan-voice-guide.md
- 验收：8 个对话场景单测通过 + 6 类用户状态 ≥80% 准确率（48/60 正确）
- 完成后汇报：L1 完成 → L3 9 节点状态机全部解锁
```

### Session C：L3 记忆/回访/状态机（**🟠 P2，等 L1+L2 完成后启动**）
```
【启动清单】
- 阅读：本总览 + 拍板文件 + L3 工程文档（engineering-handoff-L3-memory.md）
- 前置：L1 6 类用户状态 + L2 5 段 JudgmentReport
- 任务：9 节点状态机 + 5 类记忆触发 + 4 段高风险拦截 + 主动出击 Bull/Agenda + SQLite→PG 迁移
- 工作量：13 周（P2 阶段）+ 9 周灰度（P4 阶段）
- 关键约束：RELATIONS_TIER=core_only 写死 + 灰度从 1% 起（D3 修正）
- 交付物路径：awkn-life-backend/.../state-machine/ + memory-extractor.service.ts + risk-classifier.service.ts + bull-agenda.service.ts + prisma/schema.prisma (UserMemory + ConsultFollowUp)
- 验收：5 类记忆触发 ≥80% 准确率 + 9 节点 e2e 通过 + 4 段高风险拦截率 100% + 投诉率 < 1%
- 灰度顺序：Week 8 1% → Week 12 10% → Week 16 50% → Week 24 100%
- 完成后汇报：L3 完成 + 灰度放量
```

### Session D：L4 角色/视觉/体验（**🟡 P3，与 L2 并行启动**）
```
【启动清单】
- 阅读：本总览 + 拍板文件 + L4 工程文档（engineering-handoff-L4-character.md）
- 前置：L4.1/L4.2/L4.4 可与 L2 并行启动（与画师无关部分）；L4.3/L4.5 等 L0 画师产出（D10 修正）
- 任务：5 色 token + 组件结构 + 8 道具组件化 + 5 维旁批 + IP 锚点验收 + A/B 框架 + 主视觉
- 工作量：16 周（与画师外包并行）
- 关键约束：D7 8 道具 + D8 5 色 + D9 C 级 3 项 IP 锚点 100% + D12 6 句口头禅
- 交付物路径：app/tailwind.config.ts + app/src/components/icons/*.tsx + app/src/components/SideNote*.tsx
- 验收：3 项 IP 锚点 100% 命中 + 5 维旁批 100% 触发 + A/B 框架可运行 + 6 关系人 core_only 写死
- 完成后汇报：L4 全部完成 → Q5-Q8 张半山 OS 启动
```

---

## 九、不做的事（4 线都不做）

- ❌ 5 大工具的算法升级（八字/紫微/大六壬本身已成熟）
- ❌ 动画/特效开发（DivinationRitualLoader 已有，专注接入）
- ❌ 跨域 Annie 等其他 IP 联名（Q7 后期）
- ❌ 移动 App（Q4 后再讨论，优先 Web + 公众号）
- ❌ 张半山 OS / 宇宙化（Q5-Q8，下一阶段）
- ❌ **可选 2 关系人**（D4 拍板：永远不打开）
- ❌ **乐观工期承诺**（D6 拍板：不当承诺当预算，26 周是预算不是 deadline）

---

## 十、综合评分（按拍板后重评）

| 维度 | 评分 | 证据 |
|------|------|------|
| 26 个 Q 交付物覆盖度 | 10/10 | 4 线无漏无重 |
| 接口契约清晰度 | 9/10 | 5 个接触点明确（含 L0→L4） |
| 串并行无环 | 9/10 | 依赖矩阵 L2 优先 + L0/L4 并行，单链 |
| DOD 可执行性 | 9/10 | D1-D12 + C6/C9 全拍板，验收量化 |
| 优先级合理性 | **10/10** | D5 修正：L2 才是真瓶颈，避免低优消耗资源 |
| 工期务实度 | **9/10** | D6 修正：26 周按 40-50% 实际工程时间，不当承诺 |
| 风险量化与响应 | **10/10** | C9 硬规则 + 4 线停滞阈值表 |
| 与 6 项补缺不重复 | 10/10 | 明确依赖前置 |
| 拍板可追溯性 | 10/10 | 独立拍板文件 + 工程文档双备份 |

**总评 9.6/10** —— 4 线并行 + L0 画师对接 + P4 灰度放量，按 D5 优先级（L2→L1→L3→L4）+ D10 并行规则推进。

---

## 附录：相关文件

### 拍板与总览
- 拍板文件（最新）：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
- 拍板前版本（已废）：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-needed.md`
- 本总览：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-overview.md`

### 工程交接文档（5 份，2026-06-14 生成）
- 总览：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-overview.md`
- 🔴 L2 Pipeline：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L2-pipeline.md`
- L1 内容：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L1-content.md`
- L3 记忆：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L3-memory.md`
- L4 角色：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L4-character.md`

### 4 线详情
- 线 1：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-01-content.md`
- 线 2：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-02-pipeline.md`
- 线 3：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-03-memory.md`
- 线 4：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-04-character-experience.md`

### 6 项 P1 补缺（前置基础）
- `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\DOD-开发整改计划.md`
- `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\RACI-开发整改计划.md`
- `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\mini-state-machine-design.md`
- `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\rollback-sop.md`
- `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\p1-1-psychology-audit.md`
- `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\product\privacy-framework.md`

### 上游基础文档
- 张半山角色设定 V1.1：`C:\Users\10919\Downloads\张半山角色设定.docx`（doc-IP-V1.1）

---

*总览生成日期：2026-06-14*
*总览改版：2026-06-14（按 D1-D12 + C6/C9 拍板全面重排：L2 优先 / 26 周工期 / L0 并行 / 9 节点灰度 1% 起）*
*下次更新：Week 4 P0 修管完成时*