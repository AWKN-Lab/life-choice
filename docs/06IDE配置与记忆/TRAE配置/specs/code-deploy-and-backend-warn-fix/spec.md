# 人生决策宗师 - 代码部署与后端WARN修复

## Why
服务器运行的后端存在两个 WARN，同时本地有大量代码修改（40+前端文件、20+后端文件）未部署到生产环境。

## What Changes
- **部署前端更新**：包含 MetaphysicsShowcase.tsx、BaguaDiagram.tsx、StarmapDiagram.tsx、WuxingDiagram.tsx、ResultChat.tsx 等10+个新组件
- **部署后端更新**：包含 LLM gateway、各 agent service、orchestrator 等20+文件修改
- **修复 WARN 1**：Agent 层 LLM 未配置（5个Agent需要添加 @Inject 装饰器）
- **修复 WARN 2**：课体知识库加载失败（需要在 nest-cli.json 添加 assets 配置）

## Impact
- Affected specs: 后端 Agent 服务、LLM 路由
- Affected code: 前端 app/ 目录、后端 awkn-life-backend/ 目录

---

## ADDED Requirements

### Requirement: 后端 Agent LLM 依赖注入修复
NestJS Agent 服务必须正确注入 LlmProvidersService。

#### Scenario: Agent 服务启动
- **WHEN** NestJS 应用启动时
- **THEN** 所有 Agent（ZipingAgent、QimenAgent、QumingAgent、ZiweiAgent、LiuyaoAgent）的 `llmProviders` 属性不为 undefined
- **AND** 不再出现 "Agent LLM 未配置" WARN

### Requirement: 知识库资源打包
NestJS 构建时必须包含 knowledge-base JSON 文件。

#### Scenario: 知识库加载
- **WHEN** LiurenAgent 加载知识库时
- **THEN** 所有 JSON 文件正确复制到 dist 目录
- **AND** 不再出现 "课体知识库加载失败" WARN

---

## MODIFIED Requirements

### Requirement: 前端构建与部署
前端代码修改必须构建并部署到生产服务器。

#### Scenario: 前端部署
- **WHEN** 执行构建部署时
- **THEN** 所有新组件（MetaphysicsShowcase、BaguaDiagram 等）正确打包
- **AND** 访问 https://awkn.cn/life/ 页面正常加载，无 404 错误

### Requirement: 后端构建与部署
后端代码修改必须构建并部署到生产服务器。

#### Scenario: 后端部署
- **WHEN** 执行后端构建部署时
- **THEN** 所有 Agent service、LLM gateway、orchestrator 修改正确打包
- **AND** PM2 服务正常启动

---

## REMOVED Requirements
无

---

## 执行流程

### Phase 1: 代码打包上传
1. 本地 Git 提交所有修改
2. 压缩完整项目目录
3. 上传到服务器 `/opt/awkn-life/`

### Phase 2: 后端 WARN 修复
1. 修改 5 个 Agent 的注入方式（添加 @Inject 装饰器）
2. 修改 nest-cli.json 添加知识库 assets
3. 重新构建后端
4. 重启 PM2 服务

### Phase 3: 前端部署
1. 在服务器构建前端
2. 解压到 Nginx 目录
3. 验证页面正常
