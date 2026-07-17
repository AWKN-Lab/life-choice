/**
 * 八字四柱排盘表格组件 (新中式黑金风格)
 * 6列布局：属性/年柱/月柱/日柱/时柱
 * 所有字段从 calc_result 真实数据读取，无静态假数据
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ResultResponse } from '@/types/api';

const WUXING_COLORS: Record<string, string> = {
  '甲': 'text-[#00a07d]', '乙': 'text-[#00a07d]',
  '丙': 'text-[#d4504a]', '丁': 'text-[#d4504a]',
  '戊': 'text-[#8b6914]', '己': 'text-[#8b6914]',
  '庚': 'text-[#5a6b7a]', '辛': 'text-[#5a6b7a]',
  '壬': 'text-[#7b8bb0]', '癸': 'text-[#7b8bb0]',
  '寅': 'text-[#00a07d]', '卯': 'text-[#00a07d]',
  '巳': 'text-[#d4504a]', '午': 'text-[#d4504a]',
  '辰': 'text-[#8b6914]', '戌': 'text-[#8b6914]', '丑': 'text-[#8b6914]', '未': 'text-[#8b6914]',
  '申': 'text-[#5a6b7a]', '酉': 'text-[#5a6b7a]',
  '子': 'text-[#7b8bb0]', '亥': 'text-[#7b8bb0]',
};

const SHISHEN_COLORS: Record<string, string> = {
  '比肩': 'text-[#00a07d]', '劫财': 'text-[#7b5b9a]',
  '食神': 'text-[#d4504a]', '伤官': 'text-[#d4504a]',
  '偏财': 'text-[#8b6914]', '正财': 'text-[#8b6914]',
  '七杀': 'text-[#7b5b9a]', '正官': 'text-[#5a6b7a]',
  '偏印': 'text-[#00a07d]', '正印': 'text-[#8b6914]',
};

type CalcResult = NonNullable<ResultResponse['calc_result']>;

interface BaZiTableProps {
  calcResult: CalcResult;
  locale?: 'zh' | 'en';
}

function extractGanZhi(pillar: string | undefined): { gan: string; zhi: string } {
  if (!pillar || pillar.length < 2) return { gan: '-', zhi: '-' };
  return {
    gan: pillar[0] || '-',
    zhi: pillar.slice(1) || '-',
  };
}

function getArrayValue(arr: string[] | undefined, index: number): string {
  return arr && arr[index] ? arr[index] : '-';
}

function formatMultiValues(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return '-';
  return arr.join('·');
}

const BaZiTable: React.FC<BaZiTableProps> = ({ calcResult, locale = 'zh' }) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || locale === 'en';

  const year = extractGanZhi(calcResult.yearPillar);
  const month = extractGanZhi(calcResult.monthPillar);
  const day = extractGanZhi(calcResult.dayPillar);
  const hour = extractGanZhi(calcResult.hourPillar);

  const canggan = calcResult.zangganShishen;
  const selfSeat = calcResult.selfSeat || {};
  const kongWangArr: string[] = Array.isArray(calcResult.kongWang) ? calcResult.kongWang : [];
  const shenSha = calcResult.shenShaByPillar;
  const changSheng = calcResult.changSheng || calcResult.changsheng || {};

  const getCanggan = (key: 'year' | 'month' | 'day' | 'hour'): string[] => {
    if (canggan && canggan[key]) {
      return (canggan[key] as any[]).map((item: any) => typeof item === 'string' ? item : item.gan || '');
    }
    return [];
  };

  const getSubStar = (key: 'year' | 'month' | 'day' | 'hour'): string[] => {
    if (canggan && canggan[key]) {
      return (canggan[key] as any[]).map((item: any) => typeof item === 'string' ? '' : item.shishen || '').filter(Boolean);
    }
    return [];
  };

  const getSelfSeat = (key: 'year' | 'month' | 'day' | 'hour'): string => {
    return selfSeat?.[key] || '-';
  };

  const getKongWang = (): string => {
    return kongWangArr.length > 0 ? kongWangArr.join('·') : '-';
  };

  const getShenSha = (key: 'year' | 'month' | 'day' | 'hour'): string[] => {
    return shenSha?.[key] || [];
  };

  const getChangSheng = (key: 'year' | 'month' | 'day' | 'hour'): string => {
    return changSheng?.[key] || '-';
  };

  const headers = {
    title: isEnglish ? 'Four Pillars Chart' : '四柱排盘',
    attr: isEnglish ? 'Attr' : '属性',
    year: isEnglish ? 'Year' : '年柱',
    month: isEnglish ? 'Month' : '月柱',
    day: isEnglish ? 'Day' : '日柱',
    hour: isEnglish ? 'Hour' : '时柱',
    mainStar: isEnglish ? 'Main Star' : '主星',
    stem: isEnglish ? 'Stem' : '天干',
    branch: isEnglish ? 'Branch' : '地支',
    hiddenStems: isEnglish ? 'Hidden Stems' : '藏干',
    secondaryStars: isEnglish ? 'Secondary Stars' : '副星',
    phase: isEnglish ? 'Phase' : '星运',
    selfSeatLabel: isEnglish ? 'Self Seat' : '自坐',
    voidBranches: isEnglish ? 'Void Branches' : '空亡',
    naYin: isEnglish ? 'Na Yin' : '纳音',
    spiritStars: isEnglish ? 'Spirit Stars' : '神煞',
    longevity: isEnglish ? 'Longevity' : '长生',
  };

  const pillarKeys: Array<'year' | 'month' | 'day' | 'hour'> = ['year', 'month', 'day', 'hour'];

  const cellStyle = (isAlt: boolean = false) => ({
    padding: '9px 4px',
    textAlign: 'center' as const,
    fontSize: '13px',
    borderBottom: '1px solid #e8e4d8',
    background: isAlt ? '#fdfcfa' : '#ffffff',
  });

  const labelStyle = {
    padding: '9px 4px',
    textAlign: 'left' as const,
    paddingLeft: '14px',
    fontSize: '11px',
    color: '#8b7355',
    background: '#faf8f3',
    borderRight: '1px solid #e8e4d8',
    borderBottom: '1px solid #e8e4d8',
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-[#e8e4d8] bg-surface-container">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1c2026] to-[#181c22] border-b border-[#dacf98]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#8b7355]" style={{ fontSize: '16px' }}>grid_view</span>
          <span className="text-sm text-[#5c4a28] font-medium font-serif-sc">{headers.title}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed" style={{ background: '#ffffff' }}>
          <thead>
            <tr>
              <th style={{
                padding: '12px 4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#5c4a28',
                borderBottom: '2px solid #dacf98',
                background: 'linear-gradient(180deg, #f9f7f2 0%, #f5f3ec 100%)',
                textAlign: 'left',
                paddingLeft: '14px',
                width: '56px',
                borderRight: '1px solid #e8e4d8',
              }}>
                {headers.attr}
              </th>
              {pillarKeys.map((key, idx) => (
                <th key={key} style={{
                  padding: '12px 4px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#5c4a28',
                  borderBottom: '2px solid #dacf98',
                  background: 'linear-gradient(180deg, #f9f7f2 0%, #f5f3ec 100%)',
                }}>
                  <span style={{ position: 'relative' }}>
                    {[headers.year, headers.month, headers.day, headers.hour][idx]}
                    <span style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '24px',
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent, #dacf98, transparent)',
                    }} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={labelStyle}>{headers.mainStar}</td>
              <td style={cellStyle()}><span className={`font-semibold ${SHISHEN_COLORS[calcResult.yearShishen || ''] || 'text-[#00a07d]'}`}>{calcResult.yearShishen || '-'}</span></td>
              <td style={cellStyle(true)}><span className={`font-semibold ${SHISHEN_COLORS[calcResult.monthShishen || ''] || 'text-[#d4504a]'}`}>{calcResult.monthShishen || '-'}</span></td>
              <td style={cellStyle()}><span className={`font-semibold ${SHISHEN_COLORS[calcResult.dayShishen || ''] || 'text-[#5a6b7a]'}`}>{calcResult.dayShishen || '-'}</span></td>
              <td style={cellStyle(true)}><span className={`font-semibold ${SHISHEN_COLORS[calcResult.hourShishen || ''] || 'text-[#8b6914]'}`}>{calcResult.hourShishen || '-'}</span></td>
            </tr>

            <tr>
              <td style={labelStyle}>{headers.stem}</td>
              <td style={cellStyle()}><span className={`font-semibold ${WUXING_COLORS[year.gan] || 'text-[#8b7355]'}`}>{year.gan}</span></td>
              <td style={cellStyle(true)}><span className={`font-semibold ${WUXING_COLORS[month.gan] || 'text-[#8b7355]'}`}>{month.gan}</span></td>
              <td style={cellStyle()}><span className={`font-semibold ${WUXING_COLORS[day.gan] || 'text-[#8b7355]'}`}>{day.gan}</span></td>
              <td style={cellStyle(true)}><span className={`font-semibold ${WUXING_COLORS[hour.gan] || 'text-[#8b7355]'}`}>{hour.gan}</span></td>
            </tr>

            <tr>
              <td style={labelStyle}>{headers.branch}</td>
              <td style={cellStyle()}><span className={`font-semibold ${WUXING_COLORS[year.zhi] || 'text-[#8b7355]'}`}>{year.zhi}</span></td>
              <td style={cellStyle(true)}><span className={`font-semibold ${WUXING_COLORS[month.zhi] || 'text-[#8b7355]'}`}>{month.zhi}</span></td>
              <td style={cellStyle()}><span className={`font-semibold ${WUXING_COLORS[day.zhi] || 'text-[#8b7355]'}`}>{day.zhi}</span></td>
              <td style={cellStyle(true)}><span className={`font-semibold ${WUXING_COLORS[hour.zhi] || 'text-[#8b7355]'}`}>{hour.zhi}</span></td>
            </tr>

            <tr>
              <td style={labelStyle}>{headers.hiddenStems}</td>
              {pillarKeys.map((key, idx) => {
                const cgs = getCanggan(key);
                const firstGan = cgs[0] || '-';
                return <td key={key} style={cellStyle(idx % 2 === 1)}><span className={`text-sm ${WUXING_COLORS[firstGan] || 'text-[#8b7355]'}`}>{formatMultiValues(cgs)}</span></td>;
              })}
            </tr>

            <tr>
              <td style={labelStyle}>{headers.secondaryStars}</td>
              {pillarKeys.map((key, idx) => {
                const stars = getSubStar(key);
                const colorIndex = idx % 5;
                const colors = ['text-[#7b5b9a]', 'text-[#00a07d]', 'text-[#8b6914]', 'text-[#d4504a]', 'text-[#5a6b7a]'];
                return <td key={key} style={cellStyle(idx % 2 === 1)}><span className={`text-sm ${colors[colorIndex]}`}>{formatMultiValues(stars)}</span></td>;
              })}
            </tr>

            <tr>
              <td style={labelStyle}>{headers.phase}</td>
              {pillarKeys.map((key, idx) => (
                <td key={key} style={cellStyle(idx % 2 === 1)}>{getChangSheng(key)}</td>
              ))}
            </tr>

            <tr>
              <td style={labelStyle}>{headers.selfSeatLabel}</td>
              {pillarKeys.map((key, idx) => (
                <td key={key} style={cellStyle(idx % 2 === 1)}>{getSelfSeat(key)}</td>
              ))}
            </tr>

            <tr>
              <td style={labelStyle}>{headers.voidBranches}</td>
              <td colSpan={4} style={cellStyle()}><span className="text-[#b8a88a]">{getKongWang()}</span></td>
            </tr>

            <tr>
              <td style={labelStyle}>{headers.naYin}</td>
              <td style={cellStyle()}>{calcResult.naYin?.year || '-'}</td>
              <td style={cellStyle(true)}>{calcResult.naYin?.month || '-'}</td>
              <td style={cellStyle()}>{calcResult.naYin?.day || '-'}</td>
              <td style={cellStyle(true)}>{calcResult.naYin?.hour || '-'}</td>
            </tr>

            <tr>
              <td style={{ ...labelStyle, borderBottom: 'none' }}>{headers.spiritStars}</td>
              {pillarKeys.map((key, idx) => {
                const sha = getShenSha(key);
                const colorIndex = idx % 4;
                const colors = ['text-[#00a07d]', 'text-[#7b5b9a]', 'text-[#8b6914]', 'text-[#b8a88a]'];
                return <td key={key} style={{ ...cellStyle(idx % 2 === 1), borderBottom: 'none' }}><span className={colors[colorIndex]}>{formatMultiValues(sha)}</span></td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BaZiTable;