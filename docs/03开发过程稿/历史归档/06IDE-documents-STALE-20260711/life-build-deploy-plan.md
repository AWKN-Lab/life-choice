# 人生决策宗师 — 构建部署计划

> 工程阶段：B-Build → Deploy
> 生成日期：2026-05-31
> 依据：backend-warn-fix-plan.md + git status 审查 + 项目工程文档
> 目标：将本地 40+ 前端修改 + 10+ 新文件 + 20+ 后端修改首次构建并部署到线上

---

## 0. 现状盘点

### 前端（app/）
| 类别 | 数量 | 关键文件 |
|------|------|---------|
| 已修改文件 | 40+ | App.tsx, HomePage.tsx, ResultPage.tsx, ConsultPage.tsx, consultStore.ts 等 |
| 新增文件 | 10+ | MetaphysicsShowcase.tsx, BaguaDiagram.tsx, StarmapDiagram.tsx, WuxingDiagram.tsx, ResultChat.tsx, chat-messages/ (12个组件), ReasoningSteps.tsx, Timeline.tsx, ZhangbanshanOutput.tsx, StyleSwitcher.tsx, styles/ |

### 后端（awkn-life-backend/）
| 类别 | 数量 | 关键文件 |
|------|------|---------|
| 已修改文件 | 20+ | orchestrator.service.ts, llm-gateway.service.ts, main.ts, 各 agent service, 各 agent prompt, consult.service.ts, calc-engine.module.ts, prisma schema |
| 新增文件 | 5+ | memory/user-memory.service.ts, orchestrator/tool-synthesizer.service.ts, orchestrator/zhangbanshan-scheduler.service.ts, lib/atom-tools/ (完整八字/紫微/决策工具库), dunjia-stub.ts |

### 已知线上问题（backend-warn-fix-plan.md）
1. **WARN 1**: 5 个 Agent 的 LLM 注入方式不一致（缺少 `@Inject(LlmProvidersService)`）
2. **WARN 2**: nest-cli.json 缺少 knowledge-base assets 配置，导致课体知识库加载失败

### 部署目标
- 服务器：8.148.245.29（阿里云轻量应用服务器）
- 后端：PM2 运行，端口 3002（ecosystem.config.js），API 前缀 `/api/v1`
- 前端：Nginx 托管静态文件，路径 `/life/`
- 线上地址：`https://awkn.cn/life/`

---

## A. 目标与边界

- **目标一句话**：将人生决策宗师本地全部改动（前端 + 后端 + WARN 修复）首次构建并部署到线上，使 `https://awkn.cn/life/` 可正常访问
- **本轮做**：
  1. 本地前端 build 验证通过
  2. 本地后端 build + typecheck 验证通过
  3. 修复后端 WARN 1（Agent 注入方式）和 WARN 2（nest-cli.json assets）
  4. 将代码同步到服务器
  5. 服务器端构建并重启服务
  6. 线上冒烟验证
- **本轮不做**：
  1. 不做功能新增或需求变更
  2. 不做数据库迁移（Prisma schema 变更后续单独处理）
  3. 不做 HTTPS 证书配置
  4. 不做 Docker 部署（当前用 PM2 + Nginx 模式）
  5. 不做性能优化或监控告警
- **约束与假设**：
  1. 服务器 SSH 可达，有 root/sudo 权限
  2. 服务器 Node.js 20+、PM2、Nginx 已安装
  3. 服务器 .env 配置已存在（密钥不进仓库）
  4. 前端 base 为 `/life/`，Vite 已配置
  5. 后端 API 前缀为 `/api/v1`
  6. Nginx 已配置 `/life/` 路径和 `/api/` 反向代理

---

## B. 选定拆解视角

- **刀法选择**：模块边界（前端 / 后端 / 服务器部署 / 验证）
- **原因**：前端和后端是独立构建单元，部署到服务器是独立操作，验证是独立闭环。按模块边界拆解可以做到每步可验收、失败可回滚。

---

## C. 最小闭环（MVP-0）

- **定义**：本地前端 build 成功 + 后端 build 成功 + 代码同步到服务器 + 服务重启 + 线上首页可访问
- **临时项**：
  - Prisma schema 变更暂不执行 `db push`（后续单独迁移）
  - 新增的 lib/atom-tools 可能需要服务器端 npm install 新依赖

---

## D. 分步清单（8 步）

### Step 1｜本地前端构建验证

- **动作**：在本地 `app/` 目录执行 `npm run build`，确认 Vite 构建无报错
- **产出**：`app/dist/` 目录生成，包含 index.html + assets/
- **验收标准**：
  - 通过：`npm run build` exit code 0，dist/ 目录存在且包含 index.html
  - 失败：构建报错，需修复后重试
- **验证方法**：执行 `npm run build`，检查 exit code 和 dist/ 目录
- **回滚方式**：构建失败不影响线上，无需回滚
- **风险标记**：中（新增组件可能有 import 错误或类型错误）

### Step 2｜本地后端构建验证

- **动作**：在本地 `awkn-life-backend/` 目录执行 `npm run build` + `npm run typecheck`
- **产出**：后端 dist/ 目录生成，TypeScript 编译无错误
- **验收标准**：
  - 通过：`npm run build` exit code 0，`npm run typecheck` exit code 0
  - 失败：编译报错，需修复后重试
- **验证方法**：执行构建和类型检查命令
- **回滚方式**：构建失败不影响线上，无需回滚
- **风险标记**：中（新增模块和修改的 agent 可能有类型错误）

### Step 3｜修复后端 WARN 1 — Agent 注入方式统一

- **动作**：修改 5 个 Agent 文件，将 `@Optional() private readonly llmProviders?` 改为 `@Optional() @Inject(LlmProvidersService) private readonly llmProviders?`
- **产出**：5 个文件修改完成，与 LiurenAgent 注入方式一致
- **验收标准**：
  - 通过：6 个 Agent 文件（含 LiurenAgent）均包含 `@Inject(LlmProvidersService)`
  - 失败：任一文件未匹配
- **验证方法**：`grep -r '@Inject(LlmProvidersService)' *-agent/*.service.ts` 返回 6 行
- **回滚方式**：`git checkout -- *-agent/*.service.ts`
- **风险标记**：低（与已验证可行的 LiurenAgent 方式一致）

**受影响文件**：
1. `awkn-life-backend/apps/api-server/src/ziping-agent/ziping-agent.service.ts`
2. `awkn-life-backend/apps/api-server/src/qimen-agent/qimen-agent.service.ts`
3. `awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts`
4. `awkn-life-backend/apps/api-server/src/ziwei-agent/ziwei-agent.service.ts`
5. `awkn-life-backend/apps/api-server/src/liuyao-agent/liuyao-agent.service.ts`

### Step 4｜修复后端 WARN 2 — nest-cli.json 添加 knowledge-base assets

- **动作**：在 `nest-cli.json` 的 `compilerOptions.assets` 中添加 knowledge-base JSON 文件配置
- **产出**：nest-cli.json 更新，构建时自动复制 knowledge-base JSON 到 dist
- **验收标准**：
  - 通过：nest-cli.json 包含 `**/knowledge-base/**/*.json` 配置
  - 失败：配置缺失
- **验证方法**：`cat nest-cli.json | grep knowledge-base` 有输出
- **回滚方式**：`git checkout -- nest-cli.json`
- **风险标记**：低

**修改内容**：
```json
{
  "assets": [
    { "include": "**/prompts/*.md", "watchAssets": true },
    { "include": "**/knowledge-base/**/*.json", "watchAssets": true }
  ]
}
```

### Step 5｜本地二次构建验证（WARN 修复后）

- **动作**：重新执行前端和后端构建，确认 WARN 修复后构建仍然通过
- **产出**：前端 dist/ + 后端 dist/ 均生成成功
- **验收标准**：
  - 通过：前端 build exit 0 + 后端 build exit 0
  - 失败：任一构建失败
- **验证方法**：执行构建命令
- **回滚方式**：回退 Step 3/4 的修改
- **风险标记**：低

### Step 6｜代码同步到服务器

- **动作**：将本地代码同步到服务器 `/opt/awkn-life/`
- **产出**：服务器代码与本地一致
- **验收标准**：
  - 通过：服务器上关键文件（新组件、修改的 agent 文件、nest-cli.json）与本地一致
  - 失败：文件不一致或传输中断
- **验证方法**：SSH 到服务器检查关键文件
- **回滚方式**：服务器代码未构建前，不影响运行中的服务
- **风险标记**：中（需确保不覆盖 .env 等配置文件）

**同步策略**：
- 方案 A（推荐）：`rsync` 排除 node_modules、.env、dist、prisma/*.db
- 方案 B：`scp` 打包传输
- 方案 C：git push + 服务器 git pull（如果服务器有 git remote）

**排除清单**：
- `node_modules/`
- `.env` / `.env.prod` / `.env.local`
- `dist/`
- `prisma/*.db`
- `logs/`
- `.trae/`

### Step 7｜服务器端构建并重启

- **动作**：
  1. 服务器端 `cd /opt/awkn-life/awkn-life-backend && npm ci --legacy-peer-deps`
  2. `cd apps/api-server && npx prisma generate`
  3. `npm run build`
  4. `cd /opt/awkn-life/app && npm ci --legacy-peer-deps`
  5. `VITE_API_BASE_URL=/api npx vite build`
  6. `pm2 restart awkn-life-backend`
  7. 如需更新 Nginx 静态文件：`cp -r /opt/awkn-life/app/dist/* /usr/share/nginx/html/`
- **产出**：服务器端服务重启，新代码生效
- **验收标准**：
  - 通过：PM2 进程状态 online，`pm2 logs` 无启动错误
  - 失败：PM2 进程 errored 或 stopped
- **验证方法**：`pm2 list` + `pm2 logs --lines 30`
- **回滚方式**：
  - PM2 回滚：`pm2 restart awkn-life-backend`（回退到上一个版本需恢复旧代码）
  - Nginx 回滚：恢复旧 dist 备份
- **风险标记**：高（服务重启可能影响在线用户）

**备份策略**（执行前必须）：
```bash
# 备份当前 dist
cp -r /opt/awkn-life/app/dist /opt/awkn-life/app/dist.bak.$(date +%Y%m%d_%H%M%S)
# 备份当前后端代码（git commit 或 tar）
cd /opt/awkn-life/awkn-life-backend && git add -A && git commit -m "WIP 备份: $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
```

### Step 8｜线上冒烟验证

- **动作**：验证线上服务功能正常
- **产出**：验证结果记录
- **验收标准**：
  - 通过：以下全部通过
  - 失败：任一项失败需排查
- **验证方法**：

| 验证项 | 方法 | 期望结果 |
|--------|------|---------|
| 首页可访问 | `curl -s -o /dev/null -w "%{http_code}" https://awkn.cn/life/` | HTTP 200 |
| API 健康检查 | `curl -s https://awkn.cn/api/v1/health` | `{"status":"ok"}` |
| 前端静态资源 | 浏览器访问 https://awkn.cn/life/ 检查 JS/CSS 加载 | 无 404 |
| 后端无 WARN | `pm2 logs --lines 50` | 无 "Agent LLM 未配置" 和 "加载课体知识库失败" |
| 核心功能 | 浏览器提交一次八字咨询 | 正常返回结果 |

- **回滚方式**：
  - 前端回滚：恢复 dist 备份
  - 后端回滚：恢复旧代码 + `pm2 restart`
- **风险标记**：低（只读验证）

---

## E. 高风险清单

| 步骤 | 风险 | 缓解措施 |
|------|------|---------|
| Step 1 | 新组件 import 错误导致构建失败 | 本地验证，不影响线上 |
| Step 2 | 后端类型错误导致构建失败 | 本地验证，不影响线上 |
| Step 6 | rsync 覆盖 .env 导致密钥丢失 | 排除 .env 文件 |
| Step 7 | 服务重启失败 | 先备份，PM2 自动重启，有回滚方案 |
| Step 7 | 新依赖安装失败 | `npm ci --legacy-peer-deps`，检查 package-lock.json |
| Step 7 | Prisma schema 变更需迁移 | 本轮不执行 db push，后续单独处理 |

---

## F. 最终验收（DoD）

### 用户可见体验
1. `https://awkn.cn/life/` 首页正常加载，展示新版首页组件（MetaphysicsShowcase、八卦图、星盘图、五行图）
2. 咨询流程正常：选择入口 → 输入信息 → 获得结果
3. 结果页展示新版组件（ResultChat、chat-messages、Timeline、ZhangbanshanOutput）

### 系统可观测性
4. `pm2 logs` 无 "Agent LLM 未配置" WARN
5. `pm2 logs` 无 "加载课体知识库失败" WARN
6. API 健康检查端点返回正常

### 稳定性
7. 服务重启后连续运行 10 分钟无崩溃
8. 核心咨询流程连续 3 次通过

### 回归清单
1. 首页加载正常
2. 八字咨询入口可达
3. 六壬咨询入口可达
4. 结果页正常展示
5. API 健康检查通过

---

## G. 执行顺序总结

```
Step 1: 本地前端 build → 验证
Step 2: 本地后端 build + typecheck → 验证
Step 3: 修复 WARN 1（5 个 Agent 注入方式）→ 验证
Step 4: 修复 WARN 2（nest-cli.json assets）→ 验证
Step 5: 本地二次 build → 验证
Step 6: 代码同步到服务器 → 验证
Step 7: 服务器端构建 + 重启 → 验证
Step 8: 线上冒烟验证 → 完成
```

每步验收不通过，不进入下一步。
