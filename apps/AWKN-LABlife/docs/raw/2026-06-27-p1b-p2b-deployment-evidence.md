---
type: raw-source
title: P1-B+P2-B 部署原始证据（含故障与恢复全过程）
created: 2026-06-27T17:30:00+08:00
tags: [raw, deployment, P1-B, P2-B, evidencePackage, gpt-tokenizer, incident]
status: active
project: 人生决策宗师 / apps/AWKN-LABlife
server: root@8.148.245.29 (阿里云轻量)
---

# P1-B+P2-B 部署原始证据

> 本文件是部署全过程的原始证据，未经提炼与综合。
> 由本次 Ingest 整合为 3 条 E 经验（E230/E231/E232） + 1 条 P1-B+P2-B 部署决策。

---

## A. 部署前代码状态（本地）

### A.1 已完成的代码改动（P1-B）

- **文件**: `awkn-life-backend/apps/api-server/src/consult/orchestrator/zhangbanshan-scheduler.service.ts`
- **构造函数新增 4 个 @Optional 注入参数**:
  - `RuleMatcherService`
  - `EvidenceComposerService`
  - `KnowledgeRetrieverService`
  - `AgentRunLogger`（P2-B）
- **synthesizeThreeStage 签名变更**:
  - 新增 `chartSnapshot?: { male: BaziFullResult; female?: BaziFullResult }` 可选参数
  - 保留向后兼容（默认参数）
- **新增辅助方法**:
  - `mapQuestionCategoryToType(category: QuestionCategory): 'marriage' | 'career' | 'wealth' | 'health' | 'general'`
  - 把 scheduleReason 映射到 questionType
- **L401 附近构造 evidencePackage**:
  - 受 `EVIDENCE_PACKAGE_ENABLED` 环境变量灰度控制
  - try-catch 降级（失败不阻断主链路）

### A.2 已完成的代码改动（P2-B）

- **3 处埋点**:
  - RuleMatcher.match 后埋点（agentName='RuleMatcher'）
  - EvidenceComposer.compose 后埋点（agentName='EvidenceComposer'）
  - LLM 调用后埋点（agentName=decision.primaryAgent），失败也埋点
- **safeLogAgentRun 辅助方法**:
  - @Optional + try-catch 不阻断主链路

### A.3 测试

- **zhangbanshan-scheduler.evidence.spec.ts**: 11/11 全绿
  - P1-B 7 项：灰度开/关/未设置/缺失/异常/场景映射/未注入
  - P2-B 4 项：3处埋点/未注入不崩溃/异常不阻断/灰度关闭LLM仍埋点
- **tsc 编译**: 0 错误
- **整套件**: 35 套件 484 passed

### A.4 审核

- **结论**: PASS_WITH_RISKS
- **残余风险**: prompt 注入放大风险 medium
- **结构化标记**: 包含 `<!-- VERDICT: PASS_WITH_RISKS -->`（E129 铁律）

---

## B. 部署过程原始日志（服务器侧）

### B.1 部署前 SSH 检查（17:00）

```
$ ssh -i $env:USERPROFILE\.ssh\aliyun_awkn root@8.148.245.29
$ pm2 list
[Table shows awkn-life-backend status=errored, restarts=293]
```

### B.2 部署执行步骤（脚本时序）

1. **deploy-p1b-p2b.sh**（首次部署脚本）:
   - PowerShell heredoc 失败 → 改写脚本文件 → scp 上传 → ssh bash 执行
2. **fix-deploy.sh**（cp 同步修复）:
   - 目录冲突失败
3. **fix-deploy2.sh**（rsync 同步修复）:
   - `rsync: command not found` → 回退 cp
   - `--delete` 删除了 dist/consult/meihua-agent/prompts 资产
4. **restore-assets.sh**（恢复缺失资产）:
   - 从 src/meihua-agent/prompts 复制到 dist/consult/meihua-agent/prompts
5. **emergency-restore.sh**（从备份点恢复 + PM2 重启）:
   - preflight check 通过
   - Node.js 启动崩溃 → token-counter.service.js require gpt-tokenizer MODULE_NOT_FOUND

### B.3 错误日志（崩溃前 5 分钟）

```
48|awkn-li | [preflight] ALL CHECKS PASSED
48|awkn-li | [bootstrap] Preflight checks passed
48|awkn-li | [preflight] OK knowledge-service reachable at http://127.0.0.1:8701

48|awkn-li | Error: Cannot find module 'gpt-tokenizer'
48|awkn-li |     at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
48|awkn-li |     at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
48|awkn-li |     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
48|awkn-li |     at Function._load (node:internal/modules/cjs/loader:1192:37)
48|awkn-li |     at TracingChannel.traceSync (node:diagnostics_channel:328:14)
48|awkn-li |     at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
48|awkn-li |     at Module.require (node:internal/modules/cjs/loader:1463:12)
48|awkn-li |     at require (node:internal/modules/helpers:147:16)
48|awkn-li |     at Object.<anonymous> (/opt/awkn-life/awkn-life-backend/apps/api-server/dist/consult/context/token-counter.service.js:11:25)
48|awkn-li |     at Module._compile (node:internal/modules/cjs/loader:1705:14)
48|awkn-li |   code: 'MODULE_NOT_FOUND',
48|awkn-li |   requireStack: [
48|awkn-li |     '/opt/awkn-life/awkn-life-backend/apps/api-server/dist/consult/context/token-counter.service.js',
48|awkn-li |     ... 直到 main.js
48|awkn-li |   ]
48|awkn-li | Node.js v22.22.2
```

### B.4 本地代码声明（grep 验证）

```bash
$ cat apps/api-server/package.json | grep gpt-tokenizer
"gpt-tokenizer": "^2.5.0",
```

- 本地 package.json 已声明
- 服务器 node_modules 缺失（npm install 因 prisma generate 权限问题中断）

---

## C. 恢复过程（17:20）

### C.1 单包安装命令

```bash
ssh root@8.148.245.29 "cd /opt/awkn-life/awkn-life-backend/apps/api-server \
  && npm install gpt-tokenizer@^2.5.0 --legacy-peer-deps --no-audit --no-fund"
```

输出：
```
added 98 packages in 37s
```

**关键发现**: npm install 单一缺失包自动补齐了 98 个依赖（说明之前 npm install 中断导致整个 node_modules 不完整）。

### C.2 PM2 重启

```bash
ssh root@8.148.245.29 "cd /opt/awkn-life/awkn-life-backend \
  && pm2 restart ecosystem.config.js --env production"
```

### C.3 健康检查（3 次连续）

```bash
for i in 1 2 3; do
  curl -s -m 5 http://localhost:30000/api/v1/health
  sleep 2
done
```

输出：
```
{"code":0,"message":"ok","service":"awkn-life-backend","database":"connected","timestamp":"2026-06-27T09:21:06.318Z"}
{"code":0,"message":"ok","service":"awkn-life-backend","database":"connected","timestamp":"2026-06-27T09:21:08.327Z"}
{"code":0,"message":"ok","service":"awkn-life-backend","database":"connected","timestamp":"2026-06-27T09:21:10.335Z"}
```

### C.4 PM2 状态

```
│ id │ name              │ status │ uptime │ ↺    │ unstable_restarts │
│ 48 │ awkn-life-backend │ online │ 2m     │ 265  │ 0                 │
```

- restarts=265 是历史累计值
- unstable_restarts=0 表示恢复后稳定
- uptime=2m 持续增长

### C.5 部署后必做 4 验

| # | 验证项 | 实际输出 | 结论 |
|---|--------|---------|------|
| 1 | HTML title | `<title>人生决策宗师</title>` | ✅ |
| 2 | JS 哈希 | `index-C-T1YmE2.js` | ✅ |
| 3 | 健康检查 | HTTP 200 + `{"code":0,"message":"ok"}` | ✅ |
| 4 | API 路由 | 404 正确 + Auth login 400 | ✅ |

### C.6 烟测

```bash
curl -s -m 5 http://localhost/                     # HTTP 200
curl -s -m 5 http://localhost:30000/api/v1/health # code:0 ok
curl -s -o /dev/null -w '%{http_code}' http://localhost:30000/api/v1/nonexistent  # 404
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:30000/api/v1/auth/login -d '{}'  # 400
```

---

## D. 差异点（计划 vs 实际）

### D.1 计划中预期

- 部署 → PM2 重启 → 服务 online → 健康检查通过

### D.2 实际发生

- 部署 → PM2 重启 → 服务启动崩溃 → 紧急修复 → 服务 online

### D.3 根因分析（5 Why）

1. **Why 1**: 为什么服务崩溃？
   → token-counter.service.js require gpt-tokenizer MODULE_NOT_FOUND

2. **Why 2**: 为什么服务器缺这个包？
   → 之前 npm install 因 prisma generate 权限问题中断，导致 node_modules 不完整

3. **Why 3**: 为什么 npm install 会中断？
   → prisma generate 报 Permission denied（node_modules/.bin/prisma 不可执行）

4. **Why 4**: 为什么 prisma 不可执行？
   → chmod +x 未执行（部署脚本 deploy.sh 默认未含此步骤）

5. **Why 5**: 为什么部署脚本没包含 chmod？
   → 部署脚本设计阶段未考虑 node_modules 跨平台复制场景

### D.4 修复成本

- 紧急恢复耗时: ~1 分钟（npm install 单包 37s + PM2 restart + 健康检查）
- 业务影响: 服务 down ~20 分钟（从首次崩溃到恢复）
- 永久修复: 部署脚本增加 `chmod +x node_modules/.bin/*` 步骤（未来需要）

---

## E. EVIDENCE_PACKAGE_ENABLED 当前状态

```bash
$ grep -E 'EVIDENCE_PACKAGE_ENABLED|EVIDENCE' /opt/awkn-life/awkn-life-backend/apps/api-server/.env.prod
NOT SET (default false)
```

- 未设置 = 默认 false
- P1-B 主链路接入代码已部署但灰度关闭
- 业务无影响（按设计意图）
- 启动日志已确认 evidence 路由注册: `/api/v1/admin/consult-records/:id/evidence`

---

## F. 备份点状态

```
/opt/awkn-life-backup-20260627_170641  (部署前，含完整 dist + .env.prod + dev.db)
```

- 紧急回滚可用: `bash /opt/awkn-life/scripts/rollback.sh`
- 本次未触发（修复成功）

---

## G. 相关 E 编号（候选）

根据知识库已有体系，本次复盘应沉淀为：

| 候选 E 编号 | 主题 | 严重度 |
|------------|------|--------|
| E230 | npm install 中断导致 node_modules 不完整 → 部署完整性校验门 | 🔴高 |
| E231 | 单包 npm install 自动补齐缺失依赖 → 故障快速恢复模式 | 🟡中 |
| E232 | 部署后必做 4 验 + unstable_restarts=0 判稳 → 部署验收门升级 | 🟡中 |

---

## H. 相关技术文档（待更新）

### H.1 DEPLOY.md

**现状缺口**:
- 第 2.5 节"一键部署"未包含 `chmod +x node_modules/.bin/*`
- 第六章"健康检查"只提了 1 个 URL，应升级为 4 件套（HTML/JS/健康/API）

### H.2 待新建 PRD（如果不存在）

**现状**: 项目 docs/ 下无 PRD 文件，仅有 execution-plans/Q3-FINAL-RESULT.md
**差异**: P1-B+P2-B 代码已部署但未写入产品需求文档
**建议**: 在 execution-plans/ 下追加 `2026-06-27-P1B-P2B-PRD.md`，记录：
- 一句话定位：主链路增强 evidencePackage 注入 + AgentRun 埋点可观测
- MVP 功能：3 处埋点 + EVIDENCE_PACKAGE_ENABLED 灰度 + @Optional 降级
- 不做清单：v0.2 才做 EVIDENCE_PACKAGE_ENABLED 全量开启 + 报表看板
- 验收用例：灰度关闭 / 灰度开启 / 注入失败 / 埋点失败 4 场景