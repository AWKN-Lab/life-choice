/**
 * D1 契约流程测试：ConsultPage ↔ FrontdeskChat 入口契约
 *
 * 覆盖 P2-对话前台契约差异分析与修复计划-20260711.md 差异 3 的准入条件：
 * - 六壬补问时间（liuren_ask_time 阶段）
 * - 八字档案检查（ziping_profile_check 阶段）
 *
 * 这两个测试是 V2 P1 入口迁移的硬门禁：测试通过后才能实施
 * ConsultPage liuren/ziping 路由迁移到 FrontdeskChat 对话引导。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// --- Mock 外部依赖（必须在 import 组件之前） ---

// 1. react-i18next — t 函数直接返回 key
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}));

// 2. react-router-dom — 空导航/空 location
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null, pathname: '/', search: '', hash: '' }),
}));

// 3. framer-motion — 直接渲染 children，去掉动画
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => (props: any) => props.children ?? null,
  }),
  AnimatePresence: ({ children }: any) => children ?? null,
}));

// 4. intentRouter — 核心 mock，由测试用例控制返回值
vi.mock('@/lib/intentRouter', () => ({
  routeIntent: vi.fn(),
  routeIntentWithFallback: vi.fn(),
  detectUserIntent: vi.fn(() => 'consult' as const),
  ENGINE_NAMES: { liuren: '六壬', ziping: '子平', quming: '取名', ziwei: '紫微' },
  USER_INTENT_ICONS: {},
}));

// 5. analytics — 空 mock
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  getSessionId: vi.fn(() => 'test-session-id'),
}));

vi.mock('@/utils/analytics', () => ({
  trackFunnel: vi.fn(),
}));

// 6. feature-flag — 默认关闭
vi.mock('@/lib/feature-flag', () => ({
  isEnabled: vi.fn(() => false),
}));

// 7. consultDataMigration — 空 mock
vi.mock('@/lib/consultDataMigration', () => ({
  saveConsultData: vi.fn(),
}));

// 8. stores — getProfile 由测试用例控制
vi.mock('@/store/userProfileStore', () => ({
  useUserProfileStore: () => ({
    getProfile: vi.fn(() => ({ birthDate: '', birthHour: -1, gender: '' })),
    saveProfile: vi.fn(),
  }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: false, user: null }),
}));

vi.mock('@/store/languageStore', () => ({
  useLanguageStore: () => ({ currentLanguage: 'zh-CN' }),
}));

// 9. API — 空 mock
vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/api/consult', () => ({
  consultApi: { analyze: vi.fn(), generate: vi.fn() },
}));

// 10. 子组件 — 直接渲染 children 或 null
vi.mock('@/components/common/ZhangbanshanAvatar', () => ({
  ZhangbanshanAvatar: () => null,
}));

vi.mock('@/components/naming/NamingPDFExport', () => ({
  NamingPDFExport: () => null,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => null,
}));

vi.mock('@/components/form/CityQuickInput', () => ({
  CityQuickInput: () => null,
}));

vi.mock('../FrontdeskShell', () => ({
  FrontdeskShell: ({ children }: any) => children ?? null,
}));

// --- import 组件（在所有 mock 之后） ---
import FrontdeskChat from '../FrontdeskChat';
import { routeIntentWithFallback } from '@/lib/intentRouter';

describe('FrontdeskChat 契约流程：liuren/ziping 入口', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('六壬路由：提交问题后进入 liuren_ask_time 阶段', async () => {
    // Mock routeIntentWithFallback 返回 liuren 路由
    vi.mocked(routeIntentWithFallback).mockResolvedValue({
      route_type: 'liuren',
      confidence: 'high',
      next_step: 'liuren',
      need_clarify: false,
      clarify_question: '',
      required_fields: ['ask_time'],
    } as any);

    render(<FrontdeskChat mode="question" />);

    // 1. 输入问题
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '这个合作能不能继续？' } });

    // 2. 点击提交按钮
    const submitButton = screen.getByRole('button', { name: /question.frontdesk.submit/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 3. 验证进入 liuren_ask_time 阶段
    await waitFor(() => {
      // 系统消息：六壬起卦需要采集起卦时间（唯一匹配）
      expect(screen.getByText(/六壬起卦需要采集起卦时间/)).toBeInTheDocument();
      // UI 元素：起卦时间输入区域（"默认当前时间"只在 UI 出现，不在系统消息中）
      expect(screen.getByText(/默认当前时间/)).toBeInTheDocument();
      // datetime-local input 存在
      expect(screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)).toBeInTheDocument();
    });

    // 4. 验证 routeIntentWithFallback 被调用
    expect(routeIntentWithFallback).toHaveBeenCalledWith(
      '这个合作能不能继续？',
      expect.objectContaining({ hasAskTime: true }),
    );
  });

  it('八字路由：无档案用户进入 ziping_profile_check 阶段', async () => {
    // Mock routeIntentWithFallback 返回 ziping 路由
    vi.mocked(routeIntentWithFallback).mockResolvedValue({
      route_type: 'ziping',
      confidence: 'high',
      next_step: 'ziping',
      need_clarify: false,
      clarify_question: '',
      required_fields: ['birth_date', 'birth_time'],
    } as any);

    render(<FrontdeskChat mode="question" />);

    // 1. 输入问题
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '我今年整体运势怎么样？' } });

    // 2. 点击提交按钮
    const submitButton = screen.getByRole('button', { name: /question.frontdesk.submit/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 3. 验证进入 ziping_profile_check 阶段
    await waitFor(() => {
      // 系统消息：子平八字需要出生信息（系统消息含"是否现在填写"，UI 不含）
      expect(screen.getByText(/子平八字需要出生信息，检测到您尚未填写档案/)).toBeInTheDocument();
      // UI 元素：检测到尚未填写八字档案（"八字档案"只在 UI 出现）
      expect(screen.getByText(/尚未填写八字档案/)).toBeInTheDocument();
      // 按钮：填写档案
      expect(screen.getByRole('button', { name: /填写档案/ })).toBeInTheDocument();
    });

    // 4. 验证 routeIntentWithFallback 被调用
    expect(routeIntentWithFallback).toHaveBeenCalledWith(
      '我今年整体运势怎么样？',
      expect.objectContaining({ hasAskTime: true }),
    );
  });
});
