/**
 * 初步结论组件 - 方案B：现代简约风格
 * 参考苹果/线性风格，极简主义设计
 * 
 * 设计特点：
 * - 纯黑背景+霓虹色强调
 * - 极简几何图形
 * - 大量留白
 * - 细线条分隔
 * - 渐变色彩
 */

import React from 'react';
import { Icon } from '@/components/ui/Icon';

// 五行颜色（霓虹风格）
const WUXING_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  '木': { bg: '#00ff88', text: 'text-[#00ff88]', glow: 'shadow-[0_0_15px_#00ff8850]' },
  '火': { bg: '#ff4757', text: 'text-[#ff4757]', glow: 'shadow-[0_0_15px_#ff475750]' },
  '土': { bg: '#ffa502', text: 'text-[#ffa502]', glow: 'shadow-[0_0_15px_#ffa50250]' },
  '金': { bg: '#dfe4ea', text: 'text-[#dfe4ea]', glow: 'shadow-[0_0_15px_#dfe4ea50]' },
  '水': { bg: '#00d4ff', text: 'text-[#00d4ff]', glow: 'shadow-[0_0_15px_#00d4ff50]' }
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

interface ModernConclusionBProps {
  data?: typeof MOCK_DATA;
}

const ModernConclusionB: React.FC<ModernConclusionBProps> = ({ data = MOCK_DATA }) => {
  const totalWuXing = Object.values(data.wuXing).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#000000] text-on-surface p-4 pb-20">
      {/* 标题区 */}
      <div className="text-center mb-8">
        <h1 className="text-lg font-light tracking-[0.3em] text-on-surface/90 mb-1">初步结论</h1>
        <div className="w-8 h-0.5 bg-gradient-to-r from-[#00d4ff] to-[#00ff88] mx-auto rounded-full"></div>
      </div>

      {/* 四柱展示 - 极简线条 */}
      <div className="flex justify-center gap-1 mb-8">
        <div className="text-center">
          <div className="text-[10px] text-on-surface/30 mb-1">年</div>
          <div className="text-3xl font-extralight tracking-[0.2em]">甲</div>
        </div>
        <div className="text-on-surface/20 text-3xl font-extralight">/</div>
        <div className="text-center">
          <div className="text-[10px] text-on-surface/30 mb-1">月</div>
          <div className={`text-3xl font-extralight tracking-[0.2em] ${WUXING_COLORS['木'].text}`}>寅</div>
        </div>
        <div className="text-on-surface/20 text-3xl font-extralight">/</div>
        <div className="text-center">
          <div className="text-[10px] text-on-surface/30 mb-1">日</div>
          <div className="text-3xl font-extralight tracking-[0.2em]">壬</div>
        </div>
        <div className="text-on-surface/20 text-3xl font-extralight">/</div>
        <div className="text-center">
          <div className="text-[10px] text-on-surface/30 mb-1">时</div>
          <div className={`text-3xl font-extralight tracking-[0.2em] ${WUXING_COLORS['水'].text}`}>子</div>
        </div>
      </div>

      {/* 核心数据卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* 评分 */}
        <div className="bg-[#0a0a0a] border border-outline/5 rounded-xl p-4 text-center">
          <div className="text-[10px] text-on-surface/40 mb-2 uppercase tracking-wider">评分</div>
          <div className="text-3xl font-extralight text-on-surface/90">{data.score}</div>
          <div className="text-[10px] text-on-surface/30 mt-1">/ 10</div>
        </div>

        {/* 身旺 */}
        <div className={`bg-[#0a0a0a] border border-[#00ff88]/20 rounded-xl p-4 text-center ${WUXING_COLORS['木'].glow}`}>
          <div className="text-[10px] text-on-surface/40 mb-2 uppercase tracking-wider">日主</div>
          <div className={`text-2xl font-extralight ${WUXING_COLORS['木'].text}`}>
            {data.shenWang}
          </div>
        </div>

        {/* 格局 */}
        <div className="bg-[#0a0a0a] border border-outline/5 rounded-xl p-4 text-center">
          <div className="text-[10px] text-on-surface/40 mb-2 uppercase tracking-wider">格局</div>
          <div className="text-lg font-extralight text-on-surface/80">{data.mingGe}</div>
        </div>
      </div>

      {/* 五行分布 - 霓虹条 */}
      <div className="mb-6">
        <div className="text-[10px] text-on-surface/30 uppercase tracking-widest mb-3">五行分布</div>
        <div className="flex h-1 rounded-full overflow-hidden">
          {(['木', '火', '土', '金', '水'] as const).map((wx) => {
            const pct = (data.wuXing[wx] / totalWuXing) * 100;
            return (
              <div
                key={wx}
                className={`${WUXING_COLORS[wx].bg} transition-all`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[11px]">
          {(['木', '火', '土', '金', '水'] as const).map((wx) => (
            <span key={wx} className={WUXING_COLORS[wx].text}>
              {wx}
              <span className="text-on-surface/30 ml-0.5">{data.wuXing[wx]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 命理总评 - 文字卡片 */}
      <div className="bg-[#0a0a0a] border border-outline/5 rounded-xl p-5 mb-6">
        <div className="text-[10px] text-on-surface/30 uppercase tracking-widest mb-3">命理总评</div>
        <p className="text-sm text-on-surface/70 leading-relaxed">
          {data.summary}
        </p>
      </div>

      {/* 喜忌用神 - 极简标签 */}
      <div className="mb-6">
        <div className="text-[10px] text-on-surface/30 uppercase tracking-widest mb-3">喜忌用神</div>
        <div className="flex flex-wrap gap-2">
          {/* 用神 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-on-surface/30">用神</span>
            <div className="flex gap-1">
              {data.xiYong.yong.map((wx) => (
                <span key={wx} className={`px-2 py-1 rounded text-xs font-medium bg-[#0a0a0a] border ${WUXING_COLORS[wx].text} border-current/20`}>
                  {wx}
                </span>
              ))}
            </div>
          </div>
          
          {/* 喜神 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-on-surface/30">喜</span>
            <div className="flex gap-1">
              {data.xiYong.xi.map((wx) => (
                <span key={wx} className={`text-xs ${WUXING_COLORS[wx].text}/60`}>
                  {wx}
                </span>
              ))}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="h-4 w-px bg-on-surface/10"></div>

          {/* 忌神 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-on-surface/30">忌</span>
            <div className="flex gap-1">
              {data.xiYong.ji.map((wx) => (
                <span key={wx} className="text-xs text-on-surface/20 line-through">
                  {wx}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 大运提示 - 细线卡片 */}
      <div className="flex items-center gap-3 bg-[#0a0a0a] border border-outline/5 rounded-xl p-4">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[#00d4ff] to-[#00ff88]"></div>
        <div>
          <div className="text-[10px] text-on-surface/30 uppercase tracking-widest">大运</div>
          <div className="text-sm text-on-surface/80 mt-0.5">{data.daYun}</div>
        </div>
      </div>

      {/* 底部留白装饰 */}
      <div className="mt-8 flex justify-center gap-1">
        <div className="w-1 h-1 rounded-full bg-on-surface/20"></div>
        <div className="w-1 h-1 rounded-full bg-on-surface/10"></div>
        <div className="w-1 h-1 rounded-full bg-on-surface/5"></div>
      </div>
    </div>
  );
};

export default ModernConclusionB;
