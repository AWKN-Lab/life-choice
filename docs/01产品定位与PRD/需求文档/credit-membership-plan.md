# 积分 + 会员双轨制实施计划

> 对标天府 Agent 的注册送积分模式，在现有订阅制基础上叠加积分通道，
> 让免费用户也能"花积分"解锁 K 线 / 潮汐等模块，降低体验门槛。

---

## 一、现有基础（已确认）

| 设施 | 状态 | 位置 |
|------|------|------|
| `User.creditBalance` | 已有字段，默认 0 | schema.prisma L22 |
| `CreditLedger` 模型 | 已有，记录 amount/reason/balanceAfter | schema.prisma L32-40 |
| `consumeAdminCredit()` | 已有，admin 专属扣费 + 自动充值 50 | membership.service.ts |
| `unlockModule()` | 已有，admin 走积分 / 普通用户走会员 | membership.service.ts |
| `checkAccess()` | 已有，纯会员层级校验 | membership.service.ts |
| `register()` | 已有，但**不赠送积分** | auth.service.ts |
| httpClient.ts | **无 Auth Header** → 401 根因 | api/httpClient.ts |

**结论**：数据库、账本模型、扣费逻辑骨架都已就位，只需"开放给普通用户"。

---

## 二、核心设计：双轨并行

```
用户类型        访问方式                    适用场景
─────────────────────────────────────────────────────
订阅会员        会员层级直接放行             月/年会员，不限次数
  (monthly/yearly)  不消耗积分

积分用户        花积分解锁模块               注册赠送 / 邀请获得
  (free)           一次解锁，永久可查        不付费也能体验核心功能

管理员          虚拟积分（自动充值 50）       测试用
  (admin)          已有逻辑不变
```

**关键原则**：
- 积分解锁 = 永久查看（不做"阅后即焚"），降低用户心理负担
- 订阅会员 > 积分解锁（会员期间不扣积分）
- 积分不可退款、不可转让（V0.3 简化）

---

## 三、积分经济参数

### 3.1 获取途径

| 途径 | 积分 | 触发条件 | 备注 |
|------|------|----------|------|
| 注册赠送 | **10** | `POST /auth/register` 成功 | 够解锁 2-3 个模块体验 |
| 完善八字 | **5** | 首次保存 birthDate + birthTime + birthPlace | 激励补全数据 |
| 邀请好友 | **3+3** | 被邀请人完成注册 | 双方各得 |
| 每日签到 | **1** | 每天首次打开 App | V0.4 再做 |
| 积分包购买 | 按金额 | 支付成功 | V0.4 再做 |

### 3.2 消费成本

| 模块 | moduleId | 积分成本 | 说明 |
|------|----------|----------|------|
| K线摘要 | `kline` | **3** | 核心功能，值得花积分 |
| 状态雷达 | `tide_radar` | **3** | TidePage 第二个 Tab |
| 相位空间 | `tide_phase` | **0（免费）** | 引流入口，让免费用户也能玩 |
| 突破分析 | `breakthrough` | **2** | 现有模块 |
| 晨间指引 | `morning` | **1** | 现有模块 |
| 命名 | `naming` | **1** | 现有模块 |
| 提问 | `question` | **1** | 现有模块 |

**为什么注册送 10 分**：够解锁 K线(3) + 雷达(3) + 晨间(1) + 命名(1) + 提问(1) = 9 分，
刚好体验完整核心功能，又留 1 分悬念，引导付费或邀请。

---

## 四、实施步骤

### Phase 0：修复 401（前置条件，~15 min）

klineTideApi 目前用 `httpClient.ts`（无 Auth），导致所有 K 线请求 401。

**方案**：klineTideApi 改用 `client.ts` 的 `apiClient`

```typescript
// klineTideApi.ts — 改动
- import { apiGet } from '@/api/httpClient';
+ import { apiClient } from '@/api/client';

  fetchPackage: (params) =>
-   apiGet<TidePackage>('/kline-tide/package', params)
+   apiClient.get<TidePackage>('/kline-tide/package', params)
```

4 个方法全部切换。后端 controller 不需要改（已有 userId 参数）。

---

### Phase 1：注册赠送积分（~30 min）

**后端改动**：

#### 1.1 auth.service.ts — `register()` 末尾追加

```typescript
// 注册赠送积分
const WELCOME_CREDITS = 10;
await this.prisma.user.update({
  where: { id: user.id },
  data: { creditBalance: WELCOME_CREDITS },
});
await this.prisma.creditLedger.create({
  data: {
    userId: user.id,
    amount: WELCOME_CREDITS,
    reason: 'register_bonus',
    balanceAfter: WELCOME_CREDITS,
  },
});
```

#### 1.2 membership.service.ts — 扩展 `unlockModule()` 的普通用户路径

当前逻辑：
```
admin → 扣积分
普通用户 → 只检查会员层级 → 不通过就拒绝
```

改为：
```
admin → 扣积分（不变）
订阅会员 → 直接放行（不变）
普通用户 → 检查积分余额 → 足够则扣费解锁 → 不足则返回错误
```

```typescript
// unlockModule() — 普通用户分支伪代码
const membership = await this.getUserMembership(userId);
if (membership && requiredPlan !== 'year') return { success: true }; // 会员放行

// 积分通道
const cost = this.moduleCreditCost[moduleId] ?? 1;
const user = await this.prisma.user.findUnique({ where: { id: userId } });
if (!user || user.creditBalance < cost) {
  throw new BadRequestException('积分不足，请充值或升级会员');
}
await this.prisma.user.update({
  where: { id: userId },
  data: { creditBalance: { decrement: cost } },
});
await this.prisma.creditLedger.create({
  data: {
    userId, amount: -cost, reason: 'module_unlock',
    moduleId, recordId, balanceAfter: user.creditBalance - cost,
  },
});
return { success: true, moduleId, creditsUsed: cost };
```

#### 1.3 新增 `checkAndUnlockAccess()` — 整合校验

```typescript
// 给 controller 用的统一入口
async checkAndUnlockAccess(userId: string, moduleId: string): Promise<{
  hasAccess: boolean;
  source: 'membership' | 'credit' | 'admin' | 'denied';
  creditsUsed?: number;
  requiredPlan?: string;
}>
```

---

### Phase 2：TidePage 积分门控（~45 min）

#### 2.1 后端：KlineTideController 加权限守卫

```typescript
@Get('package')
async getTidePackage(@Req() req, @Query() query) {
  const userId = req.user?.id ?? 'demo-user';
  // 检查 kline 模块权限
  const access = await this.membership.checkAndUnlockAccess(userId, 'kline');
  if (!access.hasAccess) {
    return { gated: true, requiredPlan: access.requiredPlan, creditsNeeded: 3 };
  }
  return this.klineTide.getTidePackage(userId, ...);
}
```

#### 2.2 前端：TidePage 加 Paywall 状态

```
TidePage.tsx
├── useTidePackage() 调用
│   ├── 成功 → 正常渲染三个 Tab
│   ├── 402/403 (积分不足) → PaywallOverlay
│   │   ├── 显示当前积分余额
│   │   ├── 显示解锁所需积分
│   │   ├── [花积分解锁] 按钮 → 调 unlockModule API → 重新 fetch
│   │   └── [升级会员] 链接 → /membership
│   └── 401 → 引导登录
```

#### 2.3 前端：顶部积分余额指示器

在 TidePage header 右侧显示：
```
💎 7 积分
```
点击展开面板：
- 当前余额
- 最近消费记录（从 CreditLedger 读取）
- [邀请好友 +3] 按钮
- [升级会员 不限次] 链接

---

### Phase 3：完善八字奖励（~15 min）

监听 BaZiProfile 的首次创建：

```typescript
// profile.service.ts 或 BaZiProfile 创建后
async rewardProfileCompletion(userId: string) {
  const existing = await this.prisma.creditLedger.findFirst({
    where: { userId, reason: 'profile_completion' },
  });
  if (existing) return; // 只奖一次

  await this.prisma.user.update({
    where: { id: userId },
    data: { creditBalance: { increment: 5 } },
  });
  await this.prisma.creditLedger.create({
    data: {
      userId, amount: 5, reason: 'profile_completion',
      balanceAfter: /* new balance */,
    },
  });
}
```

---

### Phase 4：积分 API 端点（~20 min）

新增 controller：`credit.controller.ts`

| 端点 | 方法 | 用途 |
|------|------|------|
| `/credit/balance` | GET | 获取当前余额 + 最近 10 条流水 |
| `/credit/history` | GET | 分页查询积分流水 |
| `/credit/unlock` | POST | 手动解锁指定模块（body: `{moduleId}`) |

前端新增 service：`creditApi.ts`

---

### Phase 5：邀请奖励（~30 min，可后做）

现有 `Invite` + `Referral` 模型已就位，只需在注册流程中：

```typescript
// auth.service.ts — register() 中处理 inviteCode 参数
if (dto.inviteCode) {
  const invite = await this.prisma.invite.findUnique({ where: { code: dto.inviteCode } });
  if (invite) {
    // 给邀请人 +3
    await this.grantCredits(invite.userId, 3, 'invite_reward');
    // 给被邀请人 +3
    await this.grantCredits(user.id, 3, 'referred_bonus');
    // 记录 Referral
    await this.prisma.referral.create({ ... });
  }
}
```

---

## 五、文件改动清单

| 文件 | 改动类型 | 内容 |
|------|----------|------|
| `klineTideApi.ts` | 修改 | httpClient → apiClient（修 401） |
| `auth.service.ts` | 修改 | register() 追加 10 积分赠送 |
| `membership.service.ts` | 修改 | unlockModule() 增加积分扣费分支 |
| `kline-tide.controller.ts` | 修改 | 加权限守卫 |
| `credit.controller.ts` | 新增 | 积分余额/流水/解锁 API |
| `credit.service.ts` | 新增 | 积分业务逻辑（抽取公共方法） |
| `TidePage.tsx` | 修改 | PaywallOverlay + 积分余额指示 |
| `creditApi.ts` | 新增 | 前端积分 API 封装 |
| `CreditBalance.tsx` | 新增 | 积分余额组件 |
| `PaywallOverlay.tsx` | 新增 | 解锁/升级引导组件 |

---

## 六、实施优先级

```
Week 1（必须）
  ├── Phase 0: 修复 401 ← 当前最紧急
  ├── Phase 1: 注册赠送 + 积分扣费逻辑
  └── Phase 4: 积分 API 端点

Week 2（核心体验）
  ├── Phase 2: TidePage 积分门控 + Paywall UI
  └── Phase 3: 完善八字奖励

Week 3（增长引擎）
  └── Phase 5: 邀请奖励
```

---

## 七、风险与注意事项

1. **积分通胀**：注册送 10 分 × 大量注册 = 积分超发。建议 V0.4 加积分有效期（90 天过期）。
2. **重复解锁**：同一用户多次解锁同一模块不应重复扣费。需加 `unlock_status` 表或在 ConsultRecord 中标记。
3. **价格一致性**：现有后端价格（199/99/699）与前端 i18n（9/99/588）不一致，需同步修正。
4. **数据库迁移**：CreditLedger.reason 需新增枚举值 `register_bonus`、`profile_completion`、`invite_reward`、`referred_bonus`。当前是 String 类型，无需 migration。
5. **并发扣费**：SQLite 不支持行锁，高并发下可能超扣。V0.3 用乐观锁（`WHERE creditBalance >= cost`），V0.4 迁移 PostgreSQL 后改悲观锁。

---

## 八、对标分析：vs 天府 Agent

| 维度 | 天府 Agent | 我们的方案 | 优劣 |
|------|-----------|-----------|------|
| 注册福利 | 免费试用 1 次 | 送 10 积分（约 3 次） | ✅ 更灵活 |
| 付费模式 | 纯订阅 | 订阅 + 积分双轨 | ✅ 覆盖更多用户 |
| 数据可视化 | K线 + 雷达 | K线 + 雷达 + 相位空间 | ✅ 多一个维度 |
| 积分获取 | 购买 | 注册/完善资料/邀请 | ✅ 降低付费压力 |
| 解锁粒度 | 整体订阅 | 按模块单独解锁 | ✅ 用户选择权更大 |
