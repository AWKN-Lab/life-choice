# P0-3 ReAct FactLedger - 生产验证结果单

- 日期：2026-07-04
- 验证方式：生产dist代码部署验证
- 结论：**PASS**

## P0-3 问题背景

- **问题**：生产日志显示请求已包含出生日期/时间/性别 + 排盘完成，ReAct 仍反复要求用户补充年龄/大运/出生信息
- **影响**：增加模型调用次数 + 延迟 + 用户感知"系统没记住"
- **根因**：
  1. ReAct 引擎没有结构化 FactLedger，事实通过扁平 `Record<string, any>` 传递
  2. birthInfo/chartSnapshot/daYun/liuNian 未单独传入 ReAct，埋在 calc_result 嵌套 JSON 中
  3. `JSON.stringify(facts).slice(0, 1500)` 截断导致关键事实字段丢失
  4. ask_user action 无事实存在性检查，LLM 可随意追问已存在字段

## 修复方案

采用"结构化 FactLedger + 追问阻断"方案：
1. 在 `react-engine.service.ts` 新增 `FactLedger` 接口，结构化管理 birthInfo/chartSnapshot/currentDaYun/currentLiuNian/userContext/parallelResults
2. 在 `orchestrator.service.ts` 新增 `buildFactLedger()` 方法，从 OrchestratorInput + calcResult + memorySummary + parallelResult 提取已确认事实
3. ReAct 引擎 `run()` 方法接受 `factLedger` 参数，注入 think/reflect prompt
4. `checkClarifyBlocked()` 在 ask_user 时检查 FactLedger 已有字段，命中关键词则阻断追问
5. 阻断记录写入 `blockedClarifications` 数组，强制收敛到已有事实答案

## 修改文件清单

### 1. react-engine.service.ts（修改）
- 新增 `FactLedger` 接口（6 个结构化字段）
- 新增 `CLARIFY_KEYWORD_TO_FIELD` 关键词映射表（5 类 × 多关键词）
- 新增 `checkClarifyBlocked()` 追问阻断方法
- 新增 `formatFactLedger()` 格式化方法
- 修改 `run()` 方法：添加 factLedger 参数 + ask_user 阻断逻辑 + blockedClarifications 返回
- 修改 `think()` / `reflect()` / `buildThinkPrompt()` / `extractFinalFromFacts()`：添加 factLedger 参数，注入结构化事实

### 2. orchestrator.service.ts（修改）
- import 添加 `FactLedger` 类型
- ReAct 调用处添加 `buildFactLedger()` 构造和传参
- 新增 `buildFactLedger()` 私有方法：从 data.birthInfo/calcResult.calcData/memorySummary/parallelResult 提取结构化事实
- 日志添加 `blockedClarifications` 计数

### 3. __tests__/react/p0-3-fact-ledger.spec.ts（新增）
- 7 个测试用例覆盖追问阻断逻辑

## 生产部署验证

### 1. 代码部署确认

| 文件 | dist中存在 | P0-3 关键字段数 |
|------|-----------|---------------|
| react-engine.service.js | ✅ | 56 处（FactLedger/factLedger/checkClarifyBlocked/blockedClarifications/buildFactLedger） |
| orchestrator.service.js | ✅ | 20 处（buildFactLedger/FactLedger/factLedger） |

### 2. 服务状态

- PM2: online, PID=976164, uptime=6s, restarts=302
- Health: `{"code":0,"message":"ok","database":"connected"}`
- 资源恢复: 13 个目录/文件从 dist.old-p03 恢复

### 3. 追问阻断关键词映射

| FactLedger 字段 | 阻断关键词 | 标签 |
|----------------|-----------|------|
| birthInfo | 出生/生日/出生日期/出生时间/几月/几号/哪年/八字 | 出生信息 |
| chartSnapshot | 排盘/四柱/年柱/月柱/日柱/时柱/天干/地支 | 排盘结果 |
| currentDaYun | 大运/运程 | 当前大运 |
| currentLiuNian | 流年/今年/2026 | 当前流年 |
| userContext | 背景/情况/现状/工作/感情 | 用户背景 |

## 完成标准核对

- [x] 出生信息、排盘结果、当前大运、流年、用户背景进入统一 FactLedger
- [x] 已存在字段禁止再次追问（checkClarifyBlocked 阻断逻辑）
- [x] 每次追问记录缺失字段与来源（blockedClarifications 数组）
- [x] 无新增信息时强制收敛到已有事实答案（extractFinalFromFacts 优先从 FactLedger 提取）

## 测试验证

### 本地测试
- `npx tsc --noEmit` 通过
- `npx jest --testPathPattern="p0-3-fact-ledger|react-engine"` 2套件15用例通过
- 全量 `npx jest` 80套件1377用例通过，0失败

### 生产验证
- PM2 online + health 200
- dist中 react-engine.service.js 包含 56 处 P0-3 字段
- dist中 orchestrator.service.js 包含 20 处 P0-3 字段
- 13 个资源目录/文件已恢复

## 安全稳定性评估

- **风险等级**：低
  - FactLedger 为可选参数，未传时走原逻辑（向后兼容）
  - 阻断逻辑只在 ask_user + 关键词命中 + 字段已存在时触发
  - conclude/tool/subagent action 不受影响
- **回滚方式**：
  - 代码回滚：`git checkout 3637cf3c~1 -- 2个文件`
  - 生产回滚：`cp -r dist.old-p03/* dist/` + `pm2 reload awkn-life-backend`
- **兼容性**：
  - 旧消费者不传 factLedger 不影响功能
  - FactLedger 字段全部可选，部分缺失不阻断

## 下一步

- P0-3: **CLOSED**
- 剩余P0：
  - P0-4: 五层输出与LLM结构协议稳定性
