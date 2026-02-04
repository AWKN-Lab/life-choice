import { useEffect, useRef, useState } from 'react';
import { Quote, Star, Sparkles } from 'lucide-react';

const testimonials = [
  {
    name: '张明',
    avatar: '/avatar-1.jpg',
    role: '创业者',
    content: '命理解读让我对自己的人生道路有了惊人的清晰认识。2026高光日历帮我规划了全年的重要决策时机，非常准确！',
    rating: 5
  },
  {
    name: '李雪',
    avatar: '/avatar-2.jpg',
    role: '设计师',
    content: '关系契合度分析帮助我和伴侣更好地理解彼此。知道什么时候适合深入沟通，什么时候需要给彼此空间。',
    rating: 5
  },
  {
    name: '王芳',
    avatar: '/avatar-3.jpg',
    role: '企业高管',
    content: '事业解读指引我做出了人生中最好的职业决定。2026年的高光日让我在关键时刻把握住了机会。',
    rating: 5
  },
  {
    name: '陈静',
    avatar: '/avatar-4.jpg',
    role: '自由职业者',
    content: '年度预测让我为即将到来的机会做好了准备。现在我对2026年充满期待，每一天都过得更有方向感。',
    rating: 5
  }
];

export default function Testimonials() {
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
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      
      {/* 装饰引号 */}
      <div className="absolute top-20 left-10 text-[400px] font-display text-[#efaf5a]/5 leading-none pointer-events-none select-none">
        "
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* 头部 */}
        <div className="text-center mb-16">
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#efaf5a]/30 bg-[#efaf5a]/10 mb-6 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#efaf5a]" />
            <span className="text-sm text-[#efaf5a] tracking-wider">用户评价</span>
          </div>
          
          <h2 
            className={`font-display text-4xl md:text-5xl text-white mb-4 transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            客户<span className="text-gradient-gold">怎么说</span>
          </h2>
        </div>

        {/* 评价网格 */}
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`card-mystic relative group transition-all duration-1000 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ 
                transitionDelay: `${400 + index * 100}ms`,
                transform: isVisible ? `rotate(${index % 2 === 0 ? 1 : -1}deg)` : 'rotate(0deg)'
              }}
            >
              {/* 引号图标 */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-[#efaf5a]/20" />

              {/* 评分 */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-[#efaf5a] fill-[#efaf5a]" />
                ))}
              </div>

              {/* 内容 */}
              <p className="text-white/70 leading-relaxed mb-6">
                "{testimonial.content}"
              </p>

              {/* 用户信息 */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#efaf5a]/30 group-hover:border-[#efaf5a] transition-colors"
                  />
                  <div className="absolute inset-0 rounded-full bg-[#efaf5a]/0 group-hover:bg-[#efaf5a]/10 transition-colors" />
                </div>
                <div>
                  <div className="font-display text-white">{testimonial.name}</div>
                  <div className="text-sm text-white/50">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
