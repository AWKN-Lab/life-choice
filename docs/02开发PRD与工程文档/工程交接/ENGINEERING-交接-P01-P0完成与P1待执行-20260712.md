# ENGINEERING 交接｜P01 命运K线与潮汐 — P0 已完成与 P1 待执行

> 文档类型：工程交接（交接给 @程序员）
> 日期：2026-07-12
> 上游：`ENGINEERING-P01-命运K线与潮汐重构整改计划-20260712.md`（v1，744 行）
> 状态：P0 已完成 + Gate P0 验收通过；P1 待执行
> 交接对象：@程序员（awkn-工程师 v3.0）
> 严禁动作：在 P1 Gate 通过前禁止重画页面、新增潮汐维度、扩大付费范围

---

## 0. 一句话交接

P0（止住伪精确与文档漂移）8 项任务 + Gate P0 验收已通过，代码改动本地完成未部署；下一步进入 P1（统一算法真源与版本契约），严禁跳步。

---

## 1. P0 已完成事实清单

### 1.1 已修改文件与变更摘要

| ID | 文件 | 变更摘要 | 验证方式 |
|---|---|---|---|
| P0-02 | `app/src/pages/TidePage.tsx` | simulated 标签 → "演示数据"；real 标签 → "已有数据" | typecheck exit 0 |
| P0-03 | `app/src/pages/TidePage.tsx` | 删除"来源：后端 TideJudgmentService"2 处（状态判断 + 短指令区） | grep 无残留 |
| P0-04 | `app/src/utils/normalizeTidePackage.ts` | `normalizeFactorScores`/`normalizeStateProbabilities`/`normalizeWindowScores` 缺失时返回 `undefined` | typecheck exit 0 |
| P0-05 | `app/src/utils/normalizeTidePackage.ts` | meta fallback 使用 `generatedAt: ''` + `note: '数据来源未知…'`，禁止 `new Date()` | grep 验证 |
| P0-06 | `awkn-life-backend/apps/api-server/src/kline-tide/kline-tide.service.ts` | `getKlineBars` + `getStateSnapshots` 增加条件 `NODE_ENV !== 'production'` | grep 验证 |
| P0-07 | `app/src/pages/KlinePage.tsx` | "操盘证据层"→"趋势解释"；"支撑位"→"近期低位"；"压力位"→"近期高位"；4 处文案 + 3 处 structureReason 同步 | grep 无残留 |
| P0-08 | 3 处文档 | PRD、文档索引、任务 2 规划方案 添加 P0-08 注释，区分"组件 PASS"与"闭环 PASS" | Read 验证 |
| P0-09 | `.env.example` + `.env.prod.example` + `feature-flags.controller.ts` + `kline-tide.service.ts` | 5 个 KLINE_V2_* 开关 + `KLINE_SIMULATED_DATA_ALLOWED` 接线为三重门 | grep + typecheck |

### 1.2 Gate P0 验收结果

| 检查项 | 结果 | 证据 |
|---|---|---|
| 模拟数据不被误认为正式结论 | PASS | `simulated` 显示为"演示数据"+ 黄色徽章 + tip "不作为正式结论" |
| 空字段不显示 50 或当前时间 | PASS | normalize 函数返回 `undefined`；meta fallback `generatedAt: ''` |
| 页面不泄露后端类名 | PASS | grep TideJudgmentService 在 KlinePage.tsx 0 处；TidePage.tsx 仅保留代码注释（非 UI） |
| 文档不再将未验收链路标记 PASS | PASS | 3 处文档已添加组件级 vs 闭环级标注 |
| 前后端 typecheck 通过 | PASS | 后端 `npx tsc --noEmit` exit 0；前端 `npx tsc --noEmit` exit 0 |

### 1.3 已知残留（不阻断 P1，但需在 P1 处理）

| 项 | 描述 | 处理阶段 |
|---|---|---|
| TidePage.tsx 代码注释中保留 "TideJudgmentService" | 非用户可见，但 P2 重构时应清理 | P2-02 |
| `normalizeTidePackage.ts` 中 `toNumber(value, 50)` 仍在 KlineBar 维度 fallback 使用 | P0-04 只处理了 factor/prob/window 三类聚合字段；KlineBar 单维 fallback 保留 50 作为图表防崩兜底，P1 抽取计算引擎后统一改为 `null` | P1-02 |
| 生产 .env.prod 实际文件未修改 | 只修改了 .env.example 与 .env.prod.example 模板；实际部署时运维需同步 | 部署前 |
| `KlinePage.tsx` 中仍有 `压力`/`支撑` 在 `describeFactorEvidence` 等描述句中 | 这些是因子解释（factor pressure/trend），非伪金融术语；保留是合理的 | 不动 |

---

## 2. P1 待执行任务（交接核心）

### 2.1 P1 目标

同一用户、同一出生资料、同一时间范围只能生成一份可复现、可追踪的 K 线结果。

### 2.2 P1 任务清单（10 项，按整改计划 §437-450）

| ID | 任务 | 文件/模块 | 验收标准 | 优先级 | 依赖 |
|---|---|---|---|---|---|
| P1-01 | 盘点两套算法字段与因子 | `consult/generators/kline.generator.ts`, `kline-tide/kline-tide.service.ts` | 形成字段映射表与保留/删除表 | 高 | 无（可立即开始） |
| P1-02 | 抽取纯计算引擎 `KlineCalculationEngine` | 新文件 `src/kline-tide/kline-calculation.engine.ts` | 同输入重复运行结果一致；纯函数；无 LLM；无随机 | 高 | P1-01 完成 |
| P1-03 | 删除正式链路随机 seed | `KlineTideService._seedKlineBars`, `_seedStateSnapshots` | production 无随机业务分数；seed 仅在 `KLINE_SIMULATED_DATA_ALLOWED=true` 且非生产环境可用 | 高 | P1-02 完成 |
| P1-04 | 建立 Snapshot/Node/Outcome 表 | `prisma/schema.prisma` + migration | 迁移可回滚；旧数据不丢；schema 见本交接 §3 | 高 | 无（可与 P1-01 并行） |
| P1-05 | 实现唯一 `KlineDecisionService` | `src/kline-tide/kline-decision.service.ts` | 阶段、节点、行动只在后端生成；前端不再计算 | 高 | P1-02 完成 |
| P1-06 | 实现统一 `KlineProductViewModelV2` | controller + service + shared type | 页面只消费一个接口；契约见本交接 §4 | 高 | P1-05 完成 |
| P1-07 | 咨询结果归口 | `consult.service.ts` | 不再独立生成第二套正式 K 线；统一调用 snapshot | 中 | P1-04 + P1-06 完成 |
| P1-08 | 0–100 岁链路标记 legacy | `consult/generators/kline.generator.ts` + result module | v1.1 页面不再调用；保留只读 | 中 | P1-07 完成 |
| P1-09 | 建立证据 lineage | factor registry（新） | 节点可追溯到规则与输入 | 中 | P1-02 完成 |
| P1-10 | 建立黄金样例 | `apps/api-server/src/kline-tide/__tests__/golden/` | 至少 20 例；覆盖节气/大运边界；同输入同输出 | 中 | P1-02 完成 |

### 2.3 P1 执行顺序（强制）

```
P1-01 (盘点) ─┬─> P1-02 (计算引擎) ─┬─> P1-03 (删 seed)
               │                      ├─> P1-05 (DecisionService) ─> P1-06 (ViewModel) ─> P1-07 (咨询归口) ─> P1-08 (legacy)
               │                      └─> P1-09 (lineage) ─┐
               └─> P1-04 (migration，可并行) ──────────────┴─> P1-10 (黄金样例，收尾)
```

### 2.4 Gate P1（必须全部通过才能进入 P2）

- 仓库中只有一个正式 K 线生成入口
- 同一输入输出稳定，不因刷新变化
- 每个正式节点都有 snapshotId、版本、来源、证据和置信度
- LLM 关闭时数值与节点仍可完整生成
- 咨询结果页与 K 线页读取同一 snapshot
- migration、rollback、contract tests 全部通过

---

## 3. P1-04 数据表 schema（交接细节）

### 3.1 新增表（在 `prisma/schema.prisma` 中添加）

```prisma
model KlineSnapshot {
  id              String   @id @default(cuid())
  userId          String
  profileId       String?
  generatedAt     DateTime @default(now())
  dataVersion     String   @default("v1.1")
  algorithmVersion String  @default("alg-v1")
  status          String   @default("active") // active | superseded | archived
  sourceSummary   Json     // ["calculated","user_reported"]
  confidence      Float?   // 0-1
  degradedReason  String?
  supersedesId    String?  // 上一版本 snapshotId
  payload         Json     // 完整 KlineProductViewModelV2（持久化）

  @@index([userId, status])
  @@index([profileId])
}

model KlineNode {
  id              String   @id @default(cuid())
  snapshotId      String
  monthLabel      String   // "YYYY-MM"
  nodeType        String   // opportunity | risk | turn
  score           Float
  summary         String
  evidenceRefs    Json     // ["rule:solar-term-2026-10","input:birth-date"]
  confidence      Float    // 0-1
  consultRecordId String?  // 关联 ConsultRecord
  askedAt         DateTime?

  @@index([snapshotId])
  @@index([nodeType])
}

model KlineOutcome {
  id              String   @id @default(cuid())
  nodeId          String
  userId          String
  reportedAt      DateTime @default(now())
  result          String   // occurred | not_occurred | partial
  actualScore     Float?
  notes           String?
  source          String   @default("user_reported")

  @@index([nodeId])
  @@index([userId])
}
```

### 3.2 现有表变更

`KlineBar` 与 `StateSnapshot` 增加：

```prisma
snapshotId String? // 关联 KlineSnapshot；旧数据为 null
```

- 不删除旧字段、不破坏旧查询
- 所有正式查询必须按 snapshot 读取，禁止仅按 userId 取"看似最新"的混合数据
- migration 必须先 backfill：将旧数据归到 `KlineSnapshot(id='legacy', status='archived')` 下

### 3.3 migration 回滚策略

- up: 创建新表 + 添加 `snapshotId` 字段 + backfill legacy
- down: 删除新表 + 移除 `snapshotId` 字段（旧数据不受影响，因为旧数据该字段为 null）
- 备份：`cp prisma/dev.db prisma/dev.db.pre-P1-backup-YYYYMMDD`
- 验证：migration 后跑 `SELECT COUNT(*) FROM KlineBar; SELECT COUNT(*) FROM StateSnapshot;` 数量与 migration 前一致

---

## 4. P1-06 统一 ViewModel 契约（交接细节）

### 4.1 `KlineProductViewModelV2` 完整定义（前后端共享）

```typescript
// 共享类型位置：apps/AWKN-LABlife/shared-types/kline-v2.ts（新建）
export interface KlineProductViewModelV2 {
  meta: {
    snapshotId: string;
    profileId: string;
    generatedAt: string;       // ISO 8601，必须来自服务端
    dataVersion: string;        // "v1.1"
    algorithmVersion: string;   // "alg-v1"
    narrativeVersion?: string;  // LLM 叙事版本
    sourceSummary: Array<'calculated' | 'user_reported' | 'llm_narrative'>;
    confidence: number | null;  // 0-1
    degraded: boolean;
  };
  horizon: {
    from: string;               // "YYYY-MM"
    to: string;
    granularity: 'month';
  };
  current: {
    stage: 'accumulate' | 'advance' | 'turn' | 'defend' | 'unknown';
    trend: 'up' | 'sideways' | 'down' | 'unknown';
    summary: string;
    action: string;
  };
  series: {
    overall: KlinePoint[];
    career?: KlinePoint[];
    wealth?: KlinePoint[];
    relationship?: KlinePoint[];
  };
  windows: {
    opportunity: KlineNode[];
    risk: KlineNode[];
  };
  currentTide?: {
    timing: TideSignal | null;
    position: TideSignal | null;
    mindset: TideSignal | null;
  };
  entitlements: {
    canViewDomainLines: boolean;
    canViewAllNodes: boolean;
    canAskNode: boolean;
  };
  history?: {
    previousSnapshotId?: string;
    actualOutcomePending: boolean;
  };
}

export interface KlinePoint {
  monthLabel: string;           // "YYYY-MM"
  value: number;
  evidenceRefs: string[];       // 必须非空
  source: 'calculated' | 'simulated' | 'llm_inferred' | 'fallback';
  confidence: number;           // 0-1
}

export interface KlineNode {
  id: string;                    // nodeId
  snapshotId: string;
  monthLabel: string;
  nodeType: 'opportunity' | 'risk' | 'turn';
  score: number;
  summary: string;
  evidenceRefs: string[];
  confidence: number;
}

export interface TideSignal {
  label: string;
  score: number;
  evidenceRefs: string[];
}
```

### 4.2 关键约束

- 每个 `KlinePoint` 和 `KlineNode` 必须包含 `evidenceRefs`、`source`、`confidence`
- `evidenceRefs` 必须非空数组
- `source='simulated'` 时 `degraded` 必须为 `true`
- `confidence=null` 仅当 `source='fallback'` 时允许
- 前端只能消费此接口，不能再有本地业务判断

---

## 5. P1 接线点（前端/后端/共享）

### 5.1 后端新增/修改文件

| 文件 | 动作 |
|---|---|
| `src/kline-tide/kline-calculation.engine.ts` | **新建** — 纯计算引擎 |
| `src/kline-tide/kline-decision.service.ts` | 升级为唯一产品判断服务 |
| `src/kline-tide/kline-tide.service.ts` | 收缩为查询/持久化/聚合；删除正式随机 seed |
| `src/kline-tide/kline-v2.controller.ts` | **新建** — 暴露 `GET /api/v1/kline-v2` |
| `src/consult/generators/kline.generator.ts` | 抽取确定性计算核；停止第二套正式输出 |
| `src/consult/consult.service.ts` | 统一读取 snapshot |
| `prisma/schema.prisma` | 添加 Snapshot/Node/Outcome |
| `prisma/migrations/YYYYMMDDHHMMSS_p1_kline_v2/` | **新建** migration |

### 5.2 前端修改文件

| 文件 | 动作 |
|---|---|
| `app/src/services/klineTideApi.ts` | 改为消费 `KlineProductViewModelV2` |
| `app/src/hooks/useTidePackage.ts` | 合并到 `useKlineProduct`，统一加载/降级/权限 |
| `app/src/pages/KlinePage.tsx` | 删除本地业务计算；只渲染 ViewModel |
| `app/src/pages/TidePage.tsx` | P1 阶段保留现状；P2 阶段并入 K 线 |

### 5.3 共享类型

| 文件 | 动作 |
|---|---|
| `apps/AWKN-LABlife/shared-types/kline-v2.ts` | **新建** — 前后端共享类型 |

---

## 6. 测试要求

### 6.1 单元测试（P1-10 黄金样例）

- 位置：`apps/api-server/src/kline-tide/__tests__/golden/`
- 至少 20 例，覆盖：
  - 节气交接（立春、春分、夏至、立秋、冬至）
  - 大运交接（10/20/30/40/50/60 岁）
  - 流年交接（年初、年末）
  - 出生时辰不确定（早子、晚子、夏令时）
  - 资料缺失（仅年、仅年月）
- 验收：同输入同输出，hash 一致

### 6.2 契约测试

- 前后端共享 `KlineProductViewModelV2`
- nullable 字段、枚举、版本字段严格一致
- 老客户端读取 legacy 响应得到明确升级提示

### 6.3 E2E 测试（P1 阶段最小集）

1. 用户生成 K 线 → 返回 snapshotId → 重新生成 → snapshotId 不变或 supersedesId 链完整
2. 关闭 LLM（`LLM_DISABLED=true`）→ 数值与节点仍完整生成
3. K 线页与咨询结果页读取同一 snapshotId

---

## 7. 回滚策略

### 7.1 代码回滚

- Git 基线：`7edddc72 chore(wip): pre-P0 baseline backup 20260712`（P0 改动前）
- P0 改动 commit：待提交（建议 message：`feat(kline): P0 stop fake precision - source labels, no fill 50, no client time, simulated isolation`）
- P1 改动应独立分支：`feature/p1-kline-v2`

### 7.2 数据库回滚

- migration 必须提供 down 脚本
- 部署前备份：`cp prod.db prod.db.pre-P1-backup-YYYYMMDD`
- 失败时：`npx prisma migrate resolve --rolled-back <migration_name>` + 恢复备份

### 7.3 功能回滚

- `KLINE_V2_ENABLED=false` 即可关闭 V2 链路，回退到旧 KlinePage
- `KLINE_SIMULATED_DATA_ALLOWED=false` 强制关闭模拟数据

---

## 8. 严禁动作清单（继承自整改计划 §0.3）

在 P1 Gate 通过前，禁止：

- 新增潮汐维度、雷达图、均线、命理因子卡
- 把模拟数据包装为"真实数据"或"完整预测"
- 再建一套 K 线页面、海报或独立潮汐入口
- 用 LLM 生成数值后把它视为算法事实
- 在没有版本、来源和证据链的情况下扩大付费范围
- 重画页面（P2 才允许）
- 修改生产 .env.prod（只改 .env.example 和 .env.prod.example）

---

## 9. 完成定义（P1 Gate）

只有以下条件全部满足，P1 才能标记完成：

- [ ] 仓库中只有一个正式 K 线生成入口
- [ ] 同一输入输出稳定，不因刷新变化
- [ ] 每个正式节点都有 snapshotId、版本、来源、证据和置信度
- [ ] LLM 关闭时数值与节点仍可完整生成
- [ ] 咨询结果页与 K 线页读取同一 snapshot
- [ ] migration、rollback、contract tests 全部通过
- [ ] 至少 20 例黄金样例通过
- [ ] 前后端 typecheck + build 通过

---

## 10. 紧急联系方式

- 上游文档：`docs/02开发PRD与工程文档/工程交接/ENGINEERING-P01-命运K线与潮汐重构整改计划-20260712.md`
- PRD：`docs/01产品定位与PRD/需求文档/PRD-命运K线V2升级-2026-06-24.md`
- P0 已完成清单：本文件 §1
- P1 任务清单：本文件 §2
- 数据表 schema：本文件 §3
- ViewModel 契约：本文件 §4

---

## 11. 交接结论

- P0 已完成并验收通过，可提交 commit
- P1 可立即开始，建议从 P1-01（盘点两套算法字段）+ P1-04（migration）并行启动
- P1 预计 3-5 天，建议分 3 个最小闭环：
  1. 闭环 A：P1-01 + P1-02 + P1-03（计算引擎）
  2. 闭环 B：P1-04 + P1-09（数据表 + lineage）
  3. 闭环 C：P1-05 + P1-06 + P1-07 + P1-08（决策服务 + ViewModel + 归口）
- P1-10（黄金样例）作为收尾验收
