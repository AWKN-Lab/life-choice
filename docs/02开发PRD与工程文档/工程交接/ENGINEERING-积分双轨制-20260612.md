# 积分双轨制 — 完整工程实施文档

> 版本：v1.0 | 最后更新：2026-06-12  
> 状态：Phase 0/1/4 后端已实现，Phase 2/3/5 待实施  
> 关联文档：`docs/credit-membership-plan.md`（早期方案概要）

---

## 1. 概述

### 1.1 产品背景

"人生决策宗师"当前采用纯订阅制付费模型（月卡 99 元 / 年卡 699 元 / 单次 199 元），免费用户仅能查看基础咨询结果，K 线、潮汐、突破分析等深度模块被 `paywall_modules` 门控拦截。

对标竞品"天府 Agent"（tianfuagent.com）的注册送积分模式，本方案在订阅制基础上叠加**积分通道**，让免费用户也能"花积分"解锁核心模块，降低首次体验门槛。

### 1.2 核心设计原则

**双轨并行，会员优先**：订阅会员按层级直接放行，不消耗积分；非会员或层级不足时走积分通道。积分解锁为永久查看，不做阅后即焚。

**渐进式付费引导**：注册送 10 积分 → 用完引导邀请好友(+3+3)或完善资料(+5) → 仍然不够引导购买积分包或升级会员。

**存量兼容**：现有 `User.creditBalance` 字段、`CreditLedger` 模型、管理员积分路径均保持不变，仅扩展非管理员分支。

### 1.3 实施状态总览

| Phase | 主题 | 状态 | Commit |
|-------|------|------|--------|
| 0 | 修复 klineTideApi 401 | **已完成** | `093a6a0` |
| 1a | 注册/微信新用户赠送 10 积分 | **已完成** | `093a6a0` |
| 1b | unlockModule 积分扣费分支 | **已完成** | `093a6a0` |
| 4 | 积分 API 端点 + 前端 creditApi.ts | **已完成** | `093a6a0` |
| 2 | TidePage 前端 Paywall UI | 待实施 | — |
| 3 | 完善八字奖励 | 待实施 | — |
| 5 | 邀请好友双向奖励 | 待实施 | — |
| 6 | 积分余额指示器组件 | 待实施 | — |
| 7 | authStore 积分同步 | 待实施 | — |
| 8 | 存量用户积分回填 | 待实施 | — |

---

## 2. 系统架构

### 2.1 付费模型总览

```
                        ┌─────────────┐
                        │  用户请求模块  │
                        └──────┬──────┘
                               │
                    ┌──────────▼──────────┐
                    │  unlockModule()     │
                    │  (统一入口)          │
                    └──┬─────┬─────┬─────┘
                       │     │     │
            ┌──────────▼┐ ┌─▼───┐ ┌▼──────────┐
            │ 管理员路径  │ │会员层│ │ 积分通道    │
            │ 虚拟积分   │ │级校验│ │ 扣 credit  │
            │ 自动充值50  │ │直接放│ │ Balance    │
            └───────────┘ └─────┘ └────────────┘
                 │           │          │
                 └───────────┼──────────┘
                             │
                    ┌────────▼────────┐
                    │  CreditLedger   │
                    │  (append-only)  │
                    └─────────────────┘
```

### 2.2 积分经济参数

| 途径 | 积分 | 触发条件 | 一次性 |
|------|------|----------|--------|
| 注册赠送 | **10** | POST /auth/register 或微信新用户 | 是 |
| 完善八字 | **5** | 首次保存 birthDate + birthTime + birthPlace | 是 |
| 邀请好友 | **3+3** | 被邀请人完成注册 | 每次 |
| 每日签到 | **1** | 每天首次打开 App | V0.4 |
| 积分包购买 | 按金额 | 支付成功 | V0.4 |

| 模块 | moduleId | 积分成本 | 会员层级 |
|------|----------|----------|----------|
| K 线摘要 | `kline` | 3 | month |
| 状态雷达 | `tide_radar` | 3 | month |
| 相位空间 | `tide_phase` | **0 (免费)** | free |
| 突破分析 | `breakthrough` | 2 | year |
| 晨间指引 | `morning` | 1 | month |
| 命名 | `naming` | 1 | month |
| 提问 | `question` | 1 | month |

**设计理由**：注册送 10 积分刚好解锁 K 线(3) + 雷达(3) + 晨间(1) + 命名(1) + 提问(1) = 9 分，体验完核心功能后剩余 1 分形成"差一点"的心理张力，引导付费或邀请。

---

## 3. 数据模型

### 3.1 已有模型（无需迁移）

#### User

```prisma
model User {
  id            String   @id @default(uuid())
  email         String?  @unique
  phone         String?  @unique
  wxOpenId      String?  @unique
  nickname      String?
  isAdmin       Boolean  @default(false)
  creditBalance Int      @default(0)     // ← 积分余额
  // ... 其他字段
  creditLedgers CreditLedger[]
  memberships   Membership[]
  orders        Order[]
  invites       Invite[]
}
```

#### CreditLedger

```prisma
model CreditLedger {
  id           String   @id @default(uuid())
  userId       String
  amount       Int                        // 正=获得/退款, 负=消耗
  reason       String                     // 自由字符串，见 3.2
  moduleId     String?                    // 关联的模块 ID
  recordId     String?                    // 关联的 ConsultRecord
  balanceAfter Int                        // 操作后余额快照
  createdAt    DateTime @default(now())
  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Membership

```prisma
model Membership {
  id         String   @id @default(uuid())
  userId     String
  type       String                        // 'month' | 'year' | 'single' | 'peruse'
  status     String   @default("active")
  startDate  DateTime @default(now())
  expireDate DateTime?
  user       User @relation(fields: [userId], references: [id])
}
```

### 3.2 reason 枚举值（String 类型，无需 migration）

| reason 值 | 含义 | 对应 amount 符号 |
|-----------|------|------------------|
| `register_bonus` | 注册赠送 | + (正) |
| `module_unlock` | 模块解锁扣费 | - (负) |
| `admin_auto_topup` | 管理员自动充值 | + (正) |
| `refund_breakthrough_timeout` | 超时退款 | + (正) |
| `profile_completion` | 完善八字奖励 | + (正) |
| `invite_reward` | 邀请人奖励 | + (正) |
| `referred_bonus` | 被邀请人奖励 | + (正) |
| `daily_checkin` | 每日签到 | + (正) |
| `purchase_credit_pack` | 购买积分包 | + (正) |

### 3.3 不需要新增的模型

方案完全复用现有 `User.creditBalance` + `CreditLedger` 双字段模型。不需要：
- 新增 `CreditPackage` 模型（V0.4 再做）
- 新增 `UserUnlock` 表（用 `ConsultRecord.unlockStatus` 跟踪）
- 新增 `CreditTransaction` 独立表（`CreditLedger` 即事务表）

---

## 4. API 规格

### 4.1 已有端点（已实现）

#### 认证相关

| Method | Path | Auth | 积分相关变更 |
|--------|------|------|-------------|
| POST | `/auth/register` | 无 | 新用户 `creditBalance` 设为 10，写入 `register_bonus` 账本 |
| POST | `/auth/wx-login` | 无 | 微信新用户同上 |
| POST | `/auth/refresh` | 无 | 无变更 |

#### 会员 / 积分相关

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/membership/unlock` | JWT | **已改造**：4 级瀑布（admin→free→会员→积分） |
| GET | `/membership/credit/balance` | JWT | 当前余额 + 最近 10 条流水 |
| GET | `/membership/credit/history` | JWT | 分页流水（query: page, pageSize） |
| GET | `/membership/credit/costs` | 无 | 模块积分成本映射表 |
| GET | `/membership/check/:moduleId` | JWT | 权限详情（hasAccess + lockedFeatures） |
| GET | `/membership/plans` | 无 | 套餐列表 |
| GET | `/membership/current` | JWT | 当前有效会员 |

### 4.2 响应格式

#### POST /membership/unlock — 积分解锁成功

```json
{
  "success": true,
  "moduleId": "kline",
  "recordId": "uuid-xxx",
  "creditsUsed": 3,
  "creditBalance": 7,
  "source": "credit",
  "message": "积分解锁成功"
}
```

#### POST /membership/unlock — 积分不足

```json
{
  "success": false,
  "reason": "积分不足",
  "requiredPlan": "month",
  "creditsNeeded": 3,
  "creditBalance": 1,
  "message": "需要 3 积分，当前余额 1"
}
```

#### POST /membership/unlock — 会员直接放行

```json
{
  "success": true,
  "moduleId": "kline",
  "recordId": "uuid-xxx",
  "source": "membership",
  "message": "模块已解锁"
}
```

#### POST /membership/unlock — 免费模块

```json
{
  "success": true,
  "moduleId": "tide_phase",
  "creditsUsed": 0,
  "source": "free",
  "message": "免费模块已解锁"
}
```

#### GET /membership/credit/balance

```json
{
  "balance": 7,
  "recentTransactions": [
    {
      "id": "uuid",
      "userId": "uuid",
      "amount": -3,
      "reason": "module_unlock",
      "moduleId": "kline",
      "balanceAfter": 7,
      "createdAt": "2026-06-12T10:00:00Z"
    },
    {
      "id": "uuid",
      "amount": 10,
      "reason": "register_bonus",
      "balanceAfter": 10,
      "createdAt": "2026-06-12T09:00:00Z"
    }
  ]
}
```

### 4.3 待新增端点（Phase 3/5）

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/profile/reward-completion` | JWT | 完善八字后触发 +5 积分 |
| POST | `/auth/register` (扩展) | 无 | 接收 `inviteCode` 参数，双向奖励 |
| POST | `/credit/checkin` | JWT | 每日签到 +1 积分（V0.4） |

---

## 5. 后端实现详情

### 5.1 auth.service.ts — 已完成

**注册赠送积分**：在 `register()` 方法中，`prisma.user.create()` 的 data 直接设置 `creditBalance: 10`，随后写入 CreditLedger 条目（reason: `register_bonus`, amount: 10, balanceAfter: 10）。

**微信新用户赠送**：在 `wxLogin()` 中新增 `isNewUser` 标志位，仅在首次创建用户时赠送积分。已有微信用户不重复赠送。

**通用积分发放方法**：`grantCredits(userId, amount, reason)` 作为 public 方法暴露，供其他模块（profile、invite）调用。内部执行余额读取 → 累加 → 更新 User → 写入 CreditLedger 四步操作。

### 5.2 membership.service.ts — 已完成

**unlockModule() 四级瀑布**：

```
1. isAdminUser(user) → consumeAdminCredit()     [管理员虚拟积分]
2. moduleCreditCost[moduleId] === 0 → 直接放行    [免费模块]
3. checkAccess() === true → 会员直接放行          [订阅会员]
4. creditBalance >= cost → 扣积分解锁             [积分通道]
5. creditBalance < cost → 返回失败 + 差额信息     [余额不足]
```

**新增公开方法**：
- `getCreditBalance(userId)` — 余额 + 10 条近期流水
- `getCreditHistory(userId, page, pageSize)` — 分页流水查询
- `getModuleCreditCosts()` — 模块成本映射表

### 5.3 membership.controller.ts — 已完成

新增 3 个端点挂在 `/membership/credit/*` 路径下，均使用 `JwtAuthGuard`（`credit/costs` 除外，无需认证）。

### 5.4 待实现后端逻辑

#### Phase 3: 完善八字奖励

触发位置：`BaZiProfile` 首次创建后。需要在 BaZiProfile 的创建逻辑中追加：

```typescript
// profile.service.ts 或 BaZiProfile 创建回调中
await this.authService.grantCredits(userId, 5, 'profile_completion');
```

**防重复**：查询 CreditLedger 是否已有 `reason: 'profile_completion'` 的记录，有则跳过。

#### Phase 5: 邀请好友奖励

触发位置：`auth.service.ts` 的 `register()` 方法中，新增 `inviteCode` 参数处理：

```typescript
// register() 末尾追加
if (dto.inviteCode) {
  const invite = await this.prisma.invite.findUnique({
    where: { code: dto.inviteCode },
  });
  if (invite && invite.userId !== user.id) {
    // 邀请人 +3
    await this.grantCredits(invite.userId, 3, 'invite_reward');
    // 被邀请人 +3
    await this.grantCredits(user.id, 3, 'referred_bonus');
    // 更新邀请使用次数
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    });
    // 记录 Referral
    await this.prisma.referral.create({
      data: {
        inviteId: invite.id,
        inviteCode: invite.code,
        referredUserId: user.id,
        status: 'completed',
      },
    });
  }
}
```

**前置条件**：RegisterDto 需要新增可选字段 `inviteCode?: string`。

---

## 6. 前端实现详情

### 6.1 已完成的文件

| 文件 | 变更 |
|------|------|
| `app/src/services/klineTideApi.ts` | 从 `httpClient` 切换到 `apiClient`，修复 401 |
| `app/src/api/creditApi.ts` | 新增，封装 3 个积分端点 + 类型定义 + 中文标签映射 |

### 6.2 待实现前端组件

#### 6.2.1 CreditBalance 组件

**位置**：`app/src/components/credit/CreditBalance.tsx`

**用途**：全局积分余额指示器，嵌入页面 header 或底部导航栏。

```typescript
interface CreditBalanceProps {
  compact?: boolean;       // 紧凑模式（仅数字 + 图标）
  onDetailClick?: () => void;
}
```

**行为**：
- 挂载时调用 `creditApi.getBalance()` 获取余额
- 显示格式：compact 模式 `💎 7`，展开模式 `7 积分`
- 点击展开 Dropdown：
  - 当前余额（大字号）
  - 最近 3 条流水（原因 + 金额 + 时间）
  - [邀请好友 +3] 按钮 → 跳转分享页
  - [升级会员 不限次] 链接 → `/membership`

#### 6.2.2 PaywallOverlay 组件

**位置**：`app/src/components/credit/PaywallOverlay.tsx`

**用途**：TidePage 积分不足时的全屏/半屏遮罩。

```typescript
interface PaywallOverlayProps {
  moduleId: string;
  creditsNeeded: number;
  currentBalance: number;
  onUnlock: () => void;     // 用户确认扣积分
  onUpgrade: () => void;    // 跳转会员页
  onDismiss?: () => void;
}
```

**UI 结构**：
```
┌──────────────────────────────┐
│     🔒 需要积分解锁           │
│                              │
│  「K线摘要」需要 3 积分        │
│  你的余额：1 积分              │
│  差额：2 积分                  │
│                              │
│  ┌────────────────────────┐  │
│  │  💎 花 3 积分解锁       │  │
│  │  (余额不足，请先获取)    │  │
│  └────────────────────────┘  │
│                              │
│  获取更多积分：                │
│  · 完善出生信息  +5           │
│  · 邀请好友      +3+3         │
│                              │
│  ─── 或 ───                  │
│                              │
│  ┌────────────────────────┐  │
│  │  👑 升级会员 不限次查看  │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

#### 6.2.3 TidePage Paywall 集成

**位置**：`app/src/pages/TidePage.tsx`

**当前状态**：TidePage 完全没有权限检查，任何用户都能查看。

**改造方案**：

在 `useTidePackage()` hook 返回后，根据响应状态分流：

```typescript
const { data, loading, error, refetch } = useTidePackage();

// 新增状态
const [paywallState, setPaywallState] = useState<{
  gated: boolean;
  moduleId: string;
  creditsNeeded: number;
  currentBalance: number;
} | null>(null);

// 数据加载后检查权限
useEffect(() => {
  if (error && (error.statusCode === 403 || error.statusCode === 402)) {
    setPaywallState({
      gated: true,
      moduleId: error.moduleId || 'kline',
      creditsNeeded: error.creditsNeeded || 3,
      currentBalance: error.creditBalance || 0,
    });
  }
}, [error]);
```

**Tab 级权限**：三个 Tab 对应不同模块

| Tab | moduleId | 积分成本 | 门控策略 |
|-----|----------|----------|----------|
| K线摘要 | `kline` | 3 | 需要解锁 |
| 状态雷达 | `tide_radar` | 3 | 需要解锁 |
| 相位空间 | `tide_phase` | 0 | 始终可用 |

实现方式：每个 Tab 的内容区域独立检查权限，未解锁时显示 PaywallOverlay 半屏遮罩，相位空间始终渲染。

#### 6.2.4 VipPromptMessage 积分成本展示

**位置**：`app/src/components/result/chat-messages/VipPromptMessage.tsx`

**当前状态**：只显示 VIP 标签和解锁按钮，不显示积分成本。

**改造方案**：

新增 props：

```typescript
interface VipPromptMessageProps {
  services: VipService[];
  onUnlock: (id: string) => void;
  moduleCreditCosts?: Record<string, number>;  // 新增
  creditBalance?: number;                       // 新增
}
```

在每个服务卡片上显示积分成本：

```
┌─────────────────────────────────┐
│  🌟 突破分析    VIP · 2积分      │
│  深度推演当前困局的突破口    →    │
└─────────────────────────────────┘
```

如果用户余额不足，在卡片底部显示小字"余额不足，完善资料可获得更多积分"。

#### 6.2.5 authStore 积分同步

**位置**：`app/src/store/authStore.ts`

**当前问题**：`syncMembershipFromBackend()` 只同步 membership 和 consultQuota，不同步 creditBalance。

**修复方案**：在 `syncMembershipFromBackend()` 中追加积分同步：

```typescript
syncMembershipFromBackend: async () => {
  // ... 现有会员同步逻辑 ...

  // 新增：同步积分余额
  try {
    const { balance } = await creditApi.getBalance();
    set(state => ({
      user: state.user ? { ...state.user, creditBalance: balance } : null,
    }));
  } catch {
    // 积分同步失败不阻塞主流程
  }
}
```

#### 6.2.6 MembershipPage 积分信息

**位置**：`app/src/pages/MembershipPage.tsx`

在会员套餐卡片区上方新增一行提示：

```
💎 你当前有 7 积分，可以免费解锁 2 个模块 → 查看积分详情
```

如果用户积分为 0 或很少，这行文案变为：

```
积分用完了？升级会员享受不限次查看 → 或邀请好友获取积分
```

### 6.3 前端文件清单

| 文件 | 操作 | Phase |
|------|------|-------|
| `components/credit/CreditBalance.tsx` | 新建 | 6 |
| `components/credit/PaywallOverlay.tsx` | 新建 | 2 |
| `pages/TidePage.tsx` | 修改（加 paywall 状态） | 2 |
| `components/result/chat-messages/VipPromptMessage.tsx` | 修改（加积分成本） | 2 |
| `pages/MembershipPage.tsx` | 修改（加积分提示） | 2 |
| `store/authStore.ts` | 修改（syncCredits） | 7 |
| `api/creditApi.ts` | 已创建 | 4 ✅ |
| `services/klineTideApi.ts` | 已修改 | 0 ✅ |

---

## 7. 实施时间表

### Week 2：核心体验（Phase 2 + 6 + 7）

| 天 | 任务 | 文件 | 预估 |
|----|------|------|------|
| Day 1 | CreditBalance 组件 + authStore 积分同步 | CreditBalance.tsx, authStore.ts | 2h |
| Day 2 | PaywallOverlay 组件 | PaywallOverlay.tsx | 2h |
| Day 2 | TidePage paywall 集成 | TidePage.tsx | 1.5h |
| Day 3 | VipPromptMessage 积分成本 | VipPromptMessage.tsx | 1h |
| Day 3 | MembershipPage 积分提示 | MembershipPage.tsx | 1h |
| Day 4 | 联调测试 + 修复 | — | 2h |

### Week 3：增长引擎（Phase 3 + 5 + 8）

| 天 | 任务 | 文件 | 预估 |
|----|------|------|------|
| Day 1 | 完善八字奖励（后端 + 触发） | profile.service.ts 或等效位置 | 1.5h |
| Day 1 | RegisterDto 新增 inviteCode 字段 | auth/dto/index.ts | 0.5h |
| Day 2 | 邀请好友双向奖励 | auth.service.ts | 2h |
| Day 2 | 前端邀请码传递（注册页 → API） | 注册相关组件 | 1h |
| Day 3 | 存量用户积分回填脚本 | scripts/backfill-credits.ts | 1h |
| Day 4 | 全面联调 + 编译验证 | — | 2h |

---

## 8. 测试策略

### 8.1 后端单元测试

#### auth.service.ts 测试用例

| 用例 | 输入 | 预期结果 |
|------|------|----------|
| 邮箱注册赠送积分 | 新用户 register | user.creditBalance === 10, CreditLedger 有 register_bonus 记录 |
| 微信新用户赠送积分 | 新 wxOpenId wxLogin | 同上 |
| 微信已有用户不重复赠送 | 已存在 wxOpenId | creditBalance 不变 |
| grantCredits 正常发放 | userId, 5, 'profile_completion' | balance +5, ledger 写入 |
| grantCredits 用户不存在 | 不存在的 userId | 抛出 BadRequestException |

#### membership.service.ts 测试用例

| 用例 | 输入 | 预期结果 |
|------|------|----------|
| 管理员解锁走虚拟积分 | admin user | source='admin', 自动充值 |
| 免费模块直接放行 | moduleId='tide_phase' | source='free', creditsUsed=0 |
| 月卡会员解锁 kline | month user, 'kline' | source='membership', 不扣积分 |
| 非会员有积分解锁 kline | free user, balance=10, 'kline' | source='credit', creditsUsed=3, balance=7 |
| 非会员积分不足 | free user, balance=1, 'kline' | success=false, creditsNeeded=3 |
| 年卡会员解锁 breakthrough | year user, 'breakthrough' | source='membership' |
| 月卡会员解锁 breakthrough | month user, balance=5, 'breakthrough' | 积分通道（year 模块对月卡不够）|

### 8.2 前端组件测试

| 组件 | 测试重点 |
|------|----------|
| CreditBalance | 余额渲染、空状态、loading 态 |
| PaywallOverlay | 积分不足展示、余额足够直接解锁、升级链接 |
| TidePage | 三个 Tab 权限独立检查、401→登录引导、403→Paywall |
| VipPromptMessage | 积分成本显示、余额不足提示 |

### 8.3 集成测试场景

```
场景 1：完整新用户旅程
  注册 → 余额 10 → 进入 TidePage → 解锁 K 线(-3) → 余额 7
  → 解锁雷达(-3) → 余额 4 → 进入 ResultPage → 解锁突破(-2)
  → 余额 2 → 解锁晨间(-1) → 余额 1 → 尝试解锁命名(-1) → 余额 0
  → 尝试解锁提问 → 积分不足 → 显示引导

场景 2：会员覆盖
  注册 → 余额 10 → 购买月卡 → 解锁 K 线(source=membership, 不扣积分)
  → 余额仍为 10 → 月卡过期 → 再次解锁 K 线 → 扣 3 积分

场景 3：邀请链路
  用户 A 分享邀请码 → 用户 B 注册（带 inviteCode）
  → B 获得 10+3=13 积分 → A 获得 3 积分 → Referral 记录 status=completed
```

---

## 9. 部署与迁移

### 9.1 数据库迁移

**无需 schema 迁移**。所有使用的字段和模型均已存在：
- `User.creditBalance` — 已有，default 0
- `CreditLedger` — 已有
- `reason` 是 String 类型，新增值无需 alter table

### 9.2 存量用户积分回填

现有用户的 `creditBalance` 为 0，注册时没有赠送过积分。需要一个一次性回填脚本：

```typescript
// scripts/backfill-credits.ts
async function backfillExistingUsers() {
  const users = await prisma.user.findMany({
    where: {
      creditBalance: 0,
      // 排除已有 register_bonus 记录的用户
      creditLedgers: { none: { reason: 'register_bonus' } },
    },
    select: { id: true },
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { creditBalance: 10 },
    });
    await prisma.creditLedger.create({
      data: {
        userId: user.id,
        amount: 10,
        reason: 'register_bonus',
        balanceAfter: 10,
      },
    });
  }

  console.log(`Backfilled ${users.length} users with 10 credits each`);
}
```

**执行时机**：部署后手动运行一次，或通过 admin API 触发。

### 9.3 部署检查清单

| # | 检查项 | 验证方法 |
|---|--------|----------|
| 1 | 后端编译通过 | `npx tsc --noEmit` 零错误 |
| 2 | 前端编译通过 | `npx tsc --noEmit` 零错误 |
| 3 | 新用户注册送 10 积分 | 注册后查 DB |
| 4 | klineTideApi 不报 401 | 浏览器 Network 面板 |
| 5 | 积分解锁成功 | POST /membership/unlock 返回 source='credit' |
| 6 | 积分不足正确拒绝 | 余额 < 成本时返回 success=false |
| 7 | 会员不扣积分 | 月卡用户解锁 kline 返回 source='membership' |
| 8 | 存量用户回填完成 | 查 CreditLedger 中 register_bonus 记录数 |

---

## 10. 风险评估与对策

### 10.1 积分通胀

**风险**：注册送 10 分 × 大量注册 = 积分超发，用户囤积积分不消费。

**对策**：
- V0.4 加积分有效期（90 天过期），在 `CreditLedger` 上加 `expiresAt` 字段
- 监控指标：每日发放总量 vs 消耗总量，消耗率 < 30% 时预警

### 10.2 并发扣费

**风险**：SQLite 不支持行锁，两个请求同时扣费可能超扣（balance 从 3 变成 -3）。

**对策**：
- V0.3 用乐观锁：`WHERE creditBalance >= cost` 条件更新
- V0.4 迁移 PostgreSQL 后改 `SELECT ... FOR UPDATE` 悲观锁

**乐观锁实现**（建议 Phase 2 前补充）：

```typescript
const result = await this.prisma.user.updateMany({
  where: { id: userId, creditBalance: { gte: cost } },
  data: { creditBalance: { decrement: cost } },
});

if (result.count === 0) {
  // 并发失败或余额不足，重新读取判断
  throw new BadRequestException('积分扣费失败，请重试');
}
```

### 10.3 重复解锁

**风险**：用户对同一模块反复调用 unlockModule，每次都扣积分。

**对策**：在 `unlockModule()` 中先检查 `ConsultRecord.unlockStatus`，如果已经是 `unlocked_full`，直接返回成功不扣费。

```typescript
if (recordId) {
  const record = await this.prisma.consultRecord.findUnique({
    where: { id: recordId },
    select: { unlockStatus: true },
  });
  if (record?.unlockStatus === 'unlocked_full') {
    return { success: true, moduleId, recordId, source: 'already_unlocked' as const };
  }
}
```

### 10.4 价格一致性

**发现**：后端硬编码价格（single=199, month=99, year=699）与前端 i18n 文案（single=9, month=99, year=588）不一致。

**对策**：统一以后端为准，前端 i18n 中的折扣文案改为动态从 `/membership/plans` 读取，或明确标注"限时促销价"并在 `MEMBERSHIP_PLANS` 中同步。

### 10.5 前端 token 过期

**风险**：klineTideApi 切到 apiClient 后，如果用户 token 过期且 refresh 失败，会触发 authStore 的 logout 流程，用户被踢回登录页。

**现状**：apiClient 已有 401 auto-refresh 机制（`tryRefreshToken()`），refresh 失败时清除本地 auth state。这是预期行为。

**对策**：TidePage 捕获 401 时显示"请先登录"引导而非全屏报错。

---

## 11. 监控与度量

### 11.1 关键指标

| 指标 | 计算方式 | 健康阈值 |
|------|----------|----------|
| 注册转化率 | 注册数 / 访问数 | > 15% |
| 积分消耗率 | 消耗总量 / 发放总量 | 30-70% |
| 积分→付费转化 | 积分耗尽后购买会员的用户占比 | > 5% |
| 邀请 K 因子 | 平均每人邀请注册数 | > 0.3 |
| 模块解锁热度 | 各模块 unlockModule 调用量 | 监控分布 |

### 11.2 埋点事件

| 事件名 | 触发时机 | 携带参数 |
|--------|----------|----------|
| `credit_register_bonus` | 注册赠送积分 | `{ amount: 10 }` |
| `credit_unlock_module` | 积分解锁成功 | `{ moduleId, creditsUsed, balanceAfter }` |
| `credit_insufficient` | 积分不足拒绝 | `{ moduleId, creditsNeeded, balance }` |
| `credit_paywall_show` | Paywall 遮罩展示 | `{ moduleId, context }` |
| `credit_paywall_unlock` | Paywall 上点击解锁 | `{ moduleId }` |
| `credit_paywall_upgrade` | Paywall 上点击升级 | `{ moduleId }` |
| `invite_code_used` | 注册时填写邀请码 | `{ inviteCode, isNewUser }` |

---

## 12. 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-12 | v1.0 | 初版，Phase 0/1/4 已实现并提交 (`093a6a0`) |
