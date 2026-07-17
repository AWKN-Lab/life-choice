# 人生决策宗师 — 服务器端启动修复 & 部署计划 v2

> 生成日期：2026-05-31
> 状态：Plan Mode
> 依据：上一轮部署卡在 Step 7（PM2 online 但 NestJS 未启动）的根因分析

---

## 0. 上一轮卡点根因分析

### 症状
- PM2 进程 `awkn-life-backend` 显示 online，但端口 3002 不监听
- 无 NestFactory 启动日志输出
- 重启计数 246 次

### 根因链
1. **node_modules 从 Windows 上传** → 包含 `@esbuild/win32-x64` 原生二进制
2. **tsx 依赖 esbuild** → esbuild 找到 Windows 二进制而非 Linux 二进制 → 静默失败
3. **服务器端 npm install OOM** → 2GB 内存 + PM2 运行中 → 无法完整重装
4. **bcrypt 原生二进制不兼容** → `invalid ELF header`（已修为 bcryptjs，但 package.json 未同步）

### 额外发现：package.json 未同步 bcryptjs
- 源码已改为 `import * as bcrypt from 'bcryptjs'`
- 但 `package.json`（根级 + apps/api-server）仍依赖 `bcrypt`，未添加 `bcryptjs`
- **后果**：`npm install` 不会安装 `bcryptjs`，运行时 `Cannot find module 'bcryptjs'`

---

## A. 目标与边界

- **目标一句话**：修复服务器端后端启动失败问题，将人生决策宗师完整部署到线上
- **本轮做**：
  1. 修复本地 package.json（bcrypt → bcryptjs）
  2. 本地预编译后端（npm run build），生成 dist/
  3. 改用「预编译 + node 直接运行」方案替代 tsx 运行
  4. 同步代码到服务器
  5. 服务器端清理 + 重装依赖 + 启动
  6. 冒烟验证
- **本轮不做**：
  1. 不做功能新增
  2. 不做 Prisma schema 迁移（db push）
  3. 不做 Docker 化
  4. 不做 HTTPS 证书
  5. 不做性能优化
- **约束**：
  1. 服务器 2GB RAM，npm install 需先停 PM2
  2. 服务器磁盘已清理至 6.7G 可用
  3. .env 已存在于服务器，不覆盖
  4. 前端 dist/ 已上传到服务器（上一轮 Step 6 完成）

---

## B. 拆解视角

- **刀法**：模块边界（本地修复 → 本地构建 → 服务器部署 → 验证）
- **原因**：本地修复和构建是零风险操作，服务器部署是高风险操作，验证是独立闭环

---

## C. 核心策略变更：tsx 运行 → 预编译运行

| 维度 | 旧方案（tsx 运行） | 新方案（预编译运行） |
|------|-------------------|---------------------|
| 服务器运行方式 | `node_modules/tsx/dist/cli.mjs apps/api-server/src/main.ts` | `node dist/apps/api-server/src/main.js` |
| 服务器是否需要 tsx | ✅ 需要 | ❌ 不需要 |
| 服务器是否需要 esbuild | ✅ 需要（tsx 依赖） | ❌ 不需要 |
| 原生二进制风险 | 高（Windows/Linux 不兼容） | 无（纯 JS 运行） |
| 服务器 npm install | 需装 devDependencies（tsx/esbuild） | 只需 production 依赖 |
| 内存占用 | 高（tsx + esbuild 运行时编译） | 低（直接运行 JS） |

**结论**：预编译方案彻底消除 tsx/esbuild 原生二进制问题，且减少服务器依赖和内存占用。

---

## D. 分步清单（7 步）

### Step 1｜修复 package.json：bcrypt → bcryptjs

- **动作**：
  1. 根级 `package.json`：删除 `"bcrypt": "^5.1.1"`，添加 `"bcryptjs": "^2.4.3"`；删除 `"@types/bcrypt": "^5.0.2"`，添加 `"@types/bcryptjs": "^2.4.6"`
  2. `apps/api-server/package.json`：同上操作
- **产出**：两个 package.json 的 bcrypt 依赖替换为 bcryptjs
- **验收标准**：
  - 通过：`grep -r "bcryptjs" package.json apps/api-server/package.json` 返回 2 行
  - 通过：`grep '"bcrypt"' package.json apps/api-server/package.json` 返回 0 行
- **验证方法**：grep 检查
- **回滚方式**：`git checkout -- package.json apps/api-server/package.json`
- **风险标记**：低

### Step 2｜本地安装 bcryptjs 并验证

- **动作**：
  1. `cd awkn-life-backend && npm install bcryptjs @types/bcryptjs --save`
  2. `cd apps/api-server && npm install bcryptjs @types/bcryptjs --save`
- **产出**：本地 node_modules 包含 bcryptjs
- **验收标准**：
  - 通过：`node -e "require('bcryptjs')"` 无报错
- **验证方法**：node require 测试
- **回滚方式**：`npm uninstall bcryptjs @types/bcryptjs`
- **风险标记**：低

### Step 3｜本地预编译后端

- **动作**：
  1. `cd awkn-life-backend && npm run build`
  2. 确认 `apps/api-server/dist/` 目录生成，包含 `main.js`
- **产出**：`apps/api-server/dist/main.js` 及其他编译产物
- **验收标准**：
  - 通过：`ls apps/api-server/dist/main.js` 存在
  - 通过：构建 exit code 0
- **验证方法**：检查 dist 目录
- **回滚方式**：`rm -rf apps/api-server/dist`
- **风险标记**：中（编译可能暴露类型错误）

### Step 4｜修改 ecosystem.config.js 为预编译运行

- **动作**：修改 PM2 配置，从 tsx 运行改为 node 直接运行编译后的 JS
- **产出**：新的 ecosystem.config.js
- **验收标准**：
  - 通过：script 指向 `dist/apps/api-server/src/main.js`
  - 通过：不再依赖 tsx
- **验证方法**：cat ecosystem.config.js 检查
- **回滚方式**：`git checkout -- ecosystem.config.js`
- **风险标记**：低

**修改内容**：
```javascript
module.exports = {
  apps: [
    {
      name: "awkn-life-backend",
      script: "dist/apps/api-server/src/main.js",
      cwd: "/opt/awkn-life/awkn-life-backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        // ... 其余 env 不变
      },
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_file: "./logs/backend-combined.log",
      time: true,
    },
  ],
};
```

**关键变更**：
- `script`: `"node_modules/tsx/dist/cli.mjs"` → `"dist/apps/api-server/src/main.js"`
- `args`: `"apps/api-server/src/main.ts"` → 删除（不需要参数）

### Step 5｜代码同步到服务器

- **动作**：
  1. 将本地代码（含 dist/）同步到服务器 `/opt/awkn-life/awkn-life-backend/`
  2. 排除 node_modules、.env、logs
- **产出**：服务器代码与本地一致，包含编译后的 dist/
- **验收标准**：
  - 通过：服务器上 `ls /opt/awkn-life/awkn-life-backend/dist/apps/api-server/src/main.js` 存在
  - 通过：服务器上 `cat /opt/awkn-life/awkn-life-backend/ecosystem.config.js` 显示新配置
- **验证方法**：SSH 检查
- **回滚方式**：服务器代码未重启前不影响运行中的服务
- **风险标记**：中

**同步命令**：
```bash
# 从本地 Windows 执行
scp -r awkn-life-backend/dist root@8.148.245.29:/opt/awkn-life/awkn-life-backend/
scp awkn-life-backend/ecosystem.config.js root@8.148.245.29:/opt/awkn-life/awkn-life-backend/
scp awkn-life-backend/package.json root@8.148.245.29:/opt/awkn-life/awkn-life-backend/
scp awkn-life-backend/apps/api-server/package.json root@8.148.245.29:/opt/awkn-life/awkn-life-backend/apps/api-server/
# 同步源码（确保 agent 修复、nest-cli.json 等都同步）
scp -r awkn-life-backend/apps root@8.148.245.29:/opt/awkn-life/awkn-life-backend/
scp -r awkn-life-backend/prisma root@8.148.245.29:/opt/awkn-life/awkn-life-backend/
scp -r awkn-life-backend/scripts root@8.148.245.29:/opt/awkn-life/awkn-life-backend/
```

### Step 6｜服务器端清理 + 重装依赖 + 启动

- **动作**：
  1. SSH 到服务器
  2. 停止 PM2：`pm2 stop awkn-life-backend`
  3. 删除旧的 node_modules：`rm -rf /opt/awkn-life/awkn-life-backend/node_modules`
  4. 安装生产依赖：`cd /opt/awkn-life/awkn-life-backend && npm install --production --legacy-peer-deps`
  5. 生成 Prisma Client：`npx prisma generate`
  6. 清除旧日志：`> logs/backend-out.log && > logs/backend-error.log`
  7. 启动 PM2：`pm2 start ecosystem.config.js`
  8. 等待 5 秒，检查状态
- **产出**：后端服务以预编译方式运行
- **验收标准**：
  - 通过：`pm2 list` 显示 online，restart count = 0
  - 通过：`ss -tlnp | grep 3002` 有输出
  - 通过：`pm2 logs --lines 20` 显示 `🚀 API Server running on http://localhost:3002`
  - 失败：PM2 errored/stopped，或端口不监听
- **验证方法**：pm2 list + ss + curl
- **回滚方式**：
  1. `pm2 stop awkn-life-backend`
  2. 恢复旧 ecosystem.config.js
  3. 恢复旧 node_modules（如有备份）
  4. `pm2 start ecosystem.config.js`
- **风险标记**：高

**备份策略**（执行前）：
```bash
# 备份当前 ecosystem.config.js
cp /opt/awkn-life/awkn-life-backend/ecosystem.config.js /opt/awkn-life/awkn-life-backend/ecosystem.config.js.bak
# 备份前端 dist（上一轮已部署）
cp -r /opt/awkn-life/app/dist /opt/awkn-life/app/dist.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
```

**OOM 防护**：
- npm install 前必须先 `pm2 stop awkn-life-backend`
- 如果 npm install 仍然 OOM，添加 swap：
  ```bash
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  ```

**npm install --production 的好处**：
- 不安装 devDependencies（tsx、esbuild、jest、@types/* 等）
- 大幅减少安装包数量和内存占用
- 避免 esbuild 原生二进制问题

### Step 7｜线上冒烟验证

- **动作**：验证线上服务功能正常
- **产出**：验证结果记录
- **验收标准**：

| 验证项 | 方法 | 期望结果 |
|--------|------|---------|
| 后端健康检查 | `curl -s http://localhost:3002/api/v1/health` | `{"status":"ok"}` |
| PM2 无 WARN | `pm2 logs --lines 50` | 无 "Agent LLM 未配置" 和 "加载课体知识库失败" |
| 前端首页 | `curl -s -o /dev/null -w "%{http_code}" https://awkn.cn/life/` | HTTP 200 |
| API 反代 | `curl -s https://awkn.cn/api/v1/health` | `{"status":"ok"}` |
| 服务稳定 | 等待 2 分钟后 `pm2 list` | online，restart count 不变 |

- **验证方法**：逐项 curl + pm2 logs
- **回滚方式**：恢复旧 dist 备份 + 旧后端代码
- **风险标记**：低（只读验证）

---

## E. 高风险清单

| 步骤 | 风险 | 缓解措施 | Plan B |
|------|------|---------|--------|
| Step 3 | 编译报类型错误 | 本地验证，不影响线上 | 逐个修复类型错误 |
| Step 6 | npm install OOM | 先停 PM2，必要时加 swap | 使用 `fallocate` 创建 1G swap |
| Step 6 | npm registry 超时 | 使用 `--registry=https://registry.npmjs.org/` | 使用淘宝镜像 |
| Step 6 | Prisma generate 失败 | 确保 schema.prisma 已同步 | 手动执行 `npx prisma generate` |
| Step 6 | 启动后端口不监听 | 检查 `pm2 logs` 和 `ss -tlnp` | 直接 `node dist/apps/api-server/src/main.js` 调试 |

---

## F. 最终验收（DoD）

### 用户可见体验
1. `https://awkn.cn/life/` 首页正常加载
2. 咨询流程正常：选择入口 → 输入信息 → 获得结果
3. 结果页展示新版组件

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
Step 1: 修复 package.json（bcrypt → bcryptjs）→ 验证
Step 2: 本地安装 bcryptjs → 验证
Step 3: 本地预编译后端（npm run build）→ 验证
Step 4: 修改 ecosystem.config.js（tsx → node dist/）→ 验证
Step 5: 代码同步到服务器（含 dist/）→ 验证
Step 6: 服务器端清理 + 重装 + 启动 → 验证
Step 7: 线上冒烟验证 → 完成
```

每步验收不通过，不进入下一步。

---

## H. 与上一轮计划的差异

| 维度 | 上一轮（v1） | 本轮（v2） |
|------|-------------|-----------|
| 服务器运行方式 | tsx 实时编译 TypeScript | node 直接运行预编译 JS |
| 服务器依赖 | 需 tsx + esbuild（含原生二进制） | 只需 production 依赖 |
| node_modules 来源 | Windows 上传（二进制不兼容） | 服务器端 npm install（原生二进制正确） |
| bcrypt 处理 | 仅改源码 import | 源码 + package.json 同步修改 |
| npm install 范围 | 全量安装 | `--production` 只装运行时依赖 |
| OOM 风险 | 高（全量安装 + PM2 运行） | 低（production 安装 + 先停 PM2） |

---

## I. 复盘记录

### 上一轮卡点
- Step 7 服务器端后端启动失败
- 根因：Windows node_modules 上传导致 esbuild/bcrypt 原生二进制不兼容
- tsx 运行方式在跨平台部署场景下不可靠

### 下次遇到类似情况，先做哪 3 件事？
1. 查看当前状态（pm2 logs + ss -tlnp）
2. 备份当前版本
3. 读取完整文件并确认修改位置
