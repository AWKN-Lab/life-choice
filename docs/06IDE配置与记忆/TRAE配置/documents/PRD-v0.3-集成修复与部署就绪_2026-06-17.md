# PRD：人生决策宗师 v0.3 — 集成修复与部署就绪

> 版本：v0.3
> 日期：2026-06-17
> 产品名：人生决策宗师
> 目标形态：H5（PM2+Nginx 裸机部署 + Docker 备选）
> 上游文档：本 PRD → 技术落地文档 → 一步一验收执行计划

---

## 一、一句话定位

面向需要人生决策辅助的用户，在遇到事业/感情/人际关系等重大抉择场景下，解决"不知道该怎么选、选了又后悔"的痛点，通过紫微斗数排盘+LLM多维度分析+决策记录复盘，让用户获得可执行的行动建议和长期决策画像。

---

## 二、调研发现（颠覆性结论）

### 2.1 原认知 vs 实际情况

| 任务 | 原认知 | 实际情况 |
|------|--------|----------|
| 12个后端API路由未实现 | 需从零实现 | **12/12 全部已实现**（Controller+Service+Module） |
| 前端页面是空壳 | 3个页面无内容 | **3个页面完整 UI**（317/296/210行） |
| 部署完全没有Docker | 需从零搭建 | **Dockerfile+compose+CI 全有**，但有配置不一致 |

### 2.2 真正的问题

| # | 问题 | 严重度 | 根因 |
|---|------|--------|------|
| P1 | 前后端认证不匹配 | P0 | 前端 fetch 未携带 JWT，后端要求 JwtAuthGuard |
| P2 | chronicleApi userId 传递方式不匹配 | P0 | 前端用 query 参数，后端从 JWT 获取 |
| P3 | 前端 userId 硬编码为空字符串 | P0 | TongjianPage L21/L44 `const userId = ''` |
| P4 | shumiyuanApi.speak 未传 userId | P1 | ShumiyuanPage L37 只传 question |
| P5 | Docker 模式无 HTTPS | P1 | nginx.conf SSL 块被注释 |
| P6 | CI/CD 无部署阶段 | P1 | ci.yml 只有 build+test，无 deploy |
| P7 | 数据库配置不一致 | P1 | schema.prisma=sqlite vs 根.env=postgresql |
| P8 | .env.prod 模板缺失 | P2 | docker-compose 引用但无模板 |
| P9 | LLM 动态内容纯文本渲染 | P2 | 无 Markdown 解析，但已有14种结构化消息类型 |

---

## 三、MVP 功能清单（v0.3，≤7个）

### M1：前后端认证集成修复（P0）
- 前端 API 客户端统一注入 Authorization header
- chronicleApi 改为从 JWT token 获取 userId（移除 query 参数）
- TongjianPage 移除硬编码 `userId = ''`，改用 auth context
- ShumiyuanPage speak 调用注入 userId

### M2：HTTPS Docker 模式启用（P1）
- nginx.conf 取消注释 SSL 块
- 配置证书挂载路径
- HTTP 强制 301 跳转 HTTPS

### M3：CI/CD 补部署阶段（P1）
- ci.yml 新增 deploy job（main 分支触发）
- 集成测试阶段（前后端联调）
- Docker 镜像推送（可选）

### M4：数据库配置统一（P1）
- schema.prisma 明确 sqlite（当前生产实际）
- 根 .env.example 统一为 sqlite
- .env.prod.example 补齐模板

### M5：前端样式修复（P2）
- LLM 动态内容新增 step-card 结构化消息类型
- 对话框宽度统一（伤病/工作状态等）

---

## 四、不做清单（≥10条）

1. 不做 Supabase/PostgreSQL 迁移（当前 SQLite 够用，用户量>1万再切）
2. 不做 E2E 自动化测试（手动验证即可）
3. 不做 staging 环境（直接 main 部署）
4. 不做蓝绿/金丝雀发布（PM2 reload 即可）
5. 不做 Redis 集成（ecosystem.config.js 已强制禁用）
6. 不做 I18N 国际化（用户量>1万后做）
7. 不做真太阳时/夏令时（用户量>1万后做）
8. 不做 MLK 解析工具（依赖 pycryptodome，非核心）
9. 不做安星码编码规则提取（AS3 UI 层，非核心）
10. 不做运曜/流曜算法（非核心，待后续实现）
11. 不做前端单元测试（vitest 已有框架，但非本版本范围）
12. 不做安全扫描/SAST（CI/CD 已有 typecheck+lint+test）

---

## 五、验收用例（5-10条）

### VC1：前后端认证集成（M1）
- **入口可达**：ShumiyuanPage/TongjianPage/XingtuPage 三个页面浏览器访问无 ReferenceError
- **认证通过**：登录后访问三个页面，API 请求携带 Authorization header
- **数据返回**：TongjianPage 显示当前用户的记录（非空数据）
- **失败兜底**：未登录访问三个页面，跳转登录模态框

### VC2：HTTPS Docker 模式（M2）
- **HTTP 跳转**：访问 http://awkn.cn 自动 301 到 https://awkn.cn
- **证书有效**：浏览器显示有效 SSL 证书
- **API 可达**：HTTPS 下 API 请求正常返回

### VC3：CI/CD 流水线（M3）
- **push 触发**：push 到 main 分支触发完整流水线
- **3阶段通过**：backend+frontend+docker-build 全绿
- **部署阶段**：deploy job 执行 PM2 reload

### VC4：数据库配置统一（M4）
- **配置一致**：schema.prisma、.env.example、.env.prod.example 三处数据库配置一致
- **迁移通过**：`npx prisma migrate dev` 无错误
- **类型正确**：`npx prisma generate` + `tsc --noEmit` 通过

### VC5：前端样式（M5）
- **结构化渲染**：LLM 回复中"训练目标""伤病"等内容以 step-card 卡片渲染
- **对话框统一**：所有对话框宽度一致（max-w-lg）
- **图标可见**：云端类型图标在暗色/亮色主题下均可见

---

## 六、版本切片

| 版本 | 范围 | 目标 |
|------|------|------|
| v0.3.1 | M1 认证集成修复 | 三个页面真正可用 |
| v0.3.2 | M4 数据库配置统一 | 配置一致性 |
| v0.3.3 | M2 HTTPS + M3 CI/CD | 部署就绪 |
| v0.3.4 | M5 前端样式 | 体验优化 |

---

## 七、风险与约束

| 风险 | 触发条件 | 预案 |
|------|----------|------|
| JWT token 过期 | 用户长时间停留 | 前端 401 拦截 → 刷新 token → 重试 |
| HTTPS 证书过期 | Let's Encrypt 90天 | 配置 certbot 自动续期 |
| CI/CD 部署失败 | PM2 reload 失败 | 保留上一版本，手动回滚 |
| SQLite 并发限制 | 多用户同时写入 | 用户量>500 切 PostgreSQL |

---

## 八、上线成功标准（≥5条）

1. S1：三个页面（枢密院/通鉴/星图）登录后可正常使用，API 返回真实数据
2. S2：HTTPS 访问正常，HTTP 自动跳转
3. S3：push 到 main 分支 CI/CD 全绿，自动部署成功
4. S4：数据库配置三处一致，无冲突
5. S5：LLM 动态内容以结构化卡片渲染，对话框宽度统一

---

## 九、约束条件

- 不修改后端 Controller 路由定义（已全部实现）
- 不修改 Prisma schema 结构（仅改 provider 声明）
- 不引入新的第三方依赖（用现有库）
- 不做大规模重构（最小修改原则）
- 所有修改必须通过 `tsc --noEmit` + `npm run build`
