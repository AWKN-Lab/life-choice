<!-- 来源: https://destinylinker.github.io/MingLi-Bench/ -->
<!-- 抓取时间: 2026-05-29T10:04:07.832Z -->
<!-- 工具: guanlan_read -->
<!-- 图片: 0/0 张已下载 -->

Title: 中国传统术数的自动化推理探索

URL Source: https://destinylinker.github.io/MingLi-Bench/

Published Time: 2026-04-15

Markdown Content:
中国传统命理术数是一套建立在规则统计与经验法则之上的知识体系。 随着人工智能推理能力的提升，探索和量化这个具有高度规则性和推演特征的领域成为了可能。

为了进一步探索这一古老而富有生命力的知识体系在智能时代的应用潜力， 我们设计了 **Tianfu Agent** —— 一个面向专业命理术数研究的 Agentic AI 系统， 通过**确定性计算工具**、**规则化推理经验**与**生成式叙事能力**的融合， 缓解通用大语言模型（LLM）的计算幻觉和逻辑断层问题。

Chinese traditional destiny analysis (Ming Li) is a knowledge system built on rule-based statistics and empirical heuristics. As AI reasoning capabilities advance, it has become possible to explore and quantify this highly rule-governed, deduction-driven domain.

To further explore the potential of this ancient yet vital knowledge system in the age of intelligence, we designed **Tianfu Agent** — an Agentic AI system for professional destiny analysis research, mitigating the computational hallucinations and logical gaps of general-purpose LLMs through the integration of "**deterministic computation tools**," "**rule-based reasoning experience**," and "**generative narrative capabilities**."

#### Trimmed Mean Accuracy (截尾均值准确率)

25%Random

40%Best Baseline (Claude Opus 4.6)

50%Tianfu Agent

53.5%Human Top-20 Avg

From 2025年第十六屆全球算命師比賽

基于[2025 年全球算命师大赛](https://hkjfma.org/2025/06/2025%E5%B9%B4%E7%AC%AC%E5%8D%81%E5%85%AD%E5%B1%86-%E5%85%A8%E7%90%83%E7%AE%97%E5%91%BD%E5%B8%AB%E6%AF%94%E8%B3%BD)测试， Tianfu Agent 以 **50% 的截尾准确率** 超越了最先进的通用大模型（最佳基线 40%），接近人类 Top 20 参赛选手的平均水平（53.5%）。

*   考虑到生成式模型的随机性，Tianfu Agent 和所有基线通用模型都进行了 **5 轮独立测试**并以多数投票结果作为最终答案。
*   **截尾均值准确率**（Trimmed Mean Accuracy）是比赛官方排名采用的积分方法，去除表现最好和最差的案例后的总分/平均准确率，以排除极端情况的影响。
*   为避免通用模型由训练记忆而非推理得出答案，仅展示了公开语料较少的 2025 年比赛题目。
*   为缓解通用模型计算幻觉，除原始题目外，Prompt中均提供排盘信息。
*   本次比赛共计 [3069 个有效参赛者](https://share.google/6qgJzt7fxpp8bzbNZ)，人类 Top 20 成绩来源于官方统计结果。
*   完整基准测试数据、评测代码见 [Mingli-Bench](https://github.com/DestinyLinker/MingLi-Bench)。详细设置可见 [Benchmark](https://destinylinker.github.io/MingLi-Bench/#benchmark-%E8%AF%A6%E6%83%85)，Tianfu Agent 的多数选项回答可见[详细评估结果](https://destinylinker.github.io/MingLi-Bench/#tianfu-agent-%E8%AF%A6%E7%BB%86%E8%AF%84%E4%BC%B0%E7%BB%93%E6%9E%9C)。

Based on results from the [2025 Global Fortune Teller Competition](https://hkjfma.org/2025/06/2025%E5%B9%B4%E7%AC%AC%E5%8D%81%E5%85%AD%E5%B1%86-%E5%85%A8%E7%90%83%E7%AE%97%E5%91%BD%E5%B8%AB%E6%AF%94%E8%B3%BD), Tianfu Agent achieved a **50% trimmed mean accuracy**, surpassing the best general-purpose LLM baseline (40%) and approaching the average level of the human Top 20 contestants (53.5%).

*   Given the stochastic nature of generative models, both Tianfu Agent and all baseline LLMs were tested over **5 independent rounds**, with majority vote as the final answer.
*   **Trimmed Mean Accuracy** is the official ranking metric of the competition, calculated by removing the best and worst performing cases before averaging, to exclude extreme outliers.
*   To prevent LLMs from answering via training memorization rather than reasoning, only 2025 competition questions (with less public corpus exposure) are presented.
*   To mitigate computational hallucinations in general-purpose models, pre-computed chart data was provided in the prompt alongside the original questions.
*   The competition had [3,069 valid participants](https://share.google/6qgJzt7fxpp8bzbNZ); human Top 20 scores are sourced from official statistics.
*   Full benchmark data and evaluation code are available at [Mingli-Bench](https://github.com/DestinyLinker/MingLi-Bench). Detailed setup can be found in [Benchmark](https://destinylinker.github.io/MingLi-Bench/#benchmark-details); Tianfu Agent's majority vote answers can be viewed in the [detailed results](https://destinylinker.github.io/MingLi-Bench/#tianfu-agent-detailed-evaluation-results).

> **重要声明：** 本研究为技术探索性原型，仅用于验证 AI 在结构化命理推理中的可行性，命理咨询是开放式对话和个性化诠释，而非选择题，故本结果不代表实际咨询效果。

> **Important Disclaimer:** This research is an exploratory technical prototype, intended solely to validate the feasibility of AI in structured destiny reasoning. Real-world destiny consultation involves open-ended dialogue and personalized interpretation, not multiple-choice questions — these results do not represent actual consultation performance.

### 专业命理分析面临的困境

命理推理需要从结构化数据（命盘）中进行模式识别，并映射为对人生事件的语义判断。 专业排盘软件已支持将命盘数据序列化为 Prompt 输入，显著降低基础计算错误。 然而，**排盘数据预计算 + 通用模型推理**的二分法存在结构性限制。

1.   **衍生数据的组合爆炸。** 命理推算往往需要逐级展开大限、流年、飞宫及其观察叠加效果——这些动态衍生数据的组合量随推算深度急剧膨胀，无法穷举后注入 Prompt。

2.   **空间关系的序列化损失。**`能量流通`、`三方四正`、`串联`等核心规则均依赖一定的空间关系。经过序列化后，这种拓扑信息难以完整保留。

3.   **推理链的误差累积。** 每步都依赖前序步骤的准确结果，早期的微小偏差，会沿推理链逐步放大，这是 LLM 长链推理的通用瓶颈。另外，由于训练语料极度稀缺使模型对领域规则不够熟悉，又缺乏自动化验证手段，导致该问题在命理领域进一步放大。

### Tianfu Agent 的设计思路

Agentic 类编码智能体的成功经验表明，当 LLM 被放入一个**领域专用的工具环境**中——配备文件读写、终端执行、测试反馈——它的能力会远超单纯的文本生成。 Tianfu Agent 尝试沿这一方向，为 LLM 构建命理专用的工具环境，让它能操作命盘对象、调用推算函数、获取计算反馈，而非仅凭训练记忆"背诵"命理知识。 推理链路上，Tianfu Agent 采用**渐进式发现策略**，由多个 Sub-Agent 各自维护独立的工具集和上下文，逐步展开推理。

本着**确定性优先原则**，Tianfu Agent 配备超过 **200 个专用原子性工具**， 完成包括排盘、时间推演、空间路径等可精确计算的方法。 然而，确定性计算能覆盖的范围终究有限—— 当面对繁杂的工具输出、规则约束、解读片段， 由于缺乏自动化验证手段，命理领域中**确定性**的边界究竟在哪里？ 为此，Tianfu Agent 试图从**工具调度**、**规则封装**与**信心度量**三个角度增强推理链路。

下面通过几个真实案例，直观展示这些策略在实际推理中的运作方式：

第3题：此人年青時何種工作？

### 计算型工具的划分与调用

通用 Agent 产品仅用少量通用工具即可覆盖多数场景。命理领域则不然：不同流派各有一套专用推算方法，工具种类繁杂且存在跨流派冲突。全部堆叠会导致模型的工具选择准确率下降，过度精简又丧失专业深度。我们按程度将工具划分为四类，来平衡工具精度与上下文负担：

| 类型 | LLM 可理解性 | 可穷举性 | 描述 | 示例 |
| --- | --- | --- | --- | --- |
| 自动注入型 | ✓ | ✓ | 零歧义概念，无需模型介入 | 十神、星耀、宫位 |
| 按需调用型 | ✓ | ✗ | 模型可直接推理并自行判断调用参数 | 生克、飞宫 |
| 转译调用型 | ✗ | ✓ | 需通过预设翻译转换工具名称后调用，避免模型幻觉 | 在天呈象转在地成型、法象 |
| 触发注入型 | ✗ | ✗ | 仅特定 Sub Agent 可调用，配有专用推理知识库和校验方法 | 北派用神 |

### 推理也被视为一种工具

在代码等通用领域，模型自身的推理能力足以支撑复杂的流程控制与决策。 但在命理领域，缺乏足够强大的领域模型意味着我们无法将推理直接交给模型， 而若将规则写入 System Prompt 或 Few-shot 示例， 本质上是依赖模型"记住并遵循"，在规则数量多、条件复杂时，会出现选择性忽略和推理路径不可控等问题。

为此，除计算工具外，Tianfu Agent 将**复杂推理规则也视为一种可调用工具**： 人类专家预先为每条规则标注适用场景和优先级元数据（时间跨度、事件类型、适用条件等）， 每条规则被封装为独立函数（内部结合LLM调用）， 接受命盘状态输入，返回结论与置信度。 确保仅在需要时注入上下文，避免大量抽象规则造成的上下文污染。

### 以置信度量化应对不可验证性

由于无法提供自动化验证机制，推理过程的稳定性显得尤为重要，为此我们将**不确定性量化**（Uncertainty Quantification）融入推理的各个阶段， 用以模拟人类专家的**隐式直觉**，该**信心度量**将在更高层的推理中作为采纳标准，大致分为以下几种：

1.   **工具输出的不确定性**，面向`强弱判断`、`多象吉凶`等非确定性计算/规则推理工具，由内置工具根据算法提供；
2.   **Sub-Agent 的不确定性**，由LLM自评估判断当前结论的显著性，主要面向单一理论体系下推理过程的评估；
3.   **多流派合参的不确定性**，用于调和流派间结论矛盾，并综合得出面向用户的最终回答。

### The Challenge of Professional Destiny Analysis

Destiny reasoning requires **pattern recognition** from structured data (natal charts) and mapping those patterns to semantic judgments about life events. Professional charting software can serialize chart data as prompt input, significantly reducing basic computational errors. However, the dichotomy of **pre-computed chart data + general-purpose model reasoning** has structural limitations.

1.   **Combinatorial explosion of derived data.** Destiny calculation often requires progressively expanding major periods (Da Xian), annual periods (Liu Nian), Flying Palace transformations, and their superimposed effects — the combinatorial volume of these dynamically derived data **explodes with reasoning depth**, making exhaustive prompt injection infeasible.

2.   **Serialization loss of spatial relationships.** Core rules such as "energy flow," "Three Harmonies and Four Cardinals" (San Fang Si Zheng), and "serial linkage" all depend on spatial relationships. After serialization, such **topological information is difficult to preserve** intact.

3.   **Error accumulation in reasoning chains.** Each step depends on the accuracy of prior steps; small early deviations **propagate and amplify** along the reasoning chain — a well-known bottleneck of LLM long-chain reasoning. Furthermore, **extremely scarce training corpora** leave models unfamiliar with domain rules, and the lack of automated verification further exacerbates this problem in the destiny analysis domain.

### Design Approach of Tianfu Agent

The success of agentic coding tools has shown that when an LLM is placed in a **domain-specific tool environment** — equipped with file I/O, terminal execution, and test feedback — its capabilities far 
