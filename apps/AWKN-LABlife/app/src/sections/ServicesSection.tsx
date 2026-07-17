import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    id: 'bazi',
    title: '八字分析',
    titleEn: 'Bazi Analysis',
    description: '基于出生时间的深度命理分析，揭示您的天赋潜能与人生轨迹',
    descriptionEn: 'In-depth destiny analysis based on birth time',
    image: '/images/service-1.jpg',
    icon: 'auto_awesome',
  },
  {
    id: 'fengshui',
    title: '风水咨询',
    titleEn: 'Feng Shui Consultation',
    description: '优化生活与工作环境能量流动，创造和谐空间',
    descriptionEn: 'Optimize energy flow in living and working spaces',
    image: '/images/service-2.jpg',
    icon: 'explore',
  },
  {
    id: 'zeri',
    title: '择日服务',
    titleEn: 'Date Selection',
    description: '为重要事件选择最佳时机，把握天时地利',
    descriptionEn: 'Choose the best timing for important events',
    image: '/images/service-3.jpg',
    icon: 'calendar_month',
  },
];

export function ServicesSection() {
  const { t, i18n } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        '.services-title',
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );

      // Cards animation
      const cards = cardsRef.current?.querySelectorAll('.service-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, rotateX: 45, y: 100 },
          {
            opacity: 1,
            rotateX: 0,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const isEnglish = i18n.language === 'en';

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative w-full py-24 md:py-32 bg-black"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 mb-6"
          >
            <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>auto_awesome</span>
          </motion.div>
          
          <h2 className="services-title text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface font-serif mb-4">
            {t('nav.services')}
          </h2>
          <p className="services-title text-on-surface/60 max-w-2xl mx-auto">
            {isEnglish 
              ? 'Ancient wisdom combined with modern technology to provide professional life guidance'
              : '古老智慧与现代科技相结合，为您提供专业的人生指引'}
          </p>
        </div>

        {/* Service Cards */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
        >
          {services.map((service) => {
            return (
              <motion.div
                key={service.id}
                className="service-card group relative overflow-hidden rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-outline/10 hover:border-gold/30 transition-all duration-500"
                style={{ perspective: '1000px' }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                {/* Card Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={isEnglish ? service.titleEn : service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                  {/* Icon */}
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-gold/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>{service.icon}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-on-surface mb-3 group-hover:text-gold transition-colors">
                    {isEnglish ? service.titleEn : service.title}
                  </h3>
                  <p className="text-on-surface/60 text-sm leading-relaxed">
                    {isEnglish ? service.descriptionEn : service.description}
                  </p>
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-gold/5 to-transparent" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
