# 修复 ResultPage 白屏（BaZiDetail 访问 undefined.year）+ 401 错误日志噪音

## 摘要

用户反馈访问结果页时控制台报错：
1. **TypeError: Cannot read properties of undefined (reading 'year')** — 导致 ErrorBoundary 捕获，页面白屏
2. **多个 API 返回 401 Unauthorized** + `Load orders failed: ApiError: Unauthorized` — token 过期导致的正常认证失败，但日志噪音大

经探索，**问题 1 的根因**是：`BaZiDetail` 组件在 `useMemo` 中调用 `calculateWuXingDistribution(analysis)`，该函数第 81 行无防护访问 `analysis.baZi.year.gan`。当 ResultPage 传入的 `calcResult` 没有 `baZi` 字段（例如六壬局结果用 `sizhu` 而非 `baZi`）时，`analysis.baZi` 为 undefined，访问 `.year` 崩溃。

报错堆栈完全匹配：`useMemo` → `BaZiDetail`（在 ResultPage chunk 中）→ `calculateWuXingDistribution` → `analysis.baZi.year.gan` → 崩溃 → ErrorBoundary 捕获。

**问题 2 的根因**是：用户 token 过期，`/api/v1/auth/refresh` 也返回 401（refresh token 也过期）。`client.ts` 已有正确处理逻辑（清除 token + 设置未认证），不会导致崩溃。`orderStore` 的 `console.error('Load orders failed:', err)` 是正常的错误日志，但属于噪音——应在未认证时静默处理。

## 当前状态分析

### 问题 1：BaZiDetail 崩溃（白屏根因）

**崩溃链路**：
1. [ResultPage.tsx:1148](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/pages/ResultPage.tsx) — `const calcResult = normalizeCalcResult(result?.calc_result);`
2. [ResultPage.tsx:1461](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/pages/ResultPage.tsx) — `{calcResult && (...)}` 只检查 calcResult 存在
3. [ResultPage.tsx:1468](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/pages/ResultPage.tsx) — `analysis={calcResult as any}` 传给 BaZiDetail
4. [BaZiDetail.tsx:711](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/components/BaZiDetail.tsx) — `useMemo(() => calculateWuXingDistribution(analysis), [analysis])`
5. [BaZiDetail.tsx:81](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/components/BaZiDetail.tsx) — `analysis.baZi.year.gan` ← **baZi 为 undefined 时崩溃**

**normalizeCalcResult 不保证 baZi 存在**：
```typescript
// resultUtils.ts:389-394
export function normalizeCalcResult(calcResult: any): any {
  if (!calcResult) return null;
  if (calcResult.calcData) return calcResult.calcData;
  if (calcResult.data?.calcData) return calcResult.data.calcData;
  return calcResult;  // ← 只解包，不校验 baZi
}
```

**BaZiDetail 中无防护访问 baZi 的位置（共 10+ 处）**：
- 第 81-90 行：`analysis.baZi.year.gan` / `analysis.baZi.month.gan` / `analysis.baZi.day.gan` / `analysis.baZi.time.gan`
- 第 87-90 行：`analysis.baZi.year.zhi` 等
- 第 106-108 行：`analysis.baZi.day.gan` / `analysis.baZi.day.zhi` / `analysis.baZi.month.zhi`
- 第 125 行：`analysis.baZi.year.gan` / `analysis.baZi.time.gan`
- 第 319-321 行：`analysis.baZi.year.gan` 等（渲染四柱）
- 第 460-463 行：`analysis.baZi.year.gan` 等（天干关系）
- 第 533-536 行：`analysis.baZi.year.zhi` 等（地支关系）
- 第 579-581 行：`analysis.naYin.year` 等
- 第 595-597 行：`analysis.changSheng.year` 等

### 问题 2：401 错误日志噪音

**现象**：
- `api/v1/growth/invite-stats` 401
- `api/v1/membership/credit/balance` 401
- `api/v1/payment/orders` 401
- `api/v1/auth/refresh` 401
- `orderStore: Load orders failed: ApiError: Unauthorized`

**根因**：用户 token 过期，refresh token 也过期。`client.ts` 第 136-156 行已有正确处理：401 → 尝试 refresh → refresh 也失败 → 清除 token + 设置未认证。这是正常流程，不会崩溃。

**问题**：`orderStore.ts:112` 的 `console.error('Load orders failed:', err)` 在未认证时产生噪音。未认证是预期状态，不应报错。

## 修复方案

### 改动 1：BaZiDetail 添加 baZi 存在性校验（白屏根因修复）

**文件**：[BaZiDetail.tsx](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/components/BaZiDetail.tsx)

**改什么**：在 `BaZiDetail` 组件入口添加 `analysis.baZi` 存在性校验，若不存在则返回友好提示而非崩溃

**为什么**：`calcResult` 不保证有 `baZi` 字段（六壬局用 `sizhu`），直接渲染 BaZiDetail 会崩溃。应在入口拦截。

**怎么改**：在 `BaZiDetail` 组件函数体开头（第 710 行 `useMemo` 之前）添加：
```tsx
const BaZiDetail: React.FC<BaZiDetailProps> = ({ analysis, gender, birthYear }) => {
  const { t } = useTranslation();

  // 防御：analysis 或 baZi 不存在时返回提示，避免 useMemo 中访问 .year 崩溃
  if (!analysis?.baZi?.year) {
    return (
      <div className="p-4 text-center text-sm text-on-surface-variant">
        {t('baziDetail.noData', { defaultValue: '暂无八字详细分析数据' })}
      </div>
    );
  }

  const wuXingCounts = useMemo(() => calculateWuXingDistribution(analysis), [analysis]);
  // ...其余代码不变
};
```

**注意**：React Hook 规则要求 `useMemo` 不能在条件返回之后调用。因此需要重构——把校验放在 useMemo 内部，或用 early return 前置（不调用任何 hook）。

**推荐方案**：在 `calculateWuXingDistribution` 和 `judgeShenWang` 内部添加防护，并让 BaZiDetail 在 baZi 缺失时返回提示。由于 React Hooks 规则，采用"包裹 useMemo 内部校验"方式：

```tsx
const wuXingCounts = useMemo(() => {
  if (!analysis?.baZi?.year) return { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  return calculateWuXingDistribution(analysis);
}, [analysis]);

const shenWang = useMemo(() => {
  if (!analysis?.baZi?.year) return { result: '中和' as const, score: 50, reasons: [] };
  return judgeShenWang(analysis);
}, [analysis]);
```

并在渲染前添加 early return（在所有 useMemo 之后）：
```tsx
if (!analysis?.baZi?.year) {
  return (
    <div className="p-4 text-center text-sm text-on-surface-variant">
      {t('baziDetail.noData', { defaultValue: '暂无八字详细分析数据' })}
    </div>
  );
}
```

### 改动 2：orderStore 未认证时静默处理（减少 401 噪音）

**文件**：[orderStore.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/app/src/store/orderStore.ts)

**改什么**：`loadOrders` 在捕获到 401 时不输出 `console.error`

**为什么**：未认证是预期状态（用户未登录或 token 过期），不应报错。client.ts 已处理 401（清除 token），orderStore 只需静默失败。

**怎么改**：
```typescript
loadOrders: async () => {
  try {
    const orders = await paymentApi.getOrders();
    set({ orders });
  } catch (err) {
    // 未认证（401）是预期状态，不报错；其他错误才记录
    if (err instanceof ApiError && err.statusCode === 401) return;
    console.error('Load orders failed:', err);
  }
},
```

需要 import `ApiError`（若未 import）。

## 假设与决策

### 假设
1. BaZiDetail 崩溃是因为 `calcResult.baZi` 为 undefined（六壬局结果用 `sizhu`，子平局才有 `baZi`）
2. 401 错误是 token 过期的正常现象，client.ts 已正确处理
3. 用户看到的 chunk hash（`index-cM-HYAkX.js`）是旧缓存，但崩溃代码路径在新版本仍存在

### 决策
1. **优先修复 BaZiDetail 崩溃**：这是白屏的直接原因，添加 baZi 存在性校验
2. **orderStore 静默 401**：减少日志噪音，不影响功能
3. **不修复 401 本身**：token 过期是正常流程，client.ts 已处理，无需改动

## 验证步骤

### 步骤 1：TypeScript 编译验证
```bash
cd apps/AWKN-LABlife/app && npx tsc --noEmit
```
预期：exit 0，无类型错误

### 步骤 2：构建验证
```bash
cd apps/AWKN-LABlife/app && npm run build
```
预期：构建成功，生成 BaZiDetail chunk

### 步骤 3：部署
```bash
$env:TEMP = "C:\Users\10919\AppData\Local\Temp"; $env:SKIP_FRONTEND_BUILD = "1"; $env:SKIP_BACKEND_BUILD = "1"; .\scripts\deploy\deploy-awkn-life.ps1
```
预期：部署成功，健康检查通过

### 步骤 4：浏览器验证
1. 强制刷新（Ctrl+F5）访问结果页
2. 确认不再白屏
3. 确认 BaZiDetail 在无 baZi 数据时显示"暂无八字详细分析数据"
4. 确认控制台不再有 `Load orders failed: ApiError: Unauthorized`（401 时静默）

### 步骤 5：回归验证
1. 子平局结果（有 baZi）：BaZiDetail 正常显示五行/十神/大运
2. 六壬局结果（无 baZi）：BaZiDetail 显示提示文案，不崩溃
3. 未登录访问：控制台无 `Load orders failed` 错误
