# 授权清单｜P01 命运K线与潮汐 — P1-P4 全部未完成开发任务

> 日期：2026-07-12
> 状态：待用户确认
> 执行模式：工程文档连续执行模式（不间断）
> 依据：`ENGINEERING-交接-P01-P0完成与P1待执行-20260712.md` + `TECHNICAL-REFERENCE-P01-命运K线与潮汐架构-20260712.md` + `ENGINEERING-P01-命运K线与潮汐重构整改计划-20260712.md`

---

## 0. 总览

| 项 | 内容 |
|---|---|
| 总目标 | 完成 P01 整改计划中 P1-P4 全部未完成开发任务 |
| 当前基线 | P0 已完成 8 项 + Gate P0 验收通过（typecheck exit 0）；P0 改动本地未 commit |
| 工作区状态 | 6 个文件已修改（P0 改动）+ 多个新增文档；dev.db 存在 |
| 执行环境 | 本地开发环境（Windows + SQLite dev.db） |
| 预计执行单元 | 约 30-40 个 10 分钟单元 |

---

## 1. 现状核查结果

### 1.1 已完成（P0，8 项）

| ID | 文件 | 状态 |
|---|---|---|
| P0-02 | TidePage.tsx | ✅ simulated→演示数据、real→已有数据 |
| P0-03 | TidePage.tsx | ✅ 删除 2 处"TideJudgmentService"UI 文案 |
| P0-04 | normalizeTidePackage.ts | ✅ 3 个 normalize 函数返回 undefined |
| P0-05 | normalizeTidePackage.ts | ✅ meta fallback 使用 generatedAt: '' |
| P0-06 | kline-tide.service.ts | ✅ NODE_ENV !== 'production' 条件 |
| P0-07 | KlinePage.tsx | ✅ 4 处伪金融术语降级 |
| P0-08 | 3 处文档 | ✅ 组件PASS vs 闭环PASS 标注 |
| P0-09 | .env.example + .env.prod.example + feature-flags.controller.ts + kline-tide.service.ts | ✅ 5 个 KLINE_V2_* 开关 + KLINE_SIMULATED_DATA_ALLOWED |

### 1.2 未开始（P1-P4，36 项）

#### P1（10 项）— 统一算法真源与版本契约
- P1-01 盘点两套算法字段
- P1-02 抽取纯计算引擎 KlineCalculationEngine
- P1-03 删除正式链路随机 seed
- P1-04 建立 Snapshot/Node/Outcome 表
- P1-05 实现唯一 KlineDecisionService
- P1-06 实现统一 KlineProductViewModelV2
- P1-07 咨询结果归口
- P1-08 0–100 岁链路标记 legacy
- P1-09 建立证据 lineage
- P1-10 建立黄金样例

#### P2（10 项）— 重写用户首屏与节点问事
- P2-01 重构 KlinePage 信息架构
- P2-02 潮汐并入 K 线
- P2-03 只保留四条主线
- P2-04 统一节点卡
- P2-05 完成节点问事链路
- P2-06 结果返回原节点
- P2-07 重做权限弱态
- P2-08 修复主题与响应式
- P2-09 删除前端业务计算
- P2-10 可访问性与文案

#### P3（8 项）— 分享、历史与经营闭环
- P3-01 归并三个海报实现
- P3-02 建立公开脱敏分享页
- P3-03 建立 K 线历史版本
- P3-04 建立节点结果回写
- P3-05 建立回访提醒
- P3-06 后台资产查看
- P3-07 补全漏斗埋点
- P3-08 会员权益绑定

#### P4（8 项）— 算法质量与案例校准（持续迭代）
- P4-01 建立因子字典和权重注册表
- P4-02 接入大运、流年、流月的时间变化
- P4-03 事业/财富/关系分别定义证据
- P4-04 建立 20–50 个黄金案例
- P4-05 建立反例与边界案例
- P4-06 接入用户实际事件
- P4-07 建立 LLM 叙事评测
- P4-08 建立版本对比与回放

### 1.3 关键代码现状

| 检查项 | 真实状态 |
|---|---|
| 两套 K 线链路 | 存在：链路A（kline-tide.service.ts）+ 链路B（kline.generator.ts + consult.service.ts） |
| KlinePage.tsx 本地业务计算 | 15+ 个 useMemo 函数（describeKlinePhase、describeFactorEvidence、klineSummary、klineStructure、klineEvidence、groupInterpretations 等） |
| TidePage.tsx 本地业务计算 | describeTideAction、buildTideDirective |
| schema.prisma KlineSnapshot/KlineNode/KlineOutcome | 不存在 |
| KlineBar/StateSnapshot.snapshotId 字段 | 不存在 |
| shared-types/kline-v2.ts | 不存在（shared-types 目录不存在） |
| kline-v2.controller.ts | 不存在 |
| kline-calculation.engine.ts | 不存在 |
| 黄金样例目录 | 不存在 |
| migration 总数 | 10 个（最后：20260711211140_add_naming_three_tables） |
| 测试框架 | Jest |
| dev.db | 存在 |
| feature-flags KLINE_V2_* | 已添加（P0-09） |
| TideJudgmentService | 存在于 tide-inference/，被 kline-tide.service.ts 调用 |

---

## 2. 将要修改的文件清单

### 2.1 新增文件（约 15 个）

| 文件 | 用途 | 阶段 |
|---|---|---|
| `apps/AWKN-LABlife/shared-types/kline-v2.ts` | 前后端共享 ViewModel 类型 | P1-06 |
| `apps/AWKN-LABlife/shared-types/package.json` | shared-types 包配置 | P1-06 |
| `awkn-life-backend/apps/api-server/src/kline-tide/kline-calculation.engine.ts` | 纯计算引擎 | P1-02 |
| `awkn-life-backend/apps/api-server/src/kline-tide/kline-v2.controller.ts` | V2 API | P1-06 |
| `awkn-life-backend/apps/api-server/src/kline-tide/kline-snapshot.service.ts` | 快照服务 | P1-04 |
| `awkn-life-backend/apps/api-server/src/kline-tide/factor-registry.ts` | 因子注册表 | P1-09 |
| `awkn-life-backend/apps/api-server/src/kline-tide/__tests__/golden/` | 黄金样例目录（20+ 文件） | P1-10 |
| `awkn-life-backend/apps/api-server/prisma/migrations/YYYYMMDDHHMMSS_p1_kline_v2/` | migration | P1-04 |
| `app/src/hooks/useKlineProduct.ts` | 合并后的 hook | P2-01 |
| `app/src/components/kline/KlineNodeCard.tsx` | 统一节点卡 | P2-04 |
| `app/src/components/kline/KlineSharePage.tsx` | 公开分享页 | P3-02 |
| `app/src/pages/KlineHistoryPage.tsx` | 历史版本页 | P3-03 |
| `app/src/pages/admin/KlineAdminPage.tsx` | 后台资产 | P3-06 |
| 其他 P3/P4 文件 | 按需创建 | P3-P4 |

### 2.2 修改文件（约 20 个）

| 文件 | 修改内容 | 阶段 |
|---|---|---|
| `prisma/schema.prisma` | 新增 3 个 model + KlineBar/StateSnapshot 增加 snapshotId | P1-04 |
| `kline-tide.service.ts` | 删除随机 seed；收缩为查询/持久化 | P1-03 |
| `kline-decision.service.ts` | 升级为唯一产品判断服务 | P1-05 |
| `kline-scoring.service.ts` | 迁移到版本化因子计算 | P1-09 |
| `kline-tide.module.ts` | 注册新 providers | P1-02/04/05 |
| `consult/generators/kline.generator.ts` | 抽取确定性计算核；标记 legacy | P1-02/08 |
| `consult/consult.service.ts` | 统一读取 snapshot | P1-07 |
| `consult/dto/index.ts` | 增加 snapshotId、nodeId | P1-07 |
| `app/src/pages/KlinePage.tsx` | 删除 15+ 本地计算；只渲染 ViewModel；重构首屏 | P2-01/09 |
| `app/src/pages/TidePage.tsx` | 并入 K 线 current view | P2-02 |
| `app/src/services/klineTideApi.ts` | 改为消费 V2 ViewModel | P1-06 |
| `app/src/hooks/useTidePackage.ts` | 合并到 useKlineProduct | P2-01 |
| `app/src/components/kline/KlineChart.tsx` | 去掉 OHLC/成交量语义 | P2-03 |
| `app/src/components/kline/KlineShareCard.tsx` | 作为唯一分享实现 | P3-01 |
| `app/src/components/frontdesk/FrontdeskChat.tsx` | nodeId/snapshotId 提交 | P2-05 |
| `app/src/App.tsx` | /tide 跳转 + 分享路由 + 历史路由 | P2-02/P3-02 |
| `feature-flags.controller.ts` | 可能扩展 | 按需 |
| `.env.example` / `.env.prod.example` | 可能扩展 | 按需 |

### 2.3 不修改的文件

- `awkn.cn/` 根主页相关代码
- 不在 P01 范围内的模块（取名、问事核心逻辑等）
- 生产 .env.prod 实际文件（只改 .env.example 和 .env.prod.example 模板）

---

## 3. 涉及的系统变更

### 3.1 数据库结构变更 ✅ 涉及

| 变更 | 详情 | 风险 |
|---|---|---|
| 新增 3 张表 | KlineSnapshot、KlineNode、KlineOutcome | 低 — 只新增不破坏现有 |
| 现有表加字段 | KlineBar.snapshotId、StateSnapshot.snapshotId（均可空） | 低 — 可空字段，旧数据不受影响 |
| Backfill | 将旧数据归到 legacy snapshot | 低 — 只 INSERT + UPDATE null 字段 |
| Migration 文件 | 新增 prisma migration | 低 — 提供回滚脚本 |

**回滚方式**：
- 代码：`git reset --hard 7edddc72`（P0 基线）
- 数据库：`npx prisma migrate resolve --rolled-back <migration_name>` + 恢复 `dev.db.pre-P1-backup-YYYYMMDD`
- 备份：执行前 `cp prisma/dev.db prisma/dev.db.pre-P1-backup-$(date +%Y%m%d%H%M%S)`

### 3.2 环境变量 ✅ 涉及（仅模板）

| 变量 | 文件 | 说明 |
|---|---|---|
| KLINE_V2_ENABLED | .env.example / .env.prod.example | 已在 P0-09 添加，P1 可能新增其他 |
| KLINE_V2_PUBLIC_PREVIEW_ENABLED | 同上 | 同上 |
| KLINE_V2_NODE_ASK_ENABLED | 同上 | 同上 |
| KLINE_V2_OUTCOME_ENABLED | 同上 | 同上 |
| KLINE_SIMULATED_DATA_ALLOWED | 同上 | 同上 |

**不修改**：生产 .env.prod 实际文件。

### 3.3 密钥和凭证 ❌ 不涉及

本次任务不涉及任何密钥、Token、密码、连接串的修改或访问。

### 3.4 依赖安装或升级 ⚠️ 可能涉及

| 依赖 | 用途 | 风险 |
|---|---|---|
| 无新增依赖 | 现有 Prisma + NestJS + Jest 已满足 | 低 |
| 可能新增 dev 依赖 | shared-types 包配置（如果做独立包） | 低 |
| 可能新增测试依赖 | 黄金样例 hash 校验（crypto 已内置） | 低 |

**默认策略**：优先不新增依赖，只在必须时新增 dev 依赖。

### 3.5 系统服务 ❌ 不涉及

不涉及 Docker、PM2、Nginx、防火墙、定时任务的修改。

### 3.6 生产环境 ❌ 不涉及

- 不部署到生产
- 不修改生产文件
- 不修改 awkn.cn 根主页
- 不触发线上流量

### 3.7 外部接口 ❌ 不涉及

不调用任何外部付费服务或第三方 API。

### 3.8 Git 操作 ✅ 涉及

| 操作 | 说明 | 风险 |
|---|---|---|
| git add | 提交代码改动 | 低 |
| git commit | 使用 conventional commit 格式 | 低 |
| git branch（可选） | 可能在 feature/p1-kline-v2 分支执行 | 低 |

**不涉及**：
- ❌ git push（不推送到远程）
- ❌ git merge（不合并到 main）
- ❌ git push --force（禁止）
- ❌ git reset --hard（除非用户明确要求回滚）

**默认策略**：
- 在当前分支直接提交（不新建分支，避免工作流复杂化）
- 每个 P 阶段完成一个 commit
- commit message 使用 conventional 格式（feat / refactor / test / docs）

---

## 4. 可能造成的影响

### 4.1 对现有功能的影响

| 功能 | 影响 | 缓解 |
|---|---|---|
| 现有 K线页 /api/v1/kline-tide/* | P1 期间保留只读；P2 后 V2 接管 | feature flag 控制 |
| 现有潮汐页 /tide | P2 后跳转到 /kline?view=current | 保留兼容路由 |
| 现有咨询 /api/v1/consult/* | P1-07 后统一读 snapshot | 保留 legacy 兼容 14 天 |
| dev.db 数据 | migration 后旧数据归到 legacy snapshot | 备份 + 回滚脚本 |

### 4.2 对用户的影响

- **本地开发期间**：无用户影响（不部署）
- **部署后**：通过 feature flag 灰度，可随时回滚

---

## 5. 回滚方式

### 5.1 代码回滚

```bash
# 回滚到 P0 基线
git reset --hard 7edddc72

# 或回滚到 P1 前基线（P0 改动后）
git reset --hard <P0-commit-hash>
```

### 5.2 数据库回滚

```bash
# 恢复 dev.db 备份
cp prisma/dev.db.pre-P1-backup-YYYYMMDDHHMMSS prisma/dev.db

# 标记 migration 为已回滚
npx prisma migrate resolve --rolled-back 20260712HHMMSS_p1_kline_v2
```

### 5.3 功能回滚

```env
KLINE_V2_ENABLED=false
KLINE_SIMULATED_DATA_ALLOWED=false
```

---

## 6. 需要用户作出的选择

### 6.1 必须选择（3 项）

| # | 选择项 | 选项 | 建议 |
|---|---|---|---|
| 1 | P0 改动是否先 commit？ | A. 先 commit P0，再开始 P1 / B. P0+P1 一起 commit | A（推荐）— 分阶段提交，便于回滚 |
| 2 | 是否在 feature 分支执行？ | A. 在当前分支直接提交 / B. 新建 feature/p1-kline-v2 | A（推荐）— 本地开发无需分支隔离 |
| 3 | P4（算法校准）是否本次执行？ | A. 执行 P1-P3，P4 标记为"持续迭代" / B. 全部执行 P1-P4 | A（推荐）— P4 需要术数专家参与，无法独立完成 |

### 6.2 默认方案（无需选择，除非有异议）

| 项 | 默认方案 |
|---|---|
| shared-types 包结构 | 在 apps/AWKN-LABlife/shared-types/ 下新建，简单 ts 文件，不做独立 npm 包 |
| 黄金样例数量 | 最小 20 例（只覆盖核心边界） |
| 测试覆盖 | 新增代码必须有单元测试；核心 service 至少 1 条测试 |
| 文档同步 | 每个阶段完成后同步更新文档索引和工程文档状态 |
| commit 粒度 | 每个阶段（P1/P2/P3）一个 commit；P1 内部按闭环 A/B/C 分子 commit |

---

## 7. 本次授权的明确边界

### 7.1 授权范围内

- ✅ 修改 `apps/AWKN-LABlife/` 下的 app 和 awkn-life-backend 代码
- ✅ 修改 `prisma/schema.prisma` 和创建新 migration
- ✅ 修改 `docs/` 下的工程文档（同步状态）
- ✅ 修改 `.env.example` 和 `.env.prod.example` 模板
- ✅ 备份 `prisma/dev.db`（cp 命令）
- ✅ 运行 `npx prisma migrate dev`（本地开发 migration）
- ✅ 运行 `npx prisma generate`
- ✅ 运行 `npx tsc --noEmit`（typecheck）
- ✅ 运行 `npm test`（单元测试）
- ✅ 运行 `npm run build`（构建验证）
- ✅ git add / git commit（本地提交，conventional 格式）
- ✅ 新建文件和目录
- ✅ 修改现有文件
- ✅ 删除临时代码、调试代码、占位符

### 7.2 授权范围外（禁止）

- ❌ 修改生产 .env.prod 实际文件
- ❌ git push 到远程
- ❌ git push --force
- ❌ git reset --hard（除非用户明确要求）
- ❌ 部署到生产环境
- ❌ 修改 awkn.cn 根主页代码
- ❌ 删除 dev.db（只允许 cp 备份）
- ❌ 修改不在 P01 范围内的模块（取名、问事核心逻辑等）
- ❌ 安装新的生产依赖（只允许 dev 依赖）
- ❌ 访问任何外部付费服务
- ❌ 修改 Git 配置（user.name / user.email）

---

## 8. 执行计划概览

### 8.1 总目标

完成 P01 整改计划中 P1-P3 全部任务；P4 标记为"持续迭代"，只建立框架不完成校准。

### 8.2 当前基线

- P0 已完成 + Gate P0 验收通过
- Git 基线：`7edddc72 chore(wip): pre-P0 baseline backup 20260712`
- 代码改动：6 个文件已修改未 commit

### 8.3 执行顺序

```
阶段 1：P0 收口 + P1 准备（2 单元）
  ├─ 单元 1：commit P0 改动 + 备份 dev.db
  └─ 单元 2：P1-01 盘点两套算法字段 + 输出差异表

阶段 2：P1 闭环 A — 计算引擎（4 单元）
  ├─ 单元 3：P1-02 新建 KlineCalculationEngine
  ├─ 单元 4：P1-02 单元测试 + 确定性验证
  ├─ 单元 5：P1-03 删除正式链路随机 seed
  └─ 单元 6：P1-03 验证 + commit 闭环 A

阶段 3：P1 闭环 B — 数据表 + lineage（3 单元）
  ├─ 单元 7：P1-04 schema + migration
  ├─ 单元 8：P1-04 backfill + 验证
  └─ 单元 9：P1-09 factor-registry + commit 闭环 B

阶段 4：P1 闭环 C — 决策服务 + ViewModel + 归口（5 单元）
  ├─ 单元 10：P1-05 KlineDecisionService 升级
  ├─ 单元 11：P1-06 shared-types + KlineProductViewModelV2
  ├─ 单元 12：P1-06 kline-v2.controller + service
  ├─ 单元 13：P1-07 咨询归口 + P1-08 legacy 标记
  └─ 单元 14：P1 闭环 C 验证 + commit

阶段 5：P1 收尾 — 黄金样例 + Gate P1（3 单元）
  ├─ 单元 15：P1-10 黄金样例 20 例
  ├─ 单元 16：P1-10 hash 验证 + Gate P1 验收
  └─ 单元 17：P1 commit + 文档同步

阶段 6：P2 — 重写首屏与节点问事（6 单元）
  ├─ 单元 18：P2-01 KlinePage 信息架构重构
  ├─ 单元 19：P2-02 潮汐并入 K 线 + P2-03 四条主线
  ├─ 单元 20：P2-04 统一节点卡 + P2-05 节点问事链路
  ├─ 单元 21：P2-06 结果返回原节点 + P2-07 权限弱态
  ├─ 单元 22：P2-08 主题响应式 + P2-09 删除前端业务计算
  └─ 单元 23：P2-10 可访问性 + Gate P2 + commit

阶段 7：P3 — 分享、历史与经营闭环（5 单元）
  ├─ 单元 24：P3-01 归并海报 + P3-02 公开分享页
  ├─ 单元 25：P3-03 历史版本 + P3-04 节点结果回写
  ├─ 单元 26：P3-05 回访提醒 + P3-06 后台资产
  ├─ 单元 27：P3-07 埋点 + P3-08 会员权益
  └─ 单元 28：Gate P3 + commit + 文档同步

阶段 8：P4 框架 + 最终验收（2 单元）
  ├─ 单元 29：P4 框架建立（因子字典结构 + 版本管理结构）
  └─ 单元 30：最终自主审核 + 结果输出
```

### 8.4 最终验收标准（DoD）

见 `TECHNICAL-REFERENCE-P01-命运K线与潮汐架构-20260712.md` §10，共 15 项。

---

## 9. 风险与注意事项

| 风险 | 等级 | 缓解 |
|---|---|---|
| P1-10 黄金样例需要术数专家判定 | 中 | 只覆盖技术边界（节气/大运交接），术数正确性标记为"待专家复核" |
| SQLite 不支持 DROP COLUMN | 低 | 回滚脚本使用重建表方式；提供 pragma legacy_alter_table=ON |
| KlinePage.tsx 本地计算删除可能破坏现有 UI | 中 | P2 阶段保留旧函数作为 fallback，V2 ViewModel 就绪后再删 |
| 咨询服务归口可能影响现有咨询流程 | 中 | P1-07 保留 legacy 链路 14 天只读 |
| 工作区已有大量未提交修改 | 低 | P0 改动先 commit 建立基线 |

---

## 10. 确认请求

请确认以下 3 项选择，其余按默认方案执行：

1. **P0 改动是否先 commit？**
   - A. 先 commit P0，再开始 P1（推荐）
   - B. P0+P1 一起 commit

2. **是否在 feature 分支执行？**
   - A. 在当前分支直接提交（推荐）
   - B. 新建 feature/p1-kline-v2

3. **P4（算法校准）是否本次执行？**
   - A. 执行 P1-P3，P4 标记为"持续迭代"（推荐）
   - B. 全部执行 P1-P4

确认后即视为授权在上述范围内连续执行，不再逐项询问。
