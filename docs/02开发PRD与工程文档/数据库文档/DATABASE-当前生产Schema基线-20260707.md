# 人生决策宗师｜当前生产数据库与 Schema 基线

> **版本**：v1.0
> **取证时间**：2026-07-07
> **数据库**：SQLite
> **生产文件**：`/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db`
> **取证方式**：只读连接、Prisma Schema 比对、迁移目录检查。

---

## 1. 当前结论

生产数据库完整性检查通过，现有业务可读写；生产 Prisma Schema、迁移目录与本地当前代码存在明确漂移。

```text
本地 Prisma models：35
生产 Prisma models：33
本地 migrations：8
生产 migrations：5
生产缺失模型/表：ConsultDialogueTurn、MemoryEmbedding
```

涉及上述两张表的新代码在进入生产写路径前，必须先完成数据库备份、迁移影响评估和独立验证。

---

## 2. 数据库事实

| 项目 | 当前值 |
|---|---|
| ORM | Prisma 5 |
| Provider | SQLite |
| 文件路径 | `/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db` |
| 文件大小 | 1,081,344 bytes |
| 完整性 | `PRAGMA integrity_check = ok` |
| 生产 Schema 哈希 | `1c5e46dbf7168af3ad8bb5ac04a34c507bc6e97d957e009e037396048cc97bf9` |
| 本地 Schema 哈希 | `c16258d7da5521baed6d25fcf76377e48a5254efc7f35aa999120d3a9f9d5953` |

---

## 3. 生产 Schema 模型

生产 `schema.prisma` 当前包含 33 个模型：

```text
User
CreditLedger
UserMemory
BaZiProfile
ConsultRecord
NamingResult
ConsultFeedback
PersonProfile
PersonProfileRecord
PageVisit
UserActivity
Session
Membership
Order
Invite
Referral
GrowthOffer
LiurenCase
EvidencePacket
GenerationRun
KnowledgeHit
InteractionEvent
ConsultPreview
BenchmarkRun
PersonEightDimensions
PersonRelatedCase
ChronicleEntry
UserInsightProfile
KlineBar
StateSnapshot
ConsultFollowUp
ConsultDialogue
SavedCase
```

本地当前 Schema 额外包含：

```text
ConsultDialogueTurn
MemoryEmbedding
```

---

## 4. 生产实际表

生产 SQLite 当前业务表：

```text
BaZiProfile
BenchmarkRun
ChronicleEntry
ConsultDialogue
ConsultFeedback
ConsultFollowUp
ConsultPreview
ConsultRecord
CreditLedger
EvidencePacket
GenerationRun
GrowthOffer
InteractionEvent
Invite
KlineBar
KnowledgeHit
LiurenCase
Membership
NamingResult
Order
PageVisit
PersonEightDimensions
PersonProfile
PersonProfileRecord
PersonRelatedCase
Referral
SavedCase
Session
StateSnapshot
User
UserActivity
UserInsightProfile
UserMemory
_prisma_migrations
```

缺失：

```text
ConsultDialogueTurn
MemoryEmbedding
```

---

## 5. 当前生产数据量

| 表 | 记录数 | 说明 |
|---|---:|---|
| User | 18 | 注册用户 |
| ConsultRecord | 15 | 咨询主记录 |
| ConsultDialogue | 6 | 多轮对话主记录 |
| KlineBar | 180 | K线数据 |
| StateSnapshot | 60 | 状态快照 |
| EvidencePacket | 36 | 证据包 |
| GenerationRun | 0 | 生成运行记录尚未形成数据 |
| KnowledgeHit | 0 | 知识命中记录尚未形成数据 |
| InteractionEvent | 14 | 交互事件 |
| Membership | 0 | 当前无会员记录 |
| ConsultDialogueTurn | 缺表 | 本地新增模型 |
| MemoryEmbedding | 缺表 | 本地新增模型 |

数据量只表示当前生产库现状，不能直接作为功能完成率判断。

---

## 6. 迁移状态

### 6.1 生产已有迁移

```text
20260615010520_add_saved_cases_table
20260616142014_add_missing_tables
20260619053705_p2_1_user_memory_extend
20260619054344_p2_3_consult_followup_extend
20260625044027_q3_consult_record_enhance
```

### 6.2 本地新增、生产未部署

```text
20260703183000_add_consult_dialogue_turn
20260703183500_add_memory_last_accessed_at
20260703184000_add_memory_embedding
```

影响：

1. `ConsultDialogueTurn` 无法在生产落表。
2. `MemoryEmbedding` 无法在生产持久化。
3. `UserMemory.lastAccessedAt` 的生产字段状态需要迁移前再次确认。
4. 代码包含新能力，不代表生产数据库已经具备相应契约。

---

## 7. 主要关系

```text
User
├─ BaZiProfile
├─ UserMemory
├─ ConsultRecord
├─ ConsultDialogue
├─ PersonProfile
├─ Membership
├─ Order
├─ CreditLedger
├─ Session
├─ ChronicleEntry
└─ SavedCase

ConsultRecord
├─ ConsultFeedback
├─ ConsultFollowUp
├─ EvidencePacket（recordId 逻辑关联）
├─ GenerationRun（recordId 逻辑关联）
├─ InteractionEvent（recordId 逻辑关联）
└─ ConsultDialogue

PersonProfile
├─ PersonProfileRecord
├─ PersonEightDimensions
├─ PersonRelatedCase
└─ ChronicleEntry
```

`KlineBar`、`StateSnapshot`、`EvidencePacket`、`GenerationRun`、`KnowledgeHit`、`InteractionEvent` 中存在按 ID 字段建立的逻辑关联，部分没有数据库外键约束。

---

## 8. 数据真源说明

| 数据 | 当前真源 |
|---|---|
| 用户与咨询 | 生产 SQLite `dev.db` |
| K线 | `KlineBar` |
| 潮汐/状态 | `StateSnapshot` |
| 证据包 | `EvidencePacket` |
| 生成运行 | `GenerationRun` |
| 知识命中 | `KnowledgeHit` |
| 知识正文与向量 | `/opt/awkn-life/knowledge/processed/`，独立于 Prisma |

知识库文件不存入生产 SQLite：

```text
_manifest.json
classics_index.jsonl
embeddings.npy
idf_cache.pkl
```

---

## 9. 迁移执行前置闸门

执行 2026-07-03 三份迁移前必须完成：

```text
[ ] 确认磁盘安全余量
[ ] 备份 dev.db 并验证备份可打开
[ ] 保存当前 schema.prisma 和迁移清单哈希
[ ] 在独立 SQLite 副本执行 prisma migrate deploy
[ ] 校验新增表和字段
[ ] 运行后端 typecheck / test / 启动烟测
[ ] 验证旧 ConsultDialogue 与 UserMemory 数据未受损
[ ] 准备数据库文件级回滚
```

当前服务器仅剩约 2.5GB，备份和构建前必须先处理磁盘风险。

---

## 10. 当前风险分级

### P0：Schema 与实际数据库漂移

本地代码已使用新模型，生产数据库缺少相应表。启用新路径可能产生运行时错误。

### P1：迁移记录滞后

生产迁移目录只有 5 份，本地已有 8 份。数据库版本不能仅依据源码推断。

### P1：审计数据为空

`GenerationRun=0`、`KnowledgeHit=0`，当前生产无法依靠这两张表完整复盘生成链路和知识命中。

### P1：K线/潮汐数据来源仍需业务校验

生产已有 180 条 KlineBar、60 条 StateSnapshot。数据存在不等同于来源和算法已经完成权威性验收。

### P2：SQLite 单文件运行

备份、迁移和磁盘异常可能直接影响全部生产数据。发布流程必须坚持先备份、后迁移、再重启。

---

## 11. 只读核验命令

```bash
sha256sum apps/api-server/prisma/schema.prisma
stat apps/api-server/prisma/dev.db
sqlite3 'file:dev.db?mode=ro' 'PRAGMA integrity_check;'
find apps/api-server/prisma/migrations -mindepth 1 -maxdepth 1 -type d
```

本次没有执行数据库写入、迁移、修复或清理。
