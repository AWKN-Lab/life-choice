/**
 * 初步结论组件 - 方案A：传统经典风格
 * 参考古代命理典籍风格，融合传统装饰元素
 * 
 * 设计特点：
 * - 深红/朱砂色为主色调
 * - 传统云纹/回纹装饰
 * - 书法字体感的标题
 * - 古典边框和分隔线
 * - 宣纸质感背景
 */

import React from 'react';
import { Icon } from '@/components/ui/Icon';

// 五行颜色
const WUXING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '木': { bg: '#10b981', text: 'text-emerald-600', border: 'border-emerald-400' },
  '火': { bg: '#ef4444', text: 'text-red-600', border: 'border-red-400' },
  '土': { bg: '#f59e0b', text: 'text-amber-600', border: 'border-amber-400' },
  '金': { bg: '#9ca3af', text: 'text-gray-600', border: 'border-gray-400' },
  '水': { bg: '#3b82f6', text: 'text-blue-600', border: 'border-blue-400' }
};

// 模拟数据
const MOCK_DATA = {
  summary: '日主甲木，生于寅月，得令而旺。木气过盛，宜泄不宜克。格局为正官格，官星清透，有贵气。事业上宜往东方发展，忌西方金旺之地。',
  score: 8.2,
  shenWang: '身旺',
  wuXing: { 木: 4, 火: 2, 土: 1, 金: 1, 水: 2 },
  xiYong: { xi: ['火', '土'], yong: ['金'], ji: ['水'] },
  tiGan: '甲',
  riZhi: '木',
  mingGe: '正官格',
  daYun: '37岁起运，逢兔、虎年大吉'
};

interface TraditionalConclusionAProps {
  data?: typeof MOCK_DATA;
}

const TraditionalConclusionA: React.FC<TraditionalConclusionAProps> = ({ data = MOCK_DATA }) => {
  const totalWuXing = Object.values(data.wuXing).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#1a0a0a] text-amber-100 p-4 pb-20">
      {/* 顶部装饰 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-red-800 to-transparent"></div>
          <span className="text-red-700 text-xs tracking-[0.3em]">命理分析</span>
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-red-800 to-transparent"></div>
        </div>
      </div>

      {/* 主标题框 */}
      <div className="relative mb-8">
        {/* 装饰边框 */}
        <div className="absolute -inset-1 border border-red-900/50 rounded-sm"></div>
        <div className="absolute -inset-2 border border-red-800/30 rounded-sm"></div>
        
        <div className="bg-gradient-to-b from-[#2a1515] to-[#1a0a0a] border border-red-800/60 rounded-sm p-6 text-center relative">
          {/* 顶部云纹装饰 */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <span className="text-red-700/60 text-lg">☁</span>
            <span className="text-red-600/80 text-sm px-3 py-0.5 bg-[#1a0a0a] border border-red-800/40 rounded-full">
              初步结论
            </span>
            <span className="text-red-700/60 text-lg">☁</span>
          </div>

          {/* 八字概览 */}
          <div className="mt-4 mb-4">
            <div className="flex justify-center gap-6 text-2xl font-bold tracking-widest">
              <span className={WUXING_COLORS['木'].text}>甲</span>
              <span className="text-amber-200/50">·</span>
              <span className={WUXING_COLORS['木'].text}>寅</span>
              <span className="text-amber-200/30">·</span>
              <span className={WUXING_COLORS['木'].text}>壬</span>
              <span className="text-amber-200/50">·</span>
              <span className={WUXING_COLORS['水'].text}>子</span>
            </div>
            <div className="text-xs text-amber-200/40 mt-1 tracking-wider">四柱</div>
          </div>

          {/* 格局判定 */}
          <div className="border-t border-b border-red-800/40 py-3 mb-4">
            <div className="text-xs text-amber-200/50 mb-1">格局</div>
            <div className="text-xl font-bold text-amber-50 tracking-wider">{data.mingGe}</div>
          </div>

          {/* 综合评分 */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{data.score}</div>
              <div className="text-[10px] text-amber-200/40 tracking-widest">评分</div>
            </div>
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-red-800/60 to-transparent"></div>
            <div className="text-center">
              <div className={`text-xl font-bold ${data.shenWang === '身旺' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {data.shenWang}
              </div>
              <div className="text-[10px] text-amber-200/40 tracking-widest">日主</div>
            </div>
          </div>
        </div>

        {/* 底部云纹 */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-red-700/40 text-lg">◆</div>
      </div>

      {/* 五行分布 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-800/50 to-transparent"></div>
          <span className="text-xs text-red-600/80 tracking-[0.2em]">五行分布</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-800/50 to-transparent"></div>
        </div>
        
        <div className="bg-[#2a1515]/50 border border-red-900/30 rounded-sm p-4">
          <div className="flex h-8 rounded overflow-hidden">
            {(['木', '火', '土', '金', '水'] as const).map((wx) => {
              const pct = (data.wuXing[wx] / totalWuXing) * 100;
              return (
                <div
                  key={wx}
                  className={`${WUXING_COLORS[wx].bg} flex items-center justify-center text-on-surface text-xs font-bold transition-all`}
                  style={{ width: `${pct}%` }}
                >
                  {pct >= 15 && wx}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs">
            {(['木', '火', '土', '金', '水'] as const).map((wx) => (
              <span key={wx} className={`${WUXING_COLORS[wx].text}`}>
                {wx}: {data.wuXing[wx]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 命理总评 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-800/50 to-transparent"></div>
          <span className="text-xs text-red-600/80 tracking-[0.2em]">命理总评</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-800/50 to-transparent"></div>
        </div>

        <div className="bg-[#2a1515]/50 border border-red-900/30 rounded-sm p-5 relative">
          {/* 装饰角 */}
          <div className="absolute top-1 left-1 w-4 h-4 border-t border-l border-red-800/50"></div>
          <div className="absolute top-1 right-1 w-4 h-4 border-t border-r border-red-800/50"></div>
          <div className="absolute bottom-1 left-1 w-4 h-4 border-b border-l border-red-800/50"></div>
          <div className="absolute bottom-1 right-1 w-4 h-4 border-b border-r border-red-800/50"></div>
          
          <p className="text-amber-100/90 text-sm leading-relaxed text-justify indent-6" style={{ textIndent: '2em' }}>
            {data.summary}
          </p>
        </div>
      </div>

      {/* 喜忌用神 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-800/50 to-transparent"></div>
          <span className="text-xs text-red-600/80 tracking-[0.2em]">喜忌用神</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-800/50 to-transparent"></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* 用神 */}
          <div className="bg-[#1a2518] border border-emerald-800/50 rounded-sm p-3 text-center">
            <div className="text-[10px] text-emerald-500/70 mb-2 tracking-wider">用神</div>
            <div className="flex justify-center gap-2">
              {data.xiYong.yong.map((wx) => (
                <span key={wx} className={`px-2 py-1 rounded text-sm font-bold text-on-surface ${WUXING_COLORS[wx].bg}`}>
                  {wx}
                </span>
              ))}
            </div>
          </div>

          {/* 喜神 */}
          <div className="bg-[#1a1520] border border-amber-800/50 rounded-sm p-3 text-center">
            <div className="text-[10px] text-amber-500/70 mb-2 tracking-wider">喜神</div>
            <div className="flex justify-center gap-2">
              {data.xiYong.xi.map((wx) => (
                <span key={wx} className={`px-2 py-1 rounded text-sm font-medium border ${WUXING_COLORS[wx].border} ${WUXING_COLORS[wx].text}`}>
                  {wx}
                </span>
              ))}
            </div>
          </div>

          {/* 忌神 */}
          <div className="bg-[#251515] border border-red-800/50 rounded-sm p-3 text-center">
            <div className="text-[10px] text-red-500/70 mb-2 tracking-wider">忌神</div>
            <div className="flex justify-center gap-2">
              {data.xiYong.ji.map((wx) => (
                <span key={wx} className="px-2 py-1 rounded text-sm font-medium bg-gray-700 text-gray-400 line-through">
                  {wx}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 大运提示 */}
      <div className="bg-[#2a1515]/50 border border-red-900/30 rounded-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="timeline" size={16} className="text-red-500/70" />
          <span className="text-xs text-red-600/80 tracking-wider">大运提示</span>
        </div>
        <p className="text-sm text-amber-200/80">{data.daYun}</p>
      </div>

      {/* 底部落款装饰 */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-4">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-red-800/50"></span>
          <span className="text-red-800/50 text-xs tracking-widest">◆</span>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-red-800/50"></span>
        </div>
      </div>
    </div>
  );
};

export default TraditionalConclusionA;
