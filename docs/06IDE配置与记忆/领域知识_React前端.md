# React 前端领域知识

> **日期**：2026-06-25

## 技术栈

- React 19 + Vite + TypeScript
- Zustand（状态管理）
- React Router v6（lazy loading + Suspense）
- Tailwind CSS + shadcn/ui

## 三层防线模式（E141）

1. useMemo 内部防护
2. Early return 兜底
3. Page-level ErrorBoundary

## 401 静默处理

- `client.ts` 处理 401（清 token + 跳登录）
- store 层 `console.error` 静默：`if (err instanceof ApiError && err.statusCode === 401) return;`

## 关键文件

- `apps/AWKN-LABlife/app/src/components/ErrorBoundary.tsx`
- `apps/AWKN-LABlife/app/src/store/` — Zustand stores
- `apps/AWKN-LABlife/app/src/api/client.ts` — API 客户端
