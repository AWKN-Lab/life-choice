# 人生决策宗师｜当前生产技术基线

> **版本**：v1.0
> **取证时间**：2026-07-07 16:46（UTC+8）
> **生产主机**：`8.148.245.29`
> **适用范围**：`awkn.cn/life` 当前线上版本
> **性质**：生产事实源。涉及运行代码、部署、接口、数据库、知识库的判断，优先以本文件及同期专项基线为准。

---

## 0. 一句话结论

当前线上服务可访问，前后端构建产物与本地当前工作树一致；生产 Git 工作区存在 **521 个已跟踪变更 + 19 个未跟踪项**，Prisma Schema 与本地代码存在版本漂移，单一 commit 仍无法完整复现当前生产。

```text
生产实际版本
= 生产 HEAD 4bbcd7c
+ 521 个已跟踪变更
+ 19 个未跟踪项
+ 当前 dist 构建产物
+ 当前 SQLite 数据库
+ 当前知识索引
```

---

## 1. 生产事实基线

| 项目 | 当前值 |
|---|---|
| 主机名 | `iZ7xv1vqnxxb1yejehtqa3Z` |
| 操作系统 | Alibaba Cloud Linux 3.2104 U11 |
| 后端运行用户 | `root` |
| Node.js | `v22.22.2` |
| npm | `10.9.7` |
| pnpm | `11.1.2` |
| yarn | `1.22.22` |
| 知识服务 Python | `/usr/bin/python3.11` |
| 系统默认 Python | `3.6.8` |
| 磁盘 | 40GB，总使用率约 94%，剩余约 2.5GB |
| 前端地址 | `https://awkn.cn/life/` |
| 后端 API | `https://awkn.cn/api/v1/*` |
| life 子路径 API | `https://awkn.cn/life/api/v1/*` |

### 1.1 进程与端口

| 服务 | 管理方式 | 入口 | 监听 | 状态 |
|---|---|---|---|---|
| `awkn-life-backend` | PM2 | `/opt/awkn-life/awkn-life-backend/scripts/bootstrap-production.js` | `*:30000` | online |
| 实际 Nest 进程 | 子进程 | `/opt/awkn-life/awkn-life-backend/apps/api-server/dist/main.js` | `*:30000` | online |
| `knowledge-service` | PM2 | `/opt/awkn-life/services/knowledge-service/main.py` | `127.0.0.1:8701` | online |
| Nginx | systemd | `/etc/nginx/*` | `80 / 443` | online |

生产环境关键非敏感配置：

```env
NODE_ENV=production
PORT=30000
REDIS_ENABLED=false
DEFAULT_LLM_PROVIDER=deepseek-direct
CHEAP_LLM_PROVIDER=sensenova
KNOWLEDGE_DATA_DIR=/opt/awkn-life/knowledge/processed
KNOWLEDGE_USE_MMAP=1
```

---

## 2. 当前生产代码来源

### 2.1 Git 基线

```text
HEAD: 4bbcd7c563e6525aaf6d14ff73d3f010840bb71e
日期: 2026-07-04 19:57:50 +0800
提交: prod-truth: 生产真实状态回流 2026-07-04
分支: master
Remote: 未配置
```

生产工作区：

```text
M  478
D   43
??  19
```

受影响最多的目录：

```text
awkn-life-backend  486
_archive            31
awkn-life-frontend-update 8
knowledge            4
services             3
```

### 2.2 本地与生产一致性

已抽样核验以下关键源码，生产与本地当前工作树 SHA-256 一致：

- `apps/api-server/src/main.ts`
- `apps/api-server/src/app.module.ts`
- `consult/consult.controller.ts`
- `consult/orchestrator/orchestrator.service.ts`
- `consult/dialogue/dialogue.service.ts`
- `consult/memory/memory-embedding.service.ts`
- `llm-gateway/llm-router.service.ts`
- `kline-tide/kline-tide.controller.ts`
- `services/knowledge-service/main.py`
- `services/knowledge-service/loader.py`

以下项目也与本地一致：

| 产物 | SHA-256 |
|---|---|
| 后端 `dist/main.js` | `de3509fee47e6a50fee710401996239a42a679e5aed91feeff6250b621679dbe` |
| 前端 `index.html` | `8e9787386acf9917e8d5ca76a15f79734d19a6f0dc039673266e1413f787e08c` |
| 知识 `_manifest.json` | `719294b81d4d6ad861dff9db181d17683b9c5dbd46895b0d5d771052cdab39b0` |
| 知识 `classics_index.jsonl` | `f77c1ef8ade1d135a4f430d38c1bc5abc131e285db6e635e6bda87dd4d5f8f8b` |
| 知识 `embeddings.npy` | `cbde8e710da10b919240179fbf6ba82c0eee15dea12459da44762148df4b3886` |

### 2.3 已确认版本漂移

| 项目 | 本地 | 生产 | 风险 |
|---|---:|---:|---|
| Prisma models | 35 | 33 | 生产缺少新模型 |
| Prisma migrations | 8 | 5 | 生产未执行 2026-07-03 三份迁移 |
| `ConsultDialogueTurn` | 有 | 无 | 新对话轮次表不可用 |
| `MemoryEmbedding` | 有 | 无 | 新记忆向量表不可用 |
| `schema.prisma` 哈希 | `c16258...` | `1c5e46...` | 源码与数据库契约漂移 |

生产数据库仍可正常打开，`PRAGMA integrity_check = ok`。

---

## 3. 当前后端架构

### 3.1 技术栈

| 层 | 技术 |
|---|---|
| API | NestJS 10 |
| ORM | Prisma 5 |
| 数据库 | SQLite |
| 认证 | JWT + Passport |
| 前端 | React + Vite |
| 状态管理 | Zustand |
| 实时通信 | Socket.IO |
| 队列 | BullMQ 代码存在，生产 `REDIS_ENABLED=false` |
| 知识服务 | FastAPI + NumPy 内存/只读映射检索 |

### 3.2 全局约定

```text
Global Prefix: /api/v1
ValidationPipe: whitelist + transform + forbidNonWhitelisted
Backend Port: 30000
Frontend Base: /life/
```

### 3.3 生产已加载模块

```text
Admin
Analytics
Auth
Chronicle
Consult
DecisionFramework
FeatureFlags
Feedback
Growth
Guardrails
KlineTide
KnowledgeBase
LlmProviders
Membership
Miaosuan
MingliBench
Payment
Prisma
Queue
Redis
SavedCase
Shumiyuan
SolarTime
StarChart
TideInference
User
UserProfile
Websocket
WritingPipeline
ZiweiEngine
```

### 3.4 核心业务入口

| 业务 | 入口 |
|---|---|
| 注册/登录 | `POST /api/v1/auth/register`、`POST /api/v1/auth/login` |
| 问事预览 | `POST /api/v1/consult/preview` |
| 问事分析 | `POST /api/v1/consult/analyze` |
| 查询结果 | `GET /api/v1/consult/result/:recordId` |
| 多轮对话 | `/api/v1/consult/dialogue/*` |
| 会员/积分 | `/api/v1/membership/*` |
| 支付 | `/api/v1/payment/*` |
| K线/潮汐 | `/api/v1/kline-tide/*` |
| 用户档案 | `/api/v1/user/*`、`/api/v1/user/profile/*` |
| 管理后台 | `/api/v1/admin/*` |
| 命理评测 | `/api/v1/mingli-bench/*` |
| 枢密院 | `/api/v1/shumiyuan/*` |
| 星图 | `/api/v1/star-chart/*` |
| 编年史 | `/api/v1/chronicle/*` |

完整接口基线见：

`docs/02开发PRD与工程文档/接口文档/API-当前生产接口基线-20260707.md`

---

## 4. 当前数据库基线

### 4.1 文件

```text
路径: /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db
大小: 1,081,344 bytes
完整性: ok
```

### 4.2 关键数据量

| 表 | 记录数 |
|---|---:|
| User | 18 |
| ConsultRecord | 15 |
| ConsultDialogue | 6 |
| KlineBar | 180 |
| StateSnapshot | 60 |
| EvidencePacket | 36 |
| GenerationRun | 0 |
| KnowledgeHit | 0 |
| InteractionEvent | 14 |
| Membership | 0 |

### 4.3 当前缺失表

```text
ConsultDialogueTurn
MemoryEmbedding
```

数据库详细基线见：

`docs/02开发PRD与工程文档/数据库文档/DATABASE-当前生产Schema基线-20260707.md`

---

## 5. 当前知识服务基线

### 5.1 数据规模

| 项目 | 当前值 |
|---|---:|
| bookCount | 1,135 |
| passageCount | 329,577 |
| vectorCount | 329,577 |
| embeddings 文件 | 1,349,947,520 bytes |
| 向量模式 | NumPy + mmap |

体系分布：

```text
bazi       51,107
other     119,035
zhouyi      5,989
qimen      28,812
yuyan       1,677
ziwei      63,288
liuren     19,753
liuyao     27,663
meihua      2,760
quming      1,714
daoism      3,256
fengshui    1,973
xiangshu    2,550
```

### 5.2 运行时抽测

| 请求 | 状态 | 用时 |
|---|---|---:|
| `/retrieve`：日主身弱 | 200，有结果 | 2.20s |
| `/embed_search`：日主身弱如何取用神 | 200，有结果 | 14.86s |
| `/hybrid_search`：日主身弱 | 200，有结果 | 11.24s |
| `/embed_search`：紫微夫妻宫 | 200，有结果 | 10.21s |

结论：分类缺失问题已缓解，当前向量和混合检索延迟仍高。

---

## 6. 当前前端与 Nginx

| 项目 | 当前值 |
|---|---|
| 前端部署目录 | `/www/wwwroot/awkn.cn/life/` |
| 前端入口哈希 | `8e978738...` |
| assets 文件数 | 80 |
| SPA 回退 | `/life/index.html` |
| `/api/` | 代理到 `127.0.0.1:30000`，保留 `/api` 前缀 |
| `/life/api/` | 代理到 `127.0.0.1:30000/api/` |
| WebSocket | `/life/socket.io/` → 后端 Socket.IO |

公共入口抽测：

| URL | HTTP |
|---|---:|
| `https://awkn.cn/life/` | 200 |
| `https://awkn.cn/life/question` | 200 |
| `https://awkn.cn/life/kline` | 200 |
| `https://awkn.cn/api/v1/health` | 200 |
| `https://awkn.cn/life/api/v1/health` | 200 |

---

## 7. 当前生产风险

### P0：磁盘空间

```text
/dev/vda3 40G
已用 35G
剩余约 2.5G
使用率 94%
```

知识向量文件约 1.35GB。部署、备份、重新构建索引前必须先做磁盘安全检查。

### P0：生产版本不可由单一 commit 复现

生产 HEAD 与实际源码差距达到 521 个已跟踪变更。当前发布需要生产快照清单或新的基线 commit。

### P1：数据库 Schema 漂移

后端源代码已包含 `ConsultDialogueTurn`、`MemoryEmbedding` 相关能力，生产数据库和生产 Schema 尚未包含对应模型和迁移。

### P1：知识检索延迟

329,577 条向量在 mmap 模式下，向量查询约 10–15 秒。核心问事链路调用知识服务时存在超时风险。

### P1：PM2 重启历史

当前 PM2 计数：

```text
awkn-life-backend: 17
knowledge-service: 13
```

需要结合部署记录区分主动重启和故障重启。

### P2：生产以 root 身份运行

后端、知识服务和部署目录均由 root 管理，权限和误操作影响面较大。

---

## 8. 当前文档优先级

1. `ENGINEERING-当前生产技术基线-20260707.md`
2. `API-当前生产接口基线-20260707.md`
3. `DATABASE-当前生产Schema基线-20260707.md`
4. `DEPLOY-当前生产基线-20260707.md`
5. `_ground-truth.md` 中的 2026-07-07 覆盖层
6. 2026-06 及更早技术文档作为历史设计和上下文参考

---

## 9. 取证命令摘要

```bash
pm2 jlist
ss -ltnp
git status --short --branch
git show -s --format='%H|%ci|%s' HEAD
sha256sum <关键文件>
nginx -T
curl /api/v1/health
curl :8701/health
curl :8701/health-v2
PRAGMA integrity_check
```

本轮仅对生产执行读取和接口查询，没有修改生产文件、数据库、进程、Nginx 或环境变量。

---

## 10. 部署后更新（2026-07-07 23:01 取证）

> 来源：2026-07-06 上线部署 + 2026-07-07 23:01 稳定性观察取证
> 性质：增量更新，不修改 1-9 章基线事实，仅追加部署后变化项

### 10.1 部署事件

2026-07-06 16:22 (UTC+8) 执行上线部署：
- 后端：本地完整 build（nest build + copy-assets + verify-build）→ dist 上传 → PM2 reload
- 前端：本地 vite build → dist 上传 → Nginx reload
- 事故：第一次后端部署因上级 build 脚本不完整（E-A24）导致 preflight 失败，回滚后重新部署成功

### 10.2 部署后状态变化

| 项目 | 基线值（第 1-9 章） | 部署后值（2026-07-08 核验） | 变化 |
|---|---|---|---|
| PM2 pid | 1094263 | 1132221 | 变化（MemoryForget 止血 reload） |
| PM2 uptime | — | 18m | 稳定运行 |
| PM2 restarts | 17 | 0 | 已 reset 清零 |
| 后端 dist/main.js SHA-256 | `de3509...` | `de3509...` | 不变（基线已反映部署后版本） |
| 前端 index.html SHA-256 | `8e9787...` | `8e9787...` | 不变（基线已反映部署后版本） |
| 磁盘使用率 | 94%（~2.5G 剩余） | 90%（3.9G 剩余） | 改善（清理历史备份 47.5M） |
| API Health | 200 | 200, database connected | 正常 |
| MemoryForget | 未记录 | 已禁用（`.env.prod` L43 `MEMORY_FORGET_ENABLED=false`） | 止血 |

### 10.3 Prisma Schema 漂移运行时错误（已止血）

第 2.3 节记录的 Schema 漂移已产生实际运行时错误：

- **现象**：PM2 日志出现 3 次 `Unknown argument lastAccessedAt`
- **触发场景**：`MemoryForgetService` 定时扫描查询 `lastAccessedAt` 字段，生产数据库 Schema 缺少该字段
- **止血措施**：`.env.prod` 第 43 行追加 `MEMORY_FORGET_ENABLED=false`
- **生效路径**：`bootstrap-production.js` 的 `loadEnvFileOverride` 机制读取 `.env.prod` 覆盖 `.env`
- **验证**：PM2 reload 后日志确认 `[MemoryForget] 已禁用`；`UserMemory` 表 0 条记录，禁用无功能影响
- **残余**：Schema 漂移本身仍在（`ConsultDialogueTurn`、`MemoryEmbedding` 表缺失），下一轮需做数据库迁移副本验证，不直接生产迁移

### 10.4 磁盘空间与备份状态

**清理后当前备份**：

| 备份 | 大小 | 说明 |
|---|---|---|
| `dist.bak-pre-as12` | 7.5M | 后端备份 1 |
| `dist.old-step12` | 7.9M | 后端备份 2 |
| 前端备份 | 无 | `life.old` 已在清理时删除 |

**清理记录**：
- 删除：4 个旧 `dist.old-*`（34.5M）+ `life.old`（13M）= 47.5M
- 保留：2 份后端备份（15.4M）
- 磁盘：从 94%（2.5G 剩余）→ 90%（3.9G 剩余）

**回滚能力**：
- 后端：弱可回滚（`cp -r dist.old-step12 dist && pm2 reload`）
- 前端：无现成回滚副本，需重新构建

**建议**：磁盘 3.9G 仍偏紧，正式发布前建议继续释放到 6G 以上。

### 10.5 环境变量补充记录

以下环境变量在 `.env.prod` 中设置，通过 `bootstrap-production.js` 的 `loadEnvFileOverride` 生效，不在 `.env` 中：

| 变量 | 值 | 位置 | 用途 |
|---|---|---|---|
| `MEMORY_FORGET_ENABLED` | `false` | `.env.prod` L43 | 禁用 MemoryForgetService 定时扫描（Schema 漂移止血） |

### 10.6 部署经验沉淀

E-A24 已写入部署技能经验库：上级目录 build 脚本与子项目不一致的陷阱。
详见：`C:\Users\10919\.agents\skills\awkn-部署\references\experience-entries.md`
