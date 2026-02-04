import { useState, useEffect } from 'react';
import { X, Calendar, Star, Sparkles, TrendingUp, Users, Briefcase, Heart } from 'lucide-react';
import { getNextHighlightDay, calculateCountdown, getAnnualKeyword, getPatternDescription } from '../lib/bazi-engine';
import type { UserBazi, HighlightDay } from '../lib/bazi-engine';
import PosterGenerator from './PosterGenerator';

interface ResultDashboardProps {
  bazi: UserBazi;
  highlightDays: HighlightDay[];
  fourAspects?: {
    career: number;
    wealth: number;
    noble: number;
    romance: number;
  } | null;
  aiAnswer?: string;
  onClose: () => void;
}

export default function ResultDashboard({ bazi, highlightDays, fourAspects, aiAnswer, onClose }: ResultDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'poster'>('overview');
  const [nextHighlight, setNextHighlight] = useState<HighlightDay | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showPoster, setShowPoster] = useState(false);

  useEffect(() => {
    const next = getNextHighlightDay(highlightDays);
    setNextHighlight(next);
  }, [highlightDays]);

  useEffect(() => {
    if (!nextHighlight) return;

    const updateCountdown = () => {
      const cd = calculateCountdown(nextHighlight.date);
      setCountdown(cd);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextHighlight]);

  const annualKeyword = getAnnualKeyword(bazi);
  const patternDescription = getPatternDescription(bazi.pattern);

  const typeIcons: Record<string, React.ReactNode> = {
    '财官双美': <TrendingUp className="w-5 h-5" />,
    '贵人相助': <Users className="w-5 h-5" />,
    '桃花盛开': <Heart className="w-5 h-5" />,
    '事业高升': <Briefcase className="w-5 h-5" />,
    '财运亨通': <Star className="w-5 h-5" />,
    '智慧开启': <Sparkles className="w-5 h-5" />,
    '平安顺遂': <Calendar className="w-5 h-5" />
  };

  if (showPoster) {
    return (
      <PosterGenerator
        bazi={bazi}
        highlightDays={highlightDays}
        annualKeyword={annualKeyword}
        onClose={() => setShowPoster(false)}
      />
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl md:text-5xl text-white mb-2">
              <span className="text-gradient-gold">人生决策仪表盘</span>
            </h2>
            <p className="text-white/50">基于传统命理算法，为你量身定制</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-display text-sm tracking-wider transition-all ${
              activeTab === 'overview'
                ? 'bg-[#efaf5a] text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            总览
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 rounded-xl font-display text-sm tracking-wider transition-all ${
              activeTab === 'calendar'
                ? 'bg-[#efaf5a] text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            高光日历
          </button>
          <button
            onClick={() => setShowPoster(true)}
            className={`px-6 py-3 rounded-xl font-display text-sm tracking-wider transition-all ${
              activeTab === 'poster'
                ? 'bg-[#efaf5a] text-black'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            生成海报
          </button>
        </div>

        {/* 总览内容 */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* 命盘信息卡片 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* 八字信息 */}
              <div className="card-mystic">
                <h3 className="font-display text-xl text-white mb-6">你的命盘</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-white/50 mb-2">年柱</div>
                    <div className="text-2xl font-display text-[#efaf5a]">{bazi.yearPillar}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/50 mb-2">月柱</div>
                    <div className="text-2xl font-display text-[#efaf5a]">{bazi.monthPillar}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/50 mb-2">日柱</div>
                    <div className="text-2xl font-display text-[#efaf5a]">{bazi.dayPillar}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/50 mb-2">时柱</div>
                    <div className="text-2xl font-display text-[#efaf5a]">{bazi.hourPillar}</div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/50">日主</div>
                      <div className="text-lg text-white">{bazi.dayMaster} ({bazi.dayMasterWuxing})</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/50">格局</div>
                      <div className="text-lg text-white">{bazi.pattern}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 年度关键词 */}
              <div className="card-mystic relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#efaf5a]/10 rounded-full blur-3xl" />
                <h3 className="font-display text-xl text-white mb-4">2026年度关键词</h3>
                <div className="text-6xl font-display text-gradient-gold mb-4">{annualKeyword}</div>
                <p className="text-white/70 leading-relaxed">{patternDescription}</p>
              </div>
            </div>

            {/* 四个内容统计 */}
            {fourAspects && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card-mystic text-center">
                  <div className="flex items-center justify-center gap-2 text-[#efaf5a] mb-2">
                    <Briefcase className="w-5 h-5" />
                    <span className="text-sm">事业高升</span>
                  </div>
                  <div className="text-3xl font-display text-white">{fourAspects.career}天</div>
                </div>
                <div className="card-mystic text-center">
                  <div className="flex items-center justify-center gap-2 text-[#efaf5a] mb-2">
                    <Star className="w-5 h-5" />
                    <span className="text-sm">财运亨通</span>
                  </div>
                  <div className="text-3xl font-display text-white">{fourAspects.wealth}天</div>
                </div>
                <div className="card-mystic text-center">
                  <div className="flex items-center justify-center gap-2 text-[#efaf5a] mb-2">
                    <Users className="w-5 h-5" />
                    <span className="text-sm">贵人相助</span>
                  </div>
                  <div className="text-3xl font-display text-white">{fourAspects.noble}天</div>
                </div>
                <div className="card-mystic text-center">
                  <div className="flex items-center justify-center gap-2 text-[#efaf5a] mb-2">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">桃花盛开</span>
                  </div>
                  <div className="text-3xl font-display text-white">{fourAspects.romance}天</div>
                </div>
              </div>
            )}

            {/* AI回答 */}
            {aiAnswer && (
              <div className="card-mystic relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#efaf5a]/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#efaf5a] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-display text-lg text-white mb-2">AI回答</h5>
                      <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 倒计时 */}
            {nextHighlight && (
              <div className="card-mystic text-center py-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#efaf5a]/5 via-transparent to-[#efaf5a]/5" />
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-[#efaf5a]" />
                    <span className="text-[#efaf5a] tracking-wider">距离下一个高光日</span>
                  </div>
                  <div className="font-display text-2xl text-white mb-8">
                    {nextHighlight.dateStr} · {nextHighlight.type}
                  </div>
                  <div className="flex justify-center gap-6 md:gap-12">
                    <div className="text-center">
                      <div className="countdown-number">{String(countdown.days).padStart(2, '0')}</div>
                      <div className="countdown-label mt-2">天</div>
                    </div>
                    <div className="text-center">
                      <div className="countdown-number">{String(countdown.hours).padStart(2, '0')}</div>
                      <div className="countdown-label mt-2">时</div>
                    </div>
                    <div className="text-center">
                      <div className="countdown-number">{String(countdown.minutes).padStart(2, '0')}</div>
                      <div className="countdown-label mt-2">分</div>
                    </div>
                    <div className="text-center">
                      <div className="countdown-number">{String(countdown.seconds).padStart(2, '0')}</div>
                      <div className="countdown-label mt-2">秒</div>
                    </div>
                  </div>
                  <div className="mt-8 max-w-lg mx-auto">
                    <div className="bg-[#efaf5a]/10 rounded-lg p-4 border border-[#efaf5a]/30">
                      <p className="text-white/80">{nextHighlight.actionGuide}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 每月红绿灯 */}
            <div className="card-mystic">
              <h3 className="font-display text-xl text-white mb-6">每月红绿灯</h3>
              <div className="space-y-6">
                {(() => {
                  // 按月分组高光日
                  const months = Array.from({ length: 12 }, (_, i) => i + 1);
                  return months.map(month => {
                    const monthDays = highlightDays.filter(day => {
                      const date = new Date(day.date);
                      return date.getMonth() + 1 === month;
                    });
                    if (monthDays.length === 0) return null;
                    
                    return (
                      <div key={month} className="space-y-3">
                        <h4 className="font-display text-lg text-[#efaf5a]">{month}月</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {monthDays.map((day, index) => (
                            <div
                              key={index}
                              className="highlight-card group"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className={`flex items-center gap-2 ${day.score >= 80 ? 'text-green-500' : day.score >= 60 ? 'text-[#efaf5a]' : 'text-red-500'}`}>
                                  {typeIcons[day.type]}
                                  <span className="text-sm font-medium">{day.type}</span>
                                </div>
                                <div className="score-stars">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3 h-3 ${
                                        day.score >= 80 ? 'text-green-500' : 
                                          day.score >= 60 ? 'text-[#efaf5a]' : 
                                          'text-red-500'
                                      }`}
                                      fill={
                                        day.score >= 80 ? '#22c55e' : 
                                          day.score >= 60 ? '#efaf5a' : 
                                          '#ef4444'
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="font-display text-lg text-white mb-1">{day.dateStr}</div>
                              <div className="text-sm text-white/60">{day.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }).filter(Boolean);
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 日历内容 */}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {highlightDays.map((day, index) => (
                <div
                  key={index}
                  className="highlight-card group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-[#efaf5a]">
                      {typeIcons[day.type]}
                      <span className="text-sm font-medium">{day.type}</span>
                    </div>
                    <div className="score-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(day.score / 20) ? 'text-[#efaf5a]' : 'text-[#efaf5a]/20'}`}
                          fill={i < Math.floor(day.score / 20) ? '#efaf5a' : 'none'}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="font-display text-2xl text-white mb-2">{day.dateStr}</div>
                  <div className="text-sm text-[#efaf5a]/70 mb-2">{day.ganZhi}日</div>
                  <p className="text-sm text-white/60 mb-3">{day.description}</p>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-white/80">{day.actionGuide}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}