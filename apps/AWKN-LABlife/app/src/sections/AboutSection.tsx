import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, useInView } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { id: 'accuracy', value: 98, suffix: '%', label: '准确率', labelEn: 'Accuracy' },
  { id: 'consultations', value: 10000, suffix: '+', label: '咨询服务', labelEn: 'Consultations' },
  { id: 'experience', value: 50, suffix: '年', label: '经验积累', labelEn: 'Years Experience' },
];

function AnimatedCounter({ value }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView && ref.current) {
      const obj = { value: 0 };
      gsap.to(obj, {
        value,
        duration: 2,
        ease: 'power1.out',
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = Math.floor(obj.value).toLocaleString();
          }
        },
      });
    }
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-4xl md:text-5xl font-bold text-gold">
      0
    </span>
  );
}

export function AboutSection() {
  const { i18n } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.about-content',
        { opacity: 0, x: 50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative w-full py-24 md:py-32 bg-black"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="about-content">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 mb-6"
              >
                <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>gps_fixed</span>
              </motion.div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface font-serif mb-6">
                {isEnglish 
                  ? 'Ancient Wisdom Meets Modern AI'
                  : '古老智慧遇见现代AI'}
              </h2>

              <p className="text-on-surface/70 text-lg leading-relaxed mb-8">
                {isEnglish
                  ? 'Life Decision Master combines thousands of years of traditional metaphysics with state-of-the-art AI algorithms. Our platform analyzes your unique energy imprint to provide personalized guidance and insights.'
                  : '人生决策宗师将数千年的传统命理学知识与最先进的AI算法相结合。我们的平台分析您独特的能量印记，提供个性化的指导和洞察。'}
              </p>

              <div className="space-y-4 mb-10">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-gold" style={{ fontSize: '14px' }}>verified</span>
                  </div>
                  <p className="text-on-surface/60">
                    {isEnglish
                      ? 'Professional analysis based on classical texts'
                      : '基于经典文献的专业分析'}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-gold" style={{ fontSize: '14px' }}>psychology</span>{/* 营销页"特色"列表小图标（text-gold 14px），非张半山。P1-1 cleanup intentionally retained. */}
                  </div>
                  <p className="text-on-surface/60">
                    {isEnglish
                      ? 'AI-powered precision and personalization'
                      : 'AI驱动的精准度和个性化'}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-gold" style={{ fontSize: '14px' }}>insights</span>
                  </div>
                  <p className="text-on-surface/60">
                    {isEnglish
                      ? 'Continuous learning and improvement'
                      : '持续学习和改进'}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {stats.map((stat) => (
                  <div key={stat.id} className="text-center">
                    <div className="flex items-baseline justify-center">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      <span className="text-gold text-xl">{stat.suffix}</span>
                    </div>
                    <p className="text-on-surface/50 text-sm mt-2">
                      {isEnglish ? stat.labelEn : stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <img
                  src="/images/service-1.jpg"
                  alt="About"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              {/* Floating card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute -bottom-6 -left-6 bg-black/90 backdrop-blur-md border border-gold/30 rounded-xl p-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>group</span>
                  </div>
                  <div>
                    <p className="text-on-surface font-medium">
                      {isEnglish ? 'Trusted by' : '深受信赖'}
                    </p>
                    <p className="text-gold text-sm">
                      {isEnglish ? '10,000+ users' : '10,000+ 用户'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
