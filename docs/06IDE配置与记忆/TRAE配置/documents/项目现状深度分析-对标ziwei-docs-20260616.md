# 人生决策宗师 — 项目现状深度分析 & 对标报告

> **对标基准**：[ziwei-reverse-engineering-docs.md](file:///C:/Users/10919/Desktop/AWKN-Lab/.trae/documents/ziwei-reverse-engineering-docs.md)
> **分析日期**：2026-06-16
> **项目路径**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师`

---

## 一、执行摘要

### 1.1 一句话结论

> **项目整体完成度约 75%，核心算法链路（Python 排盘 → TypeScript 后端 → 前端展示）已打通，但存在 3 类阻塞项：运行时错误（已修复）、后端集成不完整（流盘 CLI 同步调用未生效）、前端样式问题（待定位）。**

### 1.2 5 维评分卡

| 维度 | 权重 | 得分 | 加权分 | 依据 |
|------|------|------|--------|------|
| 算法引擎 | 30% | 85 | 25.50 | Python 排盘引擎 80.75/100（对标文墨天机），125+ 测试 |
| 后端集成 | 25% | 70 | 17.50 | TypeScript 后端已接入 Python CLI，但 spawn 同步调用有 bug，流盘参数已透传但 CLI 结果未正确读取 |
| 前端完整度 | 20% | 75 | 15.00 | 19 个页面路由，4 个 lazy import 缺失（已修复），样式问题待定位 |
| 测试覆盖 | 15% | 80 | 12.00 | Python 125+ 测试 / TypeScript 多个 .spec.ts / 前端无测试 |
| 部署就绪 | 10% | 40 | 4.00 | 无 CI/CD、无 Docker、环境硬编码、sxtwl 未安装 |
| **总分** | **100%** | — | **74.00** | **接近上线但需补齐集成与部署** |

---

## 二、对标工程文档的逐项核查

### 2.1 接口文档对标

| 文档定义 | 实际状态 | 差距 |
|---------|---------|------|
| **Python CLI 接口** | ✅ 已实现 | `paipan_cli.py` 位于 `C:\Users\10919\Desktop\AWKN-Lab\projects\ziwei-reverse\python-validator\paipan_cli.py` |
| CLI 位置参数 (year/month/day/hour/sex) | ✅ 已实现 | 5 个必选参数 |
| --liupan-year/month/day/hour | ✅ 已实现 | 流盘参数已支持 |
| --feixing | ✅ 已实现 | 飞星计算已支持 |
| --config | ✅ 已实现 | PaipanConfig 19 项 |
| --pretty | ✅ 已实现 | JSON 格式化输出 |
| **TypeScript API 接口** | ✅ 已实现 | `POST /api/v1/consult/analyze` 路由存在 |
| routeType: 'ziwei' | ✅ 已实现 | CalcEngineService 支持 ziwei 路由 |
| ZiweiResult.liupan 字段 | ✅ 已定义 | ziwei-agent.service.ts L51-79 定义了完整 liupan 类型 |
| 流盘参数透传 (targetYear/Month/Day/Hour) | ✅ 已实现 | ziwei-agent.service.ts L282-287 透传 --liupan-* 参数 |
| **Python 内部函数** | ✅ 已实现 | paipan() / calc_liupan() / calc_feixing() / GejuEngine.match() |

### 2.2 数据文档对标

| 文档定义 | 实际状态 | 差距 |
|---------|---------|------|
| PaipanConfig 19 项 | ✅ 已实现 | test_config.py 35 tests 覆盖 |
| 星曜编号体系 (1-99) | ⚠️ 部分问题 | #66/#67 太阳/太阴名称冲突（文档已标注"已修复"，但需验证） |
| 流盘数据结构 (daxian/liunian/xiaoxian/liuyue/liuri/liushi) | ✅ 已实现 | liupan.py 802 行 24 函数 |

### 2.3 测试文档对标

| 文档定义 | 实际状态 | 差距 |
|---------|---------|------|
| test_p2_regression.py (9 用例) | ✅ 存在 | — |
| test_liupan.py (50 用例) | ⚠️ 2 skipped | sxtwl 未安装导致流日/流时测试跳过 |
| test_feixing.py (3 用例) | ✅ 存在 | — |
| test_config.py (35 用例) | ✅ 存在 | — |
| test_p3d.py (28 用例) | ✅ 存在 | — |
| test_e2e_5cases.py (5 用例) | ✅ 存在 | — |
| TypeScript tsc --noEmit | ✅ 通过 | 本次验证 exit code 0 |

### 2.4 部署说明对标

| 文档定义 | 实际状态 | 差距 |
|---------|---------|------|
| pip install sxtwl | ❌ 未安装 | 流日/流时测试 skipped |
| Python 3.9+ | ✅ 可用 | — |
| npm install | ✅ 可用 | — |
| Python CLI 路径配置 | ⚠️ 硬编码 | ziwei-agent.service.ts L270-273 硬编码了 3 个路径 |
| 构建命令 | ✅ 可用 | tsc --noEmit 通过 |

### 2.5 变更记录对标

| 文档记录 | 实际状态 | 差距 |
|---------|---------|------|
| ziwei.py sxtwl v2 API 修复 | ✅ 已完成 | — |
| liupan.py sxtwl v2 API 修复 | ✅ 已完成 | — |
| 星名冲突修复 | ⚠️ 待验证 | 文档声称已修复，需运行测试确认 |
| TS 后端流盘集成 | ⚠️ 部分完成 | 参数透传已实现，但 spawn 同步调用有 bug |
| 审计临时文件清理 | ❌ 未确认 | 需验证 4 个 test_audit_*.py 是否已删除 |

### 2.6 未确认项对标

| 文档定义 | 实际状态 | 差距 |
|---------|---------|------|
| 缺失的 1 个格局 | ⚠️ 待确认 | geju_engine.py 82/83 规则 |
| 安星码编码规则 | ⚠️ 待提取 | AS3 UI 层 |
| MLK 解析工具可运行性 | ⚠️ 待验证 | 依赖 pycryptodome + pylzma |
| 运曜/流曜算法 | ⚠️ 待实现 | 需从文墨天机配置项参考提取 |

---

## 三、关键问题清单（按严重度排序）

### 🔴 P0 — 阻塞上线

| # | 问题 | 位置 | 影响 | 状态 |
|---|------|------|------|------|
| 1 | **spawn 同步调用 bug** | [ziwei-agent.service.ts](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/ziwei-agent/ziwei-agent.service.ts#L294-L307) L294-307 | `spawn()` 是异步的，但代码在 L303 立即读取 `proc.exitCode`，此时子进程尚未完成，exitCode 始终为 null → Python CLI 结果永远读不到 → 降级到 iztro | **未修复** |
| 2 | **sxtwl 未安装** | Python 环境 | 流日/流时测试 skipped，生产环境流盘数据不完整 | **未修复** |

### 🟡 P1 — 影响质量

| # | 问题 | 位置 | 影响 | 状态 |
|---|------|------|------|------|
| 3 | **4 个页面 lazy import 缺失** | [App.tsx](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/App.tsx#L24-L27) | MiaosuanPage 等运行时 ReferenceError | **已修复** ✅ |
| 4 | **星名冲突** | ziwei.py STAR_NAMES | 太阳(#3 主星 + #66 杂曜) / 太阴(#8 主星 + #67 杂曜) | **待验证** |
| 5 | **前端样式问题** | 未定位 | 确认伤病/工作生活状态对话框宽度不一致 + 云端类型图标颜色不可见 | **待定位** |
| 6 | **Python CLI 路径硬编码** | [ziwei-agent.service.ts](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/ziwei-agent/ziwei-agent.service.ts#L269-L273) L269-273 | 部署到其他机器时路径不匹配 | **未修复** |

### 🟢 P2 — 优化项

| # | 问题 | 位置 | 影响 | 状态 |
|---|------|------|------|------|
| 7 | **审计临时文件未清理** | python-validator/ | 4 个 test_audit_*.py 残留 | **未确认** |
| 8 | **格局判定 82/83** | geju_engine.py | 缺 1 个格局规则 | **低优先级** |
| 9 | **I18N 缺失** | 全局 | 简繁韩 0% | **用户规模>1万后做** |
| 10 | **真太阳时/夏令时缺失** | CalendarCalc | 跨时区用户八字不准确 | **用户规模>1万后做** |

---

## 四、核心问题深度分析

### 4.1 🔴 P0-1：spawn 同步调用 bug（最关键）

**问题**：[ziwei-agent.service.ts](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/ziwei-agent/ziwei-agent.service.ts#L294-L307) L294-307

```typescript
// 当前代码（有 bug）
const proc = spawn(pythonExe, args, {
  timeout: 8000,
  windowsHide: true,
  shell: false,
});

proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

const exitCode = proc.exitCode;  // ❌ spawn 是异步的，此时 exitCode = null
if (exitCode !== 0 || !stdout.trim()) {  // ❌ 永远为 null → 永远降级
  return null;
}
```

**根因**：`child_process.spawn()` 是异步的，需要用 `spawnSync()` 或包裹在 Promise 中等待 `close` 事件。

**影响**：Python 排盘引擎的结果**永远读不到**，系统**始终降级到 iztro**。这意味着：
- 文墨天机级别的排盘精度无法使用
- 流盘数据（大限/流年/流月等）无法返回
- 飞星数据无法返回
- 格局判定数据无法返回

**修复方案**：改用 `spawnSync()` 或 `execSync()`

```typescript
// 方案 A：spawnSync（推荐）
import { spawnSync } from 'child_process';

const result = spawnSync(pythonExe, args, {
  timeout: 8000,
  windowsHide: true,
  shell: false,
  encoding: 'utf-8',
});

if (result.status !== 0 || !result.stdout?.trim()) {
  this.logger.warn(`[ZiweiAgent] Python CLI failed: ${result.stderr?.substring(0, 200)}`);
  return null;
}

const pyOutput = JSON.parse(result.stdout.trim());
```

**风险**：spawnSync 会阻塞 Node.js 事件循环 8 秒（timeout），但在单用户场景下可接受。高并发场景需改为 Worker 或异步队列。

### 4.2 🔴 P0-2：sxtwl 未安装

**问题**：Python 农历转换库 `sxtwl` 未安装，导致：
- `test_liupan.py` 2 个测试 skipped
- 生产环境流日/流时数据可能缺失

**修复**：`pip install sxtwl`（需确认 sxtwl v2+）

---

## 五、架构现状全景

### 5.1 数据流全景

```
用户请求 → 前端 (React) → API Client → NestJS 后端
                                              │
                                              ▼
                                        CalcEngineService
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                         ZiweiAgent     QimenAgent      LiuyaoAgent
                              │
                    ┌─────────┼─────────┐
                    ▼                   ▼
            Python CLI (spawn)    iztro (降级)
                    │
                    ▼
            paipan_cli.py → ziwei.py + liupan.py + feixing.py + geju_engine.py
                    │
                    ▼
            JSON 输出 → LLM 分析 → 结构化结果
```

### 5.2 前端路由现状

| 路由 | 页面 | lazy import | 状态 |
|------|------|------------|------|
| / | HomePage | ✅ | 正常 |
| /consult | ConsultPage | ✅ | 正常 |
| /info | InfoPage | ✅ | 正常 |
| /result | ResultPage | ✅ | 正常 |
| /membership | MembershipPage | ✅ | 正常 |
| /profile | ProfilePage | ✅ | 正常 |
| /history | HistoryPage | ✅ | 正常 |
| /growth | GrowthPage | ✅ | 正常 |
| /admin | AdminPage | ✅ | 正常 |
| /price | PricePage | ✅ | 正常 |
| /feedback | FeedbackPage | ✅ | 正常 |
| /fortune | FortunePage | ✅ | 正常 |
| /kline-intro | KlineIntroPage | ✅ | 正常 |
| /tide | TidePage | ✅ | 正常 |
| /frontdesk | FrontdeskChat | ✅ | 正常 |
| /preview | ComponentPreview | ✅ | 正常 |
| /miaosuan | MiaosuanPage | ✅ | **已修复** |
| /shumiyuan | ShumiyuanPage | ✅ | **已修复** |
| /tongjian | TongjianPage | ✅ | **已修复** |
| /xingtu | XingtuPage | ✅ | **已修复** |

### 5.3 后端模块现状

| 模块 | 服务 | 状态 |
|------|------|------|
| CalcEngine | CalcEngineService | ✅ 路由分发正常 |
| ZiweiAgent | ZiweiAgentService | ⚠️ spawn bug 导致 Python 引擎不可用 |
| QimenAgent | QimenAgentService | ✅ |
| LiuyaoAgent | LiuyaoAgentService | ✅ |
| LlmGateway | LlmProvidersService | ✅ |
| NamingAgent | QumingAgentService | ✅ |
| Consult | ConsultService | ✅ |

---

## 六、与对标文档的差距矩阵

| 对标文档定义 | 实际完成度 | 差距说明 |
|------------|----------|---------|
| Python CLI 接口完整 | **100%** | 无差距 |
| TypeScript API 接口完整 | **90%** | 接口定义完整，但 spawn bug 导致实际不可用 |
| Python 内部函数完整 | **100%** | 无差距 |
| PaipanConfig 19 项 | **100%** | 无差距 |
| 星曜编号体系 | **95%** | 太阳/太阴名称冲突待验证 |
| 流盘数据结构 | **100%** | 无差距 |
| 测试矩阵 125+ 用例 | **98%** | 2 个 skipped（sxtwl 未安装） |
| TypeScript 编译验证 | **100%** | tsc --noEmit 通过 |
| Python 引擎部署 | **60%** | sxtwl 未安装、路径硬编码 |
| TypeScript 后端部署 | **70%** | spawn bug、无 Docker |
| 回滚方案 | **50%** | 文档有方案但未验证 |

---

## 七、优先修复路线图

### Phase 1：解除阻塞（必须立即做）

| # | 任务 | 文件 | 风险 |
|---|------|------|------|
| 1 | **修复 spawn 同步调用 bug** | ziwei-agent.service.ts L294-307 | 改为 spawnSync |
| 2 | **安装 sxtwl** | Python 环境 | pip install sxtwl |

### Phase 2：质量补齐（1 周内）

| # | 任务 | 文件 | 风险 |
|---|------|------|------|
| 3 | 验证星名冲突修复 | ziwei.py | 运行 test_p2_regression.py |
| 4 | Python CLI 路径改为环境变量 | ziwei-agent.service.ts | 用 process.env.ZIWEI_CLI_PATH |
| 5 | 清理审计临时文件 | python-validator/ | 删除 4 个 test_audit_*.py |
| 6 | 定位并修复前端样式问题 | 待定位 | 对话框宽度 + 图标颜色 |

### Phase 3：部署就绪（2 周内）

| # | 任务 | 说明 |
|---|------|------|
| 7 | Docker 化 | Python + Node.js 双进程容器 |
| 8 | 环境变量配置 | CLI 路径、LLM API Key、数据库连接 |
| 9 | CI/CD 流水线 | 自动测试 + 自动构建 |
| 10 | 全量测试验证 | Python 125+ tests + TypeScript tsc + E2E |

---

## 八、结论

| 维度 | 对标文档定义 | 实际现状 | 差距 |
|------|------------|---------|------|
| 算法引擎 | 80.75/100 | 80.75/100 | **无差距** — Python 排盘引擎已完整 |
| 后端集成 | CLI 已支持流盘 | spawn bug 导致不可用 | **关键差距** — 1 行代码 bug 阻塞整条链路 |
| 前端展示 | 19 个页面路由 | 19 个路由 + 4 个已修复 | **已修复** |
| 测试覆盖 | 125+ tests | 123+ tests (2 skipped) | **轻微差距** — sxtwl 未安装 |
| 部署就绪 | 文档有方案 | 无 Docker/CI/CD | **显著差距** |

**一句话**：算法引擎已达标，但 1 个 spawn 同步调用 bug 导致 Python 引擎结果永远读不到，系统始终降级到 iztro。修复此 bug 后，整条链路即可打通。
