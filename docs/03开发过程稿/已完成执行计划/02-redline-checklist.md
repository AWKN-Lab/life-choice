# R 段红线操作卡口手册（Red Line Checklist）

> **生成日期**：2026-06-14
> **生效对象**：天火 + 程序员（Session B 执行期）
> **依据**：`00-ceo-action-list-v2.md` 第 67-112 行 R 段 9 项（CEO 2026-06-14 全部批准）
> **使用场景**：每次准备触发 R 段操作时，**先打开本文件**，逐条对照卡口
> **核心原则**：不可逆操作前停下 → 4 项必问 → 解除 → 执行

---

## 0. 一页速查表（30 秒判断）

| R 段 | 操作 | 卡口等级 | 必问 CEO？ | 响应时间 |
|------|------|---------|-----------|---------|
| **R1** | 删除文件/目录/`git reset --hard` | 🔴 不可逆 | ✅ 必须问 | 等审批 |
| **R2** | 改 .env / 密钥 / token / CI/CD | 🔴 不可逆 | ✅ 必须问 | 等审批 |
| **R3** | Prisma migrate / 数据回填 | 🔴 不可逆 | ✅ 必须问 | 等审批 |
| **R4** | `git push --force` / push 到 main | 🟡 局部可恢复 | ✅ 必须问 | 等审批 |
| — | 普通 `git push` 到 feature | 🟢 可恢复 | ❌ 不需要 | 自决 |
| **R5** | `npm install -g` / 系统配置 | 🟡 中 | ✅ 必须问 | 等审批 |
| **R6** | `npm publish` / 部署生产 / 发文 | 🔴 品牌不可逆 | ✅ 必须问 | 等审批 |
| **R7** | 外部合作签约（画师 L0 等） | 🔴 法律风险 | ✅ 必须问 | 等审批 |
| **R8-Hotfix** | 修线上 bug | 🟡 高时效 | ❌ 事后报备 | 分钟级 |
| **R8-常规** | 计划内功能发布 | 🟢 低 | ✅ 提前 1 天 | 24h |
| **R8-大版本** | 架构变更 / 灰度放量 | 🟡 中 | ✅ 提前 3 天 + SOP 演练 | 72h |
| **R9** | 紧急停服（医疗漏拦/P0 故障） | 🔴 兜底 | ❌ Lead 单方面 | 立即 |

---

## R1 · 删除文件 / 目录 / git 历史

### 触发场景
- `rm -rf <path>`（除非路径明确且在 git 跟踪内）
- `git reset --hard` / `git reset HEAD~N --hard`
- `git filter-branch` / `bfg` 改写历史
- `rm -rf .git` / `rm -rf node_modules`（虽然可恢复但耗时长）

### 卡口 4 问（必答）
1. **这是不可逆操作吗？** （是 → 走本卡口）
2. **目标文件/目录是否在 git 跟踪？** （`git ls-files <path>` 验证）
3. **是否已有 backup？** （`/logs` 目录、PM2 dump、Prisma migrate history）
4. **删除后能否用 `git checkout` 恢复？** （不能 → 停下来问 CEO）

### 解除条件
- ✅ 4 问全部答清 + 有 backup + 可恢复
- ✅ 已向 CEO 报告 + 拿到"确认删除"回复

### 错例 vs 正例
```bash
# ❌ 错：没看就删
rm -rf src/old-module

# ✅ 正：先查 git 跟踪 + backup + 问 CEO
git ls-files src/old-module | wc -l  # 确认在跟踪
tar -czf /tmp/old-module-bk-$(date +%Y%m%d).tar.gz src/old-module
# → 报告 CEO：计划删除 X 个文件，backup 在 Y 路径
# → CEO 回复"确认"
rm -rf src/old-module
```

---

## R2 · .env / 密钥 / token / CI/CD 配置

### 触发场景
- 编辑 `.env` / `.env.local` / `.env.production`
- 修改 `*.pem` / `*.key` / `*.p12`（注意：禁止写入，见 rule-security.md）
- 改 GitHub Actions / GitLab CI / Jenkinsfile 密钥段
- 改 K8s Secret / Vault 配置
- 改 PM2 ecosystem.config.js 里的 env 段

### 卡口 4 问
1. **改的是密钥值还是配置结构？** （改值 → 必问；改结构 → 仍要问）
2. **是否会让旧密钥失效导致服务挂掉？** （是 → 灰度切换 + 保留旧值 N 天）
3. **新密钥是否来自密钥管理服务？** （手动复制 → 标记红旗，可能 leak）
4. **是否同步到 `.env.example` 文档？** （示例值用占位符，不写真实密钥）

### 解除条件
- ✅ 已向 CEO 报告 + 拿到"确认改"
- ✅ 若改密钥值：双签 + 旧密钥保留 7 天 + 已轮换
- ✅ `.env.example` 已同步更新

### 错例 vs 正例
```bash
# ❌ 错：直接把新 key 写进文件 + commit
JWT_SECRET=newkey12345
git add .env && git commit -m "update jwt"

# ✅ 正：CEO 审批 + 旧值保留 + 不 commit 真实密钥
# 1) 报告：当前 JWT_SECRET 已用 90 天，建议轮换
# 2) CEO 同意
# 3) 用 secrets manager 注入新值，PM2 env 优先级高于 .env
pm2 restart api-server --update-env
# 4) 监控 24h 无异常 → 删除旧值
# 5) .env.example 保持占位符 JWT_SECRET=__CHANGE_ME__
```

---

## R3 · 数据库 schema 变更 / 数据迁移

### 触发场景
- `npx prisma migrate dev`（生成新 migration）
- `npx prisma migrate deploy`（生产执行）
- SQLite → PostgreSQL 迁移
- 数据回填（UPDATE 大表 / 写入历史数据）
- 删表 / 删列 / 改列类型

### 卡口 4 问
1. **影响行数估算？** （< 1k 行低风险，> 100k 行必须灰度）
2. **是否有回滚 migration？** （`migrate resolve --rolled-back` 演练过吗）
3. **是否需要停服？** （是 → R8 大版本流程；否 → R8 常规）
4. **是否已通知下游依赖方？** （旧字段被引用会 break）

### 解除条件
- ✅ 已在 staging 环境跑过同样 migration
- ✅ 灰度 SOP 明确（1% → 10% → 50% → 100%）
- ✅ 回滚脚本已演练（dry-run 过）
- ✅ CEO 批准

### 错例 vs 正例
```bash
# ❌ 错：直接生产 migrate
npx prisma migrate deploy  # 一行删除 user.email NOT NULL

# ✅ 正：4 阶段 + CEO 审批
# Stage 1: 在 dev 写 migration
npx prisma migrate dev --name add_user_phone_optional
# Stage 2: staging 跑过 + 单元测试 + 集成测试
DATABASE_URL=$STAGING_DB npx prisma migrate deploy
# Stage 3: CEO 审批 B4 检查点（Week 6-8 Prisma 迁移灰度）
# Stage 4: 生产灰度
#   1% 流量（10 个用户）观察 72h
#   10% 流量观察 1 周
#   50% 流量观察 1 周
#   100% 全量
# 任一阶段异常 → 回滚 migrate
npx prisma migrate resolve --rolled-back 20260615_add_phone
```

---

## R4 · git push --force / push 到 main 分支

### 触发场景
- `git push --force` / `git push -f`
- `git push origin main` / `git push origin master`
- PR 合并到 main（用 squash merge 时仍属此列）
- 改 `.github/CODEOWNERS` / 分支保护规则

### 卡口 4 问
1. **为什么需要 force push？** （合法理由：rebase 后清理本地历史 / 删误推的密钥；不合法理由：覆盖别人的提交）
2. **目标分支是什么？** （main/master 必问；feature 不问）
3. **是否通知了所有协作者？** （force 后他人 pull 会冲突）
4. **是否需要先建 backup branch？** （force 前 `git branch backup-$(date +%s)` 留底）

### 解除条件
- ✅ force push 目标不是 main：见下文"普通 push 自决"
- ✅ force push 目标是 main：CEO 必问 + 通知所有协作者 + backup branch 已建

### 普通 push 自决（不需要问 CEO）
- ✅ `git push origin feature/L2-pipeline` 到任何 feature 分支
- ✅ `git push origin fix/xxx` 到修复分支
- ✅ `git push origin <username>/xxx` 到个人命名分支

### 错例 vs 正例
```bash
# ❌ 错：直接 force push main
git push --force origin main  # 覆盖了 3 个人的 commit

# ✅ 正：rebase 后只 force feature 分支
git checkout feature/L2-pipeline
git rebase main
git push --force-with-lease origin feature/L2-pipeline  # 比 --force 安全
# main 分支只走 PR + squash merge，不直 push
```

---

## R5 · 全局依赖 / 系统配置

### 触发场景
- `npm install -g <pkg>` / `pnpm add -g` / `yarn global add`
- `brew install` / `apt install`
- 改 `/etc/hosts` / `~/.zshrc` / `~/.bashrc`
- 改系统 PATH / 装新服务（`systemctl enable`）
- 装 Docker / 装 Python 全局包

### 卡口 4 问
1. **能否改成项目本地依赖？** （能 → 不必全局装）
2. **是否影响其他项目？** （是 → 问 CEO；否 → 看 #3）
3. **是否有官方推荐替代？** （比如 nvm 管理 node，避免装系统 node）
4. **是否需要 sudo？** （要 sudo 必问；不需要看 #1）

### 解除条件
- ✅ 项目本地依赖无法满足（如全局 CLI 工具）
- ✅ CEO 批准（涉及系统级改动）

### 错例 vs 正例
```bash
# ❌ 错：装全局工具但项目已有替代
npm install -g typescript  # 项目已有 npx tsc

# ✅ 正：用 nvm/n 管理版本，全局只装 CLI
nvm install 20.18.0  # 项目根 .nvmrc
npm install -g pnpm  # 必须全局的 CLI
```

---

## R6 · 公开发布 / 部署生产 / 发文

### 触发场景
- `npm publish` / `pnpm publish`
- 部署到生产环境（`pm2 reload production`）
- 发公众号 / 小红书 / 知乎文章
- 公开 API 文档到公网
- 提交到 App Store / Google Play

### 卡口 4 问
1. **是否已通过 QA + CEO 内容审核？** （文章必审；代码必过 CI）
2. **是否有回滚方案？** （生产部署 → 镜像版本号 / 文章 → 删除但有缓存）
3. **发布时间是否避开高峰？** （凌晨低峰 + 公告用户）
4. **是否符合品牌口径？** （对照张半山角色设定 V1.1）

### 解除条件
- ✅ CEO 内容/功能审批
- ✅ 回滚 SOP 演练过
- ✅ 已通知相关方（运维/客服/法务）

---

## R7 · 外部合作签约

### 触发场景
- 画师外包（L0 涉及费用 + 版权）
- 律所 / 会计 / 咨询签约
- 第三方 API 服务采购
- 联合品牌 / 联名活动
- 雇佣合同 / 兼职合同

### 卡口 4 问
1. **合同金额 / 期限 / 知识产权归属？** （写到 issue / doc 里）
2. **是否有标准合同模板？** （法务过审的版本）
3. **对方资质是否核验？** （营业执照 / 作品集 / 过往合同）
4. **付款节奏是否清晰？** （预付 / 验收 / 尾款 + 发票）

### 解除条件
- ✅ CEO 亲签（C7 红线，CEO 签字不可代签）
- ✅ 法务过合同
- ✅ 财务/出纳确认付款路径

---

## R8 · 生产部署（分 3 级）

### R8-Hotfix（分钟级响应）

**场景**：线上 P0/P1 bug，已影响用户

| 步骤 | 动作 | 时间 |
|------|------|------|
| 1 | 修复 + 提交 + 部署 | < 30 min |
| 2 | 事后 30 min 内向 CEO 报备 | 30 min |
| 3 | 1 小时内出 hotfix 复盘 | 1 h |
| 4 | R8 流程不适用 | — |

**不需要 CEO 提前审批**，但需事后补报备。

### R8-常规（24h 审批）

**场景**：计划内功能发布、bug 修复、非紧急迭代

| 步骤 | 动作 | 时间 |
|------|------|------|
| 1 | 提 PR + 跑通 CI | T-24h |
| 2 | CEO 审批（线上 PM 群 / 邮件） | T-12h |
| 3 | 合并到 main | T-2h |
| 4 | 自动部署到生产 | T-0 |
| 5 | 监控 1h 无异常 | T+1h |

### R8-大版本（72h 审批 + SOP 演练）

**场景**：架构变更、灰度放量、数据库 migration

```
T-72h         T-24h           T-0            T+1h
  │             │               │              │
  ▼             ▼               ▼              ▼
CEO 审批    回滚 SOP 演练   灰度 1% 流量    监控 24h
+ 灰度策略   + 监控告警     + 触发放量/回滚
+ 回滚预案   准备就绪       决策点
```

**额外卡口**：
- 5 阶段 SOP（备份 → 灰度 1% → 50% → 100% → 监控 72h）
- 每个放量点设独立回滚决策
- D5 质量门规则全通过

---

## R9 · 紧急停服（Lead 单方面执行）

### 触发条件（任一即触发）
- 🩺 L3 高风险拦截**漏拦**（医疗/法律/金融/生命类）
- 💥 P0 级故障（服务全挂 / 数据泄露 / 安全 breach）
- 📉 度量表出现 1 例医疗漏拦
- 🛑 CEO/法务/合规直接要求

### 5 步必走 SOP

```
[0-2 min]  Step 1: 决策
                  ↓
          后端 Lead 决定"停服 / 降级 / 隔离"
          (不需要 CEO 审批 · 写入 Slack/钉钉)
                  ↓
[2-5 min]  Step 2: 执行
                  ↓
          pm2 stop ecosystem.config.js
          或 nginx -s stop / kubectl scale --replicas=0
                  ↓
[5-10 min] Step 3: 通报
                  ↓
          #incidents 频道 + CEO 微信 + 客服群
          "已停服，影响范围 X，预计恢复 Y"
                  ↓
[10-60 min] Step 4: 根因 + 修复
                  ↓
          5-Why 复盘 + 修复 PR + staging 验证
                  ↓
[60-90 min] Step 5: 复服判断
                  ↓
          CEO 同意 + 灰度 SOP 启动
```

### 复服判断清单
- [ ] 根因已找到 + 修复已 PR
- [ ] staging 环境复现已跑通
- [ ] 监控告警就绪
- [ ] 客服话术已更新
- [ ] CEO 签字放行

### 错例 vs 正例

```
❌ 错：发现漏拦后等 CEO 回复才停
   医疗漏拦 → 5min 内 100 个用户受影响 → 等 CEO 10min 才停

✅ 正：Lead 单方面停服 + 立即报备
   医疗漏拦 → Lead 30s 决定停 → 5min 通报 CEO
   → 30min 出事故复盘 → 1h 修复 PR
```

---

## 10. 触发复盘（不论是否执行 R 段操作）

> 触发 R 段任一红线操作后，**48 小时内**必须出复盘

| 复盘维度 | 必填 |
|---------|------|
| 发生了什么 | 时间线 + 截图 + log |
| 为什么发生 | 5-Why 到根因 |
| 卡口为何失效 | 是未走 R 段？还是 R 段判断错？ |
| 如何避免下次 | SOP/规则更新点 |
| 改进 owner | 谁负责落地改进 |

复盘写入 `docs/dev/incidents/YYYY-MM-DD-<title>.md`。

---

## 11. 不需要问 CEO 的速查（自决区）

> 这些操作**不需要问 CEO**，但要写日志到 `docs/dev/operations/`

- ✅ 普通 `git push` 到 feature 分支
- ✅ 创建/删除 feature branch
- ✅ 改 README / 文档 / 注释
- ✅ 跑测试 / `npm install`（项目本地）
- ✅ 改前端样式 / 文案（非品牌）
- ✅ 加 console.log / 调试代码（注意：非生产）
- ✅ `pm2 restart`（非生产）
- ✅ `git tag` 打 tag
- ✅ 写新文件（非覆盖已有）
- ✅ 提 PR（非合并）

---

## 附录：相关文件

- 拍板文件：`docs/dev/execution/00-ceo-action-list-v2.md`（R 段 line 67-112）
- 总览：`docs/dev/execution/00-overview.md`
- 安全规则：`C:\Users\10919\Desktop\AWKN-Lab\.claude\rules\rule-security.md`
- API 设计：`C:\Users\10919\Desktop\AWKN-Lab\.claude\rules\rule-api-design.md`
- 性能规则：`C:\Users\10919\Desktop\AWKN-Lab\.claude\rules\rule-performance.md`

---

*v1 生成日期：2026-06-14 · Day 1 Session B*
*下次更新：R 段触发后复盘改进点*
