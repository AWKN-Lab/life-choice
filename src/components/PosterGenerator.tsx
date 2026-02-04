import { useRef, useState } from 'react';
import { X, Download, Sparkles } from 'lucide-react';
import type { UserBazi, HighlightDay } from '../lib/bazi-engine';

interface PosterGeneratorProps {
  bazi: UserBazi;
  highlightDays: HighlightDay[];
  annualKeyword: string;
  onClose: () => void;
}

export default function PosterGenerator({ bazi, highlightDays, annualKeyword, onClose }: PosterGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterStyle, setPosterStyle] = useState<'minimal' | 'colorful' | 'elegant'>('colorful');
  const [generated, setGenerated] = useState(false);

  const generatePoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸 (9:16 比例)
    canvas.width = 1080;
    canvas.height = 1920;

    // 背景样式
    const gradients = {
      minimal: ['#1a1a1a', '#0a0a0a'],
      colorful: ['#2d1f3d', '#1a1a2e'],
      elegant: ['#1f1f2e', '#16213e']
    };

    const bgColors = gradients[posterStyle];
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, bgColors[0]);
    gradient.addColorStop(1, bgColors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加装饰元素
    if (posterStyle === 'colorful') {
      // 金色光晕
      const glowGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 3, 0,
        canvas.width / 2, canvas.height / 3, 400
      );
      glowGradient.addColorStop(0, 'rgba(239, 175, 90, 0.3)');
      glowGradient.addColorStop(1, 'rgba(239, 175, 90, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 装饰线条
    ctx.strokeStyle = 'rgba(239, 175, 90, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 200);
    ctx.lineTo(980, 200);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(100, 1720);
    ctx.lineTo(980, 1720);
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#efaf5a';
    ctx.font = '40px Forum';
    ctx.textAlign = 'center';
    ctx.fillText('2026高光日历', canvas.width / 2, 150);

    // 年度关键词
    ctx.fillStyle = '#ffffff';
    ctx.font = '60px Forum';
    ctx.fillText('年度关键词', canvas.width / 2, 350);

    ctx.fillStyle = '#efaf5a';
    ctx.font = '120px Forum';
    ctx.fillText(annualKeyword, canvas.width / 2, 520);

    // 命盘信息
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '36px Chakra Petch';
    ctx.fillText(`日主: ${bazi.dayMaster} (${bazi.dayMasterWuxing})`, canvas.width / 2, 650);
    ctx.fillText(`格局: ${bazi.pattern}`, canvas.width / 2, 710);

    // 高光日期列表
    ctx.fillStyle = '#efaf5a';
    ctx.font = '48px Forum';
    ctx.fillText('你的高光时刻', canvas.width / 2, 850);

    const topHighlights = highlightDays.slice(0, 5);
    let yPos = 950;

    topHighlights.forEach((day) => {
      // 日期卡片背景
      ctx.fillStyle = 'rgba(239, 175, 90, 0.1)';
      ctx.fillRect(80, yPos - 60, 920, 100);
      
      // 边框
      ctx.strokeStyle = 'rgba(239, 175, 90, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, yPos - 60, 920, 100);

      // 日期
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Chakra Petch';
      ctx.textAlign = 'left';
      ctx.fillText(day.dateStr, 120, yPos);

      // 类型
      ctx.fillStyle = '#efaf5a';
      ctx.font = '32px Chakra Petch';
      ctx.textAlign = 'right';
      ctx.fillText(day.type, 960, yPos);

      yPos += 130;
    });

    // 底部文案
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '28px Chakra Petch';
    ctx.textAlign = 'center';
    ctx.fillText('扫码获取你的专属高光日历', canvas.width / 2, 1650);

    // 二维码区域（模拟）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(canvas.width / 2 - 100, 1680, 200, 200);
    ctx.strokeStyle = 'rgba(239, 175, 90, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 100, 1680, 200, 200);

    // 品牌标识
    ctx.fillStyle = '#efaf5a';
    ctx.font = '32px Forum';
    ctx.fillText('2026高光日历', canvas.width / 2, 1880);

    setGenerated(true);
  };

  const downloadPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `2026高光日历_${bazi.dayMaster}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <section className="py-20 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl md:text-5xl text-white mb-2">
              生成<span className="text-gradient-gold">高光海报</span>
            </h2>
            <p className="text-white/50">创建属于你的2026高光日历海报</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* 左侧：样式选择 */}
          <div className="space-y-8">
            {/* 样式选择 */}
            <div>
              <h3 className="font-display text-xl text-white mb-4">选择海报风格</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'minimal', name: '极简', desc: '简约大气' },
                  { id: 'colorful', name: '炫彩', desc: '金色光晕' },
                  { id: 'elegant', name: '优雅', desc: '深邃典雅' }
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setPosterStyle(style.id as 'minimal' | 'colorful' | 'elegant');
                      setGenerated(false);
                    }}
                    className={`p-4 rounded-xl border transition-all ${
                      posterStyle === style.id
                        ? 'border-[#efaf5a] bg-[#efaf5a]/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="text-white font-medium mb-1">{style.name}</div>
                    <div className="text-white/50 text-sm">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 预览信息 */}
            <div className="card-mystic">
              <h3 className="font-display text-xl text-white mb-4">海报内容预览</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">年度关键词</span>
                  <span className="text-[#efaf5a]">{annualKeyword}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">日主</span>
                  <span className="text-white">{bazi.dayMaster}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">格局</span>
                  <span className="text-white">{bazi.pattern}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">高光日期数量</span>
                  <span className="text-white">{highlightDays.length}天</span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button
                onClick={generatePoster}
                className="btn-primary flex-1"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {generated ? '重新生成' : '生成海报'}
                </span>
              </button>
              {generated && (
                <button
                  onClick={downloadPoster}
                  className="btn-secondary flex-1"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    下载海报
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 右侧：海报预览 */}
          <div className="flex items-center justify-center">
            <div className="relative">
              {/* 海报画布 */}
              <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[70vh] object-contain"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>

              {/* 提示文字 */}
              {!generated && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 text-[#efaf5a] mx-auto mb-4" />
                    <p className="text-white/70">点击"生成海报"开始创作</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
