# WritingPipeline 智能体架构冻结文档 v1

> 版本：v1 | 状态：冻结 | 下一步：MVP 实施

## 一、模块定义

### 1.1 它是什么
`WritingPipeline` 是一个 **NestJS @Global() 模块**，作为后台与 LLM 之间的"写作中转层"。它不替代任何 Agent，而是在 Agent 输出 JSON 之后、前端渲染之前，对文本字段做**风格注入 + 去 AI 味清洗**。

### 1.2 它不是什么
- 不是另一个 Agent Service（不做算法计算）
- 不是 LLM Provider（不直接调 LLM API）
- 不是 Prompt 模板引擎（不管理 System Prompt 版本）
- 不是 LlmGateway 的替代品（Gateway 仍然负责路由和质量评分）

### 1.3 核心原则
1. **不改算法**：所有排盘/起课/规则引擎逻辑保持原样
2. **不改 JSON Schema**：后处理只改文本字段的值，不增删字段
3. **不增加 LLM 调用**：后处理是纯规则引擎，0 次额外 LLM 调用
4. **不增加显著延迟**：后处理目标 < 50ms
5. **可降级**：WritingPipeline 失败时原样返回输入，不影响主流程

---

## 二、接口契约

### 2.1 主入口

```typescript
// writing-pipeline.service.ts

interface PipelineInput {
  /** 模块标识：morning | breakthrough | kline | liuren | liuyao | ziping */
  moduleId: string;
  /** Agent 输出的原始 JSON（已解析为对象） */
  rawOutput: Record<string, any>;
  /** 可选的用户上下文（用于个性化） */
  context?: {
    userName?: string;
    questionText?: string;
  };
}

interface PipelineOutput {
  /** 经过风格处理后的 JSON（字段结构不变，文本值已优化） */
  processed: Record<string, any>;
  /** 质检报告 */
  qualityReport: QualityReport;
  /** 处理耗时 ms */
  processingTimeMs: number;
}

interface QualityReport {
  /** L1-L4 四层自检结果 */
  l1HardRules: { passed: boolean; violations: string[] };
  l2StyleConsistency: { passed: boolean; issues: string[] };
  l3ContentQuality: { passed: boolean; issues: string[] };
  l4HumanFeel: { passed: boolean; notes: string };
  /** 总体是否通过 */
  overallPassed: boolean;
}
```

### 2.2 主方法签名

```typescript
@Injectable()
export class WritingPipelineService {
  /**
   * 对 Agent 输出做风格处理
   * @returns 处理后的输出 + 质检报告
   * @throws 永不抛错（内部 catch，失败时返回原样输入）
   */
  async process(input: PipelineInput): Promise<PipelineOutput>;
}
```

---

## 三、内部处理管道

```
process(input)
  │
  ├── Step 0: 字段识别
  │     识别 input.rawOutput 中的文本字段（递归遍历 JSON）
  │     跳过数字、布尔、空值
  │
  ├── Step 1: 去 AI 味清洗（L1 硬规则）
  │     ├── 禁用词替换：说白了/意味着/综上所述/首先其次/本质上/值得注意的是
  │     ├── 禁用标点替换：冒号→逗号，破折号→逗号
  │     ├── 套话删除："在当今...的时代""随着...的发展""让我们来看看"
  │     └── 空泛词替换："赋能"→"帮助"，"抓手"→"方法"，"闭环"→"完整"
  │
  ├── Step 2: 口语化注入（L2 风格一致性）
  │     ├── 注入卡兹克口语词组（坦率的讲/说真的/你想想看/我觉得）
  │     ├── 私人视角转换（"根据命理分析"→"从盘面来看，我觉得"）
  │     └── 术语白话翻译检查（术语后面是否跟了白话解释）
  │
  ├── Step 3: 意象增强（L3 内容质量 — 仅 morning + breakthrough）
  │     ├── 从吴梦知体意象库中匹配 1-2 个意象
  │     ├── 金句标记（正则识别对仗/排比句式，打上标记）
  │     └── 痛点共情注入（在 overview 开头加共情句）
  │
  └── Step 4: 质检（L4 活人感）
        ├── 运行四层自检
        ├── 生成 QualityReport
        └── 返回 PipelineOutput
```

---

## 四、与现有模块的关系

```
                         ┌─────────────────────────┐
                         │   LlmGatewayService      │
                         │   (路由 + 质量评分)        │
                         └──────────┬──────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   LiurenAgent              ZipingAgent              LiuyaoAgent
   (算法+LLM+兜底)          (算法+LLM+兜底)          (算法+LLM+兜底)
          │                         │                         │
          │    Agent 返回 JSON       │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │   WritingPipeline        │  ← 新增
                         │   (风格注入+去AI味)       │
                         └──────────┬──────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │   ConsultService          │
                         │   (组装前端响应)           │
                         └──────────┬──────────────┘
                                    │
                                    ▼
                                 前端渲染
```

**关键关系：**

| 模块 | WritingPipeline 与它的关系 |
|------|--------------------------|
| `LlmProvidersService` | 无直接关系。WritingPipeline 不调 LLM |
| `LlmGatewayService` | WritingPipeline 在 Gateway 之后执行（Gateway 做质量评分，Pipeline 做风格优化） |
| Agent（6个） | Agent 不感知 Pipeline。Agent 输出原样 JSON，由调用方（ConsultService）决定是否过 Pipeline |
| `ConsultService` | **唯一调用方**。在 `generateMorningContent()` / `generateBreakthroughContent()` 中调用 `pipeline.process()` |
| `RuleEngineService` | 无直接关系。规则引擎在 Agent 内部运行，Pipeline 只处理 Agent 输出 |

---

## 五、前置注入 vs 后置清洗的边界

```
┌──────────────────────────────────────────────────────┐
│                    前置注入（Agent 内部）               │
│                                                      │
│  在 Agent 的 System Prompt 中注入精简版风格约束：        │
│  - "输出时用'你'称呼用户，用'我觉得'表达判断"            │
│  - "每条术语后面紧跟一句白话翻译"                        │
│  - "结尾给一句让人能记住的短句"                          │
│                                                      │
│  这部分不通过 WritingPipeline，而是直接写在              │
│  各 Agent 的 System Prompt 文件中。                    │
│  目的是让 LLM 原生生成时就带有风格意识。                 │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
                    LLM 返回 JSON
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                    后置清洗（WritingPipeline）          │
│                                                      │
│  对 LLM 输出做规则化清洗（不调 LLM）：                    │
│  - 去 AI 味：替换禁用词、删除套话                        │
│  - 口语化：注入口语词组、转换私人视角                     │
│  - 质检：跑 L1-L4 四层自检                              │
│                                                      │
│  目的是弥补 LLM 在前置约束下仍可能产生的"AI 味"。         │
│  纯规则引擎，延迟 < 50ms，零额外成本。                   │
└──────────────────────────────────────────────────────┘
```

---

## 六、风格 Profile 配置格式

```typescript
// style-profiles/khazix.profile.ts

export const KHAZIX_PROFILE = {
  name: 'khazix',
  version: 'v1',
  description: '卡兹克公众号写作风格：活人感 + 节奏感 + 敢下判断',

  // L1: 禁用词表
  bannedWords: [
    { pattern: /说白了/g, replacement: '坦率的讲' },
    { pattern: /意味着什么/g, replacement: '' },  // 直接删除
    { pattern: /综上所述/g, replacement: '' },
    { pattern: /首先.*其次.*最后/g, replacement: '' },
    { pattern: /值得注意的是/g, replacement: '' },
    { pattern: /本质上/g, replacement: '说到底' },
    { pattern: /换句话说/g, replacement: '你想想看' },
  ],

  // L1: 禁用标点
  bannedPunctuation: [
    { pattern: /：/g, replacement: '，' },
    { pattern: /——/g, replacement: '，' },
  ],

  // L1: 套话模式
  bannedPatterns: [
    /在当今.*的时代/g,
    /随着.*的发展/g,
    /让我们来看看/g,
    /不难发现/g,
    /不可否认/g,
  ],

  // L2: 口语化词组（随机注入，每次选 2-3 个）
  colloquialPhrases: [
    '坦率的讲', '说真的', '我觉得', '你想想看',
    '怎么说呢', '其实吧', '我跟你说', '反正我觉得',
    '说实话', '我自己也经历过', '这事我踩过坑',
  ],

  // L2: 私人视角转换规则
  perspectiveRules: [
    { from: /根据命理分析/g, to: '从盘面来看' },
    { from: /建议您/g, to: '你可以试试' },
    { from: /需要注意/g, to: '留个心' },
  ],

  // L3: 情绪标点（允许的"不规范"标点，增加活人感）
  emotionMarks: ['。。。', '？？？', '= ='],

  // L4: 活人感自检问题
  humanFeelQuestions: [
    '读起来像真人在聊天吗？',
    '有"只有这个人才会这么写"的角度吗？',
    '有没有哪个地方读起来像报告？',
  ],
};
```

---

## 七、错误处理策略

```
WritingPipeline.process() 永不抛错。

降级策略：
  try {
    result = postProcessor.clean(rawOutput);
  } catch (e) {
    logger.error('WritingPipeline 后处理失败，原样返回', e);
    return { processed: rawOutput, qualityReport: SKIP_REPORT };
  }

SKIP_REPORT = {
  l1HardRules: { passed: true, violations: [] },
  l2StyleConsistency: { passed: true, issues: [] },
  l3ContentQuality: { passed: true, issues: [] },
  l4HumanFeel: { passed: true, notes: 'Pipeline skipped due to error' },
  overallPassed: true,
};
```

---

## 八、版本管理

| 版本 | 变更 | 日期 |
|------|------|------|
| v1 | 初始架构冻结：后置清洗 + 前置注入轻量风格约束 | 2026-05-15 |

变更规则：
- 新增能力标签 → 升小版本（v1.1, v1.2）
- 修改接口契约 → 升大版本（v2）
- 修改禁用词表/口语词组 → 不升版本（配置变更）