import { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface CTAProps {
  onStartClick: () => void;
}

export default function CTA({ onStartClick }: CTAProps) {
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
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-32 relative overflow-hidden"
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      
      {/* 辐射渐变 */}
      <div 
        className={`absolute inset-0 transition-all duration-1500 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{
          background: 'radial-gradient(circle at center, rgba(239, 175, 90, 0.15) 0%, transparent 60%)'
        }}
      />

      {/* 粒子效果 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#efaf5a] rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10 text-center">
        {/* 标签 */}
        <div 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#efaf5a]/30 bg-[#efaf5a]/10 mb-8 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#efaf5a]" />
          <span className="text-sm text-[#efaf5a] tracking-wider">开始你的旅程</span>
        </div>

        {/* 标题 */}
        <h2 
          className={`font-display text-4xl md:text-6xl text-white mb-6 transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          准备好开启<br />
          <span className="text-gradient-gold">你的2026了吗？</span>
        </h2>

        {/* 副标题 */}
        <p 
          className={`text-xl text-white/70 mb-12 max-w-2xl mx-auto transition-all duration-1000 delay-400 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          解锁你命运的秘密，通过古老命理智慧，让2026年的每一天都充满期待
        </p>

        {/* CTA按钮 */}
        <div 
          className={`transition-all duration-1000 delay-600 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <button
            onClick={onStartClick}
            className="btn-primary text-lg px-12 py-5 animate-pulse-glow"
          >
            <span className="flex items-center gap-3">
              立即开始
              <ArrowRight className="w-6 h-6" />
            </span>
          </button>
        </div>

        {/* 底部文字 */}
        <p 
          className={`mt-8 text-white/40 text-sm transition-all duration-1000 delay-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          已有 10,000+ 用户获取了他们的2026高光日历
        </p>
      </div>
    </section>
  );
}
