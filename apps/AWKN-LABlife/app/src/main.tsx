import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import 'material-symbols/outlined.css'  // 本地加载 Material Symbols Outlined 图标字体（只引入 outlined 变体，避免 rounded/sharp 字体过大）
import './index.css'
import App from './App.tsx'
import { initFrontendErrorTracking } from './lib/analytics'

// Sentry 初始化（条件加载：VITE_SENTRY_DSN 为空时不初始化）
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

initFrontendErrorTracking()

const savedTheme = localStorage.getItem('awkn-theme')
try {
  const parsed = savedTheme ? JSON.parse(savedTheme) : null
  const mode = parsed?.state?.mode || 'light'
  document.documentElement.setAttribute('data-theme', mode)
} catch {
  document.documentElement.setAttribute('data-theme', 'light')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div>应用发生错误，请刷新页面重试</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
