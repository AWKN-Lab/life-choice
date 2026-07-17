# E141｜React 白屏三层防线与深路径访问防护

> **编号**：E141  
> **日期**：2026-06-25  
> **来源**：ResultPage 白屏修复复盘  
> **适用项目**：人生决策宗师 / AWKN-LABlife（可迁移至凌扬健身等 React 项目）  
> **触发词**：React 白屏、TypeError: Cannot read properties of undefined、深路径访问、ErrorBoundary、useMemo 崩溃

---

## 一、事故背景

### 1.1 症状

- **页面**：`/result`（ResultPage）
- **错误**：`TypeError: Cannot read properties of undefined (reading 'year')`
- **调用栈**：`BaZiDetail.tsx` → `useMemo(calculateWuXingDistribution)` → `analysis.baZi.year.gan` 崩溃
- **影响**：整页白屏

### 1.2 根因

1. `calcResult` 在六壬局场景下使用 `sizhu` 字段，不生成 `baZi` 字段
2. `normalizeCalcResult` 不保证 `baZi` 存在
3. `BaZiDetail.tsx` 的 `useMemo` 直接访问 `analysis.baZi.year.gan`，无 optional chaining
4. ResultPage 无 page-level ErrorBoundary

---

## 二、三层防线模式

### 防线 1：组件内部 useMemo 防护

**原则**：useMemo 必须无条件调用（React Hooks 规则），防护逻辑放在 useMemo **内部**

```typescript
// ❌ 错误：条件调用 useMemo（违反 Hooks 规则）
const wuXingCounts = analysis?.baZi?.year
  ? useMemo(() => calculateWuXingDistribution(analysis), [analysis])
  : defaultValue;

// ✅ 正确：useMemo 内部防护
const wuXingCounts = useMemo(() => {
  if (!analysis?.baZi?.year) return defaultValue;
  return calculateWuXingDistribution(analysis);
}, [analysis]);
```

### 防线 2：Early Return 兜底

**原则**：在所有 Hooks 调用完毕后，加 early return 渲染兜底 UI

```typescript
function BaZiDetail({ analysis }: Props) {
  const wuXingCounts = useMemo(() => {
    if (!analysis?.baZi?.year) return defaultValue;
    return calculateWuXingDistribution(analysis);
  }, [analysis]);

  if (!analysis?.baZi?.year) {
    return <div>暂无八字详细分析数据</div>;
  }

  return <div>...</div>;
}
```

### 防线 3：Page-level ErrorBoundary

**原则**：每个懒加载页面外层包 ErrorBoundary

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ResultPage() {
  return (
    <ErrorBoundary>
      <div className="page-content">{/* 页面内容 */}</div>
    </ErrorBoundary>
  );
}
```

---

## 三、深路径访问防护

### 3.1 危险模式

| 模式 | 风险 | 修复 |
|------|------|------|
| `obj.a.b.c` | 任一层级 undefined 即崩溃 | `obj?.a?.b?.c` |
| `arr[0].field` | 空数组崩溃 | `arr?.[0]?.field` |
| `useMemo(() => calc(deep.data), [deep])` | deep 为 undefined 崩溃 | useMemo 内部加防护 |

### 3.2 Grep 扫描

```bash
grep -rn "\.baZi\." src/ | grep -v "\.baZi?\." | grep -v "//"
grep -rEn "[a-zA-Z_]+\.[a-zA-Z_]+\.[a-zA-Z_]+\.[a-zA-Z_]+" src/ | grep -v "//"
```

---

## 四、401 静默处理模式

- 401（未认证）是预期状态（token 过期），不是错误
- `client.ts` 已处理 401（清 token + 跳登录）
- store 层的 `console.error` 是日志噪音，应静默

```typescript
import { ApiError } from '@/api/client';

try {
  await apiCall();
} catch (err) {
  if (err instanceof ApiError && err.statusCode === 401) return;
  console.error('API call failed:', err);
}
```

---

## 五、关联规则

- **E111**：完成前验证门禁
- **E95**：subagent 产出对账门禁
- **E52**：完成定义硬模板
- **E115**：大文件编辑函数边界确认
