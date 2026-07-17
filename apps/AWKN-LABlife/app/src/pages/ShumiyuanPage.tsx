import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { shumiyuanApi, SpeakResponse, SpreadResponse, BottomResponse } from '@/services/shumiyuanApi';
import { ErrorBanner } from '@/components/feedback/ErrorState';

type Step = 'input' | 'speak' | 'spread' | 'bottom' | 'dispatch';

const STEP_LABELS: Record<Step, string> = {
  input: '说出来',
  speak: '说出来',
  spread: '摆开',
  bottom: '这事底',
  dispatch: '分流',
};

export function ShumiyuanPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('input');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakResult, setSpeakResult] = useState<SpeakResponse | null>(null);
  const [spreadResult, setSpreadResult] = useState<SpreadResponse | null>(null);
  const [bottomResult, setBottomResult] = useState<BottomResponse | null>(null);
  const [spreadData, setSpreadData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const quickStarters = [
    '我最怕的是…',
    '我真正卡住的是…',
    '我想要的结果是…',
    '这里面最关键的人是…',
  ];

  const handleStart = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await shumiyuanApi.speak({ question: input });
      setSpeakResult(result);
      setStep('speak');
    } catch (e) {
      setError('分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleToSpread = async () => {
    if (!speakResult) return;
    setLoading(true);
    try {
      const result = await shumiyuanApi.getSpread(speakResult.recordId);
      setSpreadResult(result);
      setStep('spread');
    } catch (e) {
      toast.error('获取摆开数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSpread = async () => {
    if (!speakResult) return;
    setLoading(true);
    try {
      const result = await shumiyuanApi.confirmSpread(speakResult.recordId, spreadData);
      setSpreadResult(result);
      const bottom = await shumiyuanApi.getBottom(speakResult.recordId);
      setBottomResult(bottom);
      setStep('bottom');
    } catch (e) {
      toast.error('确认失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (action: string) => {
    if (!speakResult) return;
    try {
      const result = await shumiyuanApi.dispatch(speakResult.recordId, action);
      navigate(result.redirectTo);
    } catch (e) {
      toast.error('分流失败');
    }
  };

  const updateSpreadField = (key: string, value: any) => {
    setSpreadData((prev) => ({ ...prev, [key]: value }));
  };

  const getStepStatus = (s: Step): 'pending' | 'active' | 'completed' => {
    const steps: Step[] = ['input', 'speak', 'spread', 'bottom', 'dispatch'];
    const currentIdx = steps.indexOf(step);
    const targetIdx = steps.indexOf(s);
    if (targetIdx < currentIdx) return 'completed';
    if (targetIdx === currentIdx) return 'active';
    return 'pending';
  };

  // ========== 步骤指示器 ==========
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 px-4 py-3">
      {(['speak', 'spread', 'bottom'] as Step[]).map((s, i) => {
        const status = getStepStatus(s);
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`step-indicator ${status}`}>
              <div className="step-dot" />
              <span className="text-xs text-muted-foreground">{STEP_LABELS[s]}</span>
            </div>
            {i < 2 && (
              <div className={`w-6 h-px ${status === 'completed' ? 'bg-[hsl(var(--shumiyuan-safe))]' : 'bg-border/30'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ========== 输入阶段 ==========
  if (step === 'input') {
    return (
      <div className="min-h-screen bg-shumiyuan flex flex-col">
        <header className="px-4 pt-8 pb-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">人生枢密院</h1>
            <p className="text-sm text-muted-foreground mt-1">心里没底的事，先摆一遍</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6">
          <div className="text-center mb-8 animate-fade-in-up-stagger">
            <h2 className="text-xl font-semibold text-foreground">今天有哪件事心里没底？</h2>
          </div>
          <div className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="把这件事说出来，越具体越好…"
              className="input-shumiyuan h-32 animate-fade-in-up-stagger stagger-delay-1"
            />
            <div className="flex flex-wrap gap-2 animate-fade-in-up-stagger stagger-delay-2">
              {quickStarters.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput((prev) => prev + s)}
                  className="px-3 py-1.5 text-xs rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
            <button
              onClick={handleStart}
              disabled={!input.trim() || loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors animate-fade-in-up-stagger stagger-delay-3 animate-glow-pulse"
            >
              {loading ? '分析中…' : '开始摆一遍'}
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ========== 说出来阶段 ==========
  if (step === 'speak' && speakResult) {
    return (
      <div className="min-h-screen bg-shumiyuan flex flex-col">
        <StepIndicator />
        <main className="flex-1 px-4 py-6 space-y-4">
          <div className="glass-card p-4 animate-fade-in-up-stagger">
            <p className="text-xs text-muted-foreground">事项类型</p>
            <p className="text-lg font-medium text-foreground">{speakResult.identifiedType}</p>
          </div>
          {speakResult.coreStuckPoint && (
            <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-1">
              <p className="text-xs text-muted-foreground">核心卡点</p>
              <p className="text-base text-foreground">{speakResult.coreStuckPoint}</p>
            </div>
          )}
          {speakResult.relatedPeople.length > 0 && (
            <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-2">
              <p className="text-xs text-muted-foreground">涉及人物</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {speakResult.relatedPeople.map((p) => (
                  <span key={p} className="px-2 py-1 text-sm rounded-full bg-secondary/10 text-secondary">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {speakResult.riskWords.length > 0 && (
            <div className="glass-card-risk glass-card p-4 animate-fade-in-up-stagger stagger-delay-3">
              <p className="text-xs text-[hsl(var(--shumiyuan-risk))]">风险关键词</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {speakResult.riskWords.map((w) => (
                  <span key={w} className="risk-tag">{w}</span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleToSpread}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors animate-fade-in-up-stagger stagger-delay-4"
          >
            {loading ? '加载中…' : '下一步：摆开'}
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ========== 摆开阶段 ==========
  if (step === 'spread' && spreadResult) {
    return (
      <div className="min-h-screen bg-shumiyuan flex flex-col">
        <StepIndicator />
        <main className="flex-1 px-4 py-6 space-y-4">
          {spreadResult.cards.map((card, i) => (
            <div key={card.key} className={`glass-card p-4 animate-fade-in-up-stagger stagger-delay-${i + 1}`}>
              <p className="text-xs text-muted-foreground mb-2">{card.title}</p>
              {card.editable ? (
                <input
                  type="text"
                  defaultValue={card.content}
                  onChange={(e) => updateSpreadField(card.key, e.target.value)}
                  placeholder={`填写${card.title}…`}
                  className="input-shumiyuan py-3"
                />
              ) : (
                <p className="text-base text-foreground">{card.content}</p>
              )}
            </div>
          ))}
          <button
            onClick={handleConfirmSpread}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors animate-fade-in-up-stagger stagger-delay-5"
          >
            {loading ? '分析中…' : '确认，看这事底'}
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ========== 这事底阶段 ==========
  if (step === 'bottom' && bottomResult) {
    return (
      <div className="min-h-screen bg-shumiyuan flex flex-col">
        <StepIndicator />
        <main className="flex-1 px-4 py-6 space-y-4">
          <div className="glass-card p-4 animate-fade-in-up-stagger">
            <p className="text-xs text-muted-foreground">真正卡住</p>
            <p className="text-base font-medium text-foreground">{bottomResult.stuckPoint}</p>
          </div>
          {bottomResult.risks.length > 0 && (
            <div className="glass-card-risk glass-card p-4 animate-fade-in-up-stagger stagger-delay-1">
              <p className="text-xs text-[hsl(var(--shumiyuan-risk))] mb-2">风险点</p>
              <ul className="space-y-1">
                {bottomResult.risks.map((r, i) => (
                  <li key={i} className="text-sm text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--shumiyuan-risk))]" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bottomResult.threeWays.length > 0 && (
            <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-2">
              <p className="text-xs text-muted-foreground mb-2">三种走法</p>
              <div className="space-y-2">
                {bottomResult.threeWays.map((w, i) => (
                  <div key={i} className={`scenario-card ${i === 0 ? 'optimistic' : i === 1 ? 'neutral' : 'pessimistic'}`}>
                    <p className="text-sm text-foreground">{w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="glass-card-safe glass-card p-4 animate-fade-in-up-stagger stagger-delay-3">
            <p className="text-xs text-[hsl(var(--shumiyuan-safe))] mb-2">最小一步</p>
            <p className="text-base font-medium text-foreground">{bottomResult.minStep}</p>
          </div>
          <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-4">
            <p className="text-xs text-muted-foreground">回看点</p>
            <p className="text-sm text-foreground">{bottomResult.reviewPoint}</p>
          </div>

          {/* 分流选项 */}
          <div className="space-y-2 pt-4 animate-fade-in-up-stagger stagger-delay-5">
            <p className="text-sm font-medium text-foreground">下一步</p>
            {bottomResult.dispatchOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleDispatch(opt.key)}
                className="dispatch-btn w-full"
              >
                <span className="dispatch-btn-label">{opt.label}</span>
                <span className="dispatch-btn-desc">{opt.description}</span>
              </button>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return null;
}
