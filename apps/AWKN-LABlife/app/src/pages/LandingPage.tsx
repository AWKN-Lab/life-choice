/**
 * LandingPage - 渠道着陆页
 * 用户通过海报 QR 码扫码后到达此页面
 * 根据 UTM 参数展示不同的 CTA 内容
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUTMStore } from '@/store/utmStore';
import { trackLandingView } from '@/lib/analytics';
import { HeroSection } from '@/sections/HeroSection';
import { AboutSection } from '@/sections/AboutSection';
import { ServicesSection } from '@/sections/ServicesSection';
import { ProcessSection } from '@/sections/ProcessSection';
import { TestimonialsSection } from '@/sections/TestimonialsSection';
import { FooterSection } from '@/sections/FooterSection';

const LANDING_CONFIG: Record<string, { title: string; subtitle: string; cta: string; route: string }> = {
  kline: {
    title: '你的人生K线图',
    subtitle: '用数据可视化你的人生轨迹，发现隐藏的周期规律',
    cta: '查看我的K线',
    route: '/kline-intro',
  },
  naming: {
    title: 'AI 智能取名',
    subtitle: '结合八字五行，为你生成最合适的名字',
    cta: '开始取名',
    route: '/naming',
  },
  poster: {
    title: '人生决策宗师',
    subtitle: 'AI 驱动的命理决策助手，帮你看清每一个选择',
    cta: '立即体验',
    route: '/',
  },
};

const DEFAULT_CONFIG = LANDING_CONFIG.poster;

export default function LandingPage() {
  const navigate = useNavigate();
  const utm = useUTMStore();

  // 根据 UTM source 选择着陆内容
  const config = (utm.source && LANDING_CONFIG[utm.source]) || DEFAULT_CONFIG;

  // 埋点：着陆页访问
  useEffect(() => {
    trackLandingView();
  }, []);

  const handleCTA = () => {
    navigate(config.route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface to-surface-container flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* 图标 */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔮</span>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-on-surface mb-3">
          {config.title}
        </h1>
        <p className="text-on-surface/60 mb-8 leading-relaxed">
          {config.subtitle}
        </p>

        {/* CTA 按钮 */}
        <button
          onClick={handleCTA}
          className="w-full py-3 px-6 bg-primary text-on-primary rounded-xl font-medium text-lg
                     hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {config.cta}
        </button>

        {/* UTM 信息（调试用，生产环境可隐藏） */}
        {utm.source && (
          <p className="mt-4 text-xs text-on-surface/30">
            来源: {utm.source} / {utm.medium || '-'} / {utm.campaign || '-'}
          </p>
        )}
      </motion.div>

      {/* P3-1: 着陆页内容 sections */}
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <ProcessSection />
      <TestimonialsSection />
      <FooterSection />
    </div>
  );
}
