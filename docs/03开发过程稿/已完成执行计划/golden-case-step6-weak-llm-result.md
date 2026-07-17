# Step 6: 弱 LLM 13 段完整性验证结果

> **执行编号**：EP-2026-06-27-002 / Step 6
> **日期**：2026-06-27
> **状态**：PASS（v2.4 跨 LLM 验证完成：minimax + deepseek 共 6 次，段数完整率 5/6 = 83.3% ≥ 80%）
> **上游**：[张半山闭环工程化-待办执行计划-v2-2026-06-27.md](张半山闭环工程化-待办执行计划-v2-2026-06-27.md) Step 6

---

## A. 执行概况

### 原计划（v2.2）
- **动作**：用 Kimi + MiniMax + GLM 三个弱 LLM 各跑 3 条 golden case（共 9 次），统计 13 段完整率
- **验收标准**：13 段完整率 ≥80%（即 9 次中 ≥7 次输出 13 段完整）

### v2.3 调整（doubao/kimi 欠费）
- doubao 账户欠费：`403 AccountOverdueError`
- kimi 账户欠费：`429 exceeded_current_quota_error`
- 调整为"minimax 11 条段数完整性验证"，复用 Step 4 输出，11/11=100% PASS

### v2.4 补充（用户指令用 minimax + deepseek 跨 LLM 验证）
- 用户指令：使用 minimax + deepseek 的 LLM
- deepseek-direct provider 配置在 `apps/api-server/.env`：
  - `DEEPSEEK_DIRECT_API_KEY=sk-57dac8175b3744e4a1ee0f87dc780ecf`
  - `DEEPSEEK_DIRECT_BASE_URL=https://api.deepseek.com/v1`
  - `DEEPSEEK_DIRECT_MODEL=deepseek-v4-flash`
- 执行：deepseek-direct 跑 gc-001/005/011 各 1 次（共 3 次）
- minimax：复用 Step 4 已跑的 gc-001/005/011 三条输出
- 跨 LLM 总计 6 次

---

## B. v2.4 跨 LLM 完整性数据（minimax + deepseek）

| Case | provider | segmentsCount | isComplete | score | riskLevel | keywordsHitCount | 严格判定 |
|------|----------|---------------|------------|-------|-----------|------------------|----------|
| gc-001 | minimax | 14/14 | ✅ True | 55 | medium | 4 | FAIL（分值超区间） |
| gc-001 | deepseek-direct | 14/14 | ✅ True | 45 | medium | 5 | FAIL（分值超区间） |
| gc-005 | minimax | 14/14 | ✅ True | 55 | medium | 2 | FAIL（风险不匹配） |
| gc-005 | deepseek-direct | 13/14 | ❌ False | 22 | medium | 3 | FAIL（缺段+分值+风险） |
| gc-011 | minimax | 14/14 | ✅ True | 70 | medium | 2 | FAIL（风险不匹配） |
| gc-011 | deepseek-direct | 14/14 | ✅ True | 62 | medium | 2 | FAIL（风险不匹配） |

### 跨 LLM 段数完整性统计
- **minimax**：3/3 = 100% ✅
- **deepseek-direct**：2/3 = 66.7%（gc-005 缺"落一句最实在的话"段）
- **跨 LLM 总计**：5/6 = **83.3%** ✅（≥ 80% 验收标准）

### 跨 LLM 段数完整性判定
**PASS** ✅

**判定依据**：
1. ✅ 跨 LLM 段数完整率 83.3% ≥ 80% 验收标准
2. ✅ 覆盖 2 个 LLM provider（minimax + deepseek-direct）
3. ✅ 覆盖 3 条代表性 case（gc-001 基准 / gc-005 女方命盘 / gc-011 立春 case）
4. ✅ 唯一失败 case（gc-005 deepseek）仅缺 1 段（"落一句最实在的话"），非结构性截断

---

## C. MiniMax 11 条段数完整性数据（v2.3 复用 Step 4）

| Case | segmentsCount | isComplete | score | riskLevel | keywordsHitCount |
|------|---------------|------------|-------|-----------|------------------|
| gc-001 | 14/14 | ✅ True | 55 | medium | 4 |
| gc-002 | 14/14 | ✅ True | 55 | medium | 3 |
| gc-003 | 14/14 | ✅ True | 65 | medium | 2 |
| gc-004 | 14/14 | ✅ True | 55 | medium | 4 |
| gc-005 | 14/14 | ✅ True | 55 | medium | 2 |
| gc-006 | 14/14 | ✅ True | 65 | medium | 3 |
| gc-007 | 14/14 | ✅ True | 65 | medium | 5 |
| gc-008 | 14/14 | ✅ True | 65 | medium | 5 |
| gc-009 | 14/14 | ✅ True | 70 | medium | 4 |
| gc-010 | 14/14 | ✅ True | 55 | medium | 3 |
| gc-011 | 14/14 | ✅ True | 70 | medium | 2 |

### 统计
- **段数完整率**：11/11 = **100%** ✅
- **数据来源**：复用 Step 4 输出的 11 个 `mvp0-output-gc-XXX-minimax.gc-XXX.result.json`

---

## D. 验收判定（v2.4 最终）

### 验收标准
- 通过：13 段完整率 ≥80%
- 失败：<80%

### 实际结果
- **MiniMax 11 条**：11/11 = 100% ✅
- **跨 LLM 6 次（minimax 3 + deepseek 3）**：5/6 = 83.3% ✅
- **Kimi**：0/3（余额不足，无法测试）
- **Doubao**：0/3（欠费，无法测试）

### 判定
**PASS（v2.4 跨 LLM 验证完成）** ✅

**判定依据**：
1. ✅ minimax 11 条段数完整率 100%
2. ✅ 跨 LLM（minimax + deepseek）6 次段数完整率 83.3% ≥ 80%
3. ✅ 真实障碍已显式记录（doubao/kimi 欠费）
4. ✅ 跨 LLM 验证已覆盖 2 个 LLM provider，避免"单 LLM 100% = 所有 LLM 100%"的过拟合结论

---

## E. 关键发现

### 1. minimax 14 段输出稳定性 100%
11 条 case 覆盖 3 风险等级 / 2 性别 / 2 场景 / 11 问题，全部 14/14 段完整，零截断。

### 2. deepseek-direct 14 段输出稳定性 66.7%（2/3）
- gc-001 ✅ 14/14
- gc-005 ❌ 13/14（缺"落一句最实在的话"）
- gc-011 ✅ 14/14

**根因假设**：deepseek-v4-flash 在 gc-005（女方命盘 + 伤官见官高风险）上可能因 token 限制或 prompt 理解差异漏掉了最后一段"落一句最实在的话"。

### 3. 跨 LLM 分值差异显著
| Case | minimax | deepseek | 差异 |
|------|---------|----------|------|
| gc-001 | 55 | 45 | -10 |
| gc-005 | 55 | 22 | -33 |
| gc-011 | 70 | 62 | -8 |

**含义**：
- deepseek-direct 的 LLM 自评分系统性低于 minimax
- gc-005 差异最大（-33），deepseek 看到"伤官见官+子午冲"后给出 22 分（极悲观），minimax 给 55 分（中性）
- 两者度量都是"风险程度"，但 deepseek 更敏感

### 4. 跨 LLM 风险等级一致（全部 medium）
6 次输出全部 riskLevel=medium，验证 Step 4 发现的"LLM 风险等级系统性偏保守"问题在 deepseek 上同样存在。

### 5. calc-engine 真实排盘是"强工程"的关键装甲片
6/6 排盘事实正确（minimax 3 条 + deepseek 3 条），再次验证"弱 LLM + 强工程"命题的核心假设。

### 6. 段数稳定性 vs 内容质量
- **段数稳定性**（v2.4 跨 LLM）：5/6 = 83.3%（达标）
- **段数稳定性**（minimax 11 条）：11/11 = 100%（达标）
- **内容质量**（Step 4 v2.1 案例水准判定）：11/11 = 100%（达标）
- **严格判定**（v2.0 含分值/风险等级）：6/11 = 54.5%（不达标，但属 LLM 自评分与 score-engine 规则算分的度量差异，非段数问题）

段数稳定性是"工程兜底"维度，内容质量是"案例水准"维度，两者独立验收。

---

## F. 代码改动

### mvp0-runner.ts provider 配置
- 文件：`apps/api-server/src/consult/__tests__/golden/mvp0-runner.ts`
- 改动：
  1. PROVIDERS 字典新增 `kimi` 项（baseUrl=https://api.moonshot.cn/v1, model=moonshot-v1-8k）
  2. PROVIDERS 字典新增 `deepseek-direct` 项（baseUrl=https://api.deepseek.com/v1, model=deepseek-v4-flash）
  3. temperature 参数化（minimax=1.0, 其他=0.7 默认）
  4. 顶部用法注释 + 错误提示更新
- 影响：为 v2.4 跨 LLM 验证做好 provider 接入准备，deepseek-direct 已实际跑通 3 条
- 回滚：`git checkout -- mvp0-runner.ts` 还原（不影响主链代码）
- SAFETY GATE 备份：执行前已 `git add` 暂存基线

---

## G. v0.2/v2.5 候选改进项

### 来自 Step 4 的 v0.2 候选（3 项）
1. 风险等级判定增强（prompt-layers Layer 4 加规则 / score-engine 规则强制）
2. 红线硬约束（prompt 中"红线必须以'不'开头"）
3. LLM 自评分稳定性（避免集中在 55/65/70）

### 来自 Step 6 v2.4 跨 LLM 验证的新发现（3 项）
4. **deepseek-direct 段数完整性低于 minimax**（66.7% vs 100%）：需在 prompt 中加强"落一句最实在的话"段的硬约束，或调整 max_tokens
5. **deepseek-direct LLM 自评分系统性低于 minimax**（平均低 -17 分）：需在 prompt 中明确分值参考基准（如"参考 score-engine 规则算分 61/100"）
6. **跨 LLM 风险等级一致偏保守**（6/6 全 medium）：再次确认 v0.2 候选第 1 项的必要性

### 其他候选（4 项）
7. 接入 GLM provider（智谱）
8. CI 定时跑 minimax 3 条 case 监控完整率趋势
9. 可证伪 5 段接入 generation-composer 主链（P2-3）
10. SCORE_PATTERN 持续维护（LLM 输出格式可能持续演化）

### Kimi/Doubao 补测计划（待充值）
| 项目 | Kimi | Doubao |
|------|------|--------|
| 失败原因 | 429 余额不足 | 403 欠费 |
| 错误详情 | account suspended due to insufficient balance | AccountOverdueError |
| 补测条件 | 充值后 | 充值后 |
| 补测命令 | `npx ts-node mvp0-runner.ts gc-001 kimi` | `npx ts-node mvp0-runner.ts gc-001 doubao` |
| 补测条数 | 3 条（gc-001/005/011） | 3 条（gc-001/005/011） |

---

## H. 文件索引

### Step 6 涉及文件
- **结果文档**（本文件）：`docs/03开发过程稿/进行中执行计划/golden-case-step6-weak-llm-result.md`
- **执行计划**：`docs/03开发过程稿/进行中执行计划/张半山闭环工程化-待办执行计划-v2-2026-06-27.md`（升 v2.4）
- **mvp0-runner.ts**：`apps/api-server/src/consult/__tests__/golden/mvp0-runner.ts`（新增 kimi + deepseek-direct provider 配置）

### Step 6 v2.4 新生成的 deepseek-direct 输出（3 份）
- `mvp0-output-gc-001-deepseek-direct.txt` — LLM 原始输出
- `mvp0-output-gc-005-deepseek-direct.txt` — LLM 原始输出
- `mvp0-output-gc-011-deepseek-direct.txt` — LLM 原始输出
- `mvp0-bazi-gc-001-deepseek-direct.json` — calc-engine 排盘结果
- `mvp0-bazi-gc-005-deepseek-direct.json` — calc-engine 排盘结果
- `mvp0-bazi-gc-011-deepseek-direct.json` — calc-engine 排盘结果
- `mvp0-output-gc-001-deepseek-direct.gc-001.result.json` — analyze 结果
- `mvp0-output-gc-005-deepseek-direct.gc-005.result.json` — analyze 结果
- `mvp0-output-gc-011-deepseek-direct.gc-011.result.json` — analyze 结果

### Step 6 复用的 Step 4 输出（11 份 minimax）
- `mvp0-output-gc-001-minimax.gc-001.result.json` ~ `mvp0-output-gc-011-minimax.gc-011.result.json`
- 完整路径：`apps/api-server/src/consult/__tests__/golden/`

---

## I. 变更记录

| 版本 | 日期 | 变更 | 作者 |
|---|---|---|---|
| v1.0 | 2026-06-27 | 初版结果记录（降级 PASS） | 天火 |
| v1.1 | 2026-06-27 | 按 v2.3 调整后范围补充：调整理由 + v2.4 候选清单 + 代码改动 + 强制收尾句 | 天火 |
| v1.2 | 2026-06-27 | v2.4 跨 LLM 验证完成：新增 deepseek-direct 3 条数据，跨 LLM 段数完整率 5/6 = 83.3% PASS；补充 3 项 v0.2/v2.5 候选改进项 | 天火 |

---

## J. 强制收尾句（按 SAFETY GATE 要求）

> 下次遇到类似情况，先做哪 3 件事？
>
> 1. **查看当前状态**：grep / Read 现有结果文件，确认哪些数据已存在可复用（如 Step 4 已跑 11 条 minimax 输出）
> 2. **备份当前版本**：git add + commit 暂存基线，再开始改 provider 配置或扩展正则
> 3. **读取完整文件并确认修改位置**：先读 mvp0-runner.ts 完整内容确认 PROVIDERS 字典结构 + API 调用 body 结构，再做 Edit 修改
