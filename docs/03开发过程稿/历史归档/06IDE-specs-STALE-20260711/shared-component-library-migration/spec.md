# 公用组件库迁徙 Spec

## Why
人生决策宗师项目中有 12+ 个通用前端组件和 1 个后端算法框架，可被 AWKN-Lab 其他项目复用。公用组件库目前为空壳，需要从项目复制通用组件进去，建立可复用资产。

## 核心规则（用户指定）
- **迁徙到公用组件库：只复制，不改动项目本地文件**
- **从公用组件库吸收：只复制组件，不改动库文件**
- 项目源文件保持原样不动，公用组件库是独立副本

## What Changes
- 在 `C:\Users\10919\Desktop\AWKN-Lab\公用组件库` 下建立目录结构
- 复制 12 个通用前端 UI 组件到 `公用组件库/react-ui/`
- 复制 6 个半可复用前端组件（抽离业务逻辑后）到 `公用组件库/react-ui/`
- 复制后端 atom-tools 核心框架到 `公用组件库/backend/atom-tools/`
- 新增 `公用组件库/README.md` 索引文档
- **不改动** 人生决策宗师项目内任何文件

## Impact
- Affected code: 仅 `C:\Users\10919\Desktop\AWKN-Lab\公用组件库\` 下新增文件
- 不影响人生决策宗师项目任何现有代码

## ADDED Requirements

### Requirement: 公用组件库目录结构
公用组件库 SHALL 建立以下结构：

```
公用组件库/
├── react-ui/                    # 前端通用 React 组件
│   ├── feedback/                # 反馈类组件
│   │   ├── ErrorBoundary.tsx
│   │   ├── empty.tsx
│   │   ├── spinner.tsx
│   │   └── AnimatedText.tsx
│   ├── interaction/             # 交互类组件
│   │   ├── MagneticButton.tsx
│   │   ├── button-group.tsx
│   │   ├── input-group.tsx
│   │   └── kbd.tsx
│   ├── data-display/            # 数据展示类组件
│   │   ├── RadarChart.tsx
│   │   ├── field.tsx
│   │   ├── item.tsx
│   │   └── StyleSwitcher.tsx
│   └── semi-reusable/           # 半可复用组件（需二次加工）
│       ├── AuthModal.tsx
│       ├── BottomNav.tsx
│       ├── Navigation.tsx
│       ├── CitySelector.tsx
│       ├── CountdownTimer.tsx
│       └── ConclusionPreview.tsx
├── backend/                     # 后端通用模块
│   └── atom-tools/              # 工具注册与执行框架
│       ├── index.ts
│       ├── types.ts
│       └── README.md
└── README.md
```

### Requirement: 只复制不修改
迁徙操作 SHALL 只使用文件复制（Copy-Item），禁止对人生决策宗师项目内任何文件执行修改、删除或移动操作。

#### Scenario: 项目源文件不变
- **WHEN** 完成迁徙
- **THEN** 人生决策宗师项目内所有组件文件内容与迁徙前完全一致

### Requirement: 通用前端组件迁徙
系统 SHALL 将以下 12 个通用组件复制到公用组件库：

| 源文件 | 目标位置 |
|--------|---------|
| `ui/StyleSwitcher.tsx` | `react-ui/data-display/StyleSwitcher.tsx` |
| `ErrorBoundary.tsx` | `react-ui/feedback/ErrorBoundary.tsx` |
| `AnimatedText.tsx` | `react-ui/feedback/AnimatedText.tsx` |
| `MagneticButton.tsx` | `react-ui/interaction/MagneticButton.tsx` |
| `benchmark/RadarChart.tsx` | `react-ui/data-display/RadarChart.tsx` |
| `ui/empty.tsx` | `react-ui/feedback/empty.tsx` |
| `ui/spinner.tsx` | `react-ui/feedback/spinner.tsx` |
| `ui/field.tsx` | `react-ui/data-display/field.tsx` |
| `ui/item.tsx` | `react-ui/data-display/item.tsx` |
| `ui/button-group.tsx` | `react-ui/interaction/button-group.tsx` |
| `ui/input-group.tsx` | `react-ui/interaction/input-group.tsx` |
| `ui/kbd.tsx` | `react-ui/interaction/kbd.tsx` |

### Requirement: 半可复用前端组件迁徙
系统 SHALL 将以下 6 个半可复用组件复制到 `react-ui/semi-reusable/`：

| 源文件 | 目标位置 |
|--------|---------|
| `AuthModal.tsx` | `react-ui/semi-reusable/AuthModal.tsx` |
| `BottomNav.tsx` | `react-ui/semi-reusable/BottomNav.tsx` |
| `Navigation.tsx` | `react-ui/semi-reusable/Navigation.tsx` |
| `form/CitySelector.tsx` | `react-ui/semi-reusable/CitySelector.tsx` |
| `CountdownTimer.tsx` | `react-ui/semi-reusable/CountdownTimer.tsx` |
| `conclusion/ConclusionPreview.tsx` | `react-ui/semi-reusable/ConclusionPreview.tsx` |

### Requirement: 后端 atom-tools 核心框架迁徙
系统 SHALL 将 atom-tools 核心框架（index.ts + types.ts）复制到 `backend/atom-tools/`。

### Requirement: README.md 索引
公用组件库 SHALL 包含 README.md，列出所有组件、分类、来源项目、复用说明。
