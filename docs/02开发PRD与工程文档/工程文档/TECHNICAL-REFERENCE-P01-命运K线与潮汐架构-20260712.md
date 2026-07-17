# TECHNICAL REFERENCE｜P01 命运K线与潮汐 — 架构与技术参考

> 文档类型：工程文档（技术参考，长期参考）
> 日期：2026-07-12
> 上游：`ENGINEERING-P01-命运K线与潮汐重构整改计划-20260712.md`（v1，744 行）
> 同期：`ENGINEERING-交接-P01-P0完成与P1待执行-20260712.md`（交接给 @程序员）
> 状态：长期参考文档，P1-P4 实施期间持续更新
> 适用范围：`apps/AWKN-LABlife/app`、`apps/AWKN-LABlife/awkn-life-backend`

---

## 0. 文档定位

本文档是 P01 命运K线与潮汐模块的**技术参考**，覆盖架构、契约、数据模型、迁移、回滚、测试、灰度发布、算法治理等长期参考内容。

不包含：
- 交接内容（变更清单、阻塞项、待执行任务）→ 见同期交接文档
- 执行内容（具体 PR 计划、修复步骤、质检清单）→ 见整改计划 §5
- 产品需求 → 见 PRD-命运K线V2升级

---

## 1. 目标架构

### 1.1 架构原则

| 原则 | 含义 |
|---|---|
| 单一真源 | 同一用户、同一出生资料、同一时间范围只能生成一份可复现 K 线 |
| 算法与叙事分离 | 算法生成数值与节点；LLM 只生成解释文字，不可改数值 |
| 版本化与可追溯 | 每个快照、节点、结果都有 ID、版本、来源、证据、置信度 |
| 缺失即缺失 | 缺失数据返回 `null`，禁止补 50、补当前时间、补默认值 |
| 模拟与正式隔离 | simulated 数据不进入生产正式结果、历史或付费链路 |
| 前端只渲染 | 前端不再做业务判断，只消费统一 ViewModel |

### 1.2 目标链路

```text
出生资料 / 已确认命盘 / 大运流年
            +
  用户真实事件与状态
            |
            v
  KlineCalculationEngine          ← 纯计算，确定性，无 LLM，无随机
  确定性规则与数值计算
            |
            v
  KlineSnapshotService            ← 版本、来源、证据、持久化
            |
            v
  KlineDecisionService            ← 阶段、窗口、节点、行动偏向
            |
   +----------+----------+
   |                     |
   v                     v
KlineProductViewModelV2   LLM Narrative
前端唯一契约              只解释，不改数值
```

### 1.3 服务边界

| 服务 | 职责 | 不允许做 |
|---|---|---|
| `KlineCalculationEngine` | 纯计算；输入→输出确定性映射 | 调用 LLM；生成随机数；访问 DB |
| `KlineSnapshotService` | 快照创建、查询、版本管理、持久化 | 生成数值；做业务判断 |
| `KlineDecisionService` | 阶段、窗口、节点、行动偏向的唯一生成者 | 生成数值；调用 LLM |
| `KlineTideService` | 收缩为查询、持久化、聚合 | 正式链路随机 seed；生成业务结论 |
| `ConsultService` | 咨询编排；统一读取 snapshot | 独立生成第二套正式 K 线 |
| `TideInferenceService` | currentTide 推断层 | 生成 K 线主数值 |
| LLM Providers | 叙事生成；只解释，不改数值 | 修改 score、date、source、evidenceRefs |

### 1.4 LLM 边界

**LLM 可以**：
- 把结构化证据转写为接近真人顾问的自然语言
- 根据用户问题选择重点节点
- 生成行动建议的表达和追问

**LLM 不可以**：
- 修改算法分数、时间节点和来源
- 生成没有证据的"真实状态"
- 用自然语言掩盖缺失数据
- 将模拟结果升级为正式结果

---

## 2. 数据模型

### 2.1 实体关系图

```text
KlineSnapshot (1) ──── (N) KlineNode
     │                       │
     │                       │
     (1)                     (1)
     │                       │
     │                     (N)
     │                       │
     v                       v
KlineBar (N)           KlineOutcome (N)
StateSnapshot (N)           │
                            │
                          (1)
                            │
                            v
                      ConsultRecord (1)
```

### 2.2 KlineSnapshot（新增）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String | @id @default(cuid()) | 主键 |
| userId | String | required | 用户 ID |
| profileId | String? | optional | 八字档案 ID |
| generatedAt | DateTime | @default(now()) | 服务端生成时间 |
| dataVersion | String | @default("v1.1") | 数据版本 |
| algorithmVersion | String | @default("alg-v1") | 算法版本 |
| status | String | @default("active") | active \| superseded \| archived |
| sourceSummary | Json | required | ["calculated","user_reported"] |
| confidence | Float? | optional | 0-1 |
| degradedReason | String? | optional | 降级原因 |
| supersedesId | String? | optional | 上一版本 snapshotId |
| payload | Json | required | 完整 KlineProductViewModelV2 |

索引：`@@index([userId, status])`、`@@index([profileId])`

### 2.3 KlineNode（新增）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String | @id @default(cuid()) | 主键 |
| snapshotId | String | required, FK | 关联 KlineSnapshot |
| monthLabel | String | required | "YYYY-MM" |
| nodeType | String | required | opportunity \| risk \| turn |
| score | Float | required | 节点分数 |
| summary | String | required | 节点摘要 |
| evidenceRefs | Json | required | ["rule:solar-term-2026-10","input:birth-date"] |
| confidence | Float | required | 0-1 |
| consultRecordId | String? | optional | 关联 ConsultRecord |
| askedAt | DateTime? | optional | 首次问事时间 |

索引：`@@index([snapshotId])`、`@@index([nodeType])`

### 2.4 KlineOutcome（新增）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | String | @id @default(cuid()) | 主键 |
| nodeId | String | required, FK | 关联 KlineNode |
| userId | String | required | 用户 ID |
| reportedAt | DateTime | @default(now()) | 用户回写时间 |
| result | String | required | occurred \| not_occurred \| partial |
| actualScore | Float? | optional | 实际分数 |
| notes | String? | optional | 用户备注 |
| source | String | @default("user_reported") | 来源 |

索引：`@@index([nodeId])`、`@@index([userId])`

### 2.5 KlineBar（现有，增加字段）

| 新增字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| snapshotId | String? | optional | 关联 KlineSnapshot；旧数据为 null |

### 2.6 StateSnapshot（现有，增加字段）

| 新增字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| snapshotId | String? | optional | 关联 KlineSnapshot；旧数据为 null |

### 2.7 数据来源标识（KlineDataSource）

```typescript
type KlineDataSource =
  | 'calculated'        // 基于已确认出生资料和确定性规则计算
  | 'user_reported'     // 用户主动填写的真实事件或状态
  | 'llm_narrative'     // LLM 基于证据包生成的解释文字
  | 'simulated'         // 开发或演示模拟，不进入正式结果
  | 'fallback'          // 降级数据
  | 'unknown';          // 无法确认来源，禁止包装成正式结论
```

旧 `real` 标签在新版本中映射为 `calculated`；旧 `llm_inferred` 映射为 `llm_narrative`。

---

## 3. API 契约

### 3.1 KlineProductViewModelV2（前后端共享）

```typescript
// 位置：apps/AWKN-LABlife/shared-types/kline-v2.ts（新建）
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
  source: KlineDataSource;
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

### 3.2 关键约束

- 每个 `KlinePoint` 和 `KlineNode` 必须包含 `evidenceRefs`、`source`、`confidence`
- `evidenceRefs` 必须非空数组
- `source='simulated'` 时 `degraded` 必须为 `true`
- `confidence=null` 仅当 `source='fallback'` 时允许
- 前端只能消费此接口，不能再有本地业务判断

### 3.3 API 端点（P1 新增）

| Method | Path | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/v1/kline-v2` | 获取当前用户最新 KlineProductViewModelV2 | JWT |
| POST | `/api/v1/kline-v2/generate` | 触发生成新 snapshot | JWT + 会员校验 |
| GET | `/api/v1/kline-v2/snapshots/:snapshotId` | 获取指定 snapshot | JWT |
| GET | `/api/v1/kline-v2/snapshots` | 列出用户所有 snapshot | JWT |
| POST | `/api/v1/kline-v2/nodes/:nodeId/ask` | 节点问事 | JWT + 积分校验 |
| POST | `/api/v1/kline-v2/nodes/:nodeId/outcome` | 回写节点结果 | JWT |
| GET | `/api/v1/kline-v2/share/:token` | 公开分享预览 | 无（脱敏） |

### 3.4 旧 API 兼容

- `GET /api/v1/kline-tide/*` 保留 14 天只读
- 旧客户端访问时返回 `X-Deprecation: kline-v1-deprecated` header
- 新前端默认调用 `/api/v1/kline-v2`

---

## 4. Migration 策略

### 4.1 原则

- Snapshot 与旧表并行迁移，不原地覆盖历史
- migration 必须提供 down 脚本
- 部署前必须备份 SQLite
- 失败时只回退到"已有正式 snapshot"，不得回退模拟数据

### 4.2 Migration 步骤

```sql
-- Step 1: 创建新表
CREATE TABLE "KlineSnapshot" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT,
  "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataVersion" TEXT NOT NULL DEFAULT 'v1.1',
  "algorithmVersion" TEXT NOT NULL DEFAULT 'alg-v1',
  "status" TEXT NOT NULL DEFAULT 'active',
  "sourceSummary" TEXT NOT NULL,
  "confidence" REAL,
  "degradedReason" TEXT,
  "supersedesId" TEXT,
  "payload" TEXT NOT NULL
);
CREATE INDEX "KlineSnapshot_userId_status_idx" ON "KlineSnapshot"("userId", "status");
CREATE INDEX "KlineSnapshot_profileId_idx" ON "KlineSnapshot"("profileId");

CREATE TABLE "KlineNode" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "monthLabel" TEXT NOT NULL,
  "nodeType" TEXT NOT NULL,
  "score" REAL NOT NULL,
  "summary" TEXT NOT NULL,
  "evidenceRefs" TEXT NOT NULL,
  "confidence" REAL NOT NULL,
  "consultRecordId" TEXT,
  "askedAt" DATETIME
);
CREATE INDEX "KlineNode_snapshotId_idx" ON "KlineNode"("snapshotId");
CREATE INDEX "KlineNode_nodeType_idx" ON "KlineNode"("nodeType");

CREATE TABLE "KlineOutcome" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "nodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "result" TEXT NOT NULL,
  "actualScore" REAL,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'user_reported'
);
CREATE INDEX "KlineOutcome_nodeId_idx" ON "KlineOutcome"("nodeId");
CREATE INDEX "KlineOutcome_userId_idx" ON "KlineOutcome"("userId");

-- Step 2: 为现有表添加 snapshotId 字段
ALTER TABLE "KlineBar" ADD COLUMN "snapshotId" TEXT;
ALTER TABLE "StateSnapshot" ADD COLUMN "snapshotId" TEXT;

-- Step 3: Backfill legacy
INSERT INTO "KlineSnapshot" ("id", "userId", "generatedAt", "dataVersion", "algorithmVersion", "status", "sourceSummary", "confidence", "payload")
SELECT
  'legacy-' || "userId",
  "userId",
  COALESCE(MAX("createdAt"), '2026-01-01'),
  'v1.0',
  'legacy',
  'archived',
  '["unknown"]',
  NULL,
  '{}'
FROM "KlineBar"
GROUP BY "userId";

-- Step 4: 关联旧数据到 legacy snapshot
UPDATE "KlineBar" SET "snapshotId" = 'legacy-' || "userId" WHERE "snapshotId" IS NULL;
UPDATE "StateSnapshot" SET "snapshotId" = 'legacy-' || "userId" WHERE "snapshotId" IS NULL;
```

### 4.3 回滚脚本

```sql
-- Down migration
DROP TABLE "KlineOutcome";
DROP TABLE "KlineNode";
DROP TABLE "KlineSnapshot";
-- SQLite 不支持 DROP COLUMN，需要重建表
-- 备份后使用 pragma legacy_alter_table=ON 重建
```

### 4.4 备份命令

```bash
# 部署前备份
cp prisma/dev.db prisma/dev.db.pre-P1-backup-$(date +%Y%m%d%H%M%S)
# 生产环境
ssh user@server 'cp /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db /opt/awkn-life/backups/prod.db.pre-P1-$(date +%Y%m%d%H%M%S)'
```

### 4.5 验证 SQL

```sql
-- migration 前后行数一致
SELECT 'KlineBar' as tbl, COUNT(*) FROM "KlineBar"
UNION ALL
SELECT 'StateSnapshot', COUNT(*) FROM "StateSnapshot";

-- snapshotId 已 backfill
SELECT COUNT(*) FROM "KlineBar" WHERE "snapshotId" IS NULL;  -- 应为 0
SELECT COUNT(*) FROM "StateSnapshot" WHERE "snapshotId" IS NULL;  -- 应为 0

-- legacy snapshot 已创建
SELECT COUNT(*) FROM "KlineSnapshot" WHERE "status" = 'archived';  -- 应等于旧用户数
```

---

## 5. 测试矩阵

### 5.1 单元测试

| 测试项 | 验证点 |
|---|---|
| KlineCalculationEngine 确定性 | 同输入同输出，hash 一致 |
| 空数据处理 | 空数据不变成 50、当前时间或默认"恢复期" |
| 模拟数据隔离 | simulated 数据在 production 被拒绝 |
| 领域线独立性 | 事业、财富、关系分别由不同因子集生成 |
| LLM 不可覆盖 | LLM 不可覆盖 score、date、source、evidenceRefs |

### 5.2 契约测试

| 测试项 | 验证点 |
|---|---|
| 前后端类型共享 | 共享 `KlineProductViewModelV2` |
| nullable 字段 | nullable 字段、枚举、版本字段严格一致 |
| 老客户端兼容 | 老客户端读取 legacy 响应得到明确升级提示 |
| 权限响应 | 区分未登录、无权益、服务降级、数据不足 |

### 5.3 E2E 测试

| # | 场景 | 验证点 |
|---|---|---|
| 1 | 未登录打开分享链接 | 看到脱敏摘要 → 登录 → 生成正式 K 线 |
| 2 | 免费用户生成 | 看总势与一个节点 → 点击会员内容 → 权益提示正确 |
| 3 | 管理员余额不足 | 自动补测试积分 → 真实扣除 → 打开完整内容 |
| 4 | 点击机会节点 | 对话自动带入 → 提交 → 生成 ConsultRecord → 结果引用节点 |
| 5 | 节点后回访 | 用户填写结果 → 后台可查 |
| 6 | LLM 超时 | 保留算法结果 → 允许局部重试 → 不刷新整页、不重复扣费 |
| 7 | 多端多主题 | 浅色/深色、手机/桌面、中英泰三语言验收 |

### 5.4 黄金样例（P1-10）

- 位置：`apps/api-server/src/kline-tide/__tests__/golden/`
- 数量：至少 20 例
- 覆盖：
  - 节气交接（立春、春分、夏至、立秋、冬至）
  - 大运交接（10/20/30/40/50/60 岁）
  - 流年交接（年初、年末）
  - 出生时辰不确定（早子、晚子、夏令时）
  - 资料缺失（仅年、仅年月）
- 验收：同输入同输出，hash 一致

### 5.5 生产验收

- `https://awkn.cn/` 根主页不受影响
- `https://awkn.cn/life/` 三入口保持：命运 K 线、取名、问事
- `/life/kline` 与 `/life/tide` 归口一致
- API health、PM2、Nginx、SQLite integrity 正常
- 数据迁移前后用户、咨询、积分和历史数量一致
- 生产无 seed 写入、无模拟正式记录、无客户端伪造时间

---

## 6. 灰度发布策略

### 6.1 功能开关

```env
# P0-09 (2026-07-12): K线V2 功能开关
KLINE_V2_ENABLED=false                    # 总开关
KLINE_V2_PUBLIC_PREVIEW_ENABLED=false     # 公开预览
KLINE_V2_NODE_ASK_ENABLED=false           # 节点问事
KLINE_V2_OUTCOME_ENABLED=false            # 结果回看
KLINE_SIMULATED_DATA_ALLOWED=false         # 模拟数据（生产必须 false）
```

### 6.2 灰度顺序

| 阶段 | 范围 | 启用开关 | 持续时间 |
|---|---|---|---|
| 1 | 管理员账号 + 内部测试用户 | `KLINE_V2_ENABLED=true` | 1-2 天 |
| 2 | 5% 已登录用户，只读生成 | 同上 | 2-3 天 |
| 3 | 20% 用户，开放节点问事 | + `KLINE_V2_NODE_ASK_ENABLED=true` | 3-5 天 |
| 4 | 50% 用户，开放分享与历史 | + `KLINE_V2_OUTCOME_ENABLED=true` + `KLINE_V2_PUBLIC_PREVIEW_ENABLED=true` | 5-7 天 |
| 5 | 全量 | 旧链路只读保留 14 天后下线 | 14 天 |

### 6.3 回滚原则

- Snapshot 与旧表并行迁移，不原地覆盖历史
- 前端可通过 `KLINE_V2_ENABLED=false` 回退旧 Kline 页面
- 新接口失败时只回退到"已有正式 snapshot"，不得回退模拟数据
- 数据库 migration 必须提供 down/人工回滚脚本和备份验证
- 部署只更新 `/life` 子站和对应后端，不修改 `awkn.cn/` 根主页

---

## 7. 算法治理（P4）

### 7.1 因子字典

每个因子必须记录：

| 字段 | 说明 |
|---|---|
| id | 因子唯一标识 |
| name | 因子名称 |
| definition | 定义 |
| source | 来源（八字 / 大运 / 流年 / 流月 / 用户事实） |
| scope | 适用范围 |
| version | 因子版本 |
| weight | 权重 |
| evidenceTemplate | 证据模板 |

### 7.2 算法版本管理

- 算法版本号：`alg-v1`、`alg-v2`...
- 版本升级时：
  - 旧 snapshot 保留原版本
  - 新 snapshot 使用新版本
  - 不静默覆盖历史记录
  - 必须能对旧 snapshot 回放新算法，对比差异

### 7.3 LLM 叙事评测

| 维度 | 评分标准 |
|---|---|
| 忠于证据 | 0-10，10=完全忠于证据包 |
| 自然度 | 0-10，10=接近真人顾问 |
| 行动性 | 0-10，10=给出明确可执行建议 |
| 禁忌项 | 0-10，10=无任何禁忌项（承诺、医疗、法律等） |

---

## 8. 经营指标与埋点

### 8.1 北极星

命运 K 线最终服务于：**完成有效咨询并在 7 天内回访的用户数**。

### 8.2 必须埋点

```text
kline_entry_viewed
kline_generation_started
kline_generation_succeeded
kline_generation_failed
kline_first_screen_understood
kline_domain_switched
kline_node_opened
kline_node_ask_clicked
kline_node_consult_created
kline_member_unlock_viewed
kline_member_unlocked
kline_share_created
kline_share_opened
kline_history_opened
kline_outcome_submitted
kline_revisit_completed
```

每个事件至少携带：`userId/anonymousId`、`snapshotId`、`algorithmVersion`、`sourceSummary`、`entitlement`、`lang`。

### 8.3 上线后观察指标

| 指标 | 含义 |
|---|---|
| 生成成功率 | 技术可用性 |
| 首屏到节点展开率 | 用户是否看懂并感兴趣 |
| 节点到问事转化率 | K 线是否带来高价值行为 |
| 免费到会员转化率 | 付费分层是否成立 |
| 分享生成率/打开率 | 是否具备传播价值 |
| 7 日回访率 | 是否成为长期产品 |
| 结果回写率 | 是否沉淀可校准的数据资产 |

---

## 9. 关键文件清单

### 9.1 后端

| 文件 | 职责 |
|---|---|
| `src/kline-tide/kline-calculation.engine.ts` | 纯计算引擎（新建） |
| `src/kline-tide/kline-decision.service.ts` | 唯一产品判断服务 |
| `src/kline-tide/kline-tide.service.ts` | 收缩为查询/持久化/聚合 |
| `src/kline-tide/kline-v2.controller.ts` | V2 API 控制器（新建） |
| `src/kline-tide/kline-scoring.service.ts` | 版本化因子计算 |
| `src/consult/generators/kline.generator.ts` | 抽取确定性计算核；停止第二套正式输出 |
| `src/consult/consult.service.ts` | 统一读取 snapshot |
| `src/consult/orchestrator/*` | 只消费结构化证据 |
| `src/consult/dto/index.ts` | 增加 snapshotId、nodeId |
| `src/tide-inference/*` | currentTide 推断层 |
| `src/feature-flags/feature-flags.controller.ts` | K线V2 开关 |
| `prisma/schema.prisma` | 新增 Snapshot/Node/Outcome |

### 9.2 前端

| 文件 | 职责 |
|---|---|
| `app/src/pages/KlinePage.tsx` | 只渲染 ViewModel，删除本地业务计算 |
| `app/src/pages/TidePage.tsx` | P2 阶段并入 K 线 |
| `app/src/utils/normalizeTidePackage.ts` | 已完成 P0-04/05；P1 后可能废弃 |
| `app/src/services/klineTideApi.ts` | 改为消费 V2 ViewModel |
| `app/src/hooks/useTidePackage.ts` | 合并到 `useKlineProduct` |
| `app/src/components/kline/KlineChart.tsx` | 去掉无依据 OHLC/成交量语义 |
| `app/src/components/kline/KlineShareCard.tsx` | 唯一分享实现 |
| `app/src/components/frontdesk/FrontdeskChat.tsx` | nodeId、snapshotId、targetDate |
| `app/src/App.tsx` | `/tide` 兼容跳转 + 公开分享路由 |

### 9.3 共享

| 文件 | 职责 |
|---|---|
| `apps/AWKN-LABlife/shared-types/kline-v2.ts` | 前后端共享类型（新建） |

---

## 10. 完成定义（DoD）

只有以下条件全部满足，P01 才能标记完成：

- [ ] 普通用户五秒内理解阶段、趋势、机会、风险和行动
- [ ] K 线与潮汐是一个产品，不再有两个重复心智入口
- [ ] 后端只有一个正式 K 线计算入口
- [ ] 前端不生成业务结论和默认业务数值
- [ ] 每个节点都有版本、来源、证据、置信度和持久化 ID
- [ ] simulated 数据不能进入生产正式结果、历史或付费链路
- [ ] 36 个月曲线在 K 线页、咨询结果和历史页一致
- [ ] 点击节点可生成真实问事记录，并能回到原节点
- [ ] 未登录分享访问者能看到脱敏预览
- [ ] 免费/会员差异围绕解释、推演和回看，不围绕随机指标数量
- [ ] 只有一个分享实现，分享打开和后续转化可统计
- [ ] 用户可回写实际结果，管理员可查看完整资产链
- [ ] LLM 超时不刷新整页、不重复扣费、不破坏算法结果
- [ ] 关键 E2E、迁移、回滚、浅深主题、移动端和多语言全部通过
- [ ] PRD、文档索引、验收报告与当前代码状态一致

---

## 11. 版本历史

| 版本 | 日期 | 修改内容 |
|---|---|---|
| v1.0 | 2026-07-12 | 初始版本，覆盖架构、数据模型、API 契约、迁移、测试、灰度、算法治理、埋点、文件清单、DoD |
