# 人生决策宗师 - 后端服务

基于 NestJS 的后端 monorepo，包含 API 服务、算法引擎和 LLM 网关。

## 项目结构

```
awkn-life-backend/
├── apps/
│   ├── api-server/      # 统一 API 出口
│   ├── calc-engine/     # 算法引擎（八字/六壬）
│   └── llm-gateway/     # LLM 网关
├── packages/            # 共享包
├── prisma/             # 数据库模型
└── docker-compose.yml   # 本地开发环境
```

## 快速开始

### 1. 启动数据库

```bash
docker-compose up -d
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入必要的配置
```

### 4. 初始化数据库

```bash
pnpm db:push
pnpm db:generate
```

### 5. 启动开发服务

```bash
pnpm dev
```

## API 接口

### 认证
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/wx-login` - 微信登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `POST /api/v1/auth/logout` - 登出

### 用户
- `GET /api/v1/user/profile` - 获取用户信息
- `PATCH /api/v1/user/profile` - 更新用户信息
- `GET /api/v1/user/membership` - 获取会员状态

### 咨询
- `POST /api/v1/consult/route` - 问题分流判定
- `POST /api/v1/consult/clarify` - 生成澄清问题
- `POST /api/v1/consult/info` - 提交补信息
- `GET /api/v1/consult/result/:recordId` - 获取结果
- `POST /api/v1/consult/save` - 保存咨询
- `GET /api/v1/consult/records` - 历史记录
- `DELETE /api/v1/consult/records/:recordId` - 删除记录

### 支付
- `POST /api/v1/payment/create` - 创建订单
- `GET /api/v1/payment/status/:orderId` - 查询订单状态
- `GET /api/v1/payment/orders` - 我的订单
- `POST /api/v1/payment/webhook/stripe` - Stripe 回调

### 会员
- `GET /api/v1/membership/plans` - 获取套餐列表
- `POST /api/v1/membership/unlock` - 解锁模块
- `GET /api/v1/membership/check/:moduleId` - 检查权限

## 技术栈

- **框架**: NestJS
- **数据库**: PostgreSQL + Prisma
- **认证**: JWT + Passport
- **LLM**: OpenAI GPT-4o
- **支付**: Stripe / 微信 / 支付宝

## 开发说明

### 添加新的模块

1. 在 `apps/api-server/src/` 下创建模块目录
2. 创建 `*.module.ts`, `*.service.ts`, `*.controller.ts`
3. 在 `app.module.ts` 中引入

### 添加新的依赖

```bash
cd apps/api-server
pnpm add <package>
```

## License

Private - All Rights Reserved
