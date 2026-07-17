# Tasks: 代码部署与后端WARN修复

## Phase 1: 本地代码打包

- [ ] **Task 1.1**: 检查 Git 状态并提交本地修改
  - 运行 `git status` 查看修改文件列表
  - 添加所有修改和新文件到暂存区
  - 提交代码（使用描述性提交信息）

- [ ] **Task 1.2**: 打包完整项目目录
  - 排除 node_modules、dist、.git 等目录
  - 生成带时间戳的压缩包

- [ ] **Task 1.3**: 上传压缩包到服务器
  - 使用 scp 上传到 `/opt/awkn-life/`
  - 验证上传成功

---

## Phase 2: 后端 WARN 修复

- [ ] **Task 2.1**: SSH 连接到服务器并解压代码
  - 解压到 `/opt/awkn-life/`
  - 确认文件结构正确

- [ ] **Task 2.2**: 修复 ZipingAgent 注入方式
  - 找到 `llmProviders` 参数
  - 添加 `@Optional() @Inject(LlmProvidersService)` 装饰器

- [ ] **Task 2.3**: 修复 QimenAgent 注入方式
  - 同上

- [ ] **Task 2.4**: 修复 QumingAgent 注入方式
  - 同上

- [ ] **Task 2.5**: 修复 ZiweiAgent 注入方式
  - 同上

- [ ] **Task 2.6**: 修复 LiuyaoAgent 注入方式
  - 同上

- [ ] **Task 2.7**: 修复 nest-cli.json assets 配置
  - 备份原文件
  - 添加 `**/knowledge-base/**/*.json` 到 assets

- [ ] **Task 2.8**: 构建并重启后端
  - 运行 `npm run build`
  - 重启 PM2 服务
  - 检查日志确认 WARN 消失

---

## Phase 3: 前端部署

- [ ] **Task 3.1**: 在服务器构建前端
  - 进入 `app/` 目录
  - 设置 `VITE_API_BASE_URL=https://awkn.cn/api`
  - 运行 `npm run build`

- [ ] **Task 3.2**: 部署前端到 Nginx
  - 备份当前 `/usr/share/nginx/html/`
  - 解压前端构建到 Nginx 目录
  - 验证文件结构

- [ ] **Task 3.3**: 重载 Nginx 并验证
  - 运行 `nginx -t && systemctl reload nginx`
  - 访问 https://awkn.cn/life/ 验证页面正常

---

## Task Dependencies

```
Task 1.1 → Task 1.2 → Task 1.3
                           ↓
                    Task 2.1 → Task 2.2-2.7 → Task 2.8
                                                   ↓
                      Task 3.1 → Task 3.2 → Task 3.3
```

**并行执行说明**：
- Task 2.2-2.6 可以并行执行（各自修改不同文件）
- Task 3.2 依赖 Task 3.1 完成
