# Copilot Instructions for Life Choice Bazi Calendar

## Project Overview
**Life Choice** is a React + Vite app for Chinese Ba Zi (八字) numerology readings. Users input birth info, receive fortune predictions for 2026, and get AI-powered life guidance. The app uses a point-based system for premium features.

**Key Stack**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Express backend

## Critical Architecture Patterns

### 1. Ba Zi Calculation Engine (`src/lib/bazi-engine.ts`)
- **Core Algorithm**: Converts birth dates (Gregorian or Lunar) to 10 Heavenly Stems (天干) + 12 Earthly Branches (地支) combinations
- **Highlight Days**: Calculates auspicious 2026 dates based on user's pillar relationships:
  - **Type Mapping**: `财官双美` (wealth+power), `贵人相助` (noble help), `桃花盛开` (romance), `事业高升` (career), `财运亨通` (wealth), `智慧开启` (wisdom), `平安顺遂` (peace)
  - Uses hidden stems (`DI_ZHI_CANG_GAN`) and 5-element relationships (`WUXING`)
- **Key Exports**: `calculateBazi(BirthInfo)`, `calculateHighlightDays(UserBazi)` - both pure functions
- **Note**: Production AI responses use Alibaba Qianwen API; frontend only returns mock responses

### 2. State Management via Props & Local Storage
**No Redux/Context API** - state flows through component hierarchy:
- **Login State**: `localStorage['userEmail']` + `localStorage['userRole']` (see `authService.ts`)
- **Points System**: `localStorage[`awkn_points_${userEmail}`]` with history tracking (see `pointsSystem.ts`)
- **BirthInputModal → App**: Modal passes `{userBazi, fourAspects, highlightDays, aiAnswer}` via `onSubmit` callback

### 3. User Flow
```
Hero (Start Button) 
  → BirthInputModal (2-step form: birth date, then AI analysis)
  → Check Points (100 required per analysis, via reducePoints())
  → ResultDashboard (displays findings + scrolls to results)
```

### 4. Four Aspects Scoring
Reads `BirthInputModal` line ~320 for logic:
- **Career, Wealth, Noble, Romance** each 0-100
- Derived from stem/branch relationships to daily pillars
- Passed to `ResultDashboard` for visualization

## Developer Workflows

### Build & Dev
```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # Typecheck + Vite bundle
npm run lint         # ESLint check
npm run typecheck    # TypeScript validation (tsc --noEmit)
```

### Running Backend AI Integration
```bash
node server.cjs      # Starts Express server (uses QIANWEN_API_KEY)
```
⚠️ **Important**: Qianwen API key is hardcoded in `server.cjs` line 11 - should move to env vars before production

### TypeScript Path Alias
Import convention: `import { X } from '@/components/...'` maps to `src/components/...` via `tsconfig.json`

## Project-Specific Conventions

### 1. Chinese Comments & Strings
- Comments and UI labels are Chinese-only (not translated)
- Don't auto-translate to English without consulting product owner
- Example: `// 初始化认证状态` = "Initialize auth state"

### 2. Modal Patterns
All modals (LoginModal, BirthInputModal, PointsInsufficientModal) follow:
- Props: `{onClose(), onSubmit(data), onGoRegister?()}`
- Always render `X` close button in top-right
- State passed upward to App.tsx via callbacks, not Context

### 3. Component Organization
- **Sections**: Full-page landing components (Hero, About, Blog, etc.)
- **Components**: Reusable modals, inputs, dashboards
- **UI**: Radix + Tailwind primitives (Button, Card, Dialog, etc.)
- **Lib**: Pure logic (bazi-engine, utils)
- **Services**: Auth + localStorage wrappers
- **Hooks**: Reusable React logic

### 4. Points System Integration
When implementing features requiring points:
```typescript
import { getPointsData, reducePoints, addPoints } from '@/utils/pointsSystem';

// Always check balance first
const pointsData = getPointsData();
if (pointsData.balance < REQUIRED) {
  setShowPointsModal(true); // Trigger PointsInsufficientModal
  return;
}

// Then deduct
const success = reducePoints(amount, 'reason string');
```

### 5. Styling Defaults
- Tailwind with HSL CSS variables (see `tailwind.config.js`)
- Dark mode via `darkMode: ["class"]` - toggle with `document.documentElement.classList.toggle('dark')`
- Primary/secondary/accent colors are theme-aware

## Integration Points

### Frontend ↔ Backend Communication
- **GET /api/bazi** → POST birth JSON → returns AI response (planned)
- **POST /auth/login** → email validation (planned)
- Currently: Most logic is client-side with mock responses

### External Dependencies
- **Qianwen API** (`server.cjs`): AI responses for life guidance (documented in line 10-12)
- **Radix UI**: Accessible primitives for modals, inputs, dropdowns
- **Ant Design Icons**: Icon library imported but mostly using Lucide instead

## Common Pitfalls to Avoid

1. **Don't mutate Ba Zi calculations**: `calculateBazi()` returns new object each time - safe for re-renders
2. **Points are per-user**: Always check `localStorage['userEmail']` before reading points
3. **Modal close is parent responsibility**: Child modals must NOT auto-close on navigation
4. **Highlight days are 2026-only**: Algorithm hardcoded for 2026 - if extending years, refactor date logic
5. **Lunar calendar conversion**: Uses simplified library logic, not astronomical precision

## Key Files Reference

- [App.tsx](App.tsx#L1): Main component, state orchestration
- [bazi-engine.ts](src/lib/bazi-engine.ts#L1): Algorithm core, start here for Ba Zi logic
- [BirthInputModal.tsx](src/components/BirthInputModal.tsx#L1): Two-step form UX
- [authService.ts](src/services/authService.ts#L1): LocalStorage auth wrapper
- [pointsSystem.ts](src/utils/pointsSystem.ts#L1): Points history + balance
- [server.cjs](server.cjs#L1): Backend Qianwen integration
