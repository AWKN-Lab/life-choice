# 复盘目录操作日志

> 本文件记录 apps/AWKN-LABlife/docs/复盘/ 目录的所有操作
> 按 awkn-知识库 5 步自动归档：保存产出物 → _log → 更新关联 → 索引 → 进度

---

## [2026-06-27 17:30] Ingest | P1-B+P2-B 部署深度复盘

**触发**：用户指令 `@天火 深度复盘 @复盘 将结果更新技术文档，执行过程中的差异点更新回PRD文档`

**来源**：会话 2026-06-27 部署会话（gpt-tokenizer MODULE_NOT_FOUND 故障 + 单包 npm install 恢复）

### 操作清单

#### 归档 1 - 保存 raw 原始证据
- **新建**: `raw/2026-06-27-p1b-p2b-deployment-evidence.md`
- **内容**: 部署前代码状态 + 部署过程原始日志 + 恢复过程 + 差异点 5 Why 根因分析
- **目的**: 事实源头，未提炼

#### 归档 2 - Wiki 页面（E 经验）
- **新建**: `E230_npm-install中断导致node_modules不完整_部署完整性校验门.md`
  - 主题: 部署完整性校验门（chmod + node -e require.resolve）
  - 严重度: 🔴 critical
  - 关联 E: E132, E217
- **新建**: `E231_单包npm-install自动补齐缺失依赖_故障快速恢复模式.md`
  - 主题: 单包 npm install 自动补齐 98 个依赖的快速恢复手段
  - 严重度: 🟡 medium
  - 关联 E: E230, E132
- **新建**: `E232_部署后必做4验_unstable_restarts判稳_部署验收门升级.md`
  - 主题: 部署后 5 件套验证（HTML/JS/Health/API/Stable）
  - 严重度: 🟡 medium
  - 关联 E: E217, E230, E-L2-5

#### 归档 3 - 决策文档
- **新建**: `2026-06-27_P1B-P2B部署复盘决策.md`
  - 主题: P1-B+P2-B 部署全过程时序 + 候选方案 + 最终决策
  - 决策: 采纳方案 A（单包 npm install + PM2 restart）
  - 关联 E: E230, E231, E232, E217, E132

#### 归档 4 - PRD 文档
- **新建**: `2026-06-27_P1B-P2B-PRD.md`
  - 主题: 主链路 evidencePackage 接入 + AgentRun 埋点
  - 版本: v0.1（已上线）
  - 上线日期: 2026-06-27
  - 上线结果: ✅ PASS

#### 归档 5 - 更新技术文档
- **更新**: `DEPLOY.md`
  - 新增 2.6 节"部署完整性校验"（E230 落地）
  - 升级第六章"健康检查"为 5 件套（E232 落地）
- **更新**: `deploy.sh`
  - 新增"chmod + 完整性校验门"（Q3 P0-6）
  - 新增"部署后 5 件套验证"（Q3 P0-7）
- **新建**: `scripts/verify-deploy.sh`
  - 5 件套验证脚本（HTML title + JS 哈希 + 健康 + API 404 + unstable_restarts）

### 完成标准验证

- [x] raw 证据保存（1 个文件）
- [x] 3 条 E 经验沉淀（E230/E231/E232）
- [x] 1 条部署决策文档
- [x] 1 个 PRD 文档
- [x] DEPLOY.md 更新（增加 2.6 + 第六章升级）
- [x] deploy.sh 更新（增加 Q3 P0-6 + Q3 P0-7）
- [x] verify-deploy.sh 新增
- [x] _log.md 记录

### 待用户手动同步（沙箱限制）

由于工具沙箱不允许写入 `C:\Users\10919\Desktop\AWKN-Lab\记忆系统\` 路径，以下同步需用户手动：

1. **E 编号索引表同步**：
   - 复制 `E230_*.md` `E231_*.md` `E232_*.md` 到 `记忆系统/02-evolution/`
   - 在 `记忆系统/00-memory-control/E编号索引表.md` 第 69 行后追加 3 行

2. **01-decisions 索引同步**：
   - 复制 `2026-06-27_P1B-P2B部署复盘决策.md` 到 `记忆系统/01-decisions/`
   - 在 `记忆系统/01-decisions/_index.md` 第 25 行后追加 1 行

3. **session-006 创建**：
   - 在 `记忆系统/03-sessions/2026-06-27/session-006.md` 中记录本次会话摘要

### 部署后服务状态

- PM2 awkn-life-backend: online, uptime 2m+
- 健康检查: 3/3 通过
- 5 件套验证: 全通过
- EVIDENCE_PACKAGE_ENABLED: 未设置 = 默认 false（符合设计）
- 备份点: /opt/awkn-life-backup-20260627_170641

### 后续待办

1. 升级 deploy.sh（已写入，等下次部署生效）
2. 新增 verify-deploy.sh（已写入，下次部署可调用）
3. EVIDENCE_PACKAGE_ENABLED 灰度验证（默认 false → true）
4. UC1 线上连续 10 次真实问事验证
5. 知识库手动同步（见上方"待用户手动同步"）