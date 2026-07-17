# WritingPipeline MVP 实施计划

> 版本：v1 | 目标：验证"写作智能体"能否提升醒神早贴 + 深入推演的自然语言质量

## 一、MVP 范围

### 做
- 新建 `src/writing-pipeline/` 模块（6 个文件）
- 修改 `consult.module.ts`（1 行）
- 修改 `consult.service.ts`（~15 行，注入 + 调用）
- 覆盖模块：`morning`（醒神早贴）+ `breakthrough`（深入推演）

### 不做
- 不改 Agent 内部逻辑
- 不改前端渲染
- 不覆盖 liuren/liuyao/ziping 等断事 Agent
- 不做前置 System Prompt 注入（Phase 2）
- 不做意象增强（Phase 2）

---

## 二、新建文件清单（6 个文件，~320 行）

### 文件 1：`src/writing-pipeline/writing-pipeline.module.ts`

```typescript
// ~20 行
// @Global() NestJS 模块，导出 WritingPipelineService
// imports: []（无依赖）
// providers: [WritingPipelineService]
// exports: [WritingPipelineService]
```

### 文件 2：`src/writing-pipeline/writing-pipeline.service.ts`

```typescript
// ~80 行
// 核心服务：
//   process(input: PipelineInput): PipelineOutput
//   内部调用链：去AI味 → 口语化 → 质检
//   try/catch 包裹，失败时原样返回
```

### 文件 3：`src/writing-pipeline/style-profiles/khazix.profile.ts`

```typescript
// ~60 行
// 导出 KHAZIX_PROFILE:
//   bannedWords: 禁用词 → 替换词映射
//   bannedPunctuation: 禁用标点 → 替换标点映射
//   bannedPatterns: 套话正则
//   colloquialPhrases: 口语化词组池
//   perspectiveRules: 私人视角转换规则
```

### 文件 4：`src/writing-pipeline/style-profiles/wumengzhi.profile.ts`

```typescript
// ~50 行
// 导出 WUMENGZHI_PROFILE:
//   imageryMap: 抽象词 → 具象意象映射
//   antithesisTemplates: 四字对仗模板
//   goldenLinePatterns: 金句正则识别模式
// （MVP 阶段暂不使用，Phase 2 启用）
```

### 文件 5：`src/writing-pipeline/processors/post-processor.ts`

```typescript
// ~100 行
// 导出 PostProcessor 类：
//   clean(input: Record<string, any>, profile: StyleProfile): Record<string, any>
//   递归遍历 JSON，对每个 string 字段：
//     1. 替换禁用词
//     2. 替换禁用标点
//     3. 删除套话模式
//     4. 注入 2-3 个口语化词组（仅 overview / daily_tips / warnings 字段）
//     5. 私人视角转换
```

### 文件 6：`src/writing-pipeline/processors/quality-checker.ts`

```typescript
// ~40 行
// 导出 QualityChecker 类：
//   check(output: Record<string, any>, profile: StyleProfile): QualityReport
//   运行 L1 硬规则检查：
//     - 扫描禁用词残留
//     - 扫描禁用标点残留
//     - 扫描套话残留
//   生成 QualityReport
//   （MVP 只跑 L1，Phase 2 加 L2-L4）
```

---

## 三、修改文件清单（2 个文件，~16 行）

### 修改 1：`consult.module.ts`

**位置**：[L11](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.module.ts#L11)

```diff
+ import { WritingPipelineModule } from '../writing-pipeline/writing-pipeline.module';

  @Module({
-   imports: [CalcEngineModule, LlmGatewayModule, WebsocketModule, GeneratorsModule, QumingAgentModule, MembershipModule],
+   imports: [CalcEngineModule, LlmGatewayModule, WebsocketModule, GeneratorsModule, QumingAgentModule, MembershipModule, WritingPipelineModule],
```

### 修改 2：`consult.service.ts`

**位置 1**：文件顶部 imports

```diff
+ import { WritingPipelineService } from '../writing-pipeline/writing-pipeline.service';
```

**位置 2**：constructor 注入（在 MembershipService 之后）

```diff
    @Inject(MembershipService)
    private readonly membershipService: MembershipService,
+   @Inject(WritingPipelineService)
+   private readonly writingPipeline: WritingPipelineService,
  ) {}
```

**位置 3**：[generateMorningContent()](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.service.ts#L1886) 返回前

```diff
    // 在 return 之前插入：
+   const pipelined = await this.writingPipeline.process({
+     moduleId: 'morning',
+     rawOutput: result,
+   });
+   return pipelined.processed;
```

**位置 4**：[generateBreakthroughContent()](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.service.ts#L1630) 返回前

```diff
    // 在 return breakthroughContent 之前插入：
+   const pipelined = await this.writingPipeline.process({
+     moduleId: 'breakthrough',
+     rawOutput: breakthroughContent,
+   });
+   return pipelined.processed;
```

---

## 四、验收用例（8 条）

### UC-1：醒神早贴 LLM 输出经过后处理
- **前置**：用户触发醒神早贴，LLM 正常返回 JSON
- **操作**：查看 `generateMorningContent()` 返回值
- **预期**：返回的是 `pipelined.processed` 而非原始 `result`
- **验证**：日志中出现 `[WritingPipeline] morning 处理完成，耗时 Xms`

### UC-2：禁用词被替换
- **前置**：LLM 返回的 overview 包含"说白了，今天适合..."
- **操作**：过 WritingPipeline
- **预期**："说白了"被替换为"坦率的讲"或直接删除
- **验证**：`pipelined.processed.overview` 不含"说白了"

### UC-3：禁用标点被替换
- **前置**：LLM 返回的 shi_shen_today 包含"："
- **操作**：过 WritingPipeline
- **预期**："："被替换为"，"
- **验证**：`pipelined.processed.shi_shen_today` 不含冒号

### UC-4：套话模式被删除
- **前置**：LLM 返回包含"值得注意的是，今日..."
- **操作**：过 WritingPipeline
- **预期**："值得注意的是"被删除
- **验证**：文本中不含"值得注意的是"

### UC-5：口语化词组注入
- **前置**：LLM 正常返回醒神早贴
- **操作**：过 WritingPipeline
- **预期**：`overview` 或 `daily_tips` 中包含至少 1 个口语化词组（"坦率的讲""我觉得""说真的"等）
- **验证**：搜索口语化词组池中的词

### UC-6：JSON Schema 不变
- **前置**：原始 LLM 输出有 `overview`、`shi_shen_today`、`dayun_focus` 等字段
- **操作**：过 WritingPipeline
- **预期**：字段名和结构完全一致，只有文本值变化
- **验证**：`Object.keys(pipelined.processed)` 与原始一致

### UC-7：深入推演也过 Pipeline
- **前置**：用户触发深入推演，LLM 正常返回
- **操作**：查看 `generateBreakthroughContent()` 返回值
- **预期**：返回的是 `pipelined.processed`
- **验证**：日志中出现 `[WritingPipeline] breakthrough 处理完成`

### UC-8：Pipeline 失败不影响主流程
- **前置**：模拟 `postProcessor.clean()` 抛异常
- **操作**：调用 `pipeline.process()`
- **预期**：返回原始 `rawOutput`，`qualityReport` 为 SKIP_REPORT
- **验证**：日志中出现 `[WritingPipeline] 后处理失败，原样返回`

---

## 五、验收标准（DoD）

| # | 标准 | 判定方式 |
|---|------|---------|
| 1 | 醒神早贴输出不含禁用词（"说白了""意味着""综上所述""首先其次"） | 正则扫描 |
| 2 | 醒神早贴输出不含禁用标点（冒号、破折号） | 正则扫描 |
| 3 | 醒神早贴 overview 含至少 1 个口语化表达 | 关键词匹配 |
| 4 | 深入推演输出同样经过后处理 | 日志确认 |
| 5 | JSON Schema 不被破坏 | 字段对比 |
| 6 | 后处理延迟 < 50ms | 计时 |
| 7 | Pipeline 异常时原样返回，不阻塞主流程 | 异常测试 |
| 8 | TypeScript 编译无错误 | tsc --noEmit |

---

## 六、预估改动量

| 类型 | 文件数 | 行数 |
|------|--------|------|
| 新建 | 6 | ~320 |
| 修改 | 2 | ~16 |
| **合计** | **8** | **~336** |

---

## 七、实施顺序

```
Step 1: 新建 writing-pipeline.module.ts          （5 分钟）
Step 2: 新建 khazix.profile.ts                   （10 分钟）
Step 3: 新建 wumengzhi.profile.ts                （5 分钟，骨架）
Step 4: 新建 post-processor.ts                   （20 分钟）
Step 5: 新建 quality-checker.ts                  （10 分钟）
Step 6: 新建 writing-pipeline.service.ts         （15 分钟）
Step 7: 修改 consult.module.ts                   （1 分钟）
Step 8: 修改 consult.service.ts                  （5 分钟）
Step 9: 构建验证                                  （5 分钟）
Step 10: 手动测试 UC-1 到 UC-8                    （15 分钟）

总计：约 90 分钟
```