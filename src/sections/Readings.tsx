import { useEffect, useRef, useState } from 'react';
import { User, Heart, Briefcase, Sparkles, Calendar, ArrowRight } from 'lucide-react';

const readings = [
  {
    icon: <Calendar className="w-8 h-8" />,
    title: '01 | 2026 高光时刻日历',
    description: '基于趋势周期算法，精确标注 2026 年全年的"绿灯日期"与"红灯日期"。为你定制高光时刻表，踩准每一步。',
    rotation: -5,
    color: 'from-[#efaf5a]/20 to-transparent'
  },
  {
    icon: <User className="w-8 h-8" />,
    title: '02 | 人生道路导航',
    description: '调用 [职业决策逻辑]。深度解析天赋配置，帮你识别哪条路是你的"常绿通道"，从拥堵的红海中抽身。',
    rotation: 0,
    color: 'from-[#f3c039]/20 to-transparent'
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: '03 | 关系契合度',
    description: '调用 [契约决策逻辑]。博弈推演双方的底层需求。如果对方是消耗型人格，为你亮起红灯；如果是增益型队友，亮起绿灯。',
    rotation: 5,
    color: 'from-[#9e8a74]/20 to-transparent'
  },
  {
    icon: <Briefcase className="w-8 h-8" />,
    title: '04 | 事业与财务',
    description: '调用 [资产决策逻辑] 与 [竞争决策逻辑]。识别资产结构的脆弱点。如果前方有风险，提前亮红灯叫停；如果具备护城河，给绿灯建议。',
    rotation: 0,
    color: 'from-[#efaf5a]/20 to-transparent'
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: '05 | 精神成长',
    description: '透视性格盲区与防御机制，消除内耗，将潜意识的红灯转为绿灯，实现自我驱动的觉醒。',
    rotation: -3,
    color: 'from-[#f3c039]/20 to-transparent'
  }
];

export default function Readings() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="readings"
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      
      {/* 环境光晕 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#efaf5a]/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* 头部 */}
        <div className="text-center mb-16">
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#efaf5a]/30 bg-[#efaf5a]/10 mb-6 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#efaf5a]" />
            <span className="text-sm text-[#efaf5a] tracking-wider">决策模型</span>
          </div>
          
          <h2 
            className={`font-display text-4xl md:text-5xl text-white mb-4 transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            探索我们的<span className="text-gradient-gold">解读场景</span>
          </h2>
          
          <p 
            className={`text-lg text-white/50 max-w-2xl mx-auto transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            每个解读都针对你的人生特定领域，你需要哪盏红绿灯？
          </p>
        </div>

        {/* 卡片网格 */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {readings.map((reading, index) => (
            <div
              key={index}
              className={`group relative transition-all duration-1000 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ 
                transitionDelay: `${400 + index * 100}ms`,
                transform: isVisible ? `rotate(${reading.rotation}deg)` : 'rotate(0deg) translateY(48px)'
              }}
            >
              <div 
                className="card-mystic h-full cursor-pointer group-hover:scale-105 group-hover:rotate-0 transition-all duration-500"
                style={{
                  background: `linear-gradient(135deg, ${reading.color})`
                }}
              >
                {/* 图标 */}
                <div className="w-16 h-16 rounded-xl bg-[#efaf5a]/20 flex items-center justify-center text-[#efaf5a] mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  {reading.icon}
                </div>

                {/* 标题 */}
                <h3 className="font-display text-xl text-white mb-3">
                  {reading.title}
                </h3>

                {/* 描述 */}
                <p className="text-sm text-white/50 mb-6 leading-relaxed">
                  {reading.description}
                </p>

                {/* 链接 */}
                <div className="flex items-center gap-2 text-[#efaf5a] text-sm group-hover:gap-4 transition-all">
                  <span>开始推演</span>
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* 悬停边框 */}
                <div className="absolute inset-0 rounded-xl border border-[#efaf5a]/0 group-hover:border-[#efaf5a]/50 transition-colors pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
