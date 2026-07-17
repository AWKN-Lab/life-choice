# FTS5 + v2 混合搜索落地计划 - 20260705

> 用户意图："按你的需要额外依赖建议 规划其他计划"
> 硬约束：零外部 API、零数据外露、最小额外依赖、保持 v2 生产

---

## 一、目标与边界

### 目标
在现有 v2（TF-IDF + numpy）生产基础上，引入 FTS5 作为关键词检索层，构建 **FTS5 + v2 双路混合搜索**，提升召回率与稳定性，同时保持额外依赖最小化。

### 本轮做（IN SCOPE）
1. 把 FTS5 评估索引迁移到服务器（生产化）
2. 实现 `/retrieve` `/embed_search` `/hybrid_search` 的 FTS5 + v2 双路融合
3. 用 12 查询验证混合召回率 ≥ v2 基线（0.917）
4. 100 并发压测混合搜索（483MB 服务器）
5. 灰度切流 10% → 50% → 100%

### 本轮不做（OUT OF SCOPE）
1. 不引入 LanceDB / sqlite-vec / any 向量数据库
2. 不引入 Embedding 模型（BGE / OpenAI / 任何外部 API）
3. 不替换 v2 numpy 检索（v2 保留作为 rerank 层）
4. 不升级服务器配置（继续用 483MB）
5. 不重构 main.py 业务逻辑（仅扩展检索函数）

### 约束与假设
- 假设 1：483MB 内存可用，无需扩容
- 假设 2：v2 numpy 检索在 100 并发下 OOM 风险已存在，需用 FTS5 做前置过滤降压
- 假设 3：FTS5 单查询延迟 20-60ms（含元数据 join），可接受
- 假设 4：业务流量峰值 100 QPS（来自前端日志估算）

---

## 二、选定拆解视角

**刀法选择：按数据流（输入 → 检索 → 融合 → 输出）**

理由：
1. 混合搜索本质是数据流问题（FTS5 + v2 → 融合打分 → 输出）
2. 按数据流拆解，每步可独立验收，不互相阻塞
3. 失败时可定位到具体阶段（是 FTS5 漏召回？还是 v2 rerank 错？）

---

## 三、当前状态分析

### 已完成资产
- ✅ FTS5 索引已构建：`knowledge/processed/passages_fts.db`（362.6MB，357k passages）
- ✅ 12 查询评估完成：FTS5 avg_p@10=0.717，v2=0.917
- ✅ v2 生产稳定：5 接口全 PASS，passageCount=357359
- ✅ 服务器 PM2 在线：knowledge-service id=47

### 阻塞点
- FTS5 单查询召回率 < v2（0.717 < 0.917），不能直接替换
- 但 FTS5 的索引构建、查询语法已验证可行
- 需要将 FTS5 + v2 融合，扬长避短

### 风险评估
| 风险 | 等级 | 缓解 |
|------|------|------|
| 100 并发下 FTS5 + v2 同时跑 OOM | 中 | 仅命中数 < 阈值时启动 v2 rerank |
| 混合打分融合权重调不好 | 低 | 用 12 查询反馈调优，可回滚到纯 v2 |
| 灰度切流影响真实流量 | 中 | 用 canary header 路由，仅记录不上线 |

---

## 四、实施步骤（最小闭环）

### Step 1：FTS5 服务化（4 小时）

**动作**：
- 创建 `scripts/fts5_search.py`（FTS5 独立模块，纯 SQLite，无依赖）
- 实现 `search(query, system_type, top_k, keywords) -> List[Passage]`
- 支持 AND / OR / 核心词三级退化策略（复用 eval_fts5.py 逻辑）

**产出文件**：
- `scripts/fts5_search.py`（新增）
- `scripts/test_fts5_search.py`（新增，单元测试）

**验收标准**：
- 模块独立运行：`python scripts/fts5_search.py "日主身弱" bazi 10`
- 返回 10 条结果，含 score / passage_id / book / chapter
- 单元测试 PASS：12 查询全部命中（≥1 条）

**验证方法**：
```bash
python scripts/fts5_search.py "日主身弱如何取用神" bazi 5
# 期望：返回 5 条 bazi 类相关 passages
pytest scripts/test_fts5_search.py -v
```

**回滚方式**：
- 删除 `scripts/fts5_search.py`，无需回滚索引文件
- FTS5 索引不影响生产服务

**风险标记**：低

---

### Step 2：v2 向量检索独立化（2 小时）

**动作**：
- 创建 `scripts/v2_search.py`（把 main.py 的 v2 检索逻辑抽出来）
- 实现 `search(query_vec, system_type, top_k) -> List[Passage]`
- 接受外部传入的 query_vec（解耦 encode / search）

**产出文件**：
- `scripts/v2_search.py`（新增）
- `scripts/test_v2_search.py`（新增）

**验收标准**：
- 模块独立运行：`python scripts/v2_search.py --vec np.array([...])`
- 返回 10 条结果，score 与主流程一致
- 不依赖 sentence_transformers（v2 用 TF-IDF，无需模型）

**验证方法**：
```bash
pytest scripts/test_v2_search.py -v
# 期望：12 查询全部命中，avg_p@10 ≥ 0.917
```

**回滚方式**：
- 删除 `scripts/v2_search.py`，不影响 main.py

**风险标记**：低

---

### Step 3：FTS5 + v2 混合搜索（4 小时）

**动作**：
- 创建 `scripts/hybrid_search.py`
- 流水线：
  ```
  query → FTS5初筛(top_k=50) → v2 rerank → 融合打分 → Top-10
         └─ 命中<5条 → 仅FTS5，不走v2（节省内存）
  ```
- 融合打分公式：`final_score = 0.6 * fts_score_norm + 0.4 * v2_score_norm`
- 权重可调（config 或 env）

**产出文件**：
- `scripts/hybrid_search.py`（新增）
- `scripts/test_hybrid_search.py`（新增）

**验收标准**：
- 12 查询评估：avg_p@10 ≥ 0.95
- 弱网测试：FTS5 返回 0 条时，v2 兜底正常
- 内存测试：混合搜索内存峰值 < 200MB（满足 483MB 服务器限制）

**验证方法**：
```bash
python scripts/eval_hybrid.py  # 复用 eval_fts5.py 框架
# 期望：avg_p@10 ≥ 0.95
pytest scripts/test_hybrid_search.py -v
```

**回滚方式**：
- 删除 `scripts/hybrid_search.py`
- main.py 继续走原 v2 流程（无需改动）

**风险标记**：中

---

### Step 4：部署到服务器 + 5 接口验证（3 小时）

**动作**：
- scp `scripts/fts5_search.py` / `v2_search.py` / `hybrid_search.py` 到服务器
- scp `passages_fts.db`（362.6MB）到服务器
- 修改 `apps/AWKN-LABlife/services/knowledge-service/main.py`：
  - `retrieve()`: 走 hybrid_search
  - `embed_search()`: 走 hybrid_search（用 FTS5 关键词层代替 TF-IDF）
  - `hybrid_search()`: 走 hybrid_search_v2（v2 BM25 + v2 向量）
- 重启 PM2（`pm2 restart 47`）
- 跑 5 接口验证（`_verify_prod_5api_v2.py`）

**产出文件**：
- 服务器上的 scripts 与 .db
- main.py 修改（git diff 显示）

**验收标准**：
- 5/5 接口 PASS
- `/retrieve` `/embed_search` 返回结果数 ≥ v2
- `/health-v2` 显示 v2_initialized=True
- 服务器内存 < 400MB（483MB 限制）

**验证方法**：
```bash
ssh aliyun-awkn "cd /opt/awkn-life && \
  bash scripts/_verify_prod_5api_v2.py"
# 期望：5/5 PASS, ALL GREEN
```

**回滚方式**：
- `git revert` main.py 改动
- `pm2 restart 47`
- 服务器立即回到纯 v2 服务（10 分钟内恢复）

**风险标记**：中（涉及线上主流程）

---

### Step 5：100 并发压测（3 小时）

**动作**：
- 创建 `scripts/load_test_hybrid.py`（基于 `verify_v2_lightweight.py`）
- 模拟 100 并发查询
- 记录：p50 / p95 / p99 延迟、错误率、内存峰值
- 持续 10 分钟
- 对比 v2（基线）与 hybrid（新方案）

**产出文件**：
- `scripts/load_test_hybrid.py`（新增）
- `knowledge/processed/load_test_hybrid_20260705.json`（结果）

**验收标准**：
- p99 延迟 < 500ms（业务可接受）
- 错误率 = 0%（无 OOM、无超时）
- 内存峰值 < 400MB

**验证方法**：
```bash
ssh aliyun-awkn "cd /opt/awkn-life && \
  python3 scripts/load_test_hybrid.py --concurrent 100 --duration 600"
# 期望：p99<500ms, err=0%, mem<400MB
```

**回滚方式**：
- 压测不影响生产（独立测试脚本）
- 失败则不灰度，直接回滚 Step 4

**风险标记**：中（压测可能影响真实流量）

---

### Step 6：灰度切流 10% → 100%（2 天）

**动作**：
- 用 nginx / API 网关做流量切分（10% → 50% → 100%）
- 配置 `X-Canary: hybrid` header 路由
- 监控真实流量召回率与延迟（前端日志 + APM）
- 每天 +1 个观察日，3 天不降级则全量

**产出文件**：
- `apps/AWKN-LABlife/configs/nginx-canary-hybrid.conf`（新增）
- `scripts/monitor_hybrid_prod.py`（实时监控脚本）
- 灰度日志归档

**验收标准**：
- D+1：10% 流量下，无 P0/P1 故障
- D+2：50% 流量下，召回率与延迟未降级
- D+3：100% 全量，召回率 ≥ v2

**验证方法**：
- 看 APM 指标（前端埋点已记录 _retrieve_latency_ms）
- 业务反馈：命理师认可检索结果质量

**回滚方式**：
- nginx 把 canary header 流量切回 v2（5 秒生效）
- 或 `pm2 restart 47` 走纯 v2 路径

**风险标记**：中（涉及真实业务流量）

---

### Step 7：结果单 + Git commit（1 小时）

**动作**：
- 创建 `apps/AWKN-LABlife/docs/engineering/FTS5混合搜索-v0.2-结果单-20260705.md`
- Git commit 全部产出
- 更新 `.trae/documents/下一步计划-20260705.md` 为"已完成"

**产出文件**：
- 结果单（新增）
- Git commit messages

**验收标准**：
- git log 显示新 commit
- 结果单含：目标 / 产出 / 数据 / 风险 / 回滚执行记录

---

## 五、高风险清单（自动标红）

| # | Step | 风险描述 | 缓解措施 |
|---|------|---------|----------|
| 1 | 4 | main.py 修改影响线上 | 用 git revert 1 秒回滚，10 分钟恢复 |
| 2 | 5 | 100 并发压测可能 OOM | 先 10/20/50 并发渐进，发现问题立即停 |
| 3 | 6 | 灰度切流召回率降低 | D+1 用 12 查询回归测试，必须 PASS |
| 4 | 3 | 融合权重调不好 | 权重 0.6/0.4 默认，可配置 env，失败回纯 v2 |

---

## 六、最终验收（DoD）

### 用户可见体验（至少 3 条）
1. `/retrieve` `/embed_search` 返回更相关的命理典籍 passages（召回率 ≥ v2）
2. 100 并发下页面响应无 500 错误、无白屏
3. 模糊查询（"身弱"、"贼克"）仍能命中专业典籍

### 系统可观测性
- p50/p95/p99 延迟指标（前端 APM）
- 服务器内存 / CPU 监控（PM2 + top）
- 召回率周报（12 查询回归）

### 稳定性
- 连续 7 天 100 QPS 无 P0 故障
- 凌晨全量索引重建（cron，每月 1 次）

### 回归清单
- [ ] /retrieve 12 查询全 PASS
- [ ] /embed_search 12 查询全 PASS
- [ ] /hybrid_search 12 查询全 PASS
- [ ] /health-v2 v2_initialized=True
- [ ] /health bookCount=1126 passageCount=357359

---

## 七、复盘模板（Step 6 完成后）

```markdown
## 复盘记录 v0.2
- 本轮做了：Step 1-7 通过/未通过
- 卡点是什么：（如有）
- 下轮第一步：（最小下一口）
```

---

## 八、产出文件清单

| 文件 | 用途 | 类型 |
|------|------|------|
| `scripts/fts5_search.py` | FTS5 检索模块 | 新增 |
| `scripts/v2_search.py` | v2 检索模块解耦 | 新增 |
| `scripts/hybrid_search.py` | 混合检索流水线 | 新增 |
| `scripts/load_test_hybrid.py` | 100 并发压测 | 新增 |
| `scripts/eval_hybrid.py` | 混合检索评估 | 新增 |
| `scripts/test_fts5_search.py` | 单元测试 | 新增 |
| `scripts/test_v2_search.py` | 单元测试 | 新增 |
| `scripts/test_hybrid_search.py` | 单元测试 | 新增 |
| `apps/AWKN-LABlife/docs/engineering/FTS5混合搜索-v0.2-结果单-20260705.md` | 结果单 | 新增 |
| `apps/AWKN-LABlife/services/knowledge-service/main.py` | 接入混合检索 | 修改 |

---

## 九、工时估算

| Step | 工时 |
|------|------|
| 1: FTS5 服务化 | 4h |
| 2: v2 解耦 | 2h |
| 3: 混合搜索 | 4h |
| 4: 部署 + 5 接口 | 3h |
| 5: 100 并发压测 | 3h |
| 6: 灰度切流 | 2 天（含 3 天观察） |
| 7: 结果单 + commit | 1h |
| **总计** | **3 天（含观察日）** |

---

## 十、与 LanceDB 方案的差异

| 维度 | FTS5 + v2（本计划） | LanceDB |
|------|---------------------|---------|
| 新增依赖 | **0** | lancedb + pyarrow |
| 服务器内存 | ~10MB（FTS5 缓存） | ~150MB |
| 召回率预估 | **0.95+** | 0.6-0.7（不优于 v2） |
| 100 并发稳定性 | ✅ 无 OOM | ❌ 易 OOM（483MB） |
| 数据出境 | ❌ 无 | ❌ 无 |
| 实施周期 | 3 天 | 2-3 周 |

**结论**：FTS5 + v2 混合方案在"零依赖 / 483MB 友好 / 高召回率"约束下全面优于 LanceDB。

---

## 十一、版本历史

| 版本 | 日期 | 修改 |
|------|------|------|
| v0.1 | 2026-07-05 | 初始计划（基于 FTS5 评估结果） |
