import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FrontdeskChat from '@/components/frontdesk/FrontdeskChat';

/**
 * ConsultPage — 咨询入口页面
 *
 * V2 P1 迁移（2026-07-12）：
 *   移除 V1 ConsultContent 旧架构（直接跳转 liuren/ziping），
 *   统一走 FrontdeskChat 对话引导流程。
 *   - type=naming → FrontdeskChat mode="naming"
 *   - 其他 → FrontdeskChat mode="question"（含 liuren_ask_time / ziping_profile_check）
 *
 * 依据：P2-对话前台契约差异分析与修复计划-20260711.md 差异 3
 * 准入：D1 契约测试 FrontdeskChat.contract.test.tsx 2/2 通过
 * 回滚：git checkout -- ConsultPage.tsx
 */
export function ConsultPage() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const navigate = useNavigate();

  if (typeParam === 'naming') {
    return (
      <ErrorBoundary>
        <FrontdeskChat
          mode="naming"
          onClose={() => navigate('/')}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <FrontdeskChat
        mode="question"
        onClose={() => navigate('/')}
      />
    </ErrorBoundary>
  );
}
