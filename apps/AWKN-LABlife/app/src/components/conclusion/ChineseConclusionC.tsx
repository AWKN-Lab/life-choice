/**
 * 初步结论组件 - 方案C：新中式风格
 * 融合传统元素与现代设计，简约大气
 * 
 * 设计特点：
 * - 米白/暖灰色背景
 * - 墨绿色/金色点缀
 * - 传统印章元素
 * - 现代卡片布局
 * - 竹/梅/松意象
 */

import React from 'react';
import { Icon } from '@/components/ui/Icon';

// 五行颜色（新中式）
const WUXING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '木': { bg: '#166534', text: 'text-emerald-800', border: 'border-emerald-700' },
  '火': { bg: '#dc2626', text: 'text-red-700', border: 'border-red-600' },
  '土': { bg: '#d97706', text: 'text-amber-700', border: 'border-amber-600' },
  '金': { bg: '#6b7280', text: 'text-gray-600', border: 'border-gray-500' },
  '水': { bg: '#2563eb', text: 'text-blue-700', border: 'border-blue-600' }
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

interface ChineseConclusionCProps {
  data?: typeof MOCK_DATA;
}

const ChineseConclusionC: React.FC<ChineseConclusionCProps> = ({ data = MOCK_DATA }) => {
  const totalWuXing = Object.values(data.wuXing).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-800 p-4 pb-20">
      {/* 顶部标题区 */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-300"></div>
        <div className="text-center">
          <h2 className="text-lg font-medium text-stone-700 tracking-wider">初步结论</h2>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="w-1 h-1 rounded-full bg-amber-600"></span>
            <span className="w-1 h-1 rounded-full bg-amber-600/50"></span>
            <span className="w-1 h-1 rounded-full bg-amber-600/30"></span>
          </div>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-300"></div>
      </div>

      {/* 四柱展示 - 新中式卡片 */}
      <div className="bg-surface-container rounded-2xl shadow-sm border border-stone-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-stone-500">四柱八字</div>
          {/* 印章元素 */}
          <div className="w-10 h-10 border-2 border-red-700 rounded flex items-center justify-center rotate-12">
            <span className="text-red-700 text-xs font-bold">命</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '年', gan: '甲', zhi: '寅' },
            { label: '月', gan: '丙', zhi: '辰' },
            { label: '日', gan: '壬', zhi: '子' },
            { label: '时', gan: '戊', zhi: '午' },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <div className="text-[10px] text-stone-400 mb-1">{p.label}柱</div>
              <div className="flex items-center justify-center gap-1">
                <span className={`text-xl font-medium ${WUXING_COLORS['木'].text}`}>{p.gan}</span>
                <span className="text-stone-300">·</span>
                <span className={`text-xl font-medium ${WUXING_COLORS['水'].text}`}>{p.zhi}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 核心指标 - 三列卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* 综合评分 */}
        <div className="bg-surface-container rounded-xl shadow-sm border border-stone-200 p-4 text-center">
          <div className="text-[10px] text-stone-400 mb-2 tracking-wider">综合评分</div>
          <div className="text-2xl font-bold text-amber-700">{data.score}</div>
          <div className="text-[10px] text-stone-400 mt-1">分</div>
        </div>

        {/* 日主判断 */}
        <div className={`rounded-xl shadow-sm border p-4 text-center ${
          data.shenWang === '身旺' 
            ? 'bg-emerald-50 border-emerald-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="text-[10px] text-stone-500 mb-2 tracking-wider">日主</div>
          <div className={`text-xl font-bold ${
            data.shenWang === '身旺' 
              ? 'text-emerald-700' 
              : 'text-blue-700'
          }`}>
            {data.shenWang}
          </div>
        </div>

        {/* 格局 */}
        <div className="bg-surface-container rounded-xl shadow-sm border border-stone-200 p-4 text-center">
          <div className="text-[10px] text-stone-400 mb-2 tracking-wider">格局</div>
          <div className="text-lg font-bold text-stone-700">{data.mingGe}</div>
        </div>
      </div>

      {/* 五行分布 - 新中式条形 */}
      <div className="bg-surface-container rounded-xl shadow-sm border border-stone-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-stone-600">五行分布</span>
          <Icon name="eco" size={16} className="text-emerald-600" />
        </div>
        
        <div className="flex h-6 rounded-full overflow-hidden">
          {(['木', '火', '土', '金', '水'] as const).map((wx) => {
            const pct = (data.wuXing[wx] / totalWuXing) * 100;
            return (
              <div
                key={wx}
                className={`${WUXING_COLORS[wx].bg} flex items-center justify-center text-on-surface text-xs font-medium`}
                style={{ width: `${pct}%` }}
              >
                {pct >= 15 && wx}
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between mt-2 text-xs">
          {(['木', '火', '土', '金', '水'] as const).map((wx) => (
            <span key={wx} className={WUXING_COLORS[wx].text}>
              {wx}: {data.wuXing[wx]}
            </span>
          ))}
        </div>
      </div>

      {/* 命理总评 - 诗意卡片 */}
      <div className="bg-surface-container rounded-xl shadow-sm border border-stone-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="auto_stories" size={16} className="text-amber-600" />
          <span className="text-sm text-stone-600">命理总评</span>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          {data.summary}
        </p>
      </div>

      {/* 喜忌用神 - 传统圆形标签 */}
      <div className="bg-surface-container rounded-xl shadow-sm border border-stone-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="spa" size={16} className="text-emerald-600" />
          <span className="text-sm text-stone-600">喜忌用神</span>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* 用神 */}
          <div className="flex items-center gap-2">
            <div className="w-12 text-center">
              <div className="text-[10px] text-stone-400 mb-1">用神</div>
              <div className="flex justify-center gap-1">
                {data.xiYong.yong.map((wx) => (
                  <span key={wx} className={`w-6 h-6 rounded-full flex items-center justify-center text-on-surface text-xs font-bold ${WUXING_COLORS[wx].bg}`}>
                    {wx}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 喜神 */}
          <div className="flex items-center gap-2">
            <div className="w-12 text-center">
              <div className="text-[10px] text-stone-400 mb-1">喜神</div>
              <div className="flex justify-center gap-1">
                {data.xiYong.xi.map((wx) => (
                  <span key={wx} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 ${WUXING_COLORS[wx].border} ${WUXING_COLORS[wx].text}`}>
                    {wx}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 分隔 */}
          <div className="h-10 w-px bg-stone-200"></div>

          {/* 忌神 */}
          <div className="flex items-center gap-2">
            <div className="w-12 text-center">
              <div className="text-[10px] text-stone-400 mb-1">忌神</div>
              <div className="flex justify-center gap-1">
                {data.xiYong.ji.map((wx) => (
                  <span key={wx} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-stone-200 text-stone-400 line-through">
                    {wx}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 大运提示 - 底部信息 */}
      <div className="bg-gradient-to-r from-emerald-50 to-amber-50 rounded-xl border border-stone-200 p-4">
        <div className="flex items-center gap-3">
          <Icon name="schedule" size={20} className="text-emerald-600" />
          <div>
            <div className="text-xs text-stone-400">大运提示</div>
            <div className="text-sm text-stone-700 font-medium mt-0.5">{data.daYun}</div>
          </div>
        </div>
      </div>

      {/* 底部装饰 - 竹叶意象 */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-3">
          <span className="text-emerald-300 text-lg">▎</span>
          <span className="text-stone-300 text-xs tracking-widest">虚怀若谷 · 顺势而为</span>
          <span className="text-emerald-300 text-lg">▎</span>
        </div>
      </div>
    </div>
  );
};

export default ChineseConclusionC;
