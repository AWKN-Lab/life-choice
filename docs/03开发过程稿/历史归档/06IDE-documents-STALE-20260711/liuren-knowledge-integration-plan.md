# 六壬文档 → 能力/知识库/数据库 融合计划 v2

> **状态更新（2026-05-15）**：Step 2 知识库 JSON 文件已全部创建（6 文件就位），Step 1/3/4/5/6 未启动。

---

## 一、目标与范围

### 目标
将 20 份大六壬专业文档转化为项目的三大资产，并融入现有断事能力：
1. **知识库（Knowledge Base）**：结构化理论知识 → JSON 文件（6 个，Step 2 文件已就位，待验证）
2. **能力（Capabilities）**：新增分析能力 → Service 方法（金口诀/推命/择日，3 个新方法）
3. **数据库（Cases Database）**：案例库 → Prisma 模型 + 检索（LiurenCase 表，≥100 条案例）

### 范围
- **做**：Step 2 文件质量验证、案例数据库建表+入库、金口诀/推命/择日能力新增、LLM prompt 增强、规则引擎补充、编译部署
- **不做**：文档格式转换工具开发、前端展示改造、其他术数模块改造、Step 1 全量文档提取（延后为可选任务）

---

## 二、当前状态速览

### 已完成 ✅
| 步骤 | 内容 | 状态 |
|------|------|------|
| Step 2 | 知识库 JSON 扩展（6 文件） | 文件已创建，**内容质量待验证** |

已就位的文件：
- `knowledge-base/liuren/ke-ti.json` — 更新版（课体知识）
- `knowledge-base/liuren/bi-fa.json` — 更新版（毕法赋）
- `knowledge-base/liuren/zhanlei-rules.json` — 新建（分类占断规则）
- `knowledge-base/liuren/jinkoujue-rules.json` — 新建（金口诀规则）
- `knowledge-base/liuren/tuiming-rules.json` — 新建（推命规则）
- `knowledge-base/liuren/zeri-rules.json` — 新建（择日规则）

### 待执行 ❌
| 步骤 | 内容 | 当前完成度 |
|------|------|-----------|
| Step 2-verify | 知识库 JSON 内容验证 | 0% |
| Step 3 | 案例数据库（Prisma + 种子） | 0% |
| Step 4 | 新增断事能力（3 方法） | 0% |
| Step 5 | 融入现有流程（prompt + 规则引擎 + 案例检索） | 0% |
| Step 6 | 编译验证与部署 | 0% |

---

## 三、执行步骤

### Step 2-verify：知识库 JSON 内容验证（优先级最高）

**目标**：确认 6 个 JSON 文件内容达到计划标准，不足则补充。

**动作**：
1. 逐个读取 6 个 JSON 文件，统计条目数
2. 对照验收标准逐项打分：
   - `ke-ti.json`：课体数 ≥ 31，每条含 吉凶/描述/应用/发用条件/三传特征/常见神煞组合
   - `bi-fa.json`：毕法数 ≥ 30，每条含 条件/判断/应用场景
   - `zhanlei-rules.json`：分类 ≥ 10，每条含 类神/判断要点/禁忌信号/应期
   - `jinkoujue-rules.json`：含 起课法/五位生克/课体/口诀/分类占断
   - `tuiming-rules.json`：含 起命盘/命宫身宫/大运/流年
   - `zeri-rules.json`：含 4 种事件类型，每条含 吉利条件/禁忌/吉时选择
3. 不足项标记并补充

**产出**：验证报告 + 补充后的 JSON 文件（如有不足）

**验收**：6 个文件全部通过标准检查

---

### Step 3：案例数据库建设

**目标**：建立 LiurenCase 表，入库 ≥ 100 条六壬断案案例。

**动作**：

#### 3.1 新增 Prisma 模型
```prisma
model LiurenCase {
  id            String   @id @default(uuid())
  source        String           // 来源文档
  question      String           // 原问题
  askTime       String           // 占问时间
  eventType     String           // 事件类型（婚姻/求财/官非/出行/疾病/考试/失物/合作/田宅/天时）
  
  lessonData    String           // LiurenLesson JSON（课盘数据）
  
  judgment      String           // 断语原文
  verification  String?          // 应验情况
  keyPoints     String           // 关键判断点（JSON数组）
  
  keTi          String?          // 课体名称
  tags          String           // 标签（JSON数组）
  shenshaList   String           // 涉及神煞（JSON数组）
  biFaList      String           // 涉及毕法（JSON数组）
  
  createdAt     DateTime @default(now())
}
```

#### 3.2 创建种子脚本
文件：`scripts/seed-liuren-cases.ts`

种子案例来源（按优先级）：
1. 六壬断案详解.docx — 历史经典断案（约 30 条）
2. 林锋六壬实战进阶精通上/中/下.docx — 现代实战案例（约 40 条）
3. 六壬指南例题解.docx — 指南例题（约 20 条）
4. 六壬神课金口诀现代实例精解.docx — 金口诀案例（约 30 条）

每条案例包含：
- 原问题（question）
- 占问时间（askTime）— 干支时间
- 事件类型（eventType）
- 课盘摘要（lessonData）— 简化的 LiurenLesson JSON
- 断语（judgment）
- 应验（verification）
- 关键判断点（keyPoints）— 如 "白虎入传主凶" "青龙临身主吉"
- 课体（keTi）
- 标签（tags）— 如 ["婚姻", "成婚", "六合"]
- 神煞（shenshaList）— 如 ["青龙", "贵人", "驿马"]
- 毕法（biFaList）— 如 ["贵人临身", "青龙入传"]

**产出**：
- `prisma/schema.prisma`（新增 LiurenCase 模型）
- `prisma/migrations/`（迁移文件）
- `scripts/seed-liuren-cases.ts`（种子脚本）

**验收**：
- `npx prisma migrate dev` 成功创建表
- `npx ts-node scripts/seed-liuren-cases.ts` 成功入库 ≥ 100 条
- `SELECT count(*) FROM LiurenCase` ≥ 100

---

### Step 4：新增断事能力

**目标**：在 LiurenAgentService 中新增 3 个独立分析方法，在 LiurenCalculator 中扩展金口诀起课。

#### 4.1 LiurenCalculator 扩展：金口诀起课

在 `liuren-calculator.ts` 中新增方法：

```typescript
// 金口诀起课：地分 → 月将 → 贵神 → 人元
setUpJinKouJue(askTime: Date, diFen?: string): JinKouJueLesson

// 金口诀课盘接口
interface JinKouJueLesson {
  diFen: string;        // 地分（地支）
  yueJiang: string;     // 月将（天将+地支）
  guiShen: string;      // 贵神（十二贵人+地支）
  renYuan: string;      // 人元（天干）
  wuWei: {              // 五位
    gan: string;        // 干 = 人元
    shen: string;       // 神 = 贵神
    jiang: string;      // 将 = 月将
    fang: string;       // 方 = 地分
  };
  keTi: string;         // 课体类型
  shengKe: {            // 生克关系
    ganShengKeJiang: string;
    shenShengKeJiang: string;
    fangShengKeJiang: string;
  };
}
```

#### 4.2 LiurenAgentService 新增 3 个方法

**方法 1：analyzeJinKouJue（金口诀断课）**
```typescript
async analyzeJinKouJue(input: {
  askTime: string;
  question: string;
  diFen?: string;          // 可选：指定地分，不传则随机
}): Promise<{
  lesson: JinKouJueLesson;
  judgment: string;        // LLM 断语
  risks: string[];         // 风险点
  actions: string[];       // 建议行动
  ruleResults: any[];      // 规则引擎结果
}>
```
实现策略：
1. 调用 `LiurenCalculator.setUpJinKouJue()` 起课
2. 加载 `jinkoujue-rules.json` 作为知识注入
3. LLM 分析 + 规则引擎兜底

**方法 2：analyzeTuiMing（六壬推命）**
```typescript
async analyzeTuiMing(input: {
  birthDate: string;       // 出生日期 YYYY-MM-DD
  birthTime: string;       // 出生时间 HH:MM
  gender: '男' | '女';
}): Promise<{
  mingGong: string;        // 命宫
  shenGong: string;        // 身宫
  lifetimeLesson: LiurenLesson;  // 终身课盘
  daYun: Array<{           // 大运
    period: string;        // 年龄段
    lesson: LiurenLesson;  // 该大运课盘
  }>;
  judgment: string;        // LLM 断语
}>
```
实现策略：
1. 出生时间起终身课（调用 `LiurenCalculator.setUpLesson`）
2. 命宫/身宫定位（按 `tuiming-rules.json` 规则）
3. 大运课盘推算（每 10 年一运）
4. LLM 综合分析

**方法 3：analyzeZeRi（六壬择日）**
```typescript
async analyzeZeRi(input: {
  eventType: '嫁娶' | '入宅' | '开业' | '出行';
  dateRange: { start: string; end: string };
}): Promise<{
  suitableDates: Array<{
    date: string;
    score: number;         // 0-100 吉凶评分
    reason: string;        // 吉凶原因
  }>;
  unsuitableDates: string[];
}>
```
实现策略：
1. 遍历日期范围，每日起课
2. 按 `zeri-rules.json` 规则评分（课体 + 神煞 + 干支关系）
3. 排序返回推荐日期

**产出**：
- `knowledge-base/liuren-calculator.ts`（新增 `setUpJinKouJue` + `JinKouJueLesson` 接口）
- `liuren-agent/liuren-agent.service.ts`（新增 3 个方法）

**验收**：每个新方法可独立调用并返回结构化结果

---

### Step 5：融入现有断事流程

**目标**：增强 `LiurenAgentService.analyze()` 主流程，整合新知识库和案例检索。

#### 5.1 新增 Prompt 模板

创建 3 个新 prompt 文件：

**`prompts/jinkoujue-prompt.md`**：金口诀分析提示词
- 五位生克分析框架
- 课体吉凶速查表
- 分类占断要点

**`prompts/tuiming-prompt.md`**：推命分析提示词
- 命宫身宫解读框架
- 大运流年分析要点
- 终身课盘解读方法

**`prompts/zeri-prompt.md`**：择日分析提示词
- 事件类型对应神煞
- 评分规则说明
- 吉凶判定标准

#### 5.2 规则引擎扩展

创建 4 个新规则文件（格式与现有 `liuren-zhanduan.json` 一致）：

**`shared/rule-engine/rules/liuren-zhanlei.json`**
```json
{
  "description": "分类占断规则引擎",
  "rules": {
    "婚姻": {
      "classShen": ["干为男", "支为女", "六合为媒"],
      "goodSignals": ["干上神生支上神", "三传见六合青龙", "天后临支"],
      "badSignals": ["天后乘玄武", "支上见空亡", "干支上神相克"],
      "timing": "三合六合填实之日"
    }
  }
}
```

**`shared/rule-engine/rules/liuren-jinkoujue.json`**：金口诀规则
**`shared/rule-engine/rules/liuren-tuiming.json`**：推命规则
**`shared/rule-engine/rules/liuren-zeri.json`**：择日规则

#### 5.3 增强 analyze() 主流程

在 `analyze()` 方法中增加：

1. **案例检索步骤**（LLM 推理前）：
```typescript
// 根据课体 + 事件类型 + 神煞匹配相似案例
const similarCases = await this.findSimilarCases(lesson, eventType);
```

2. **增强 System Prompt**（注入新知识库）：
```typescript
// 在现有 system prompt 基础上追加
- 课体知识（从 ke-ti.json 加载）
- 分类占断规则（从 zhanlei-rules.json 加载）
- 毕法赋详解（从 bi-fa.json 加载）
```

3. **案例参考注入**（在 analysis prompt 中）：
```typescript
if (similarCases.length > 0) {
  prompt += `\n【相似历史案例】（共${similarCases.length}条，供参考）\n`;
  prompt += this.formatCasesForPrompt(similarCases);
}
```

4. **新增私有方法**：
- `findSimilarCases(lesson, eventType)` — 案例检索
- `formatCasesForPrompt(cases)` — 案例格式化为 prompt 文本
- `loadKnowledgeForPrompt(knowledgeType)` — 知识库加载

**产出**：
- `liuren-agent/prompts/jinkoujue-prompt.md`（新建）
- `liuren-agent/prompts/tuiming-prompt.md`（新建）
- `liuren-agent/prompts/zeri-prompt.md`（新建）
- `liuren-agent/prompts/liuren-system-prompt.md`（更新）
- `shared/rule-engine/rules/liuren-zhanlei.json`（新建）
- `shared/rule-engine/rules/liuren-jinkoujue.json`（新建）
- `shared/rule-engine/rules/liuren-tuiming.json`（新建）
- `shared/rule-engine/rules/liuren-zeri.json`（新建）
- `liuren-agent/liuren-agent.service.ts`（增强 analyze + 新增私有方法）

**验收**：
- 断事结果中引用知识库规则（可追溯至 JSON 文件）
- 案例检索命中率 ≥ 30%（有相似课盘时）
- 3 个新能力方法可独立调用

---

### Step 6：编译验证与部署

**动作**：
1. `npm run build` — 确认无 TypeScript 错误
2. `npx prisma migrate dev --name add-liuren-case` — 创建案例表
3. `npx ts-node scripts/seed-liuren-cases.ts` — 入库案例
4. `npm run start:dev` — 本地启动验证
5. 部署到服务器

**验收**：
- 编译通过，0 错误
- 数据库 LiurenCase 表存在且案例数 ≥ 100
- 3 个新 API 端点可正常调用
- 现有 analyze() 端点不受影响（回归测试）

---

## 四、文件变更清单（完整）

| 操作 | 文件 | 步骤 |
|------|------|------|
| 更新 | `knowledge-base/liuren/ke-ti.json` | Step 2-verify |
| 更新 | `knowledge-base/liuren/bi-fa.json` | Step 2-verify |
| 验证 | `knowledge-base/liuren/zhanlei-rules.json` | Step 2-verify |
| 验证 | `knowledge-base/liuren/jinkoujue-rules.json` | Step 2-verify |
| 验证 | `knowledge-base/liuren/tuiming-rules.json` | Step 2-verify |
| 验证 | `knowledge-base/liuren/zeri-rules.json` | Step 2-verify |
| 更新 | `prisma/schema.prisma` | Step 3 |
| 新增 | `scripts/seed-liuren-cases.ts` | Step 3 |
| 更新 | `knowledge-base/liuren-calculator.ts` | Step 4 |
| 更新 | `liuren-agent/liuren-agent.service.ts` | Step 4+5 |
| 新增 | `liuren-agent/prompts/jinkoujue-prompt.md` | Step 5 |
| 新增 | `liuren-agent/prompts/tuiming-prompt.md` | Step 5 |
| 新增 | `liuren-agent/prompts/zeri-prompt.md` | Step 5 |
| 更新 | `liuren-agent/prompts/liuren-system-prompt.md` | Step 5 |
| 新增 | `shared/rule-engine/rules/liuren-zhanlei.json` | Step 5 |
| 新增 | `shared/rule-engine/rules/liuren-jinkoujue.json` | Step 5 |
| 新增 | `shared/rule-engine/rules/liuren-tuiming.json` | Step 5 |
| 新增 | `shared/rule-engine/rules/liuren-zeri.json` | Step 5 |

**总计**：6 验证 + 3 更新 + 8 新增 = 17 项文件操作

---

## 五、执行顺序

```
Step 2-verify: 知识库 JSON 验证（读 6 个文件，逐项打分，补缺）
    ↓
Step 3: 案例数据库（Prisma 模型 + 种子脚本 + 入库 100 条）
    ↓
Step 4: 新增断事能力（Calculator 扩展 + Service 3 个新方法）
    ↓
Step 5: 融入现有流程（Prompt + 规则引擎 + 案例检索）
    ↓
Step 6: 编译验证 + 部署
```

---

## 六、风险与约束

- **Step 2 文件内容质量不确定**：必须先验证再进入后续步骤，否则知识注入效果打折扣
- **案例数据量**：种子案例目标 ≥ 100 条，若文档中可提取案例不足，需降级为手动构造
- **LLM Token 消耗**：System prompt 注入知识库后可能增加 2-5K token/次调用
- **不破坏现有功能**：所有新增能力为独立方法，不修改 `analyze()` 核心逻辑（仅增强）
- **金口诀起课复杂度**：地分→月将→贵神→人元的四步法需要精确实现，需参照 `jinkoujue-rules.json` 规则
- **择日遍历性能**：若日期范围超过 30 天，起课次数较多，需做缓存优化