# 修复生产环境 404 错误 — 重新构建与部署

> 日期：2026-05-30
> 问题：`https://awkn.cn/life/` 多个 JS chunk 文件返回 404

---

## 问题分析

### 错误现象
```
GET https://awkn.cn/life/assets/languageStore-BYk8z6Jp.js → 404
GET https://awkn.cn/life/assets/userProfileStore-C7xWjebQ.js → 404
GET https://awkn.cn/life/assets/HomePage-DzCgGZJl.js → 404
GET https://awkn.cn/life/assets/consult-DRX1Fotx.js → 404
GET https://awkn.cn/life/assets/FrontdeskChat-ClPnXDuk.js → 404
```

### 根因
新增组件（HeroBanner、CriticalMoments、EngineFeatures、HomeFAQ）改变了 Vite 代码分割的 chunk 内容和哈希值。服务器上的 `index.html` 引用了新的 chunk 哈希，但对应的 JS 文件未上传到服务器。

### 服务器信息（来自 deploy-checklist.md）
- SSH 别名：`aliyun-awkn`（即 `8.148.245.29`）
- 前端静态文件目录：`/www/wwwroot/awkn-lab/life/`
- 后端端口：3002（PM2 实际监听，非 ecosystem.config.js 中的 3000）
- 域名：`awkn.cn`，子路径：`/life/`

---

## 执行计划

### Step 1：本地重新构建前端
```bash
cd C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\AWKN-LABlife\app
npm run build
```
- 验证：`dist/` 目录生成，`dist/assets/` 包含新的 chunk 文件
- 确认 `dist/index.html` 存在且引用了正确的 chunk 哈希

### Step 2：验证构建产物完整性
- 检查 `dist/assets/` 中是否包含关键 chunk：
  - `HomePage-*.js`
  - `languageStore-*.js`
  - `userProfileStore-*.js`
  - `consult-*.js`
  - `FrontdeskChat-*.js`
  - `vendor-react-*.js`
  - `index-*.js`
  - `index.css`
- 确认 `dist/index.html` 的 `<script>` 和 `<link>` 标签引用的文件都存在于 `dist/assets/`

### Step 3：部署前预验证（SSH 到服务器）
```bash
# 1. 确认后端端口
ssh aliyun-awkn "ss -tlnp | grep awkn-life"

# 2. 确认 PM2 状态
ssh aliyun-awkn "pm2 list | grep awkn-life"

# 3. 确认 API health
curl -sI "https://awkn.cn/api/health"

# 4. 确认 Nginx 静态文件实际路径
ssh aliyun-awkn "nginx -T 2>/dev/null | grep -A5 'location /life'"
```

### Step 4：备份服务器当前前端
```bash
ssh aliyun-awkn "cp -r /www/wwwroot/awkn-lab/life /www/wwwroot/awkn-lab/life.bak-$(date +%Y%m%d%H%M%S)"
```

### Step 5：上传新构建产物（rsync --delete）
```bash
rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no" \
  /c/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/app/dist/ \
  aliyun-awkn:/www/wwwroot/awkn-lab/life/
```
> ⚠️ 必须用 `rsync --delete`，禁止 `scp -r`（教训 E-A7：scp 导致旧文件残留）

### Step 6：设置权限 + reload Nginx
```bash
ssh aliyun-awkn "chmod -R a+rX /www/wwwroot/awkn-lab/life/ && nginx -s reload"
```

### Step 7：部署后验证
```bash
# 1. API health（先测后端，教训 E-A8）
curl -sI "https://awkn.cn/api/health"

# 2. 前端首页
curl -sI "https://awkn.cn/life/"

# 3. 关键 JS 文件（从 dist/assets/ 中取实际文件名）
curl -sI "https://awkn.cn/life/assets/index-*.js"
curl -sI "https://awkn.cn/life/assets/HomePage-*.js"
curl -sI "https://awkn.cn/life/assets/vendor-react-*.js"

# 4. CSS 文件
curl -sI "https://awkn.cn/life/assets/index.css"
```

### Step 8：清理旧备份（验证通过后）
```bash
ssh aliyun-awkn "ls -la /www/wwwroot/awkn-lab/ | grep life.bak"
ssh aliyun-awkn "rm -rf /www/wwwroot/awkn-lab/life.bak-XXXXXXXX"
```

---

## 回滚方案

如任何步骤失败：
```bash
ssh aliyun-awkn "rm -rf /www/wwwroot/awkn-lab/life && mv /www/wwwroot/awkn-lab/life.bak-XXXXXXXX /www/wwwroot/awkn-lab/life && nginx -s reload"
curl -sI "https://awkn.cn/api/health"
```

---

## 风险点

| 风险 | 缓解措施 |
|------|---------|
| rsync 不可用（Windows） | 备选：scp -r 先上传，再 SSH 删除旧文件 |
| Nginx 静态路径不是 `/www/wwwroot/awkn-lab/life/` | Step 3 先确认实际路径 |
| 构建失败 | 先本地 `npm run build` 确认无错误 |
| 后端不在线 | Step 3 预验证，先修后端再部署前端 |

---

## 经验教训引用

| 编号 | 教训 |
|------|------|
| E-A6 | 部署前必须验证后端端口 |
| E-A7 | 上传必须用 rsync --delete |
| E-A8 | 部署后先 API health 再前端 |
| E-A10 | 部署必须先备份 |
