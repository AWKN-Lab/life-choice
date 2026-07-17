import { motion } from 'framer-motion';
import { Icon } from '../Icon';
import type { UnifiedResult } from '../resultTypes';

interface QumingCardMessageProps {
  result: UnifiedResult;
}

export function QumingCardMessage({ result }: QumingCardMessageProps) {
  const bazi = result.bazi || {};
  const wuxingAnalysis = result.wuxing_analysis || {};
  const xiYongShen = result.xi_yong_shen || {};
  const nameSuggestions = result.name_suggestions || [];

  const yearPillar = bazi.yearPillar || '';
  const monthPillar = bazi.monthPillar || '';
  const dayPillar = bazi.dayPillar || '';
  const hourPillar = bazi.hourPillar || '';
  const dayGan = bazi.dayGan || '';
  const naYin = bazi.naYin || '';

  const wuxing = wuxingAnalysis.current || {};
  const missing = wuxingAnalysis.missing || [];
  const excessive = wuxingAnalysis.excessive || [];

  const xi = xiYongShen.xi || [];
  const yong = xiYongShen.yong || [];

  const hasBazi = yearPillar && monthPillar && dayPillar && hourPillar;
  const visibleNames = nameSuggestions.slice(0, 3);

  return (
    <div className="space-y-3 w-full">
      {/* 八字四柱 */}
      {hasBazi && (
        <div className="grid grid-cols-4 gap-2">
          {[
            ['年柱', yearPillar],
            ['月柱', monthPillar],
            ['日柱', dayPillar],
            ['时柱', hourPillar],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-2.5 text-center">
              <div className="text-[10px] text-on-surface/50 mb-1">{label}</div>
              <div className="text-sm font-serif-sc font-semibold text-primary">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 日主 + 喜用神 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-center">
          <div className="text-[10px] text-on-surface/55 mb-1">日主</div>
          <div className="text-xl font-semibold text-primary">{dayGan || '-'}</div>
          {naYin && <div className="text-[10px] text-on-surface/40 mt-1">{naYin}</div>}
        </div>
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
          <div className="text-[10px] text-on-surface/55 mb-1">喜用神</div>
          <div className="flex flex-wrap gap-1">
            {yong.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">用{yong.join('、')}</span>
            )}
            {xi.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">喜{xi.join('、')}</span>
            )}
            {yong.length === 0 && xi.length === 0 && <span className="text-xs text-on-surface/40">-</span>}
          </div>
        </div>
      </div>

      {/* 五行分布 */}
      {Object.keys(wuxing).length > 0 && (
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
          <div className="text-[10px] text-on-surface/45 mb-2">五行分布</div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { key: 'wood', label: '木', color: 'text-green-400', bg: 'bg-green-500/10', ring: 'ring-green-400/50' },
              { key: 'fire', label: '火', color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-400/50' },
              { key: 'earth', label: '土', color: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-400/50' },
              { key: 'metal', label: '金', color: 'text-gray-300', bg: 'bg-gray-500/10', ring: 'ring-gray-400/50' },
              { key: 'water', label: '水', color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-400/50' },
            ].map(({ key, label, color, bg, ring }) => {
              const count = wuxing[key] || 0;
              const isMissing = missing.includes(label);
              const isExcessive = excessive.includes(label);
              return (
                <div key={key} className={`rounded-lg ${bg} p-2 text-center ${isMissing || isExcessive ? `ring-1 ${ring}` : ''}`}>
                  <div className={`text-sm font-bold ${color}`}>{count}</div>
                  <div className="text-[10px] text-on-surface/60 mt-0.5">{label}</div>
                  {isMissing && <div className="text-[9px] text-red-400">缺</div>}
                  {isExcessive && <div className="text-[9px] text-amber-400">旺</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 推荐名字 */}
      {visibleNames.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="text-[10px] text-primary mb-2 flex items-center gap-1.5">
            <Icon name="stars" size={12} />
            推荐名字
          </div>
          <div className="space-y-2">
            {visibleNames.map((suggestion: any, idx: number) => {
              const name = suggestion.names?.[0] || suggestion.name;
              return (
                <motion.div
                  key={name + idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-lg bg-on-surface/[0.04] p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">{idx + 1}</span>
                    <span className="text-base font-bold text-on-surface">{name}</span>
                    {suggestion.score != null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${suggestion.score >= 80 ? 'bg-green-500/20 text-green-400' : suggestion.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                        {suggestion.score}分
                      </span>
                    )}
                  </div>
                  {suggestion.reason && (
                    <p className="text-xs text-on-surface/50 mt-1">{suggestion.reason}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
          {nameSuggestions.length > 3 && (
            <p className="text-[10px] text-on-surface/30 text-center mt-2">
              还有 {nameSuggestions.length - 3} 个推荐名字
            </p>
          )}
        </div>
      )}
    </div>
  );
}
