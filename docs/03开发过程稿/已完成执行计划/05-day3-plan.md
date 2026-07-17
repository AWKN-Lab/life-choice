# Day 3 计划（2026-06-15）

> **生成日期**：2026-06-15
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\04-day2-summary.md` §四 CEO 关注点 + §五 5 项建议
> **优先级**：🔴 P0 文档纠偏 + 🟠 P1 P0 修管 + 🟡 P2 L1 落代码
> **工期**：5 天（2026-06-15 ~ 2026-06-19）
> **目标读者**：陈婷（CEO）、天火（架构 Lead）、程序员

---

## 〇、阅读路径

```
本文档 §一  ←  1 个核心修正（基于真实代码，不基于偏差文档）
        §二  ←  4 项偏差修正优先级
        §三  ←  P0 修管 3 个修复
        §四  ←  L1.1 落代码 5 天
        §五  ←  RACI + 风险
```

---

## 一、1 个核心修正（与原 line-01~04 计划的差异）

> **原 line-02 计划** = 9 模块 Pipeline + 5 层输出 + 9 节点状态机
> **Day 3 实际目标** = 修管 + 6 段输出稳定性 + 4 类用户状态

| 修正项 | 原计划 | 实际目标 | 原因 |
|--------|-------|---------|------|
| **Pipeline 模块数** | 9 模块 | **保持 4 路由（ziping/liuren/mixed/clarify）** | 文档承诺 9 模块，代码只 4 路由 |
| **输出格式** | 5 段（clauses/halfMountain/detail/cost/nextAction） | **6 段（一句话定性/判断依据/当前风险/建议动作/时间窗口/落一句）** | generation-composer.ts 第 135 行 |
| **状态机** | 9 节点 XState | **无状态机，ConsultRecord.status 字符串** | 当前实现可用，不重构 |
| **用户状态** | 6 类（含 high_risk） | **4 类（casual/genuine/repeating/validating）** | user-state-classifier.service.ts 第 4 行 |
| **意图分类** | 5 类（career/wealth/...） | **4 路由（ziping/liuren/mixed/clarify）** | intent-router.service.ts 第 3 行 |
| **L3 记忆字段** | 5 类（identity/preference/issue/feedback/timing） | **4 JSON 字段（chartHistory/consultHistory/timelineEvents/insights）** | Prisma UserMemory 模型 |

**为什么修正**：
1. 文档承诺的接口代码里没有，按文档编码会编译失败
2. 代码现状已可用 6 个月，硬重构风险大于收益
3. L1/L2/L3 文档需要先更新到"代码真相"，再谈"未来扩展"

---

## 二、4 项偏差修正优先级（Day 3 上午）

### 2.1 P0 修正清单

| # | 偏差 | 修正位置 | 工期 |
|---|------|----------|------|
| **D-COR-1** | L1 文档"5 段输出"→"6 段输出" | `engineering-handoff-L1-content.md` §三 + L1 文档 顶部勘误框已加 | 1h |
| **D-COR-2** | L1 文档"6 类用户状态"→"4 类（casual/genuine/repeating/validating）" | `engineering-handoff-L1-content.md` §四 | 1h |
| **D-COR-3** | L2 文档"9 模块"→"4 路由" + 移除 XState 依赖说明 | `engineering-handoff-L2-pipeline.md` §二 | 1h |
| **D-COR-4** | L3 文档"5 类记忆"→"4 JSON 字段" + "9 节点状态机"→"ConsultRecord.status" | `engineering-handoff-L3-memory.md` §二 + §三 | 1h |

**总工期**：4 小时（半天）

### 2.2 修正后 4 份文档应承诺的接口

| 文档 | 修正后承诺 |
|------|----------|
| L1 内容 | 6 段输出 + 4 类用户状态 + 5 类断句库（career/wealth/noble/timing/relationship）仍保留为内容设计，不强求代码分类 |
| L2 Pipeline | 4 路由 + 6 段输出 + 6 LLM Provider（minimax/doubao/deepseek/sensenova/deepseek-direct/spark，B13 已确认） |
| L3 记忆 | 4 JSON 字段 + ConsultRecord.status 状态机（4 状态：analyzing/clarify/completed/failed） |
| L4 角色 | 8 道具 + 5 色 + 3 IP 锚点（不变） |

---

## 三、P0 修管 3 个修复（Day 3 下午 ~ Day 5）

### 3.1 修管清单

| # | 修复 | 文件 | 工期 | 验收 |
|---|------|------|------|------|
| **FIX-1** | BullMQ 条件加载 | `consult/orchestrator/orchestrator.processor.module.ts` | 0.5 天 | `ENABLE_BULLMQ=false` 时不走队列 |
| **FIX-2** | asset copying | `scripts/copy-assets.sh` | 0.5 天 | 找不到源目录时 exit 1 + 提示 |
| **FIX-3** | Prisma client 同步 | `scripts/sync-prisma.sh` | 0.5 天 | 改 schema 后跑一遍自动同步 |

### 3.2 验收

```bash
# FIX-1
cd apps/AWKN-LABlife/awkn-life-backend/apps/api-server
ENABLE_BULLMQ=false npm run start:dev
# → 日志应输出 "generationQueue unavailable, fallback to sync"

# FIX-2
bash scripts/copy-assets.sh
# → 源目录不存在时 exit 1，不静默成功

# FIX-3
npx prisma generate && npx prisma db push
# → schema 改了 client 自动同步
```

### 3.3 e2e 测试（Day 6）

```typescript
// e2e/pipeline.spec.ts
test('user submits question → receives 6-section report', async ({ page }) => {
  await page.goto('/consult');
  await page.fill('[data-testid="question-input"]', '明年该不该跳槽？');
  await page.click('[data-testid="submit-btn"]');
  // 验证 6 段都出现
  await expect(page.locator('text=一句话定性')).toBeVisible();
  await expect(page.locator('text=判断依据')).toBeVisible();
  await expect(page.locator('text=当前风险')).toBeVisible();
  await expect(page.locator('text=建议动作')).toBeVisible();
  await expect(page.locator('text=时间窗口')).toBeVisible();
  await expect(page.locator('text=落一句最实在的话')).toBeVisible();
});
```

---

## 四、L1.1 落代码 5 天（Day 9~13）

### 4.1 任务卡

| 任务卡 | 名称 | 工期 | 验收 |
|--------|------|------|------|
| **L1.1.1** | 20 对话样例入代码（career 4 条） | 1.5 天 | TypeScript 模板 + 4 条数据 + 单测 |
| **L1.1.2** | 20 对话样例入代码（wealth 4 条） | 1.5 天 | 同上 |
| **L1.1.3** | 20 对话样例入代码（noble/timing/relationship 各 4 条） | 1.5 天 | 5 类全 20 条 |
| **L1.1.4** | 张半山口吻校验（halfMountain 字段） | 0.5 天 | ≥80% 通过测试集 |

**为什么不进 prompt**：D1 已拍板"入代码"（可单测、可 IDE 提示、可 Lint）

### 4.2 文件位置

```
apps/AWKN-LABlife/app/src/data/dialogueSamples/
├── 01-career.ts            (4 条)
├── 02-wealth.ts            (4 条)
├── 03-noble.ts             (4 条)
├── 04-timing.ts            (4 条)
├── 05-relationship.ts      (4 条)
├── types.ts                (DialogueSample 类型)
└── __tests__/              (vitest)
```

---

## 五、RACI + 风险

### 5.1 RACI

| 任务 | R | A | C | I |
|------|---|---|---|---|
| D-COR-1~4 文档修正 | 程序员 | CEO | 天火 | 全部 |
| FIX-1 BullMQ | 天火 | CEO | 程序员 | 全部 |
| FIX-2 asset copying | 程序员 | CEO | 天火 | 全部 |
| FIX-3 Prisma 同步 | 程序员 | CEO | 天火 | 全部 |
| L1.1.1~4 对话样例 | 程序员 | 产品 Lead | 天火 / CEO | 全部 |
| e2e 测试 | 测试 Lead | CEO | 程序员 / 天火 | 全部 |

### 5.2 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 文档修正引入新偏差 | 中 | 中 | 修正后跑通 4 个 LLM 通道，确认实际行为 |
| BullMQ 修改变更行为 | 低 | 高 | 灰度开关 `ENABLE_BULLMQ=false` 100% 兜底 |
| L1.1 20 条数据质量 | 中 | 中 | CEO + 产品 Lead 双盲审（先各评 5 条，>80% 通过再继续） |
| e2e 测试覆盖不全 | 中 | 中 | Playwright 4 个关键路径（首页/咨询/结果/会员） |

### 5.3 应急回滚

```bash
# 文档纠偏回滚：git revert
git revert <commit-hash>

# BullMQ 回滚：环境变量
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 env set ENABLE_BULLMQ true'
pm2 reload api-server
```

---

## 六、Day 3 完结交付物

- [ ] D-COR-1~4 文档修正（4 份交接文档）
- [ ] FIX-1 BullMQ 修复 + 验收
- [ ] FIX-2 asset copying 修复 + 验收
- [ ] FIX-3 Prisma 同步脚本 + 验收
- [ ] e2e 测试套件（Playwright）
- [ ] 06-day3-summary.md（Day 3 完结汇报）

---

## 七、关键文件路径

- Day 2 总结：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\04-day2-summary.md`
- 4 份交接文档：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L{1,2,3,4}-*.md`
- 探查代码：
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\orchestrator.service.ts`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\intent-router.service.ts`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\classifier\user-state-classifier.service.ts`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\generation-composer.service.ts`

---

*生成日期：2026-06-15*
*下次更新：Day 3 完结时（2026-06-15 EOD）*
