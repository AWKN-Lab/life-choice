# L1 内容线工程交接

> ⚠️ **DEPRECATED（2026-06-25）**：本文件已被 [`engineering-handoff-L1-content-v2.md`](./engineering-handoff-L1-content-v2.md) 取代（v2 为天级执行手册精炼版，工期 10 天）。本文件仅作历史参考，不再维护。权威版本请查阅 -v2.md。

> **版本**：v2.0
> **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)（矛盾处以口径源为准）
> **生成日期**：2026-06-14
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md` §一 D1 + §三 战略
> **优先级**：🟠 **P1**（依赖 L2 跑通，第 5-12 周启动）
> **工期**：8 周（P1 阶段）
> **目标读者**：程序员（实施 Lead）、产品 Lead、天火
> **依赖阻塞**：L2（必须先跑通 4 路由 Pipeline + 调度器）

---

## 〇、阅读路径

```
本文档 §一  ←  变更摘要 + 4 任务卡        ← 程序员/产品先看
        §二  ←  D1 修正：20 对话入代码   ← 核心交付（20 条为规划量，P2-1 先做 20 条）
        §三  ←  5 类断句结构              ← L1→L2 接触点（50-80 条为规划量，P2-1 先做 15 条精选）
        §四  ←  4 类用户状态              ← L1→L3 接触点（对齐 _ground-truth.md §3）
        §五  ←  人读参考 md               ← D1 补强
        §六  ←  RACI + 技术约束          ← 责任到人
```

---

## 一、变更摘要 + 4 任务卡

### 1.1 变更摘要

| # | 变更 | 优先级 | 工期 |
|---|------|--------|------|
| **C-L1-1** | 20 对话样例**入代码**（D1：结构化模板，可单测） | 🔴 P0 | 5 天 |
| **C-L1-2** | 5 类断句库（career/wealth/noble/timing/relationship） | 🔴 P0 | 3 天 |
| **C-L1-3** | 4 类用户状态分类器（user-state-classifier.service.ts） | 🔴 P0 | 4 天 |
| **C-L1-4** | 4 类用户状态测试集（60 条，每类 15 条）+ 准确率 ≥80% | 🟠 P1 | 2 天 |
| **C-L1-5** | **人读参考 md**（D1 补强：补 1 份给非工程师查阅） | 🟡 P2 | 1 天 |

**总工期**：13 天（4 任务卡 + 1 补强）

### 1.2 4 任务卡明细

| 任务卡 | 名称 | 工期 | 验收 |
|--------|------|------|------|
| **L1.1** | 20 对话样例入代码 | 5 天 | TypeScript 模板 + 20 条数据 + 单测 |
| **L1.2** | 5 类断句库 | 3 天 | `apps/AWKN-LABlife/app/src/data/clauses/*.ts` 5 文件 + zod schema |
| **L1.3** | 4 类用户状态分类器 | 4 天 | service + 60 条测试集 + ≥80% 准确率 |
| **L1.4** | 用户状态准确率验证 | 2 天 | 测试集跑通 + 报告 |

---

## 二、D1 修正：20 对话样例入代码

> **20 条为规划量，P2-1 先做 20 条。**

### 2.1 D1 拍板结论

> **D1** = **入代码**（结构化模板，可单测）
> **D1 补强**：补 1 份人读参考 md（给非工程师查阅）

**为什么入代码 vs 进 prompt**：
- ✅ 入代码：可单测、可版本管理、可 IDE 提示、可 Lint
- ❌ 进 prompt：灵活但难测、出问题难定位

### 2.2 20 对话样例结构

```typescript
// apps/AWKN-LABlife/app/src/data/dialogueSamples/01-career.ts (示例：career 类)

export const CAREER_SAMPLES: DialogueSample[] = [
  {
    id: 'career-001',
    category: 'career',
    scenario: '该不该跳槽',
    userState: 'genuine',
    samples: [
      {
        user: '我手里有个 offer，薪资涨 30%，要不要去？',
        halfMountain: '涨 30% 听着好看，但你得想清楚：是地方不对，还是人不对。',
        detail: '...',
        cost: '...',
        nextAction: '...',
      },
      // ... 4 条
    ],
  },
  // ... 4 类（career/wealth/noble/timing/relationship）各 4 条 = 20 条
];

type DialogueSample = {
  id: string;
  category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship';
  scenario: string;
  userState: UserState;
  samples: Array<{
    user: string;          // 用户输入
    halfMountain: string;  // 半山口吻原句
    detail: string;        // 详批
    cost: string;          // 代价
    nextAction: string;    // 下一步
  }>;
};
```

### 2.3 测试

```typescript
// apps/AWKN-LABlife/app/src/data/dialogueSamples/__tests__/career.spec.ts

describe('CAREER_SAMPLES', () => {
  it('should have 4 samples', () => {
    expect(CAREER_SAMPLES[0].samples).toHaveLength(4);
  });
  
  it('all halfMountain should be 张半山口吻', () => {
    // 检查是否含张半山特征（不直白、给一寸）
  });
  
  it('no sample should be empty', () => {
    // 所有字段非空
  });
});
```

---

## 三、5 类断句结构（L1→L2 接触点）

> **50-80 条为规划量，P2-1 先做 15 条精选（5 类 × 3 条）。**

### 3.1 数据结构

```typescript
// apps/AWKN-LABlife/app/src/data/clauses/career.ts (示例)

export const CAREER_CLAUSES: Clause[] = [
  {
    id: 'career-clause-001',
    category: 'career',
    text: '木生于春，金成于秋；你的时机到了。',
    halfMountain: '时机这事急不来，但也不能等。',
    fit: ['25-35 岁', '想转行', '有一技之长'],
    cost: '若错失此次，可能再等 3 年',
    action: '3 个月内做决定',
  },
  // ... 50-80 条
];

// 类型定义（共享给 L2）
type Clause = {
  id: string;
  category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship';
  text: string;
  halfMountain: string;
  fit: string[];
  cost: string;
  action: string;
};
```

### 3.2 文件结构

```
apps/AWKN-LABlife/app/src/data/clauses/
├── career.ts          # 50-80 条
├── wealth.ts          # 50-80 条
├── noble.ts           # 50-80 条
├── timing.ts          # 50-80 条
├── relationship.ts    # 50-80 条
├── types.ts           # Clause 类型定义
└── index.ts           # 汇总导出
```

---

## 四、4 类用户状态（L1→L3 接触点，对齐 _ground-truth.md §3）

### 4.1 4 类枚举（与代码一致）

```typescript
// apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/classifier/user-state-classifier.service.ts
// 实际代码（2026-06-15 读取）

export type UserState = 'casual' | 'genuine' | 'repeating' | 'validating';
```

| 状态 | 含义 | 触发条件 |
|------|------|---------|
| `casual` | 随便问问 | 问题模糊，无情绪词，无背景描述 |
| `genuine` | 真有具体问题 | 含情绪词 + 背景描述 / 含情绪词 + 长度 > 15 字 |
| `repeating` | 30 天内问过类似问题 | getRepeatingQuestionCount > 0 |
| `validating` | 验证已有选择 | 含"之前有人说/算命说/别人说"等关键词 |

### 4.2 分类器服务

分类器详细实现（优先级链、关键词列表、genuine 判定逻辑等）见 P2 文档：
→ `engineering-handoff-L2-pipeline.md` §Step 4（Classifier）

L1 侧仅提供 4 类枚举定义 + 测试集数据，不重复实现细节。

### 4.3 测试集（60 条，4 类 × 15 条）

| 类别 | 数量 | 示例 |
|------|------|------|
| casual | 15 | "帮我看看今天运气怎么样" |
| genuine | 15 | "明年该不该跳槽？" |
| repeating | 15 | "我上个月也问过，再问一次" |
| validating | 15 | "之前有人说我不适合创业，对吗？" |

**验收**：分类准确率 ≥80%（48/60 正确）

---

## 五、人读参考 md（D1 补强）

### 5.1 为什么需要

CEO + 产品 + 设计师都是非工程师，20 对话样例和 5 类断句对他们是黑盒。
需要 1 份人读 md，把"张半山怎么说话"用中文讲清楚。

### 5.2 文件路径

`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\product\zhangbanshan-voice-guide.md`

### 5.3 内容大纲

```markdown
# 张半山口吻指南（人读版）

## 一、5 类断事总览
- 事业（career）：50-80 条
- 财富（wealth）：50-80 条
- ...

## 二、4 类用户状态识别
- casual：随便问问 → 轻松回答
- genuine：真有具体问题 → 认真分析
- repeating：30 天内问过类似 → 温和提醒
- validating：验证已有选择 → 正面回应

## 三、20 对话样例选段（精选 5 条展示）
- 场景 1：该不该跳槽
- 场景 2：感情纠葛
- ...

## 四、张半山口吻三原则
1. 不直白，给一寸（halfMountain 字段）
2. 永远有代价（cost 字段必填）
3. 下一步可执行（nextAction 字段必填）

## 五、与 LLM Prompt 的衔接
- 5 类断句库 → Prompt Compiler
- 4 类用户状态 → Memory Extractor
- 20 对话样例 → ZhangbanshanMessage 渲染
- 输出格式 → 三套输出（三段式 + 5 层 + 6 段 Prompt），详见 [_ground-truth.md](./_ground-truth.md) §2

## 六、修订记录
- v1.0 (2026-06-14)：初版
```

---

## 六、RACI + 技术约束

### 6.1 RACI

| 任务 | R | A | C | I |
|------|---|---|---|---|
| 20 对话样例 | 程序员 | 产品 Lead | 天火 / CEO | 全部 |
| 5 类断句库 | 程序员 | 产品 Lead | 天火 / CEO | 全部 |
| 4 类用户状态分类器 | 程序员 | 产品 Lead | 天火 | 全部 |
| 人读参考 md | 程序员 | 产品 Lead | CEO | 全部 |
| 准确率验证 | 后端 Lead | 产品 Lead | 程序员 | 全部 |

### 6.2 技术约束

| 约束 | 值 |
|------|-----|
| 语言 | TypeScript 5.x strict |
| 数据格式 | TypeScript 文件（不入 JSON/YAML，便于 IDE 提示） |
| 验证 | zod |
| 测试 | jest |
| 文件命名 | kebab-case |
| 字符集 | UTF-8 |
| 最小变更原则 | 不改 L2/L3 接口契约，仅提供数据 |

---

## 附录 A：关键文件路径

- 对话样例目录：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\data\dialogueSamples\`
- 5 类断句目录：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\data\clauses\`
- 4 类分类器：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\classifier\user-state-classifier.service.ts`
- 测试集：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\test\user-state\`
- 人读参考 md：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\product\zhangbanshan-voice-guide.md`
- 拍板文件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
- 计划详情：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-01-content.md`
- 总览：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-overview.md`
- L2 依赖：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L2-pipeline.md`

---

*生成日期：2026-06-14*
*v2.0 修订：2026-06-15（对齐 _ground-truth.md 代码探查结果）*
*下次更新：Week 5 L1 启动时*
