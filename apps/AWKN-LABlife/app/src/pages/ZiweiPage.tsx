import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { consultApi } from '@/api/consult';
import type { ResultResponse } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { SHICHEN_OPTIONS } from '@/constants/shichen';
import { GenderSelector } from '@/components/form/GenderSelector';

type Step = 'intro' | 'input' | 'loading' | 'result';
type LiupanTab = 'benshen' | 'daxian' | 'liunian' | 'feixing';

/** 十二宫位名称与对应主题 */
const PALACES = [
  { name: '命宫', aspect: 'overall' },
  { name: '兄弟', aspect: 'relationship' },
  { name: '夫妻', aspect: 'relationship' },
  { name: '子女', aspect: 'relationship' },
  { name: '财帛', aspect: 'wealth' },
  { name: '疾厄', aspect: 'overall' },
  { name: '迁移', aspect: 'career' },
  { name: '交友', aspect: 'relationship' },
  { name: '官禄', aspect: 'career' },
  { name: '田宅', aspect: 'wealth' },
  { name: '福德', aspect: 'overall' },
  { name: '父母', aspect: 'overall' },
];

const ASPECT_COLORS: Record<string, string> = {
  overall: 'border-purple-400/40 bg-purple-500/10',
  career: 'border-blue-400/40 bg-blue-500/10',
  wealth: 'border-amber-400/40 bg-amber-500/10',
  relationship: 'border-rose-400/40 bg-rose-500/10',
};

const ASPECT_LABELS: Record<string, string> = {
  overall: '综合',
  career: '事业',
  wealth: '财富',
  relationship: '人际',
};

export function ZiweiPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [question, setQuestion] = useState('请看整体紫微命盘格局');
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [error, setError] = useState('');
  const [liupanTab, setLiupanTab] = useState<LiupanTab>('benshen');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());

  const handleSubmit = async () => {
    if (!birthDate || !birthTime) {
      setError('请填写出生日期和出生时辰');
      return;
    }
    setError('');
    setStep('loading');

    try {
      const res = await consultApi.analyze({
        routeType: 'ziwei',
        question,
        birthDate,
        birthTime,
        gender,
      } as any);
      setResult(res);
      setStep('result');
    } catch (e: any) {
      setError(e?.message || '排盘失败，请重试');
      setStep('input');
    }
  };

  // ==================== Intro ====================
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col">
        <header className="px-6 pt-12 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 border border-purple-400/30 mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-wide">紫微斗数</h1>
          <p className="text-sm text-purple-200/70 mt-2 max-w-xs mx-auto leading-relaxed">
            以出生时辰定命宫，十四主星布十二宫位，四化飞星揭示人生格局与运势走向
          </p>
        </header>

        <main className="flex-1 px-6 py-4">
          <div className="grid grid-cols-3 gap-3 mb-8">
            {['命盘格局', '四化飞星', '大限流年'].map((item, i) => (
              <div key={item} className="rounded-xl border border-purple-400/20 bg-purple-500/5 p-3 text-center">
                <p className="text-xs text-purple-200/80">{item}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('input')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-on-surface font-medium text-base shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform"
          >
            开始排盘
          </button>

          <p className="text-center text-xs text-purple-300/40 mt-4">
            需要准确的出生日期和时辰
          </p>
        </main>

        <BottomNav />
      </div>
    );
  }

  // ==================== Input ====================
  if (step === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col">
        <PageHeader title="填写出生信息" onBack={() => setStep('intro')} className="px-6 pt-8 pb-4" />

        <main className="flex-1 px-6 py-4 space-y-5">
          {/* 出生日期 */}
          <div>
            <label className="block text-sm text-purple-200/70 mb-1.5">出生日期</label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full rounded-lg bg-on-surface/5 border border-purple-400/20 px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {/* 出生时辰 */}
          <div>
            <label className="block text-sm text-purple-200/70 mb-1.5">出生时辰</label>
            <select
              value={birthTime}
              onChange={e => setBirthTime(e.target.value)}
              className="w-full rounded-lg bg-on-surface/5 border border-purple-400/20 px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-purple-400/50 appearance-none"
            >
              <option value="" className="bg-slate-800">请选择时辰</option>
              {SHICHEN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm text-purple-200/70 mb-1.5">性别</label>
            <GenderSelector value={gender} onChange={setGender} variant="purple" />
          </div>

          {/* 问题（可选） */}
          <div>
            <label className="block text-sm text-purple-200/70 mb-1.5">想了解的方面（可选）</label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="如：整体格局、事业、财运、感情…"
              className="w-full rounded-lg bg-on-surface/5 border border-purple-400/20 px-4 py-3 text-on-surface text-sm placeholder:text-purple-300/30 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!birthDate || !birthTime}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-on-surface font-medium text-base shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          >
            排盘解析
          </button>
        </main>

        <BottomNav />
      </div>
    );
  }

  // ==================== Loading ====================
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-purple-400/40 border-t-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-200/70 text-sm">正在排列紫微命盘…</p>
          <p className="text-purple-300/40 text-xs mt-1">通常需要 10-20 秒</p>
        </div>
      </div>
    );
  }

  // ==================== Result ====================
  if (step === 'result' && result) {
    const astrolabeData = result.astrolabeData as any;
    const liupan = astrolabeData?.liupan;
    const palaces = astrolabeData?.palaces || [];

    const LIUPAN_TABS: { key: LiupanTab; label: string; hasData: boolean }[] = [
      { key: 'benshen', label: '本命盘', hasData: true },
      { key: 'daxian', label: '大限', hasData: !!liupan?.daxian?.length },
      { key: 'liunian', label: '流年', hasData: !!liupan?.liunian?.length },
      { key: 'feixing', label: '飞星', hasData: palaces.some((p: any) => p.majorStars?.some((s: any) => s.mutagen)) },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col pb-20">
        <PageHeader title="紫微命盘" onBack={() => { setResult(null); setStep('input'); }} className="px-6 pt-8 pb-4" />

        <main className="flex-1 px-4 py-2 space-y-5">
          {/* 一句话总断 */}
          {result.summary_line && (
            <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 p-4">
              <p className="text-base font-medium text-on-surface leading-relaxed">{result.summary_line}</p>
            </div>
          )}

          {/* Tab 导航：本命盘 / 大限 / 流年 / 飞星 */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-purple-400/15 bg-on-surface/3 p-1">
            {LIUPAN_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => tab.hasData && setLiupanTab(tab.key)}
                disabled={!tab.hasData}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  liupanTab === tab.key
                    ? 'bg-purple-600 text-on-surface'
                    : tab.hasData
                      ? 'text-purple-200/60 hover:text-purple-200/90'
                      : 'text-purple-300/20 cursor-not-allowed'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 流年选择器 */}
          {liupanTab === 'liunian' && (
            <div className="flex items-center gap-2 px-2">
              <label className="text-xs text-purple-200/60">流年：</label>
              <input
                type="number"
                value={targetYear}
                onChange={e => setTargetYear(Number(e.target.value))}
                className="w-20 rounded bg-on-surface/5 border border-purple-400/20 px-2 py-1 text-on-surface text-xs text-center"
                min={1900}
                max={2100}
              />
              <button
                onClick={handleSubmit}
                className="text-xs bg-purple-600 text-on-surface px-3 py-1 rounded"
              >
                刷新
              </button>
            </div>
          )}

          {/* 本命盘：十二宫位网格 */}
          {liupanTab === 'benshen' && (
            <div className="grid grid-cols-3 gap-2">
              {PALACES.map((palace) => {
                const colorClass = ASPECT_COLORS[palace.aspect] || ASPECT_COLORS.overall;
                return (
                  <div
                    key={palace.name}
                    className={`rounded-lg border ${colorClass} p-2.5 text-center`}
                  >
                    <p className="text-xs text-purple-200/50 mb-0.5">{ASPECT_LABELS[palace.aspect]}</p>
                    <p className="text-sm font-medium text-on-surface">{palace.name}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* 大限 */}
          {liupanTab === 'daxian' && liupan?.daxian && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-purple-200/80">大限（十年一运）</h3>
              {liupan.daxian.map((dx: any, i: number) => (
                <div key={i} className="rounded-lg border border-purple-400/15 bg-on-surface/3 p-3 flex items-center justify-between">
                  <span className="text-sm text-on-surface">
                    {dx.tiangan_name || dx.tiangan}{dx.dizhi_name || dx.dizhi}
                  </span>
                  <span className="text-xs text-purple-200/50">
                    {dx.age_start}–{dx.age_end}岁
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 流年 */}
          {liupanTab === 'liunian' && liupan?.liunian && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-purple-200/80">{targetYear}年流年</h3>
              {liupan.liunian.map((ln: any, i: number) => (
                <div key={i} className="rounded-lg border border-blue-400/15 bg-blue-500/5 p-3 flex items-center justify-between">
                  <span className="text-sm text-on-surface">
                    {ln.tiangan_name || ln.tiangan}{ln.dizhi_name || ln.dizhi}
                  </span>
                  <span className="text-xs text-blue-200/50">
                    {ln.year || ln.age}年
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 飞星：四化飞星图 */}
          {liupanTab === 'feixing' && palaces.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-purple-200/80">四化飞星</h3>
              <div className="grid grid-cols-2 gap-2">
                {palaces.map((p: any) => {
                  const mutagenStars = p.majorStars?.filter((s: any) => s.mutagen) || [];
                  if (mutagenStars.length === 0) return null;
                  return (
                    <div key={p.name} className="rounded-lg border border-purple-400/15 bg-on-surface/3 p-3">
                      <p className="text-xs text-purple-200/50 mb-1">{p.name}</p>
                      {mutagenStars.map((s: any, j: number) => {
                        const mutagenColor = s.mutagen === '禄' ? 'text-emerald-300' :
                          s.mutagen === '权' ? 'text-amber-300' :
                          s.mutagen === '科' ? 'text-blue-300' :
                          s.mutagen === '忌' ? 'text-rose-300' : 'text-purple-200';
                        return (
                          <p key={j} className={`text-sm ${mutagenColor}`}>
                            {s.name}（化{s.mutagen}）
                          </p>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 详细分析 */}
          {result.summary_body && (
            <div className="rounded-xl border border-purple-400/20 bg-on-surface/3 p-4">
              <h3 className="text-sm font-medium text-purple-200/80 mb-2">格局解析</h3>
              <div className="text-sm text-purple-100/70 leading-relaxed whitespace-pre-line">
                {result.summary_body}
              </div>
            </div>
          )}

          {/* 风险提示 */}
          {result.risk_block && result.risk_block.length > 0 && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
              <h3 className="text-sm font-medium text-amber-200/80 mb-2">当前风险</h3>
              <div className="space-y-1.5">
                {(Array.isArray(result.risk_block) ? result.risk_block : [result.risk_block]).map((risk, i) => (
                  <p key={i} className="text-sm text-amber-100/70">{typeof risk === 'string' ? risk : JSON.stringify(risk)}</p>
                ))}
              </div>
            </div>
          )}

          {/* 行动建议 */}
          {result.action_block && result.action_block.length > 0 && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
              <h3 className="text-sm font-medium text-emerald-200/80 mb-2">建议动作</h3>
              <div className="space-y-1.5">
                {(Array.isArray(result.action_block) ? result.action_block : [result.action_block]).map((action, i) => (
                  <p key={i} className="text-sm text-emerald-100/70">{typeof action === 'string' ? action : JSON.stringify(action)}</p>
                ))}
              </div>
            </div>
          )}

          {/* 时间窗口 */}
          {result.window_block && (
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
              <h3 className="text-sm font-medium text-blue-200/80 mb-2">时间窗口</h3>
              <p className="text-sm text-blue-100/70">{result.window_block}</p>
            </div>
          )}

          {/* 推演依据 */}
          {result.evidence_fold && (
            <details className="rounded-xl border border-purple-400/10 bg-on-surface/2 p-4">
              <summary className="text-sm text-purple-200/50 cursor-pointer">推演依据</summary>
              <div className="mt-2 text-xs text-purple-200/40 leading-relaxed whitespace-pre-line">
                {result.evidence_fold}
              </div>
            </details>
          )}
        </main>

        <BottomNav />
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <button onClick={() => setStep('intro')} className="text-purple-300 text-sm">返回首页</button>
    </div>
  );
}