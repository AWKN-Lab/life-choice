import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    id: 1,
    title: '提交问题',
    titleEn: 'Submit Question',
    description: '描述您的人生困惑或决策难题，系统会自动分析您的问题类型',
    descriptionEn: 'Describe your life confusion or decision dilemma',
    icon: 'chat',
  },
  {
    id: 2,
    title: '智能分析',
    titleEn: 'AI Analysis',
    description: 'AI宗师分析您的能量格局，结合古老智慧与现代算法',
    descriptionEn: 'AI Master analyzes your energy pattern',
    icon: 'psychology',
  },
  {
    id: 3,
    title: '获得指引',
    titleEn: 'Get Guidance',
    description: '接收个性化的深度洞察报告，为您的人生决策提供参考',
    descriptionEn: 'Receive personalized in-depth insights',
    icon: 'description',
  },
];

export function ProcessSection() {
  const { i18n } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Timeline line animation
      gsap.fromTo(
        '.timeline-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.5,
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: timelineRef.current,
            start: 'top 80%',
          },
        }
      );

      // Steps animation
      const stepElements = timelineRef.current?.querySelectorAll('.process-step');
      if (stepElements) {
        gsap.fromTo(
          stepElements,
          { opacity: 0, scale: 0 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.3,
            ease: 'back.out',
            scrollTrigger: {
              trigger: timelineRef.current,
              start: 'top 80%',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-24 md:py-32 bg-black"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 mb-6"
            >
              <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>psychology</span>{/* 营销页 section header 装饰图标（text-gold 12x12），非张半山。P1-1 cleanup intentionally retained. */}
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface font-serif mb-4">
              {isEnglish ? 'Consultation Process' : '咨询流程'}
            </h2>
            <p className="text-on-surface/60 max-w-2xl mx-auto">
              {isEnglish 
                ? 'Simple three steps to get your personalized guidance'
                : '简单三步，获取您的专属人生指引'}
            </p>
          </div>

          {/* Timeline */}
          <div ref={timelineRef} className="relative">
            {/* Timeline Line - Desktop */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-on-surface/10">
              <div className="timeline-line origin-left h-full bg-gradient-to-r from-gold/50 via-gold to-gold/50" />
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {steps.map((step, index) => {
                return (
                  <motion.div
                    key={step.id}
                    className="process-step relative"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                  >
                    {/* Step Number */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center">
                          <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>{step.icon}</span>
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">
                          {step.id}
                        </div>
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-on-surface mb-3">
                        {isEnglish ? step.titleEn : step.title}
                      </h3>
                      <p className="text-on-surface/60 text-sm leading-relaxed">
                        {isEnglish ? step.descriptionEn : step.description}
                      </p>
                    </div>

                    {/* Connector - Mobile */}
                    {index < steps.length - 1 && (
                      <div className="md:hidden flex justify-center my-6">
                        <div className="w-0.5 h-8 bg-gradient-to-b from-gold/50 to-gold/20" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
