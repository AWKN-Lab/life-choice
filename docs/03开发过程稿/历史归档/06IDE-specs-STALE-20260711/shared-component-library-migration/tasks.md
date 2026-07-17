# Tasks

## Phase 1: 创建公用组件库目录结构
- [x] Task 1: 创建目标目录
  - [x] 创建 `react-ui/feedback/`、`react-ui/interaction/`、`react-ui/data-display/`、`react-ui/semi-reusable/`
  - [x] 创建 `backend/atom-tools/`

## Phase 2: 复制通用前端组件
- [x] Task 2: 复制 feedback 类组件
  - [x] 复制 `ErrorBoundary.tsx` → `react-ui/feedback/`
  - [x] 复制 `empty.tsx` → `react-ui/feedback/`
  - [x] 复制 `spinner.tsx` → `react-ui/feedback/`
  - [x] 复制 `AnimatedText.tsx` → `react-ui/feedback/`

- [x] Task 3: 复制 interaction 类组件
  - [x] 复制 `MagneticButton.tsx` → `react-ui/interaction/`
  - [x] 复制 `button-group.tsx` → `react-ui/interaction/`
  - [x] 复制 `input-group.tsx` → `react-ui/interaction/`
  - [x] 复制 `kbd.tsx` → `react-ui/interaction/`

- [x] Task 4: 复制 data-display 类组件
  - [x] 复制 `StyleSwitcher.tsx` → `react-ui/data-display/`
  - [x] 复制 `RadarChart.tsx` → `react-ui/data-display/`
  - [x] 复制 `field.tsx` → `react-ui/data-display/`
  - [x] 复制 `item.tsx` → `react-ui/data-display/`

## Phase 3: 复制半可复用前端组件
- [x] Task 5: 复制 semi-reusable 类组件
  - [x] 复制 `AuthModal.tsx` → `react-ui/semi-reusable/`
  - [x] 复制 `BottomNav.tsx` → `react-ui/semi-reusable/`
  - [x] 复制 `Navigation.tsx` → `react-ui/semi-reusable/`
  - [x] 复制 `CitySelector.tsx` → `react-ui/semi-reusable/`
  - [x] 复制 `CountdownTimer.tsx` → `react-ui/semi-reusable/`
  - [x] 复制 `ConclusionPreview.tsx` → `react-ui/semi-reusable/`

## Phase 4: 复制后端 atom-tools 核心框架
- [x] Task 6: 复制 atom-tools 核心
  - [x] 复制 `atom-tools/index.ts` → `backend/atom-tools/`
  - [x] 复制 `atom-tools/types.ts` → `backend/atom-tools/`

## Phase 5: 文档
- [x] Task 7: 创建 README.md
  - [x] 写入组件索引、分类、来源项目、复用说明

## Phase 6: 验证
- [x] Task 8: 验证
  - [x] 公用组件库目录结构正确
  - [x] 所有 20 个目标文件存在且大小正确
  - [x] 人生决策宗师项目源文件未被修改

# Task Dependencies
- [Task 1] 无依赖
- [Task 2-4] depends on [Task 1]，可并行
- [Task 5] depends on [Task 1]
- [Task 6] depends on [Task 1]
- [Task 7] depends on [Task 2, 3, 4, 5, 6]
- [Task 8] depends on [Task 7]
