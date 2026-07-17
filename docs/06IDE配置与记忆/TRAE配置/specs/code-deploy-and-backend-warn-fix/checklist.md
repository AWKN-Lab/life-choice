# Checklist: 代码部署与后端WARN修复

## Phase 1: 代码打包

- [ ] **Phase 1 Complete**: 本地代码已打包上传
  - [ ] Git status 显示无未提交修改（或已提交）
  - [ ] 压缩包已上传到服务器 `/opt/awkn-life/`

---

## Phase 2: 后端 WARN 修复

- [ ] **Phase 2 Complete**: 后端 WARN 已修复

### Agent 注入修复验证

- [ ] ZipingAgent 包含 `@Optional() @Inject(LlmProvidersService)`
- [ ] QimenAgent 包含 `@Optional() @Inject(LlmProvidersService)`
- [ ] QumingAgent 包含 `@Optional() @Inject(LlmProvidersService)`
- [ ] ZiweiAgent 包含 `@Optional() @Inject(LlmProvidersService)`
- [ ] LiuyaoAgent 包含 `@Optional() @Inject(LlmProvidersService)`
- [ ] LiurenAgent 保持原有正确配置

### 知识库配置验证

- [ ] nest-cli.json 包含 `**/knowledge-base/**/*.json` assets 配置
- [ ] 备份文件 `nest-cli.json.bak` 已创建

### 构建与启动验证

- [ ] `npm run build` 成功完成（exit code 0）
- [ ] PM2 服务正常运行
- [ ] `pm2 logs` 中不再出现 "Agent LLM 未配置" WARN
- [ ] `pm2 logs` 中不再出现 "课体知识库加载失败" WARN

---

## Phase 3: 前端部署

- [ ] **Phase 3 Complete**: 前端已部署

### 构建验证

- [ ] `npm run build` 成功完成
- [ ] dist/assets/ 包含所有 chunk 文件

### 部署验证

- [ ] `/usr/share/nginx/html/assets/` 包含最新构建文件
- [ ] 备份文件 `/usr/share/nginx/html.bak.*/` 已创建
- [ ] Nginx 配置测试通过（`nginx -t`）

### 功能验证

- [ ] 访问 https://awkn.cn/life/ 返回 200
- [ ] 页面 HTML 正常加载
- [ ] 无 JS/CSS 资源 404 错误
- [ ] 登录功能正常（401 问题已修复）
- [ ] 核心功能页面可正常访问

---

## 最终验收

- [ ] **所有 Phase 完成**
- [ ] **两个 WARN 均已修复**
- [ ] **前端页面正常加载，无 404 错误**
- [ ] **后端服务正常运行**
- [ ] **部署文档已更新**（如有需要）
