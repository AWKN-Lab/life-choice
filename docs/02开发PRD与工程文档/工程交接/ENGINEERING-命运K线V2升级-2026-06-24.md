# 命运K线 V2 升级 — 工程交接文档

> 日期：2026-06-24
> 状态：ACTIVE
> 上游 PRD：`docs/01产品定位与PRD/需求文档/PRD-命运K线V2升级-2026-06-24.md`
> 关联文档：
> - `docs/01产品定位与PRD/功能方案/命运K线丰富方案-v2.md`
> - `docs/01商业计划/V1-V3阶段路线图-2026-06-24.md`
> 部署约束：只作用于 `awkn.cn/life`，不修改 `awkn.cn/` 根主页

---

## 1. 目标

本工程文档解决的是命运K线当前“有很多组件和因子，但产品口径与计算真源尚未完全统一”的问题。

V2 工程目标：

1. 明确后端为 K 线唯一真源。
2. 把前端本地重算降为兼容层，而不是主计算层。
3. 收口免费版、完整版、分享卡、历史回看和对比能力。
4. 让因子增强、图表展示、分享传播和付费承接在同一套结构里协同。

---

## 2. 当前代码事实

### 2.1 前端现状

已存在文件：

- `apps/AWKN-LABlife/app/src/lib/lifeklineService.ts`
- `apps/AWKN-LABlife/app/src/components/LifeKLineChart.tsx`
- `apps/AWKN-LABlife/app/src/components/kline/KlineChart.tsx`
- `apps/AWKN-LABlife/app/src/components/kline/KlineShareCard.tsx`
- `apps/AWKN-LABlife/app/src/components/KLineImageGenerator.tsx`
- `apps/AWKN-LABlife/app/src/components/PosterGenerator.tsx`
- `apps/AWKN-LABlife/app/src/lib/destinyKline/deriveDestinyKline.ts`
- `apps/AWKN-LABlife/app/src/lib/destinyKline/*`

当前结论：

1. 前端已经存在相当多的 destiny kline 因子模块：
   - `shiShenModulator`
   - `xingChongHeHaiPenalty`
   - `naYinZangganModulator`
   - `ziweiModulator`
   - `celebrityModulator`
2. `deriveDestinyKline.ts` 已包含 V2 风格的扩展公式，但文件内明确标注：

```ts
/** @deprecated 本地重算已废弃，K 线以后端为唯一真源 */
```

3. 这意味着当前前端已经进入“能力有了，但架构方向要收口”的阶段。
4. 分享侧已有 `KlineShareCard.tsx`、`KLineImageGenerator.tsx`、`PosterGenerator.tsx` 多条能力线，存在重复与口径分裂风险。

### 2.2 后端现状

已存在文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/generators/kline.generator.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/generators/monthly.generator.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/generators/short-cycle.generator.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/generators/moving-average.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/generators/celebrity.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/kline-tide/*`

当前结论：

1. 后端 `kline.generator.ts` 已不只是简版曲线，而是包含 15 因子方向的生成器：
   - 现有 5 因子
   - `baseChart`
   - 8 类十神
   - `xingChongHeHai`
   - `riskPenalty`
2. 后端已经是更合理的真源位置。
3. 仍需对前端接口、结果结构和分享资产进行统一。

---

## 3. 本期范围

### 3.1 必做

1. 后端真源口径明确化。
2. 前端展示层围绕后端返回结构收口。
3. 免费版与完整版能力分层明确。
4. 关键节点与窗口展示统一。
5. 分享卡与海报能力统一。
6. K 线记录与历史回看打通。

### 3.2 暂不做

1. 不在本期彻底删除所有前端 destiny kline 因子文件。
2. 不在本期做完整开放 API 平台。
3. 不在本期补完全部名人对标与紫微增强细节。
4. 不在本期做复杂公众排行榜或社区。

---

## 4. 真源架构

### 4.1 真源原则

统一原则：

`后端生成 K 线数据，前端负责展示、交互、分享和兼容兜底。`

### 4.2 当前问题

当前存在双路径：

1. 后端生成器：`kline.generator.ts`
2. 前端本地派生：`deriveDestinyKline.ts`

风险：

1. 分数不一致
2. 节点不一致
3. 窗口不一致
4. 分享图与结果页来源不一致

### 4.3 V2 要求

1. 后端接口返回的 K 线 bundle 作为页面主展示数据。
2. 前端本地重算仅用于：
   - 兼容历史记录
   - 开发阶段辅助
   - 服务端缺字段时兜底
3. 页面层必须优先消费后端 bundle，而不是先本地派生再覆盖。

---

## 5. 前端改造

### 5.1 图表主组件

文件：

- `apps/AWKN-LABlife/app/src/components/LifeKLineChart.tsx`
- `apps/AWKN-LABlife/app/src/components/kline/KlineChart.tsx`
- `apps/AWKN-LABlife/app/src/types/lifekline.ts`

改造：

1. 图表主组件统一接收后端 bundle。
2. 图表默认先展示总势线。
3. 完整版可切换到事业、财运、情感等分维线。
4. 图表层不再自行做复杂命理计算。

验收：

1. 图表数据来自统一结构。
2. 切维度不改变真源，仅改变展示。

### 5.2 页面展示结构

文件：

- `apps/AWKN-LABlife/app/src/pages/ResultPage.tsx`
- `apps/AWKN-LABlife/app/src/components/kline/DimensionInsight.tsx`
- `apps/AWKN-LABlife/app/src/components/kline/AnnualReview.tsx`
- `apps/AWKN-LABlife/app/src/components/kline/LongCycleReport.tsx`
- `apps/AWKN-LABlife/app/src/components/kline/RecordComparison.tsx`

改造：

1. 免费版首屏最少展示：
   - 当前阶段
   - 当前大运
   - 总势线
   - 最佳窗口
   - 风险窗口
2. 完整版增加：
   - 分维线
   - 关键年份详细解释
   - 阶段建议
   - 对比/长周期入口
3. 如果某些增强数据缺失，不允许页面空白；必须有兜底文案。

### 5.3 前端 destiny kline 派生层

文件：

- `apps/AWKN-LABlife/app/src/lib/destinyKline/deriveDestinyKline.ts`
- `apps/AWKN-LABlife/app/src/lib/destinyKline/*`

处理策略：

1. 保留为兼容层，不再作为主真源。
2. 在文档和调用点明确标注仅在服务端数据缺失时兜底。
3. 后续可逐步迁出页面主路径。

---

## 6. 后端改造

### 6.1 生成器主链路

文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/generators/kline.generator.ts`

现状：

1. 已有 `generateKLineData`
2. 已有 `generateMeta`
3. 已有月度、年-月等模式
4. 已有 15 因子方向扩展

V2 要求：

1. 后端输出统一的 K 线 bundle，前端无需二次命理加工。
2. 输出至少包含：
   - points
   - meta
   - viewMode
   - factor breakdown（可选展示）
3. 明确哪些数据给免费版，哪些给完整版。

### 6.2 元数据要求

后端 K 线元数据至少包含：

1. `currentAge`
2. `currentDaYun`
3. `confidence`
4. `bestWindow`
5. `riskWindow`

这是前端构建趋势感和窗口感的最小集。

### 6.3 模式与粒度

当前后端已支持：

1. `life`
2. `decade`
3. `monthly`
4. `yearMonth`

V2 产品层建议映射：

1. 免费版主看 `life`
2. 完整版可扩展 `decade`
3. `monthly/yearMonth` 作为后续增强或高级能力，不强行压到 V2 首屏

---

## 7. 分享与海报

### 7.1 当前问题

前端存在多条分享生成路径：

- `components/kline/KlineShareCard.tsx`
- `components/KLineImageGenerator.tsx`
- `components/PosterGenerator.tsx`

风险：

1. 视觉风格不一致
2. 数据来源不一致
3. 文案口径不一致

### 7.2 V2 要求

1. 确定一个主分享卡资产路径。
2. 传播图只展示：
   - 主趋势感
   - 一句判断
   - 品牌标识
   - 少量关键数字/窗口
3. 不把完整解释和隐私信息塞进海报。

### 7.3 工程建议

1. 统一分享数据输入模型。
2. 页面结果和分享卡使用同一份后端真源数据。
3. 将海报定位为传播资产，不是长报告导出。

---

## 8. 免费与付费分层

### 8.1 免费版最小集

1. 总势线简版
2. 当前阶段
3. 当前大运
4. 最佳窗口
5. 风险窗口

### 8.2 完整版能力

1. 多维线
2. 年份级解释
3. 更完整节点说明
4. 高清分享海报
5. 长周期/对比入口

工程要求：

1. 前端 gating 口径统一到 `kline`
2. 不再出现取名或其他模块误解锁 K 线路径

---

## 9. 数据资产落库要求

本期至少保证以下资产可留存或回看：

1. 出生输入
2. K 线 bundle 快照
3. 用户查看的模式或维度
4. 分享生成状态
5. 解锁状态
6. 历史对比引用关系

如已有 `destiny snapshot` 保存路径，应优先复用。

---

## 10. 埋点

建议新增或核对以下事件：

| 事件 | 触发时机 |
|---|---|
| `kline_preview_view` | 免费版首屏展示 |
| `kline_dimension_switch` | 切换维度 |
| `kline_unlock_click` | 点击解锁完整版 |
| `kline_window_expand` | 展开关键窗口说明 |
| `kline_share_card_view` | 打开分享卡 |
| `kline_share_save` | 保存海报 |
| `kline_history_reopen` | 从历史重开 K 线记录 |

---

## 11. 测试要求

### 11.1 前端验证

1. 免费用户可看到基础 K 线预览。
2. 完整版可切换多维线。
3. 最佳窗口、风险窗口位置与文案对应。
4. 分享卡能生成且不含过深隐私。
5. 前端不会优先使用本地重算覆盖后端真源。

### 11.2 后端验证

建议补充或核对：

- `consult/generators/kline.generator.spec.ts`
- `app/src/lib/__tests__/lifeklineService.test.ts`
- `app/src/lib/__tests__/LifeKLineChart.test.tsx`

至少增加以下场景：

1. `generateMeta` 返回窗口字段完整
2. 免费模式与完整版模式返回结构一致、内容分层
3. 因子异常缺失时仍能产出可用 bundle
4. 历史快照可复用

### 11.3 构建验证

本期至少执行：

```bash
npm run build
```

如有专项测试，可追加：

```bash
npm test -- kline
```

---

## 12. 风险与处理

### 风险 1：前后端双真源继续并存

影响：

- 走势和窗口口径持续漂移

处理：

1. 明确后端真源
2. 页面消费优先走后端 bundle

### 风险 2：分享能力多头发展

影响：

- 视觉与数据口径混乱

处理：

1. 收口单一主分享路径
2. 海报只做传播，不做报告替代

### 风险 3：因子增强太深，用户却看不懂

影响：

- 技术做了，产品感没提升

处理：

1. 因子用于提高质量，不直接堆在前台
2. 前台输出集中到趋势、窗口、建议

---

## 13. 实施顺序

### Step 1

真源收口：

- 后端 bundle 结构确认
- 前端主消费路径确认

### Step 2

结果页收口：

- 免费版
- 完整版
- 节点说明

### Step 3

分享资产收口：

- 统一分享卡
- 统一数据输入

### Step 4

历史与验证：

- 历史回看
- 测试
- 构建

---

## 14. 验收清单

- [ ] 后端被定义为 K 线唯一真源
- [ ] 免费用户可完成基础 K 线预览
- [ ] 完整版提供多维线与关键节点解释
- [ ] 图表至少展示当前阶段、当前大运、最佳窗口、风险窗口
- [ ] 分享海报收口为传播资产而不是结果页拼贴
- [ ] K 线记录进入历史与后台资产
- [ ] 不影响 `awkn.cn` 根主页，仅作用于 `/life`
