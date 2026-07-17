/**
 * 八字详细分析组件
 * 展示：五行分布、身旺判断、喜忌用神、四柱十神、天干地支、大运流年、神煞等
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FullAnalysis, DaYunItem } from '../types/bazi';
import { Icon } from '@/components/ui/Icon';

const WUXING_GAN: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};

const WUXING_ZHI: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土',
  '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金',
  '戌': '土', '亥': '水'
};

const WUXING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '木': { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-300' },
  '火': { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-300' },
  '土': { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-300' },
  '金': { bg: 'bg-gray-400', text: 'text-gray-600', border: 'border-gray-300' },
  '水': { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-300' }
};

const GAN_STRENGTH: Record<string, number> = {
  '甲': 8, '乙': 7, '丙': 9, '丁': 8, '戊': 7,
  '己': 6, '庚': 8, '辛': 7, '壬': 9, '癸': 8
};

const ZHI_MONTH_STRENGTH: Record<string, number> = {
  '子': 10, '丑': 8, '寅': 9, '卯': 9, '辰': 7, '巳': 8,
  '午': 10, '未': 7, '申': 6, '酉': 6, '戌': 7, '亥': 9
};

const ZANGAN: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '辛', '癸'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};

const SHISHEN_COLORS: Record<string, { bg: string; text: string }> = {
  '比肩': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '劫财': { bg: 'bg-red-100', text: 'text-red-700' },
  '食神': { bg: 'bg-green-100', text: 'text-green-700' },
  '伤官': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '偏财': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  '正财': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '七杀': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '正官': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  '偏印': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  '正印': { bg: 'bg-teal-100', text: 'text-teal-700' }
};

interface BaZiDetailProps {
  analysis: FullAnalysis;
  gender: 'male' | 'female';
  birthYear: number;
}

interface I18nReason {
  key: string;
  params?: Record<string, string | number>;
}

function calculateWuXingDistribution(analysis: FullAnalysis): Record<string, number> {
  const counts: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  const gans = [
    analysis.baZi.year.gan,
    analysis.baZi.month.gan,
    analysis.baZi.day.gan,
    analysis.baZi.time.gan
  ];
  const zhis = [
    analysis.baZi.year.zhi,
    analysis.baZi.month.zhi,
    analysis.baZi.day.zhi,
    analysis.baZi.time.zhi
  ];
  gans.forEach(g => { counts[WUXING_GAN[g]]++; });
  zhis.forEach(z => {
    counts[WUXING_ZHI[z]]++;
    ZANGAN[z]?.forEach(g => counts[WUXING_GAN[g]]++);
  });
  return counts;
}

function judgeShenWang(analysis: FullAnalysis): {
  result: '身旺' | '身弱' | '中和';
  score: number;
  reasons: I18nReason[];
} {
  const counts = calculateWuXingDistribution(analysis);
  const dayGan = analysis.baZi.day.gan;
  const dayZhi = analysis.baZi.day.zhi;
  const monthZhi = analysis.baZi.month.zhi;
  let score = 50;
  const reasons: I18nReason[] = [];
  const monthStrength = ZHI_MONTH_STRENGTH[monthZhi] || 5;
  if (monthStrength >= 8) {
    score += 15;
    reasons.push({ key: 'baziDetail.reasonMonthStrong', params: { zhi: monthZhi } });
  } else if (monthStrength <= 4) {
    score -= 15;
    reasons.push({ key: 'baziDetail.reasonMonthWeak', params: { zhi: monthZhi } });
  }
  const dayRoots = ZANGAN[dayZhi] || [];
  const hasRoot = dayRoots.includes(dayGan);
  if (hasRoot) {
    score += 10;
    reasons.push({ key: 'baziDetail.reasonDayRoot', params: { zhi: dayZhi, gan: dayGan } });
  }
  const biJieCount = [analysis.baZi.year.gan, analysis.baZi.month.gan, analysis.baZi.time.gan]
    .filter(g => g === dayGan).length;
  if (biJieCount >= 2) {
    score += 10;
    reasons.push({ key: 'baziDetail.reasonBiJie', params: { count: biJieCount } });
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(counts));
  const minCount = Math.min(...Object.values(counts));
  if (maxCount >= total * 0.5) {
    score -= 10;
    reasons.push({ key: 'baziDetail.reasonPianKu', params: { percent: Math.round(maxCount / total * 100) } });
  }
  if (minCount === 0) {
    score += 5;
    reasons.push({ key: 'baziDetail.reasonMissing' });
  }
  const dayWuXing = WUXING_GAN[dayGan];
  const shishenValues = Object.values(analysis.shiShen);
  const keCount = shishenValues.filter(s => ['七杀', '正官', '偏财', '正财'].includes(s)).length;
  const xieCount = shishenValues.filter(s => ['食神', '伤官'].includes(s)).length;
  if (keCount >= 2) score -= 5;
  if (xieCount >= 2) score -= 5;
  score = Math.max(0, Math.min(100, score));
  let result: '身旺' | '身弱' | '中和';
  if (score >= 55) result = '身旺';
  else if (score <= 45) result = '身弱';
  else result = '中和';
  return { result, score, reasons };
}

function calculateXiYongShen(shenWang: '身旺' | '身弱' | '中和', counts: Record<string, number>): {
  xi: string[];
  yong: string[];
  ji: string[];
} {
  const wuxingOrder = ['木', '火', '土', '金', '水'];
  if (shenWang === '身旺') {
    return {
      xi: ['木', '火'],
      yong: ['土', '金'],
      ji: ['水']
    };
  } else if (shenWang === '身弱') {
    return {
      xi: ['水', '金'],
      yong: ['木', '水'],
      ji: ['火', '土']
    };
  } else {
    return {
      xi: ['木', '火', '土', '金', '水'],
      yong: ['木', '火'],
      ji: []
    };
  }
}

const WuXingBar = ({ counts }: { counts: Record<string, number> }) => {
  const { t } = useTranslation();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{t('baziDetail.wuxingDistribution')}</div>
      <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
        {(['木', '火', '土', '金', '水'] as const).map((wx) => {
          const pct = total > 0 ? (counts[wx] / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={wx}
              className={`${WUXING_COLORS[wx].bg} flex items-center justify-center text-on-surface text-xs font-bold transition-all`}
              style={{ width: `${pct}%` }}
              title={t('baziDetail.wuxingCount', { element: wx, count: counts[wx] })}
            >
              {pct >= 10 && wx}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        {(['木', '火', '土', '金', '水'] as const).map((wx) => (
          <span key={wx} className={WUXING_COLORS[wx].text}>
            {t('baziDetail.wuxingCount', { element: wx, count: counts[wx] })}
          </span>
        ))}
      </div>
    </div>
  );
};

const ShenWangCard = ({ shenWang }: { shenWang: { result: string; score: number; reasons: I18nReason[] } }) => {
  const { t } = useTranslation();
  const isStrong = shenWang.result === '身旺';
  const isWeak = shenWang.result === '身弱';
  const bodyStrengthKey = isStrong ? 'baziDetail.bodyStrong' : isWeak ? 'baziDetail.bodyWeak' : 'baziDetail.bodyBalanced';

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isStrong ? 'bg-emerald-100 text-emerald-700' :
          isWeak ? 'bg-red-100 text-red-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          <span className="text-2xl font-bold">
            {isStrong ? t('baziDetail.shenWangShort') : isWeak ? t('baziDetail.shenRuoShort') : t('baziDetail.shenZhongShort')}
          </span>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('baziDetail.dayMasterJudgment')}</div>
          <div className="text-xl font-bold text-slate-800">
            {t(bodyStrengthKey)}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-slate-700">{shenWang.score}</div>
          <div className="text-xs text-gray-400">{t('baziDetail.strengthScore')}</div>
        </div>
      </div>
      {shenWang.reasons.length > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t border-slate-100">
          {shenWang.reasons.map((r, i) => (
            <div key={i} className="text-xs text-gray-600 flex items-start gap-1">
              <span className="text-emerald-500 mt-0.5">•</span>
              {t(r.key, r.params)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const XiYongShenCard = ({ xiYong }: { xiYong: { xi: string[]; yong: string[]; ji: string[] } }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <Icon name="auto_awesome" size={14} />
        {t('baziDetail.xiJiYongShen')}
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-400 mb-1.5">{t('baziDetail.yongShen')}</div>
          <div className="flex gap-2">
            {xiYong.yong.map((wx) => (
              <span key={wx} className={`px-3 py-1.5 rounded-full text-sm font-bold ${WUXING_COLORS[wx].bg} text-on-surface`}>
                {wx}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1.5">{t('baziDetail.xiShen')}</div>
          <div className="flex gap-2">
            {xiYong.xi.map((wx) => (
              <span key={wx} className={`px-3 py-1.5 rounded-full text-sm font-medium border ${WUXING_COLORS[wx].border} ${WUXING_COLORS[wx].text}`}>
                {wx}
              </span>
            ))}
          </div>
        </div>

        {xiYong.ji.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1.5">{t('baziDetail.jiShen')}</div>
            <div className="flex gap-2">
              {xiYong.ji.map((wx) => (
                <span key={wx} className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-200 text-gray-600 line-through">
                  {wx}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ShiShenDisplay = ({ analysis }: { analysis: FullAnalysis }) => {
  const { t } = useTranslation();
  const pillars = [
    { key: 'year', label: t('baziDetail.yearPillar'), gan: analysis.baZi.year.gan, zhi: analysis.baZi.year.zhi, shishen: analysis.shiShen.year, zhiShiShen: analysis.zhiShiShen.year },
    { key: 'month', label: t('baziDetail.monthPillar'), gan: analysis.baZi.month.gan, zhi: analysis.baZi.month.zhi, shishen: analysis.shiShen.month, zhiShiShen: analysis.zhiShiShen.month },
    { key: 'day', label: t('baziDetail.dayPillar'), gan: analysis.baZi.day.gan, zhi: analysis.baZi.day.zhi, shishen: analysis.shiShen.day, zhiShiShen: analysis.zhiShiShen.day },
    { key: 'hour', label: t('baziDetail.hourPillar'), gan: analysis.baZi.time.gan, zhi: analysis.baZi.time.zhi, shishen: analysis.shiShen.time, zhiShiShen: analysis.zhiShiShen.time },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <Icon name="person" size={14} />
        {t('baziDetail.fourPillarsTenGods')}
      </div>

      <div className="space-y-2">
        {pillars.map((p) => (
          <div key={p.key} className="flex items-center gap-3 p-2 rounded-lg bg-surface-container border border-slate-100">
            <span className="text-xs text-gray-400 w-8">{p.label}</span>
            <span className={`font-bold text-lg ${WUXING_COLORS[WUXING_GAN[p.gan]].text}`}>{p.gan}</span>
            <span className="text-gray-300">:</span>
            <span className={`font-bold text-lg ${WUXING_COLORS[WUXING_ZHI[p.zhi]].text}`}>{p.zhi}</span>
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${SHISHEN_COLORS[p.shishen]?.bg || 'bg-gray-100'} ${SHISHEN_COLORS[p.shishen]?.text || 'text-gray-700'}`}>
              {p.shishen}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-gray-400 mb-2">{t('baziDetail.zhiZangGan')}</div>
        <div className="grid grid-cols-4 gap-2">
          {pillars.map((p) => (
            <div key={p.key} className="text-center">
              <div className="text-xs text-gray-400 mb-1">{p.zhi}</div>
              <div className="flex flex-wrap justify-center gap-1">
                {(p.zhiShiShen || []).map((zs: { gan: string; shishen: string }) => (
                  <span key={zs.gan} className={`px-1.5 py-0.5 rounded text-xs ${WUXING_COLORS[WUXING_GAN[zs.gan]].bg} text-on-surface`}>
                    {zs.gan}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DaYunDisplay = ({ daYun, birthYear }: { daYun: { qiYunSui: number; isShun: boolean; daYun: DaYunItem[] }; birthYear: number }) => {
  const { t } = useTranslation();
  const currentYear = 2026;
  const currentAge = currentYear - birthYear;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <Icon name="timeline" size={14} />
        {t('baziDetail.daYun')}
        <span className="ml-auto text-xs text-emerald-600">
          {daYun.isShun ? t('baziDetail.shunXing') : t('baziDetail.niXing')} · {t('baziDetail.qiYunAge', { age: daYun.qiYunSui })}
        </span>
      </div>

      <div className="space-y-2">
        {(daYun.daYun || []).map((dy) => {
          const isActive = currentAge >= dy.startAge && currentAge <= dy.endAge;
          return (
            <div
              key={dy.index}
              className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                isActive ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-surface-container border-slate-100'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isActive ? 'bg-emerald-500 text-on-surface' : 'bg-slate-100 text-slate-600'
              }`}>
                {dy.index}
              </span>
              <span className="font-bold">{dy.full}</span>
              <span className="text-xs text-gray-500">
                {t('baziDetail.ageRange', { start: dy.startAge, end: dy.endAge })}
              </span>
              {isActive && (
                <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                  {t('baziDetail.current')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ShenShaDisplay = ({ shenSha, kongWang }: { shenSha: FullAnalysis['shenSha']; kongWang: string[] }) => {
  const { t } = useTranslation();
  const shenShaItems = [
    { key: 'tianYi', name: t('baziDetail.tianYiGuiRen'), value: shenSha.tianYiGuiRen, icon: 'shield' },
    { key: 'taiJi', name: t('baziDetail.taiJiGuiRen'), value: shenSha.taiJiGuiRen, icon: 'yin_yang' },
    { key: 'wenChang', name: t('baziDetail.wenChangGuiRen'), value: shenSha.wenChangGuiRen, icon: 'menu_book' },
    { key: 'yangRen', name: t('baziDetail.yangRen'), value: shenSha.yangRen, icon: 'bolt' },
    { key: 'taoHua', name: t('baziDetail.taoHua'), value: shenSha.taoHua, icon: 'local_florist' },
    { key: 'yiMa', name: t('baziDetail.yiMa'), value: shenSha.yiMa, icon: 'directions_run' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <Icon name="auto_awesome" size={14} />
        {t('baziDetail.shenShaGuiRen')}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {shenShaItems.map((item) => (
          <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container border border-slate-100">
            <Icon name={item.icon} size={14} className="text-amber-500" />
            <span className="text-xs text-gray-500">{item.name}</span>
            <span className="ml-auto text-sm font-bold text-slate-700">
              {item.value.length > 0 ? item.value.join('') : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Icon name="block" size={14} />
          <span>{t('baziDetail.kongWang')}</span>
          <span className="ml-auto text-sm font-bold text-red-500">
            {kongWang.length > 0 ? kongWang.join('') : t('baziDetail.none')}
          </span>
        </div>
      </div>
    </div>
  );
};

const GanAnalysis = ({ analysis }: { analysis: FullAnalysis }) => {
  const { t } = useTranslation();
  const gans = [
    analysis.baZi.year.gan,
    analysis.baZi.month.gan,
    analysis.baZi.day.gan,
    analysis.baZi.time.gan
  ];

  const labels = [t('baziDetail.yearLabel'), t('baziDetail.monthLabel'), t('baziDetail.dayLabel'), t('baziDetail.hourLabel')];

  const relations: Array<{ from: number; to: number; type: '生' | '克' | '比' | '被生' | '被克' }> = [];

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const wx1 = WUXING_GAN[gans[i]];
      const wx2 = WUXING_GAN[gans[j]];
      const sheng: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };

      if (wx1 === wx2) {
        relations.push({ from: i, to: j, type: '比' });
      } else if (sheng[wx1] === wx2) {
        relations.push({ from: i, to: j, type: '生' });
      } else if (sheng[wx2] === wx1) {
        relations.push({ from: i, to: j, type: '被生' });
      } else if (sheng[wx1] && sheng[sheng[wx1]] === wx2) {
        relations.push({ from: i, to: j, type: '克' });
      } else if (sheng[wx2] && sheng[sheng[wx2]] === wx1) {
        relations.push({ from: i, to: j, type: '被克' });
      }
    }
  }

  const relationColors: Record<string, string> = {
    '生': 'text-emerald-600 bg-emerald-50',
    '被生': 'text-blue-600 bg-blue-50',
    '克': 'text-red-600 bg-red-50',
    '被克': 'text-orange-600 bg-orange-50',
    '比': 'text-purple-600 bg-purple-50'
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <Icon name="hub" size={14} />
        {t('baziDetail.tianGanRelation')}
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        {gans.map((g, i) => (
          <React.Fragment key={i}>
            <div className="text-center">
              <span className={`text-xl font-bold ${WUXING_COLORS[WUXING_GAN[g]].text}`}>{g}</span>
              <div className="text-xs text-gray-400">{labels[i]}</div>
            </div>
            {i < 3 && <span className="text-gray-300 mx-1">—</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-1 text-xs">
        {relations.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-gray-600">
            <span className="w-4 text-center">{labels[r.from]}</span>
            <span className={`px-1.5 py-0.5 rounded ${relationColors[r.type]}`}>{r.type}</span>
            <span className="w-4 text-center">{labels[r.to]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ZhiAnalysis = ({ analysis }: { analysis: FullAnalysis }) => {
  const { t } = useTranslation();
  const zhis = [
    analysis.baZi.year.zhi,
    analysis.baZi.month.zhi,
    analysis.baZi.day.zhi,
    analysis.baZi.time.zhi
  ];

  const labels = [t('baziDetail.yearLabel'), t('baziDetail.monthLabel'), t('baziDetail.dayLabel'), t('baziDetail.hourLabel')];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <Icon name="pentagon" size={14} />
        {t('baziDetail.zhiZangGan')}
      </div>

      <div className="space-y-2">
        {zhis.map((z, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container border border-slate-100">
            <span className="text-xs text-gray-400 w-6">{labels[i]}</span>
            <span className={`text-lg font-bold ${WUXING_COLORS[WUXING_ZHI[z]].text}`}>{z}</span>
            <span className="text-gray-300">:</span>
            <div className="flex gap-1">
              {ZANGAN[z]?.map((g) => (
                <span key={g} className={`px-1.5 py-0.5 rounded text-xs ${WUXING_COLORS[WUXING_GAN[g]].bg} text-on-surface`}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NaYinDisplay = ({ analysis }: { analysis: FullAnalysis }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200">
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <Icon name="diamond" size={14} />
        {t('baziDetail.naYinWuXing')}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'year', label: t('baziDetail.yearLabel'), value: analysis.naYin.year },
          { key: 'month', label: t('baziDetail.monthLabel'), value: analysis.naYin.month },
          { key: 'day', label: t('baziDetail.dayLabel'), value: analysis.naYin.day },
          { key: 'hour', label: t('baziDetail.hourLabel'), value: analysis.naYin.time },
        ].map((item) => (
          <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container border border-slate-100">
            <span className="text-xs text-gray-400 w-4">{item.label}</span>
            <span className="text-sm font-medium text-slate-700">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="text-xs text-gray-400 mb-2">{t('baziDetail.dayGanChangSheng')}</div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { key: 'year', label: t('baziDetail.yearLabel'), value: analysis.changSheng.year },
            { key: 'month', label: t('baziDetail.monthLabel'), value: analysis.changSheng.month },
            { key: 'day', label: t('baziDetail.dayLabel'), value: analysis.changSheng.day },
            { key: 'hour', label: t('baziDetail.hourLabel'), value: analysis.changSheng.time },
          ].map((item) => {
            const isGood = ['长生', '冠带', '临官', '帝旺'].includes(item.value);
            const isBad = ['死', '墓', '绝'].includes(item.value);
            return (
              <div key={item.key} className="text-center p-1 rounded bg-slate-50">
                <span className="text-xs text-gray-400">{item.label}</span>
                <div className={`text-xs font-bold ${isGood ? 'text-emerald-600' : isBad ? 'text-red-500' : 'text-slate-600'}`}>
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LiuNianDisplay = ({ xiaoYun, birthYear }: {
  xiaoYun: { age: number; gan: string; zhi: string; full: string }[];
  birthYear: number
}) => {
  const { t } = useTranslation();
  const currentYear = 2026;
  const currentAge = currentYear - birthYear;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
      <div className="text-sm text-blue-600 mb-3 flex items-center gap-1">
        <Icon name="event" size={14} />
        {t('baziDetail.liuNianFortune')}
        <span className="ml-auto text-xs">{t('baziDetail.recent5Years')}</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(xiaoYun || []).slice(0, 5).map((ln) => {
          const isCurrent = ln.age === currentAge || ln.age === currentAge - 1;
          return (
            <div
              key={ln.age}
              className={`text-center p-2 rounded-lg border ${
                isCurrent
                  ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-200'
                  : 'bg-surface-container border-slate-100'
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">{currentYear - (currentAge - ln.age)}</div>
              <div className={`text-lg font-bold ${isCurrent ? 'text-blue-600' : 'text-slate-700'}`}>
                {ln.gan}{ln.zhi}
              </div>
              <div className="text-xs text-gray-500">{t('baziDetail.ageSuffix', { age: ln.age })}</div>
              {isCurrent && (
                <div className="text-[10px] text-blue-600 font-medium">{t('baziDetail.thisYear')}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const JiaoYunDisplay = ({ analysis }: { analysis: FullAnalysis }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-xl border border-amber-200">
      <div className="text-sm text-amber-600 mb-3 flex items-center gap-1">
        <Icon name="schedule" size={14} />
        {t('baziDetail.qiYunJiaoYun')}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 rounded-lg bg-surface-container border border-amber-100">
          <span className="text-xs text-gray-500">{t('baziDetail.qiYunAgeLabel')}</span>
          <span className="text-lg font-bold text-amber-700">{t('baziDetail.ageSuffix', { age: analysis.daYun.qiYunSui })}</span>
        </div>

        <div className="flex justify-between items-center p-2 rounded-lg bg-surface-container border border-amber-100">
          <span className="text-xs text-gray-500">{t('baziDetail.daYunDirection')}</span>
          <span className={`text-sm font-bold ${analysis.daYun.isShun ? 'text-emerald-600' : 'text-blue-600'}`}>
            {analysis.daYun.isShun ? t('baziDetail.shunXing') : t('baziDetail.niXing')}
          </span>
        </div>

        {analysis.jiaoYunTime && (
          <div className="flex justify-between items-center p-2 rounded-lg bg-surface-container border border-amber-100">
            <span className="text-xs text-gray-500">{t('baziDetail.jiaoYunTime')}</span>
            <span className="text-sm font-bold text-slate-700">{analysis.jiaoYunTime.dateStr}</span>
          </div>
        )}

        <div className="pt-2 border-t border-amber-100">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded bg-surface-container border border-amber-100">
              <div className="text-xs text-gray-400 mb-1">{t('baziDetail.taiYuan')}</div>
              <div className="text-sm font-bold text-slate-700">{analysis.taiYuan.full}</div>
              <div className="text-xs text-gray-500">{analysis.taiYuan.naYin}</div>
            </div>
            <div className="text-center p-2 rounded bg-surface-container border border-amber-100">
              <div className="text-xs text-gray-400 mb-1">{t('baziDetail.mingGong')}</div>
              <div className="text-sm font-bold text-slate-700">{analysis.mingGong.full}</div>
              <div className="text-xs text-gray-500">{analysis.mingGong.naYin}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BaZiDetail: React.FC<BaZiDetailProps> = ({ analysis, gender, birthYear }) => {
  const { t } = useTranslation();
  const wuXingCounts = useMemo(() => {
    if (!analysis?.baZi?.year) return { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    return calculateWuXingDistribution(analysis);
  }, [analysis]);
  const shenWang = useMemo(() => {
    if (!analysis?.baZi?.year) return { result: '中和' as const, score: 50, reasons: [] as I18nReason[] };
    return judgeShenWang(analysis);
  }, [analysis]);
  const xiYongShen = useMemo(
    () => calculateXiYongShen(shenWang.result as '身旺' | '身弱' | '中和', wuXingCounts),
    [shenWang, wuXingCounts]
  );

  // 六壬局结果没有 baZi 字段，early return 防止子组件崩溃
  if (!analysis?.baZi?.year) {
    return (
      <div className="p-4 text-center text-sm text-on-surface-variant">
        {t('baziDetail.noData', { defaultValue: '暂无八字详细分析数据' })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800">{t('baziDetail.title')}</h2>
        <div className="flex justify-center gap-4 text-sm text-gray-500 mt-1">
          <span>{gender === 'male' ? t('baziDetail.qianZao') : t('baziDetail.kunZao')}</span>
          <span>•</span>
          <span>{t('baziDetail.yearSuffix', { year: birthYear })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WuXingBar counts={wuXingCounts} />
        <ShenWangCard shenWang={shenWang} />
        <XiYongShenCard xiYong={xiYongShen} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GanAnalysis analysis={analysis} />
        <ZhiAnalysis analysis={analysis} />
        <LiuNianDisplay xiaoYun={analysis.xiaoYun} birthYear={birthYear} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DaYunDisplay daYun={analysis.daYun} birthYear={birthYear} />
        <ShenShaDisplay shenSha={analysis.shenSha} kongWang={analysis.kongWang} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NaYinDisplay analysis={analysis} />
        <JiaoYunDisplay analysis={analysis} />
      </div>
    </div>
  );
};

export default BaZiDetail;
