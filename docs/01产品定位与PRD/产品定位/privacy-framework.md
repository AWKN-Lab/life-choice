# 张半山 · 隐私与同意框架（P3-0 前置）

> **目的**：在 P3-1（回访系统）/P3-2（记忆锚定）/P3-3（用户状态分类）实施前，建立用户数据合规框架
> **关联文档**：[批判性分析-开发整改计划.md](../../批判性分析-开发整改计划.md) · [DOD-开发整改计划.md](../dev/DOD-开发整改计划.md)
> **生成日期**：2026-06-13

---

## 一、为什么需要这个框架

### 业务驱动

整改计划 P3 阶段涉及：
- **P3-1 回访系统**：7 天后主动联系用户
- **P3-2 记忆锚定**：跨会话记住用户咨询历史
- **P3-3 用户状态分类**：根据历史判断用户类型

这三项**都涉及对用户深层数据的处理**——出生信息、咨询内容、情绪状态、决策偏好。如果不先建立合规框架：
- 法律风险（GDPR / 个保法）
- 用户信任崩塌（"他怎么知道我的事"）
- 产品事故（数据滥用导致的舆论危机）

### 合规驱动

中国《个人信息保护法》（2021）+ 欧盟 GDPR 对命理类应用有**特殊要求**：
- 命理数据属于"敏感个人信息"
- 涉及"算法决策"必须告知
- 用户有"被遗忘权"
- 跨境传输受限

---

## 二、6 个子模块

### 模块 1：数据分类

#### 字段级敏感度分级

| 字段 | 敏感度 | 例子 | 处置 |
|------|--------|------|------|
| **公开数据** | L0 | nickname | 可公开 |
| **基本身份** | L1 | userId, createdAt | 内部使用 |
| **生辰信息** | L2 | birthDate, birthHour, birthPlace | 加密存储 |
| **咨询内容** | L3 | 提问、回答、对话 | LLM 调用时脱敏 |
| **情绪/状态** | L4 | 情绪快照、压力指数 | 不入日志 |
| **记忆摘要** | L5 | 长期记忆、决策偏好 | 单独加密、用户可控 |
| **支付/账户** | L6 | 余额、订单 | 走独立支付系统 |

#### 数据流向矩阵

```
用户输入 (L3) ──→ 脱敏 (L2.5) ──→ LLM Prompt (L3) ──→ LLM 返回 (L3)
                            ↓
                    日志 (L1，仅元数据)
                            ↓
                  长期存储 (L3 + 加密)
```

### 模块 2：数据脱敏规则

#### 字段级脱敏规则

| 字段 | 日志脱敏 | LLM 脱敏 | DB 存储 |
|------|---------|---------|---------|
| `birthDate` | 末 4 位 | 完整（保留年份） | 完整 |
| `birthHour` | ❌ | ❌ | 完整 |
| `birthPlace` | 城市级 | 完整 | 完整 |
| 咨询内容 | 末 20 字 | 完整 | 完整 |
| 情绪快照 | ❌ 不入日志 | 完整 | 完整 |
| 记忆摘要 | ❌ | 摘要版 | 完整 |
| `userId` | 哈希前 8 位 | 完整 | 完整 |

#### LLM Prompt 注入规则

```typescript
// prompt-layers.ts 中的脱敏函数
function scrubForLLM(data: UserData): UserData {
  return {
    ...data,
    birthDate: data.birthDate ? data.birthDate.slice(0, 4) + '-**-**' : undefined,
    birthPlace: data.birthPlace ? data.birthPlace.split('市')[0] + '市' : undefined,
    // 情绪快照不进 Prompt Layer 1，仅在内部调度使用
    emotion_snapshot: undefined,
  };
}
```

### 模块 3：同意机制

#### 同意 UI 流程

```
首次打开 App
    ↓
显示欢迎页 + 隐私政策链接
    ↓
点击"开始使用"
    ↓
弹窗：勾选同意项
    ├─ ✅ 必要同意：基础功能
    ├─ ☐ 可选同意 1：记忆锚定（用于跨会话记住你）
    ├─ ☐ 可选同意 2：回访提醒（7 天后回访咨询结果）
    └─ ☐ 可选同意 3：个性化推荐（根据你的状态推送）
    ↓
点击"同意并继续"
    ↓
写入 UserConsent 表
```

#### 同意状态字段

```typescript
// UserMemory schema 扩展（M3 必做）
model UserMemory {
  // ... 现有字段
  consentAt            DateTime?  // 同意时间
  consentVersion       String?    // 同意的隐私政策版本号
  consentMemoryAnchor  Boolean    @default(false)  // 是否同意记忆锚定
  consentCallback      Boolean    @default(false)  // 是否同意回访
  consentPersonalize   Boolean    @default(false)  // 是否同意个性化推荐
  expiresAt            DateTime?  // 数据过期时间（用于自动清理）
  scrubLevel           Int        @default(1)      // 脱敏等级 1-5
}
```

#### 同意的撤回

- 用户可在「设置 → 隐私 → 我的同意」查看并撤回任何一项
- 撤回后，**对应功能立即停止**
- 已存储的数据按"撤回后 30 天内删除"原则清理

### 模块 4：数据保留策略

#### 保留期矩阵

| 数据类型 | 保留期 | 过期后处置 |
|---------|--------|----------|
| 咨询记录 | 永久（用户主动删除除外） | 用户主动删除 |
| 记忆摘要 | 2 年 | 自动清理（除非用户续期） |
| 情绪快照 | 90 天 | 自动匿名化 |
| LLM 调用日志 | 30 天 | 自动删除 |
| 用户操作日志 | 1 年 | 匿名化保留 |

#### 主动清理触发

- 用户主动删除（"忘记我"功能）
- 保留期到期（cron job）
- 账户注销（立即）
- 法律要求（数据调取请求）

### 模块 5："忘记我"功能

#### 用户视角

- 进入「设置 → 隐私 → 忘记我」
- 确认弹窗："你确定要删除所有个人数据吗？此操作不可恢复"
- 选择删除范围：
  - 🔴 删除全部（账户注销 + 数据清除）
  - 🟡 仅删除咨询历史（保留账户）
  - 🟢 仅删除记忆锚定（不影响咨询）

#### 后端实现

```typescript
// forget-me.service.ts 伪代码
async function forgetUser(userId: string, scope: 'all' | 'history' | 'memory'): Promise<void> {
  await db.$transaction(async (tx) => {
    if (scope === 'all' || scope === 'history') {
      await tx.consultRecord.deleteMany({ where: { userId } });
      await tx.consultDialogue.deleteMany({ where: { userId } });
    }
    if (scope === 'all' || scope === 'memory') {
      await tx.userMemory.deleteMany({ where: { userId } });
      await tx.userInsightProfile.deleteMany({ where: { userId } });
    }
    if (scope === 'all') {
      await tx.user.delete({ where: { id: userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.creditLedger.deleteMany({ where: { userId } });
    }
    // 记录删除日志（仅用于审计，30 天后自动删除）
    await tx.forgetMeAuditLog.create({
      data: { userId, scope, deletedAt: new Date() },
    });
  });
  // 通知 LLM Gateway 清除该用户的 prompt cache
  await llmGateway.purgeUserCache(userId);
}
```

### 模块 6：合规检查

#### 中国《个人信息保护法》要点

| 条款 | 要求 | 我们的实现 |
|------|------|----------|
| 第 13 条 | 合法基础 | 用户同意（M3 模块 3） |
| 第 17 条 | 告知 | 隐私政策 + 同意 UI |
| 第 24 条 | 自动化决策透明 | 告知用户"系统会根据你的命盘生成建议" |
| 第 44 条 | 知情同意 | 勾选 + 撤回机制 |
| 第 47 条 | 主动删除 | "忘记我"功能 |
| 第 73 条 | 敏感个人信息 | 命理数据按 L3~L5 处理 |

#### GDPR 额外要求

| 条款 | 要求 | 我们的实现 |
|------|------|----------|
| Art. 15 | 数据访问权 | 用户可导出个人数据（JSON） |
| Art. 16 | 更正权 | 用户可编辑咨询记录 |
| Art. 17 | 被遗忘权 | "忘记我"功能 |
| Art. 20 | 数据可携权 | 导出功能（PDF + JSON） |
| Art. 22 | 算法决策 | 告知用户 AI 生成内容、不替代真人 |

#### 命理类应用特殊条款

- ❌ 不声称"100% 准确"
- ❌ 不替用户做医疗/法律/投资决策
- ✅ 明确告知"这是基于传统文化模型的参考建议"
- ✅ 提供付费用户"真人咨询师"通道（可选）

---

## 三、Schema 扩展（必做）

在 P3-1/P3-2/P3-3 实施前，必须先做以下 schema 扩展：

```prisma
// UserMemory 模型扩展
model UserMemory {
  id          String   @id @default(cuid())
  userId      String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 现有字段
  chartHistory    String?  @default("{}")
  consultHistory  String?  @default("{}")
  timelineEvents  String?  @default("{}")
  insights        String?  @default("{}")

  // M3 新增字段
  consentAt            DateTime?
  consentVersion       String?
  consentMemoryAnchor  Boolean   @default(false)
  consentCallback      Boolean   @default(false)
  consentPersonalize   Boolean   @default(false)
  expiresAt            DateTime?
  scrubLevel           Int       @default(1)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])  // 用于 cron 自动清理
}

// 新增 ForgetMeAuditLog 模型
model ForgetMeAuditLog {
  id         String   @id @default(cuid())
  userId     String
  scope      String   // 'all' | 'history' | 'memory'
  deletedAt  DateTime @default(now())
  // 30 天后自动删除（cron job）
  expiresAt  DateTime

  @@index([userId])
  @@index([expiresAt])
}
```

#### 数据迁移策略

由于 UserMemory 是已有表，采用**软迁移**：
1. 默认值：所有现有用户的同意字段 = false，scrubLevel = 1
2. 渐进式回填：下次用户进入 App 时，弹窗请求同意
3. 保留期到期：自动清理脚本

---

## 四、实施步骤

### 阶段 1：Schema 扩展（0.5 天）

1. 修改 Prisma schema
2. 运行 `prisma migrate dev --name add_consent_fields`
3. 验证迁移成功
4. 老用户数据保留（默认值）

### 阶段 2：同意 UI（1 天）

1. 创建 `<PrivacyConsentModal />` 组件
2. 接入 userProfileStore
3. 接入点：首次进入 App / 设置入口

### 阶段 3："忘记我"功能（1 天）

1. 创建 `/api/user/forget-me` 后端 API
2. 创建「设置 → 隐私 → 忘记我」前端入口
3. 实现 forget-me.service.ts
4. LLM Gateway 清除缓存

### 阶段 4：合规审计（0.5 天）

1. 内部 review：律师 / 顾问（如有）
2. 隐私政策更新
3. 用户协议更新
4. 准备 GDPR / 个保法合规 checklist

---

## 五、与其他任务的关系

### P3 任务依赖 M3

```
M3 (隐私框架) ──┬──→ P3-1 (回访系统)   // 需要 consentCallback
                ├──→ P3-2 (记忆锚定)   // 需要 consentMemoryAnchor
                └──→ P3-3 (用户分类)   // 需要 consentPersonalize
```

### 与 M4 状态机的关系

M4 状态机的 IDLE → COMPLETED 流转中，需要**读取 consent 字段决定功能开关**：

```typescript
// mini-state-machine.service.ts
if (currentState === 'GENERATING' && !userMemory.consentMemoryAnchor) {
  // 用户未同意记忆锚定 → 不注入历史摘要
  promptContext.historySummary = undefined;
}
```

---

## 六、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 老用户不重新同意 | P3 功能无法为他们激活 | 进入 App 时弹窗，但**不强制阻断**其他功能 |
| "忘记我"误触 | 数据无法恢复 | 二次确认 + 输入"删除"字样 |
| LLM 数据回传第三方 | 合规风险 | 选本地模型 + 私有部署 |
| 数据泄露 | 用户信任崩塌 | 加密存储 + 最小权限 + 审计日志 |

---

## 七、未来扩展

- **数据可携权导出**：用户可一键导出所有数据（JSON + PDF）
- **算法决策解释**：每次 AI 输出附带"我为什么这样说"的解释
- **第三方审计**：年度合规审计报告
- **数据脱敏 API**：提供给第三方开发者使用

---

*文档结束。M3 是 P3 阶段的前置依赖，必须先完成。*