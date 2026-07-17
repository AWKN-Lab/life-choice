import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    id: 1,
    name: '张先生',
    nameEn: 'Mr. Zhang',
    role: '企业高管',
    roleEn: 'Executive',
    content: '人生决策宗师帮助我做出了职业生涯中最重要的决定。精准的分析让我对自己的人生方向有了全新的认识。',
    contentEn: 'Life Decision Master helped me make the most important decision in my career. The precise analysis gave me a completely new understanding of my life direction.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
    rating: 5,
  },
  {
    id: 2,
    name: '李女士',
    nameEn: 'Ms. Li',
    role: '创业者',
    roleEn: 'Entrepreneur',
    content: '在投资决策上，宗师的建议让我避开了几个潜在的风险。这种结合古老智慧与现代科技的方式令人信服。',
    contentEn: 'In investment decisions, the Master\'s advice helped me avoid several potential risks. This combination of ancient wisdom and modern technology is convincing.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
    rating: 5,
  },
  {
    id: 3,
    name: '王先生',
    nameEn: 'Mr. Wang',
    role: '医生',
    roleEn: 'Doctor',
    content: '作为一名医生，我本对命理持怀疑态度。但宗师的准确分析改变了我的看法，现在我会定期咨询。',
    contentEn: 'As a doctor, I was skeptical about destiny analysis. But the Master\'s accurate analysis changed my mind, and now I consult regularly.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
    rating: 5,
  },
];

export function TestimonialsSection() {
  const { i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const isEnglish = i18n.language === 'en';

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="relative w-full py-24 md:py-32 bg-black">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 mb-6"
            >
              <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>format_quote</span>
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface font-serif mb-4">
              {isEnglish ? 'Client Testimonials' : '客户心声'}
            </h2>
            <p className="text-on-surface/60 max-w-2xl mx-auto">
              {isEnglish 
                ? 'Hear what our clients say about their experience'
                : '听听我们的客户如何评价他们的体验'}
            </p>
          </div>

          {/* Testimonial Card */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-b from-white/5 to-transparent border border-outline/10 rounded-2xl p-8 md:p-12"
              >
                {/* Quote Icon */}
                <div className="flex justify-center mb-6">
                  <span className="material-symbols-outlined text-gold/50 text-5xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>format_quote</span>
                </div>

                {/* Rating */}
                <div className="flex justify-center space-x-1 mb-6">
                  {[...Array(currentTestimonial.rating)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>star</span>
                  ))}
                </div>

                {/* Content */}
                <p className="text-on-surface/80 text-lg md:text-xl text-center leading-relaxed mb-8">
                  "{isEnglish ? currentTestimonial.contentEn : currentTestimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center justify-center space-x-4">
                  <img
                    src={currentTestimonial.avatar}
                    alt={isEnglish ? currentTestimonial.nameEn : currentTestimonial.name}
                    className="w-14 h-14 rounded-full bg-on-surface/10"
                  />
                  <div className="text-center">
                    <p className="text-on-surface font-medium">
                      {isEnglish ? currentTestimonial.nameEn : currentTestimonial.name}
                    </p>
                    <p className="text-on-surface/50 text-sm">
                      {isEnglish ? currentTestimonial.roleEn : currentTestimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-center items-center space-x-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="border-outline/20 text-on-surface hover:bg-on-surface/10 hover:border-gold"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </Button>

              {/* Dots */}
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'w-6 bg-gold'
                        : 'bg-on-surface/30 hover:bg-on-surface/50'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="border-outline/20 text-on-surface hover:bg-on-surface/10 hover:border-gold"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
