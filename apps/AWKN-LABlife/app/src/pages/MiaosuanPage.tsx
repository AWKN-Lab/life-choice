import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { miaosuanApi, MiaosuanRecord, Scenario } from '@/services/miaosuanApi';
import { ErrorBanner } from '@/components/feedback/ErrorState';

type MiaoSuanType = 'case' | 'person' | 'review';
type Step = 'select' | 'input' | 'result';

const TYPE_LABELS: Record<MiaoSuanType, { title: string; desc: string }> = {
  case: { title: '事项庙算', desc: '推演一件事的走向' },
  person: { title: '人物庙算', desc: '深度判断一个人' },
  review: { title: '复盘庙算', desc: '回看过去的决策' },
};

export function MiaosuanPage() {
  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<MiaoSuanType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MiaosuanRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!selectedType || !title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const record = await miaosuanApi.create({
        type: selectedType,
        title,
        content,
      });
      setResult(record);
      setStep('result');
    } catch (e) {
      setError('庙算失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSelectedType(null);
    setTitle('');
    setContent('');
    setResult(null);
  };

  // ========== 选择类型 ==========
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-shumiyuan flex flex-col">
        <header className="px-4 pt-8 pb-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">庙算</h1>
            <p className="text-sm text-muted-foreground mt-1">先胜而后求战</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6">
          <div className="space-y-3">
            {(Object.keys(TYPE_LABELS) as MiaoSuanType[]).map((type, i) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setStep('input');
                }}
                className={`glass-card w-full p-4 text-left animate-fade-in-up-stagger stagger-delay-${i + 1}`}
              >
                <p className="text-base font-medium text-foreground">{TYPE_LABELS[type].title}</p>
                <p className="text-sm text-muted-foreground mt-1">{TYPE_LABELS[type].desc}</p>
              </button>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ========== 输入内容 ==========
  if (step === 'input') {
    return (
      <div className="min-h-screen bg-shumiyuan flex flex-col">
        <header className="px-4 pt-8 pb-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">
              {selectedType && TYPE_LABELS[selectedType].title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">描述具体情况</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 space-y-4">
          <div className="animate-fade-in-up-stagger">
            <p className="text-sm text-muted-foreground mb-2">标题</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这次庙算起个标题…"
              className="input-shumiyuan"
            />
          </div>
          <div className="animate-fade-in-up-stagger stagger-delay-1">
            <p className="text-sm text-muted-foreground mb-2">详细描述</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="描述具体情况，越详细越好…"
              className="input-shumiyuan h-40"
            />
          </div>
          {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
          <div className="flex gap-3 animate-fade-in-up-stagger stagger-delay-2">
            <button
              onClick={() => setStep('select')}
              className="flex-1 py-3 rounded-xl glass-card text-foreground font-medium hover:bg-surface-elevated/80 transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleStart}
              disabled={!title.trim() || !content.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? '推演中…' : '开始庙算'}
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ========== 结果展示 ==========
  if (step === 'result' && result) {
    return (
      <div className="min-h-screen bg-shumiyuan flex flex-col">
        <header className="px-4 pt-8 pb-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">庙算结果</h1>
            <p className="text-sm text-muted-foreground mt-1">{result.title}</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 space-y-4">
          {/* 情景推演 */}
          {result.scenarios.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">情景推演</p>
              {result.scenarios.map((scenario: Scenario, i: number) => (
                <div
                  key={i}
                  className={`scenario-card ${i === 0 ? 'optimistic' : i === 1 ? 'neutral' : 'pessimistic'} animate-fade-in-up-stagger stagger-delay-${i + 1}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{scenario.name}</p>
                    <span className="text-xs text-muted-foreground">{scenario.probability}</span>
                  </div>
                  <p className="text-sm text-foreground">{scenario.outcome}</p>
                  {scenario.risks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {scenario.risks.map((r, j) => (
                        <span key={j} className="risk-tag">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 关键因素 */}
          {result.keyFactors.length > 0 && (
            <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-1">
              <p className="text-sm font-medium text-foreground mb-2">关键影响因素</p>
              <ul className="space-y-1">
                {result.keyFactors.map((f, i) => (
                  <li key={i} className="text-sm text-foreground">• {f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 盲点 */}
          {result.blindSpots.length > 0 && (
            <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-2" style={{ borderColor: 'hsl(var(--shumiyuan-warn) / 0.2)', background: 'linear-gradient(135deg, hsl(var(--shumiyuan-warn) / 0.05) 0%, transparent 100%)' }}>
              <p className="text-sm font-medium text-[hsl(var(--shumiyuan-warn))] mb-2">可能忽略的盲点</p>
              <ul className="space-y-1">
                {result.blindSpots.map((b, i) => (
                  <li key={i} className="text-sm text-foreground">• {b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 综合建议 */}
          {result.recommendation && (
            <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-3" style={{ borderColor: 'hsl(var(--secondary) / 0.2)', background: 'linear-gradient(135deg, hsl(var(--secondary) / 0.05) 0%, transparent 100%)' }}>
              <p className="text-sm font-medium text-secondary mb-2">综合建议</p>
              <p className="text-sm text-foreground">{result.recommendation}</p>
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors animate-fade-in-up-stagger stagger-delay-4"
          >
            再算一次
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return null;
}
