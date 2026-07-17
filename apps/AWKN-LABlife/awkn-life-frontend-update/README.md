# 前端更新包 - 对接真实后端 API

## 文件说明

| 文件 | 复制到 | 说明 |
|------|--------|------|
| `api/client.ts` | `app/src/api/client.ts` | API 客户端，添加 PATCH 方法 |
| `api/consult.ts` | `app/src/api/consult.ts` | 咨询 API |
| `api/auth.ts` | `app/src/api/auth.ts` | 认证 API，支持微信登录 |
| `api/payment.ts` | `app/src/api/payment.ts` | 支付 API |
| `api/membership.ts` | `app/src/api/membership.ts` | 新增，会员 API |

## 复制步骤

1. 备份原文件
2. 将更新包中的文件复制到对应位置

## 环境变量配置

创建或修改 `app/.env`：

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCK=false
```

## API 接口对应

### 咨询接口
| 前端方法 | 后端接口 |
|----------|----------|
| consultApi.route() | POST /api/v1/consult/route |
| consultApi.clarify() | POST /api/v1/consult/clarify |
| consultApi.submitInfo() | POST /api/v1/consult/info |
| consultApi.getResult() | GET /api/v1/consult/result/:recordId |
| consultApi.saveRecord() | POST /api/v1/consult/save |
| consultApi.getRecords() | GET /api/v1/consult/records |
| consultApi.deleteRecord() | DELETE /api/v1/consult/records/:recordId |

### 认证接口
| 前端方法 | 后端接口 |
|----------|----------|
| authApi.login() | POST /api/v1/auth/login |
| authApi.register() | POST /api/v1/auth/register |
| authApi.wxLogin() | POST /api/v1/auth/wx-login |
| authApi.logout() | POST /api/v1/auth/logout |
| authApi.getProfile() | GET /api/v1/user/profile |
| authApi.updateProfile() | PATCH /api/v1/user/profile |

### 支付接口
| 前端方法 | 后端接口 |
|----------|----------|
| paymentApi.createOrder() | POST /api/v1/payment/create |
| paymentApi.getOrderStatus() | GET /api/v1/payment/status/:orderId |
| paymentApi.getOrders() | GET /api/v1/payment/orders |
| paymentApi.refundOrder() | POST /api/v1/payment/refund/:orderId |

### 会员接口
| 前端方法 | 后端接口 |
|----------|----------|
| membershipApi.getPlans() | GET /api/v1/membership/plans |
| membershipApi.getPlan() | GET /api/v1/membership/plans/:planId |
| membershipApi.getCurrentMembership() | GET /api/v1/membership/current |
| membershipApi.activateMembership() | POST /api/v1/membership/activate |
| membershipApi.unlockModule() | POST /api/v1/membership/unlock |
| membershipApi.checkAccess() | GET /api/v1/membership/check/:moduleId |

## 测试步骤

1. 启动后端服务
2. 配置前端环境变量 `VITE_USE_MOCK=false`
3. 测试用户注册/登录
4. 测试咨询流程
5. 测试会员购买流程
6. 测试支付流程