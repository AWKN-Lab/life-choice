import { useEffect, useRef, useState } from 'react';
import { Sparkles, BookOpen, Compass, Star } from 'lucide-react';

export default function About() {
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

  const features = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: '[A] 竞争决策：动态演变模拟',
      description: '格鲁夫·战略转折点。面对职场竞争或商务博弈，推演三传路径。识别当前处于"进攻、守成还是撤退"的 10x 信号点。'
    },
    {
      icon: <Compass className="w-6 h-6" />,
      title: '[W] 资产决策：安全边际审计',
      description: '波特五力模型 + 塔勒布·杠铃策略。在大额投资或资产配置前，审计你的"护城河"。计算在最坏波动下，你的系统是否具备反脆弱性。'
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: '[K] 契约决策：逻辑一致性检查',
      description: 'JTBD模型 + 囚徒困境。入职、合伙、签约前的人性博弈模拟。透视对方的真实动因，判断合作模式是"互补增益"还是"存量消耗"。'
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: '[N] 职业决策：天赋复利定位',
      description: '蓝海战略 (价值创新)。基于月令格局定性，寻找你的职业"蓝海"。避开高内卷红海，将你的底层五行能量转化为不可替代的商业价值。'
    }
  ];

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]" />
      
      {/* 对角线装饰 */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(135deg, transparent 49.5%, rgba(239, 175, 90, 0.1) 49.5%, rgba(239, 175, 90, 0.1) 50.5%, transparent 50.5%)'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* 左侧图片 */}
          <div 
            className={`relative transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`}
          >
            <div className="relative">
              {/* 主图 */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/about-compass.jpg"
                  alt="传统罗盘"
                  className="w-full aspect-[4/5] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              {/* 装饰元素 */}
              <div className="absolute -top-6 -left-6 w-24 h-24 border-2 border-[#efaf5a]/30 rounded-full" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 border-2 border-[#efaf5a]/20 rounded-full" />
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="space-y-8">
            {/* 标签 */}
            <div 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#efaf5a]/30 bg-[#efaf5a]/10 transition-all duration-1000 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#efaf5a]" />
              <span className="text-sm text-[#efaf5a] tracking-wider">AWKN 信号控制系统四大决策逻辑</span>
            </div>

            {/* 标题 */}
            <h2 
              className={`font-display text-4xl md:text-5xl text-white transition-all duration-1000 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              你的人生决策操作系统
            </h2>

            {/* 描述 */}
            <p 
              className={`text-lg text-white/70 leading-relaxed transition-all duration-1000 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              别把人生交给运气。我们将传统时空数据转化为现代工程语言，为你构建上帝视角的决策仪表盘。
            </p>

            {/* 特性列表 */}
            <div 
              className={`space-y-4 transition-all duration-1000 delay-400 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-[#efaf5a]/20 flex items-center justify-center flex-shrink-0 text-[#efaf5a]">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-display text-lg text-white mb-1">{feature.title}</h4>
                    <p className="text-sm text-white/50">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA按钮 */}
            <div 
              className={`transition-all duration-1000 delay-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <a href="#how-it-works" className="btn-secondary inline-flex">
                查看完整架构
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
