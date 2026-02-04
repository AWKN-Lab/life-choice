import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Stars } from 'lucide-react';

interface HeroProps {
  onStartClick: () => void;
}

export default function Hero({ onStartClick }: HeroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="min-h-screen flex items-center relative overflow-hidden"
    >
      {/* 背景光晕 */}
      <div className="absolute inset-0 bg-radial-glow opacity-60" />
      
      {/* 装饰性圆环 */}
      <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] opacity-20">
        <div className="w-full h-full rounded-full border border-[#efaf5a]/30 animate-spin" style={{ animationDuration: '30s' }} />
        <div className="absolute inset-[10%] rounded-full border border-[#efaf5a]/20 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }} />
        <div className="absolute inset-[20%] rounded-full border border-[#efaf5a]/10 animate-spin" style={{ animationDuration: '20s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 左侧内容 */}
          <div className="space-y-8">
            {/* 标签 */}
            <div 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#efaf5a]/30 bg-[#efaf5a]/10 transition-all duration-1000 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Stars className="w-4 h-4 text-[#efaf5a]" />
              <span className="text-sm text-[#efaf5a] tracking-wider">东方命理 × 博弈论算法</span>
            </div>

            {/* 标题 */}
            <div className="space-y-2">
              <h1 
                className={`font-display text-white transition-all duration-1000 delay-200 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                命运没有标准答案
              </h1>
              <h1 
                className={`font-display text-gradient-gold transition-all duration-1000 delay-400 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                但博弈有最优解
              </h1>
            </div>

            {/* 副标题 */}
            <p 
              className={`text-lg md:text-xl text-white/70 max-w-lg leading-relaxed transition-all duration-1000 delay-800 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
              }`}
            >
              集成八字排盘与博弈算法，将传统时空数据转化为现代博弈算法语言，为你构建上帝视角的决策仪表盘。识别非对称风险（红灯），锁定最佳时间窗口（绿灯）
            </p>

            {/* CTA按钮 */}
            <div 
              className={`flex flex-wrap gap-4 transition-all duration-1000 delay-1000 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            >
              <a href="#" onClick={(e) => { e.preventDefault(); onStartClick(); }} className="btn-primary group">
                <span className="flex items-center gap-2">
                  开启人生外挂
                  <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
              <a href="#about" className="btn-secondary">
                查看演示 Demo
              </a>
            </div>

            {/* 统计数据 */}
            <div 
              className={`flex gap-8 pt-8 transition-all duration-1000 delay-1200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div>
                <div className="text-3xl font-display text-[#efaf5a]">10万+</div>
                <div className="text-sm text-white/50">决策样本</div>
              </div>
              <div>
                <div className="text-3xl font-display text-[#efaf5a]">30+</div>
                <div className="text-sm text-white/50">算法模型</div>
              </div>
              <div>
                <div className="text-3xl font-display text-[#efaf5a]">98%</div>
                <div className="text-sm text-white/50">风险识别率</div>
              </div>
            </div>
          </div>

          {/* 右侧命理图 */}
          <div 
            className={`relative transition-all duration-1000 delay-600 ${
              isVisible ? 'opacity-100 translate-x-0 rotate-0' : 'opacity-0 translate-x-12 -rotate-12'
            }`}
          >
            <div className="relative w-full aspect-square max-w-[500px] mx-auto">
              {/* 外圈光晕 */}
              <div className="absolute inset-[-10%] rounded-full bg-gradient-radial from-[#efaf5a]/20 via-transparent to-transparent animate-pulse" />
              
              {/* 命理图 */}
              <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#efaf5a]/30 shadow-2xl animate-float">
                <img
                  src="/hero-chart.jpg"
                  alt="命理图"
                  className="w-full h-full object-cover"
                />
                
                {/* 叠加渐变 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
              </div>

              {/* 装饰点 */}
              <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-[#efaf5a] animate-pulse-glow" />
              <div className="absolute -bottom-6 -left-6 w-6 h-6 rounded-full bg-[#f3c039] animate-pulse-glow" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 底部渐变 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
    </section>
  );
}
