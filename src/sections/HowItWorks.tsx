import { useEffect, useRef, useState } from 'react';
import { Edit3, Cpu, Mail, CheckCircle, Sparkles } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: <Edit3 className="w-6 h-6" />,
    title: '输入你的信息',
    description: '提供你的出生日期、时间和地点，我们将基于传统命理算法进行分析',
    align: 'left'
  },
  {
    number: '02',
    icon: <Cpu className="w-6 h-6" />,
    title: '我们创建你的命盘',
    description: '我们的系统运用子平真诠算法，生成你独特的命理档案和2026年运势分析',
    align: 'right'
  },
  {
    number: '03',
    icon: <Mail className="w-6 h-6" />,
    title: '接收你的解读',
    description: '获得针对你人生问题的个性化洞察，包括全年高光日期和具体行动建议',
    align: 'left'
  }
];

export default function HowItWorks() {
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
      id="how-it-works"
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]" />

      <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10">
        {/* 头部 */}
        <div className="text-center mb-20">
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#efaf5a]/30 bg-[#efaf5a]/10 mb-6 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#efaf5a]" />
            <span className="text-sm text-[#efaf5a] tracking-wider">工作原理</span>
          </div>
          
          <h2 
            className={`font-display text-4xl md:text-5xl text-white mb-4 transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            获取你的解读<span className="text-gradient-gold">很简单</span>
          </h2>
        </div>

        {/* 时间线 */}
        <div className="relative">
          {/* 中心线 */}
          <div 
            className={`absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#efaf5a] via-[#efaf5a]/50 to-transparent transition-all duration-1500 ${
              isVisible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
            }`}
            style={{ transformOrigin: 'top', transitionDelay: '400ms' }}
          />

          {/* 步骤 */}
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative grid md:grid-cols-2 gap-8 items-center transition-all duration-1000 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${500 + index * 200}ms` }}
              >
                {/* 左侧内容 */}
                <div className={`${step.align === 'right' ? 'md:order-2' : ''}`}>
                  <div 
                    className={`card-mystic group hover:border-[#efaf5a]/50 transition-all duration-500 ${
                      step.align === 'right' ? 'md:text-left' : 'md:text-right'
                    }`}
                  >
                    {/* 步骤编号 */}
                    <div className={`flex items-center gap-4 mb-4 ${step.align === 'right' ? '' : 'md:flex-row-reverse'}`}>
                      <div className="w-14 h-14 rounded-xl bg-[#efaf5a]/20 flex items-center justify-center text-[#efaf5a] group-hover:scale-110 group-hover:rotate-12 transition-all">
                        {step.icon}
                      </div>
                      <span className="text-5xl font-display text-[#efaf5a]/20">{step.number}</span>
                    </div>

                    <h3 className="font-display text-2xl text-white mb-3">{step.title}</h3>
                    <p className="text-white/50 leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {/* 中心点 */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
                  <div className="w-4 h-4 rounded-full bg-[#efaf5a] shadow-lg shadow-[#efaf5a]/50" />
                  <div className="absolute inset-0 w-4 h-4 rounded-full bg-[#efaf5a] animate-ping opacity-50" />
                </div>

                {/* 右侧占位 */}
                <div className={`${step.align === 'right' ? 'md:order-1' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div 
          className={`mt-16 text-center transition-all duration-1000 delay-1200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-[#efaf5a]/10 border border-[#efaf5a]/30">
            <CheckCircle className="w-5 h-5 text-[#efaf5a]" />
            <span className="text-white/70">整个过程只需几分钟，即可获得你的专属解读</span>
          </div>
        </div>
      </div>
    </section>
  );
}
