import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { ZhangbanshanAvatar } from '../icons/ZhangbanshanAvatar';
import type { UnifiedResult } from './resultTypes';
import { AnchorNav } from './AnchorNav';
import { BaziOverviewCard } from './BaziOverviewCard';
import { CharacterCard } from './CharacterCard';
import { CareerWealthCard } from './CareerWealthCard';
import { DaYunLiuNianTable } from './DaYunLiuNianTable';
import { ShenShaCard } from './ShenShaCard';
import { SuggestionsCard } from './SuggestionsCard';
import { MajorDecisionAnalysis } from '../question/MajorDecisionAnalysis';
import { HistoryReview } from '../question/HistoryReview';
// P0-7 修复: 渲染张半山三段式（原 import 仅在 ResultPage 声明但从未使用）
import { ZhangbanshanOutput } from './ZhangbanshanOutput';

interface ReportDashboardProps {
  result: UnifiedResult;
  consultData: {
    question?: string;
    birthDate?: string;
    birthHour?: number;
    city?: string;
    gender?: string;
    askTime?: string;
    namingType?: string;
    originalName?: string;
    sourceEntry?: string;
  };
  onVipClick?: (moduleId: string) => void;
  onFollowUpClick?: (question: string) => void;
}

const SECTION_IDS = {
  OVERVIEW: 'overview',
  CHARACTER: 'character',
  CAREER: 'career',
  DAYUN: 'dayun',
  SHENSHA: 'shensha',
  SUGGESTIONS: 'suggestions',
} as const;

const NAV_ITEMS = [
  { id: SECTION_IDS.OVERVIEW, label: '命盘总览', icon: 'visibility' },
  { id: SECTION_IDS.CHARACTER, label: '性格画像', icon: 'psychology' /* 概念图标（非张半山），与同组其他 nav 风格统一（visibility/trending_up/schedule/auto_awesome/lightbulb）。P1-1 cleanup intentionally retained. */ },
  { id: SECTION_IDS.CAREER, label: '事业财运', icon: 'trending_up' },
  { id: SECTION_IDS.DAYUN, label: '大运流年', icon: 'schedule' },
  { id: SECTION_IDS.SHENSHA, label: '神煞解析', icon: 'auto_awesome' },
  { id: SECTION_IDS.SUGGESTIONS, label: '综合建议', icon: 'lightbulb' },
];

const QUICK_ACTIONS = [
  { label: '事业方向', icon: 'work', query: '事业方向' },
  { label: '财运分析', icon: 'payments', query: '财运分析' },
  { label: '感情婚姻', icon: 'favorite', query: '感情婚姻' },
  { label: '健康提醒', icon: 'healing', query: '健康提醒' },
];

export function ReportDashboard({ result, consultData, onVipClick, onFollowUpClick }: ReportDashboardProps) {
  const [activeSection, setActiveSection] = useState<string>(SECTION_IDS.OVERVIEW);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element && containerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

      for (const sectionId of Object.values(SECTION_IDS).reverse()) {
        const element = sectionRefs.current[sectionId];
        if (element) {
          const offsetTop = element.offsetTop;
          if (scrollTop >= offsetTop - viewportHeight / 2) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = useCallback((sectionId: string) => {
    scrollToSection(sectionId);
  }, [scrollToSection]);

  const calcResult = result.calc_result;
  const normalizedCalc = calcResult;

  const renderSection = (id: string, component: React.ReactNode, showCondition: boolean = true) => {
    if (!showCondition) return null;
    return (
      <section
        id={id}
        ref={(el) => { sectionRefs.current[id] = el; }}
        className="mb-6 scroll-mt-4"
      >
        {component}
      </section>
    );
  };

  const isZiping = result.route_type === 'ziping';
  const isLiuren = result.route_type === 'liuren';
  const isQuming = result.route_type === 'quming';

  return (
    <>
      <div className="flex h-full">
        {/* 左侧导航 - 桌面端 */}
        <div className="hidden md:block w-48 flex-shrink-0 p-4 border-r border-outline/5">
          <AnchorNav
            items={NAV_ITEMS}
            activeId={activeSection}
            onSelect={handleNavClick}
          />
        </div>

        {/* 右侧内容区 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin"
        >
          {/* 顶部横向导航 - 移动端 */}
          <div className="md:hidden mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all ${
                    activeSection === item.id
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-on-surface/5 text-on-surface/60 border border-transparent'
                  }`}
                >
                  <Icon name={item.icon} size={14} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 信息栏 */}
          <div className="mb-4 p-3 rounded-xl bg-on-surface/[0.02] border border-outline/5">
            <div className="flex items-center gap-2 text-xs text-on-surface/50">
              <Icon name={isZiping ? 'visibility' : isLiuren ? 'explore' : 'group'} size={14} className="text-primary" />
              {isZiping && consultData.birthDate && (
                <span>{consultData.birthDate} {String(consultData.birthHour ?? 12).padStart(2, '0')}:00{consultData.city ? ` · ${consultData.city}` : ''}</span>
              )}
              {isLiuren && consultData.askTime && (
                <span>{consultData.askTime.replace('T', ' ').slice(0, 19)}{consultData.city ? ` · ${consultData.city}` : ''}</span>
              )}
              {isQuming && consultData.originalName && (
                <span>姓名：{consultData.originalName}{consultData.birthDate ? ` · ${consultData.birthDate}` : ''}</span>
              )}
            </div>
          </div>

          {/* P0-7 修复: 张半山三段式输出 — 核心卖点，置于报告顶部 */}
          {result.zhangbanshan_output && (
            <ZhangbanshanOutput result={result} />
          )}

          {/* 八字命盘模块 */}
          {isZiping && normalizedCalc && (
            <>
              {renderSection(
                SECTION_IDS.OVERVIEW,
                <BaziOverviewCard
                  calcResult={normalizedCalc}
                  birthDate={consultData.birthDate}
                />
              )}

              {renderSection(
                SECTION_IDS.CHARACTER,
                <CharacterCard
                  portrait={result.character_portrait || ''}
                  classicAnalysis={result.classicAnalysis}
                />,
                !!result.character_portrait || !!result.classicAnalysis
              )}

              {renderSection(
                SECTION_IDS.CAREER,
                <CareerWealthCard
                  career={result.modules?.career}
                  wealth={result.modules?.wealth}
                  careerScore={result.modulesRating?.career}
                  wealthScore={result.modulesRating?.wealth}
                />,
                !!result.modules?.career || !!result.modules?.wealth
              )}

              {renderSection(
                SECTION_IDS.DAYUN,
                <DaYunLiuNianTable
                  calcResult={normalizedCalc}
                  birthDate={consultData.birthDate}
                />
              )}

              {renderSection(
                SECTION_IDS.SHENSHA,
                <ShenShaCard shenSha={normalizedCalc.shenSha} />,
                !!normalizedCalc.shenSha && Object.keys(normalizedCalc.shenSha).length > 0
              )}
            </>
          )}

          {/* 六壬问事模块 */}
          {isLiuren && result.engine_data && (
            <>
              {renderSection(
                SECTION_IDS.OVERVIEW,
                <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
                  <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
                    <Icon name="explore" size={18} />
                    六壬课盘
                  </h3>
                  <p className="text-on-surface/70 text-sm leading-relaxed">
                    {result.summary_line}
                  </p>
                </div>
              )}

              {renderSection(
                SECTION_IDS.CHARACTER,
                <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
                  <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
                    <ZhangbanshanAvatar size={18} userId="anonymous" />
                    核心推理
                  </h3>
                  <p className="text-on-surface/60 text-sm leading-relaxed">
                    {result.coreReasoning || result.summary_body}
                  </p>
                </div>,
                !!result.coreReasoning || !!result.summary_body
              )}
            </>
          )}

          {/* 取名模块 */}
          {isQuming && (
            <>
              {renderSection(
                SECTION_IDS.OVERVIEW,
                <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
                  <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
                    <Icon name="group" size={18} />
                    取名分析
                  </h3>
                  <p className="text-on-surface/70 text-sm leading-relaxed">
                    {result.summary_line}
                  </p>
                </div>
              )}

              {renderSection(
                SECTION_IDS.CHARACTER,
                <CharacterCard
                  portrait={result.character_portrait || result.summary_body}
                  classicAnalysis={result.classicAnalysis}
                />
              )}
            </>
          )}

          {/* 综合建议 - 所有类型都有 */}
          {renderSection(
            SECTION_IDS.SUGGESTIONS,
            <SuggestionsCard
              actions={result.actions || []}
              risks={result.risks || []}
              timeWindow={result.time_window}
              isGated={result.route_type === 'liuren' && !result.paywall_modules?.length}
              totalRisks={result.risks?.length}
            />,
            (result.actions?.length ?? 0) > 0 || (result.risks?.length ?? 0) > 0
          )}

          {/* 重大决策分析 - 八字路由时显示 */}
          {isZiping && (
            <section className="mb-6">
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
                <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
                  <ZhangbanshanAvatar size={18} userId="anonymous" />
                  重大决策分析
                </h3>
                <MajorDecisionAnalysis result={result} />
              </div>
            </section>
          )}

          {(isZiping || isLiuren) && (
            <section className="mb-6">
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
                <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
                  <Icon name="history" size={18} />
                  历史事项复盘
                </h3>
                <HistoryReview currentRecordId={result.record_id} />
              </div>
            </section>
          )}

          {/* VIP引导 */}
          {result.paywall_modules && result.paywall_modules.length > 0 && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-primary font-semibold flex items-center gap-2">
                  <Icon name="workspace_premium" size={18} />
                  VIP深度服务
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {result.paywall_modules.map((moduleId) => (
                  <button
                    key={moduleId}
                    onClick={() => onVipClick?.(moduleId)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-on-surface/5 hover:bg-on-surface/10 text-sm text-on-surface/80 transition-colors"
                  >
                    <Icon name={
                      moduleId === 'kline' ? 'show_chart' :
                      moduleId === 'breakthrough' ? 'cruelty_free' :
                      moduleId === 'morning' ? 'calendar_month' : 'star'
                    } size={16} className="text-amber-400" />
                    {moduleId === 'kline' ? '命运K线图' :
                     moduleId === 'breakthrough' ? '突破分析' :
                     moduleId === 'morning' ? '晨间提示' : moduleId}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 底部留空 - 适配 BottomNav */}
          <div className="h-32" />
        </div>
      </div>

      {/* 悬浮快捷操作 - 移动端 */}
      <div className="md:hidden fixed bottom-20 left-0 right-0 px-4 z-10 pointer-events-none">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pointer-events-auto"
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.query}
              onClick={() => onFollowUpClick?.(action.query)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/20 text-primary text-xs whitespace-nowrap border border-primary/30 flex-shrink-0"
            >
              <Icon name={action.icon} size={14} />
              {action.label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* 底部固定VIP引导 - 移动端 */}
      <AnimatePresence>
        {result.paywall_modules && result.paywall_modules.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="md:hidden fixed bottom-16 left-0 right-0 z-10 pointer-events-none"
          >
            <div className="mx-4 rounded-t-xl bg-gradient-to-t from-black/90 to-black/60 backdrop-blur-sm border-t border-primary/20 p-3 pointer-events-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="workspace_premium" size={16} className="text-amber-400" />
                  <span className="text-xs text-on-surface/80">解锁VIP深度服务</span>
                </div>
                <button
                  onClick={() => onVipClick?.(result.paywall_modules[0])}
                  className="px-3 py-1.5 rounded-full bg-primary text-xs text-on-surface font-medium"
                >
                  立即解锁
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
