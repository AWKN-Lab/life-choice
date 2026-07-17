# MingLi-Bench 能力吸收计划

> 源：`C:\Users\10919\Downloads\MingLi-Bench-main\MingLi-Bench-main\`
> 目标：`awkn-life-backend/apps/api-server/src/mingli-bench/`
> 日期：2026-05-25
> 状态：**后端 P0/P1/P2 已完成，前端待构建**

---

## 一、现状基线

| 文件 | 当前状态 | 对标差距 |
|------|---------|---------|
| `mingli-bench.service.ts` (573 行) | ✅ 已吸收全部 6 项能力 | — |
| `dto/run-benchmark.dto.ts` (39 行) | ✅ 已添加 shuffleOptions / maxWorkers | — |
| `mingli-bench.controller.ts` (41 行) | ✅ 已添加 /categories / /history/:runId/export | — |
| `schema.prisma` BenchmarkRun | ✅ 已添加 categoryStats / detailedResults | — |
| 前端 benchmark 页面 | ❌ **完全不存在** | 需从零构建 |
| `DATASET_PATH` | ⚠️ 硬编码路径 | 应改环境变量 |

---

## 二、吸收批次完成状态

### ✅ P0 批次（核心鲁棒性提升）— 已完成

#### 2.1 选项打乱机制 ✅ DONE

**实现位置**：[mingli-bench.service.ts L134-L178](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L134-L178)

- `shuffleOptions()` — Derangement 算法（Fisher-Yates + 固定点检测，最多 100 次尝试）
- DTO 新增 `shuffleOptions?: boolean`
- `evaluateQuestion()` 中检查 `shuffleOptions` → 打乱 → 记录 `optionMap`
- `BenchmarkResultItem` 接口新增 `optionMap?: Record<string, string>`
- 答案比较使用 `optionMap[predicted]` 反向映射

#### 2.2 答案提取正则升级 ✅ DONE

**实现位置**：[mingli-bench.service.ts L245-L276](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L245-L276)

- 9 条优先级正则（Pattern 1-8 取首次，Pattern 9 取末次）
- Markdown 预处理（`[\*_\`]+` → ``）
- `allLetters[allLetters.length - 1]` 兜底策略

---

### ✅ P1 批次（数据丰富度提升）— 后端已完成，前端待做

#### 2.3 题目分类体系应用 — 后端 ✅ / 前端 ❌

**后端已实现**：
- `QUESTION_CATEGORIES` 常量（8 类 + 关键词）— [L73-L82](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L73-L82)
- `getCategories()` 公开方法 — [L112-L114](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L112-L114)
- `categoryBreakdown` 8 类补齐（无数据类别 total:0）— [L425-L438](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L425-L438)
- `GET /api/v1/benchmark/categories` — [controller L9-L12](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.controller.ts#L9-L12)
- Prisma `categoryStats Json?` — [schema L428](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/prisma/schema.prisma#L428)

**前端待做**：
- 分类雷达图组件（用 categoryBreakdown 数据渲染）
- 结果显示"8 类完整 table"（即使某类 0 条也显示）

#### 2.4 逐题详细日志保存 — 后端 ✅ / 前端 ❌

**后端已实现**：
- `detailedResults` Prisma 持久化 — [L479-L493](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L479-L493)
- `GET /api/v1/benchmark/history/:runId/export` — [controller L37-L40](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.controller.ts#L37-L40)
- `BenchmarkResultItem` 包含 `optionMap` / `baziPillars` / `llmContent` / `llmReasoning` / token 信息

**前端待做**：
- benchmark 历史页（`app/src/pages/Benchmark/`）：列表 + 筛选
- "查看详情"弹窗：逐题日志 — 题目 / 预测 / 正确 / 耗时 / token / prompt
- 结果表格"选项打乱"列

---

### ✅ P2 批次（方法与性能优化）— 已完成

#### 2.5 Prompt 工程模板升级 ✅ DONE

**实现位置**：[mingli-bench.service.ts L215-L243](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L215-L243)

- 三段式模板：命主信息 → 排盘/问题/选项 → CoT/直接指令
- `useCot` 切换指令文本

#### 2.6 并发评估支持 ✅ DONE

**实现位置**：[mingli-bench.service.ts L387-L418](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/mingli-bench/mingli-bench.service.ts#L387-L418)

- DTO 新增 `maxWorkers?: number`（1-10）
- 串行模式（maxWorkers ≤ 1）
- 并发模式（`Promise.allSettled` + 批次串行）

---

## 三、待完成清单

### 3.1 前端 benchmark 页面（优先级 P1）

> **当前状态**：前端 `app/src/` 中 **零个** benchmark 相关文件，需从零构建

#### Step 1: API Service 层
**文件**：`app/src/api/benchmark.ts`

```typescript
// 封装所有 benchmark API 调用
- runBenchmark(params)  → POST /api/v1/benchmark/run
- getHistory()           → GET /api/v1/benchmark/history
- getHistoryById(id)     → GET /api/v1/benchmark/history/:id
- exportHistoryById(id)  → GET /api/v1/benchmark/history/:id/export
- getCategories()        → GET /api/v1/benchmark/categories
```

**验收**：所有端点可调通

#### Step 2: benchmark 历史记录页
**文件**：`app/src/pages/Benchmark/History.tsx`

- 列表展示历史 benchmark 运行记录
- 筛选器：provider / CoT / Astro / shuffleOptions / 日期范围
- 每行显示：runId / 时间 / 题目数 / 正确率 / 平均耗时 / provider / 配置标签
- "查看详情"按钮 → 弹窗

**验收**：列表正确展示 Prisma 持久化的历史数据

#### Step 3: 详情弹窗（逐题日志）
**文件**：`app/src/pages/Benchmark/DetailModal.tsx`

- 上半：运行摘要（准确率 / 分类饼图 / token 总量）
- 下半：逐题日志 table
  - 列：题号 / 题目 / 类别 / 正确答案 / 预测答案 / 判定 / 耗时 / token / 选项打乱
- 点击某行展开：完整 prompt + LLM 返回内容

**验收**：每题可追溯完整 LLM 交互链路

#### Step 4: 分类雷达图组件
**文件**：`app/src/components/benchmark/RadarChart.tsx`

- 基于 `categoryBreakdown` 渲染 8 轴雷达图
- 可选：同时展示多个 run 的叠加对比
- 推荐用 ECharts 或 Chart.js（项目已有依赖）

**验收**：8 类数据正确映射到雷达图

#### Step 5: 运行配置面板
**文件**：`app/src/pages/Benchmark/RunPanel.tsx`

- 表单：year / sampleSize / useCot / useAstro / shuffleOptions / provider / maxWorkers
- "开始 Benchmark"按钮 → 调用 runBenchmark
- 运行时显示进度条（模拟，因后端是同步请求）

**验收**：表单正确提交，结果页正确展示返回数据

---

### 3.2 后端收尾项（优先级 P0）

#### 3.2.1 DATASET_PATH 环境变量化
**文件**：`mingli-bench.service.ts` L71

```diff
- const DATASET_PATH = 'C:/Users/10919/Downloads/MingLi-Bench-main/MingLi-Bench-main/data/data.json';
+ const DATASET_PATH = process.env.MINGLI_BENCH_DATA_PATH ||
+   path.resolve(__dirname, '../../../../../MingLi-Bench-main/data/data.json');
```

**验收**：部署环境可通过环境变量指定数据集路径

#### 3.2.2 getHistory/getHistoryById config 修复
**文件**：`mingli-bench.service.ts` L522 / L554

当前硬编码 `shuffleOptions: false, maxWorkers: 1`。方案：
- 方案 A：Prisma 新增 `shuffleOptions` + `maxWorkers` 字段 → 数据库读回
- 方案 B（短期）：从 `detailedResults` 反推 shuffleOptions（检查 optionMap 是否为 1:1 映射）

**建议**：方案 A，Prisma schema 加两个字段后 regenerate

#### 3.2.3 后端 build 环境修复
```bash
cd awkn-life-backend
npm install                    # 恢复缺失依赖
npx prisma generate            # 重新生成 Prisma client
npx nest build                 # 验证零错误
```

**当前状态**：183 个 build error，全部为预存在（Prisma client 未生成 + node_modules 缺失）

---

### 3.3 长期架构演进（P3，不在本次计划内）

| 项 | 说明 |
|----|------|
| 模型工厂重构 | 当前 `LlmProvidersService` 已覆盖所有 provider，重构 ROI 低 |
| 紫微模块解耦 | `useAstro` 模式需要紫微排盘模块独立 |
| 增量评估 | 只评估上次运行后新增的题目 |

---

## 四、执行顺序

```
3.2.3 环境修复（npm install + prisma generate）
    ↓
3.2.1 DATASET_PATH 环境变量化
    ↓
3.2.2 getHistory config 修复（Prisma 加字段）
    ↓
3.1.1 API Service 层（前端）
    ↓
3.1.2 历史记录页 + 3.1.5 运行配置面板（并行）
    ↓
3.1.3 详情弹窗 + 3.1.4 雷达图（并行）
    ↓
build 全链路验证
```

---

## 五、验收标准总清单

- [x] P0-1: `shuffleOptions=true` 时，选项映射表无 1:1 固定点
- [x] P0-2: 9 条正则按优先级匹配
- [x] P1-3 (后端): BenchmarkRun 含 8 类完整 categoryBreakdown
- [x] P1-4 (后端): 逐题日志含 prompt / response / 耗时 / token
- [x] P2-5: CoT 模式 prompt 含"逐步推理"指令
- [x] P2-6: maxWorkers≥2 时并发
- [ ] 3.2.1: DATASET_PATH 从环境变量读取
- [ ] 3.2.2: getHistory 返回真实的 shuffleOptions/maxWorkers
- [ ] 3.2.3: `npx nest build` 后端零错误
- [ ] 3.1.1: benchmark API service 可调通
- [ ] 3.1.2: 历史记录页展示 Prisma 持久化的运行记录
- [ ] 3.1.3: 详情弹窗展示逐题完整日志
- [ ] 3.1.4: 分类雷达图正确渲染 8 类数据
- [ ] 3.1.5: 运行配置面板可发起 benchmark
- [ ] `npx vite build` 前端零错误