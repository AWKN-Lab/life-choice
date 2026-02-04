import { Sparkles } from 'lucide-react';

const quickLinks = [
  { label: '首页', href: '#hero' },
  { label: '决策模型', href: '#about' },
  { label: '算法原理', href: '#readings' },
  { label: '案例库', href: '#how-it-works' },
  { label: '博客', href: '#blog' }
];

const services = [
  { label: '第二曲线导航', href: '#' },
  { label: '动态博弈模型', href: '#' },
  { label: '资产风控评估', href: '#' },
  { label: '潜意识投影仪', href: '#' }
];

const socialLinks = [
  { label: '微信', icon: 'wechat' },
  { label: '微博', icon: 'weibo' },
  { label: '小红书', icon: 'xiaohongshu' },
  { label: '抖音', icon: 'douyin' }
];

export default function Footer() {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-black pt-20 pb-8">
      {/* 波浪分隔线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#efaf5a]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* 主要内容 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Logo和描述 */}
          <div className="lg:col-span-1">
            <a href="#hero" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#efaf5a] to-[#f3c039] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <span className="font-display text-xl text-white tracking-wider">
                人生决策红绿灯
              </span>
            </a>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              集成八字排盘与博弈算法，为你提供全场景的理性决策支持。识别非对称风险，锁定最佳时间窗口。
            </p>
            {/* 社交链接 */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <button
                  key={index}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#efaf5a]/20 flex items-center justify-center text-white/50 hover:text-[#efaf5a] transition-all hover:scale-110 hover:rotate-12"
                  title={social.label}
                >
                  <span className="text-xs font-bold">{social.label[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="font-display text-lg text-white mb-6">快速链接</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                    className="text-white/50 hover:text-[#efaf5a] hover:translate-x-1 transition-all inline-block text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 服务 */}
          <div>
            <h4 className="font-display text-lg text-white mb-6">服务</h4>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index}>
                  <a
                    href={service.href}
                    className="text-white/50 hover:text-[#efaf5a] hover:translate-x-1 transition-all inline-block text-sm"
                  >
                    {service.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 订阅 */}
          <div>
            <h4 className="font-display text-lg text-white mb-6">订阅洞察</h4>
            <p className="text-white/50 text-sm mb-4">
              获取每周命理洞察和高光日提醒
            </p>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="输入你的邮箱"
                className="input-mystic text-sm"
              />
              <button type="submit" className="btn-primary w-full text-sm py-3">
                订阅
              </button>
            </form>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-white/10 mb-8" />

        {/* 底部 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">
            © 2024 人生决策红绿灯。保留所有权利。
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-white/30 hover:text-[#efaf5a] transition-colors">
              隐私政策
            </a>
            <a href="#" className="text-white/30 hover:text-[#efaf5a] transition-colors">
              服务条款
            </a>
            <a href="#" className="text-white/30 hover:text-[#efaf5a] transition-colors">
              联系我们
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
