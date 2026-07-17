# Kline Home 页面 UI 优化计划

## 目标
优化 `https://awkn.cn/life/result?type=kline&mode=home` 页面的算法排盘展示（流年小运、大运等），实现：
- **重复内容隐藏**：避免排盘信息在不同区域重复出现
- **保持详细输出**：所有详细数据仍然可查看，不丢失信息

## 现状分析

### 页面结构（ResultPage.tsx）
1. **InitialZipingAlgorithmPanel** (L1092): 算法排盘面板，展示四柱、五行、藏干、刑冲合害、大运、流年、流月、神煞
2. **AdvancedReportSection** (L1183): 深度报告（命盘验证、格局、大运主题、流年现象、古籍依据）
3. **详细内容区域** (L1186): 行动建议 + 关键时间
4. **VIP 模块内容** (L1283): 当 `module=kline` 时展示 K 线图、趋势分析、关键节点等

### 重复内容识别
当前 `InitialZipingAlgorithmPanel` 在 `compact=true`（kline 入口）时：
- ✅ 已折叠：四柱（隐藏）
- ✅ 已折叠：大运/流年/流月/神煞（通过 `detailExpanded` 按钮折叠）
- ❌ 仍显示：日主、身强身弱、当前大运、五行分布、BaZiTable、藏干/副星、刑冲合害、命盘总评、喜用神

这些信息和 `AdvancedReportSection` 以及 Kline 模块内容有大量重叠。

### 数据流
```
result.calc_result → normalizeCalcResult() → InitialZipingAlgorithmPanel
                 ↓
            moduleContent (kline) → ResultPage 渲染 K 线相关模块
```

## 优化方案

### 方案：智能折叠 + 分层展示

对 `InitialZipingAlgorithmPanel` 进行改造，当 `compact=true`（即 kline 入口）时：

#### 1. 精简展示层（默认可见）
仅保留最核心的 3 个信息卡片：
- **日主** + **身强身弱**（合并为一行）
- **当前大运**（高亮显示）
- **五行分布**（简化版进度条）

#### 2. 详细排盘层（可展开）
将以下所有详细排盘内容折叠到「详细排盘」展开面板中：
- BaZiTable（四柱详细表格）
- 藏干 / 副星复核
- 刑冲合害
- 起运 / 胎元 / 命宫 / 空亡
- 命盘总评
- 喜用神
- 大运明细
- 流年小运
- 本年流月
- 神煞总览

#### 3. 与 Kline 模块联动
当用户展开 Kline 模块（`module=kline`）时：
- 如果详细排盘已展开，自动折叠（避免信息过载）
- Kline 模块内的五行分析、大运解读保持独立展示

### 改动文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `app/src/components/result/InitialZipingAlgorithmPanel.tsx` | 修改 | 核心：增加 `compact` 模式下的智能折叠逻辑 |
| `app/src/pages/ResultPage.tsx` | 修改 | 可选：增加展开状态联动 |

### 详细改动点

#### InitialZipingAlgorithmPanel.tsx

1. **新增状态管理**：
   ```typescript
   const [showDetailedPan, setShowDetailedPan] = useState(false);
   ```

2. **compact 模式下的精简头部**：
   - 保留：日主 + 身强身弱（一行）
   - 保留：当前大运（一行）
   - 保留：五行分布（简化进度条）
   - 新增：「查看详细排盘」展开按钮

3. **详细排盘折叠面板**：
   - 包含所有原有的详细排盘内容
   - 使用 `AnimatePresence` 实现平滑展开/收起动画
   - 默认收起（`compact=true` 时）

4. **非 compact 模式**：
   - 保持现有展示逻辑不变（完全展开）

#### ResultPage.tsx（可选联动）

1. 监听 `moduleId` 变化
2. 当 `moduleId === 'kline'` 且详细排盘展开时，可自动折叠（提升 K 线图表可视区域）

### 视觉设计

- 展开按钮样式：与现有「大运·流年·流月·神煞」折叠按钮一致
- 面板背景：`bg-white/[0.04] rounded-xl border border-white/10`
- 动画：使用 `framer-motion` 的 `AnimatePresence` + `motion.div`
- 保持现有黑金配色风格

### 验收标准

1. `compact=true`（kline 入口）时，默认只展示精简信息（日主、身强身弱、当前大运、五行分布）
2. 点击「查看详细排盘」可展开所有排盘细节
3. 展开/收起动画流畅
4. `compact=false`（普通 ziping 入口）时，展示逻辑不变
5. 不丢失任何排盘数据
6. 五行分布在精简视图和详细视图中不重复
7. 与 Kline 模块内容无视觉冲突

### 风险

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 用户找不到详细排盘 | 低 | 展开按钮使用醒目的 primary 色，带图标 |
| 动画性能问题 | 低 | 使用 `layout` 动画，内容多时加 `will-change` |
| 与现有折叠逻辑冲突 | 中 | 保留原有的 `detailExpanded` 状态，新增独立状态 |

### 实施步骤

1. 修改 `InitialZipingAlgorithmPanel.tsx`
   - 添加 `showDetailedPan` 状态
   - 重构 `compact` 模式渲染逻辑
   - 将详细内容包装为折叠面板
   - 精简视图只保留核心信息

2. 测试验证
   - kline 入口：确认默认精简，可展开详细
   - 普通 ziping 入口：确认展示不变
   - 检查五行分布不重复
   - 检查动画流畅度
