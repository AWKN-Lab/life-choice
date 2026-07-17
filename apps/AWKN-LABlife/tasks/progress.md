# 命运K线·牛市生命周期重构 — progress

## 状态：已完成 ✅

## 本轮执行清单

| Step | 内容 | 状态 | 产出 |
|------|------|------|------|
| Step 1 | types.ts 新增牛市阶段类型 | ✅ 张予完成 | BullMarketStageKey + BULL_MARKET_STAGES + getBullMarketStage |
| Step 2 | types.ts 判定阈值更新 | ✅ 本轮完成 | 旧阈值 45/60/75 → 新阈值 40/55/75/88 |
| Step 3 | LifeKLineChart.tsx 图表改造 | ✅ 张予完成 | 阶段视图/背景条/图例/视图切换 |
| Step 4 | npm build 验证 | ✅ 通过 | ✅ 2937 modules，18.34s，0 error |

## 本轮改动文件

1. `app/src/lib/destinyKline/types.ts`
   - `getStageName` / `getStageNameEn` / `getStageKey` 阈值更新
   - `rising` stage key 从单一分界点改为 ≥55 为 rising（与新阶段定义对齐）

2. `app/src/locales/zh-CN/translation.json`
   - 补 `lifeKLine.bullMarket.viewAge` + `viewStage`

3. `app/src/locales/en/translation.json`
   - 补 `lifeKLine.bullMarket.viewAge` + `viewStage`

## 待观察（无需本轮处理）

- i18n 文本内容：stage 名称（低谷修复/蓄势调整/稳步推进/上升窗口/见顶出局）的完整翻译文案未补充，目前沿用旧 key
- deriveDestinyKline.ts：`oneLiner` / `actionAdvice` 的 i18n key 依赖旧 stageKey，阈值改动后需同步确认

## 时间

完成于 2026-05-30 21:25