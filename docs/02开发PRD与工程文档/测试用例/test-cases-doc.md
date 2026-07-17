# 测试用例文档

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）

> **版本**：v1.1
> **原始日期**：2026-06-16
> **生产校准日期**：2026-07-07
> **当前生产烟测入口**：[`TEST-当前生产烟测基线-20260707.md`](./TEST-当前生产烟测基线-20260707.md)

下文保留单元测试与历史用例结构。发布硬闸门、公网烟测、数据库迁移检查和知识检索性能采用 2026-07-07 生产烟测基线。

---

## 1. 测试基础设施

| 项目 | 说明 |
|------|------|
| 测试框架 | Jest |
| 应用框架 | NestJS |
| 测试工具 | `@nestjs/testing` 的 `Test.createTestingModule` |
| 运行命令 | `npx jest` / `npx jest --watch` / `npx jest <path>` |
| Mock 策略 | 手动构造 mock 对象 + `jest.fn()`，不使用自动 mock |
| 测试文件约定 | `*.spec.ts`，与源文件同目录或 `__tests__/` 子目录 |

---

## 2. 现有测试文件清单

### 2.1 咨询管线（consult）

| 测试文件 | 测试目标 | 关键测试点 |
|---------|---------|-----------|
| `consult/__tests__/orchestrator.spec.ts` | 编排器 | 调度决策、Agent 选择 |
| `consult/__tests__/router.service.spec.ts` | 路由服务 | 意图路由、路由分发 |
| `consult/__tests__/classifier/user-state-classifier.spec.ts` | 用户状态分类器 | casual/genuine/repeating/validating 四类判定 |
| `consult/__tests__/generation/generation-composer.spec.ts` | 生成组合器 | 多模块输出组合 |
| `consult/__tests__/integration/pipeline-integration.spec.ts` | 管线集成 | 端到端流程 |
| `consult/__tests__/prompt/prompt-layers.spec.ts` | Prompt 分层 | 系统/角色/场景层叠加 |
| `consult/__tests__/quality/quality-gate.spec.ts` | 质量门禁 | 输出质量校验 |
| `consult/__tests__/react/react-engine.spec.ts` | ReAct 引擎 | 推理-行动循环 |
| `consult/__tests__/routes/intent-router.spec.ts` | 意图路由 | 问题→路由映射 |
| `consult/__tests__/safety/high-risk-detector.spec.ts` | 高危检测 | 危机关键词拦截 |
| `consult/consult.service.spec.ts` | 咨询服务 | 路由/分析/提交/保存/删除 |
| `consult/generators/kline.generator.spec.ts` | K线生成器 | OHLCV 数据生成 |

### 2.2 计算引擎（calc-engine）

| 测试文件 | 测试目标 | 关键测试点 |
|---------|---------|-----------|
| `calc-engine/bazi-engine/__tests__/bazi-data.spec.ts` | 八字数据 | 天干地支数据完整性 |
| `calc-engine/bazi-engine/__tests__/bazi-golden.spec.ts` | 八字黄金用例 | 已知八字→已知结果 |
| `calc-engine/bazi-engine/__tests__/jieqi-validation.spec.ts` | 节气校验 | 节气计算精度 |
| `calc-engine/bazi-calculator.spec.ts` | 八字计算器 | 排盘核心逻辑 |
| `calc-engine/naming-engine/__tests__/kangxi-strokes.spec.ts` | 康熙笔画 | 笔画数准确性 |
| `calc-engine/naming-engine/__tests__/naming-calculator.spec.ts` | 起名计算器 | 五格计算 |
| `calc-engine/naming-engine/__tests__/zodiac-taboo.spec.ts` | 生肖禁忌 | 12生肖×忌用部首 |

### 2.3 原子工具（lib/atom-tools）

| 测试文件 | 测试目标 | 关键测试点 |
|---------|---------|-----------|
| `lib/atom-tools/__tests__/cross-validate.spec.ts` | 交叉验证 | 多维度结果一致性 |
| `lib/atom-tools/__tests__/wuxing-balance.spec.ts` | 五行平衡 | 五行强弱判定 |
| `lib/atom-tools/__tests__/rizhu-strength.spec.ts` | 日主强弱 | 日主旺衰计算 |

### 2.4 其他模块

| 测试文件 | 测试目标 | 关键测试点 |
|---------|---------|-----------|
| `qimen-agent/__tests__/qimen-golden.spec.ts` | 奇门黄金用例 | 奇门遁甲排盘验证 |
| `membership/membership.service.spec.ts` | 会员服务 | 权限门控/会员分层/积分扣减 |

---

## 3. 测试覆盖缺口

以下模块有业务逻辑但**无测试文件**：

| 模块 | 路径 | 风险等级 | 说明 |
|------|------|---------|------|
| **kline-tide** | `kline-tide/kline-tide.service.ts` | 🔴 P1 | K线+潮汐图数据服务，SQLite 持久化 + OHLCV 解析，无测试 |
| **zhangbanshan-scheduler** | `consult/orchestrator/zhangbanshan-scheduler.service.ts` | 🔴 P1 | 张半山调度器，Agent 选择 + 工具组合编排，无测试 |
| **mingli-bench** | `mingli-bench/mingli-bench.service.ts` | 🟡 P2 | 命理基准测试，依赖 LlmProvidersService，无测试 |
| **tide-inference** | `tide-inference/tide-inference.service.ts` | 🟡 P2 | 潮汐推导服务，无测试 |
| **payment** | `payment/payment.service.ts` | 🔴 P1 | 支付服务，无测试 |
| **auth** | `auth/auth.service.ts` | 🔴 P0 | 认证服务，无测试 |
| **admin** | `admin/admin.controller.ts` | 🔴 P0 | 管理后台，无测试 |
| **health** | `health.controller.ts` | 🟡 P0 | 健康检查，无测试 |
| **chronicle** | `chronicle/chronicle.service.ts` | 🟡 P2 | 编年史服务，无测试 |
| **followup** | `consult/followup/followup.service.ts` | 🟡 P2 | 跟进服务，无测试 |
| **dialogue** | `consult/dialogue/dialogue.service.ts` | 🟡 P2 | 对话服务，无测试 |

---

## 4. 待补充的关键测试用例

### 4.1 P0：生产基线（必须优先补齐）

#### 4.1.1 健康检查端点（8 项，对应 health-check.sh）

| 编号 | 测试用例 | 验证内容 |
|------|---------|---------|
| HC-01 | `GET /health` 返回 200 + `{ code: 0, message: 'ok' }` | 后端存活 |
| HC-02 | `GET /health/db` 返回 `{ db: 'connected', provider: 'sqlite' }` | 数据库连接 |
| HC-03 | `GET /health/llm` 返回 LLM 状态 | LLM Provider 可用性 |
| HC-04 | `HEAD /health` 返回 200 | 轻量存活探针 |
| HC-05 | PM2 进程 `awkn-life-backend` 存在且 cwd 正确 | 进程状态 |
| HC-06 | 前端 `/life/` 返回 200 + 含 `<script` 标签 | 前端可达 |
| HC-07 | SQLite 数据库文件存在 + WAL 模式已启用 | 数据持久化 |
| HC-08 | 管理员登录后 `isAdmin=true` | 管理员保底 |

#### 4.1.2 管理员登录与权限门控

| 编号 | 测试用例 | 验证内容 |
|------|---------|---------|
| AUTH-01 | 正确密码登录返回 JWT token | 登录成功 |
| AUTH-02 | 错误密码登录返回 401 | 登录失败 |
| AUTH-03 | JWT token 访问 admin 端点返回 200 | 权限通过 |
| AUTH-04 | 无 token 访问 admin 端点返回 403 | 权限拦截 |
| AUTH-05 | `ensure-admin.js` 脚本创建管理员 | 管理员保底 |

#### 4.1.3 数据库备份与恢复

| 编号 | 测试用例 | 验证内容 |
|------|---------|---------|
| DB-01 | `backup-db.sh` 生成备份文件 | 备份成功 |
| DB-02 | 备份文件大小 > 0 | 备份非空 |
| DB-03 | 从备份恢复后数据完整 | 恢复成功 |
| DB-04 | 备份失败时部署中止 | 安全守卫 |

### 4.2 P1：收入主链路

#### 4.2.1 咨询管线端到端（4 路由）

| 编号 | 测试用例 | 验证内容 |
|------|---------|---------|
| PIPE-01 | 子平路由：有出生信息 → ziping → 八字排盘 + LLM 生成 | ziping 完整流程 |
| PIPE-02 | 六壬路由：有问事时间 → liuren → 六壬排盘 + LLM 生成 | liuren 完整流程 |
| PIPE-03 | 混合路由：多维度问题 → mixed → 多 Agent 组合 | mixed 完整流程 |
| PIPE-04 | 澄清路由：模糊问题 → clarify → 追问 | clarify 完整流程 |
| PIPE-05 | 路由降级：LLM 不可用时走规则引擎 fallback | 降级路径 |

#### 4.2.2 K线数据流

| 编号 | 测试用例 | 验证内容 |
|------|---------|---------|
| KLINE-01 | 种子数据写入 KlineBar 表 | 数据入库 |
| KLINE-02 | `GET /api/v1/kline-tide` 返回 OHLCV 结构 | API 输出格式 |
| KLINE-03 | 前端 K线图渲染（7 维度 × 12 月） | 前端展示 |
| KLINE-04 | OHLCV JSON 字符串解析正确 | 数据解析 |
| KLINE-05 | 内存 fallback 生成逻辑 | 无数据时降级 |

#### 4.2.3 起名引擎（五格计算精度）

| 编号 | 测试用例 | 验证内容 |
|------|---------|---------|
| NAME-01 | 康熙笔画查询：常见字笔画数准确 | kangxi-strokes 精度 |
| NAME-02 | 五格计算：天格/人格/地格/外格/总格 | 五格公式 |
| NAME-03 | 生肖禁忌过滤：12 生肖 × 忌用部首 | zodiac-taboo 规则 |
| NAME-04 | 笔画冲突字符（如「茵」11画 vs 9画）使用正确值 | 冲突解决 |
| NAME-05 | 三才五行组合吉凶判定 | 三才配置 |

#### 4.2.4 付费门控（免费 vs 付费分层）

| 编号 | 测试用例 | 验证内容 |
|------|---------|---------|
| PAY-01 | basic 模块：无会员可访问 | 免费层 |
| PAY-02 | kline 模块：无会员拒绝访问 | 付费门控 |
| PAY-03 | kline 模块：月卡会员可访问 | 月卡权限 |
| PAY-04 | kline 模块：单次/按次会员拒绝访问 | 单次权限不足 |
| PAY-05 | deep 模块：年卡会员可访问 | 年卡权限 |
| PAY-06 | naming 模块：月卡会员可访问 | 起名权限 |
| PAY-07 | 管理员零积分自动充值 50 + 扣减 1 | 管理员保底 |
| PAY-08 | 非管理员无会员解锁 kline 返回失败 | 权限拒绝 |

---

## 5. 已知测试失败

### 5.1 consult.service.spec.ts — 21 个测试失败

**根因**：`ConsultService` 的依赖注入中缺少 `LlmProvidersService` 的 mock 提供者。

`ConsultService` 构造函数依赖 `LlmProvidersService`（通过 `HealthController` 和 `zhangbanshan-scheduler.service.ts` 间接引入），但测试模块的 `providers` 数组中未提供该依赖的 mock。

**错误表现**：

```
Nest can't resolve dependencies of the ConsultService (LlmProvidersService)
```

### 5.2 修复方案

在 `consult.service.spec.ts` 的 `Test.createTestingModule` 中添加 `LlmProvidersService` 的 mock：

```typescript
import { LlmProvidersService } from '../llm-providers/llm-providers.service';

// 在 beforeEach 中添加 mock
const mockLlmProviders = {
  getLlmHealth: jest.fn().mockResolvedValue({ status: 'ok' }),
  chat: jest.fn().mockResolvedValue({ content: 'mock response' }),
  getProvider: jest.fn().mockReturnValue({ name: 'deepseek-direct' }),
} as any;

// 在 providers 数组中添加
const module: TestingModule = await Test.createTestingModule({
  providers: [
    ConsultService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: RouterService, useValue: mockRouterService },
    { provide: CalcEngineService, useValue: mockCalcEngine },
    { provide: LlmGatewayService, useValue: mockLlmGateway },
    { provide: WebsocketGateway, useValue: mockWebsocketGateway },
    { provide: BaziCalculatorWrapper, useValue: mockBaziCalculator },
    { provide: KlineGenerator, useValue: mockKlineGenerator },
    // ↓ 新增：修复 21 个测试失败
    { provide: LlmProvidersService, useValue: mockLlmProviders },
  ],
}).compile();
```

**修复后预期**：21 个测试全部通过。

---

## 6. 测试优先级路线图

| 阶段 | 时间 | 目标 | 关键动作 |
|------|------|------|---------|
| **P0 修稳** | Week 1 | 修复已知失败 + 补齐健康检查 | 修复 consult.service 21 失败；补 health.controller.spec.ts |
| **P0 安全** | Week 1-2 | 认证 + 权限 + 备份 | 补 auth/admin/backup 测试 |
| **P1 收入** | Week 2-4 | 咨询管线 + K线 + 起名 + 付费 | 补 4 路由 e2e + kline-tide + naming + payment |
| **P2 能力** | Week 4+ | 剩余模块覆盖 | mingli-bench / chronicle / followup / dialogue |

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-16 | v1.0 | 初始版本：测试基础设施、现有文件清单、覆盖缺口、关键用例、已知失败修复方案 |
