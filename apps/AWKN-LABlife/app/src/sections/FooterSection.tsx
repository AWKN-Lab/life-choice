import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const footerLinks = [
  {
    title: '服务',
    titleEn: 'Services',
    links: [
      { label: '八字分析', labelEn: 'Bazi Analysis', href: '/#services' },
      { label: '风水咨询', labelEn: 'Feng Shui', href: '/#services' },
      { label: '择日服务', labelEn: 'Date Selection', href: '/#services' },
    ],
  },
  {
    title: '关于',
    titleEn: 'About',
    links: [
      { label: '关于我们', labelEn: 'About Us', href: '/#about' },
      { label: '咨询流程', labelEn: 'Process', href: '/#process' },
      { label: '客户评价', labelEn: 'Testimonials', href: '/#testimonials' },
    ],
  },
  {
    title: '支持',
    titleEn: 'Support',
    links: [
      { label: '开始咨询', labelEn: 'Start Consult', href: '/consult' },
      { label: '会员服务', labelEn: 'Membership', href: '/membership' },
      { label: '联系客服', labelEn: 'Contact', href: '/contact' },
    ],
  },
];

export function FooterSection() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-black border-t border-outline/10">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-6">
                <span className="material-symbols-outlined text-gold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>auto_awesome</span>
                <span className="text-xl font-bold text-gold-gradient font-serif">
                  {t('app.name')}
                </span>
              </Link>
              <p className="text-on-surface/60 text-sm leading-relaxed mb-6 max-w-sm">
                {isEnglish
                  ? 'Blending ancient Eastern wisdom with cutting-edge AI to provide precise life guidance.'
                  : '融合古老东方智慧与前沿AI技术，为您提供精准的人生指引。'}
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-on-surface/50 text-sm">
                  <span className="material-symbols-outlined text-gold" style={{ fontSize: '16px' }}>mail</span>
                  <span>contact@lifedecision.master</span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface/50 text-sm">
                  <span className="material-symbols-outlined text-gold" style={{ fontSize: '16px' }}>call</span>
                  <span>+86 400-888-8888</span>
                </div>
                <div className="flex items-center space-x-3 text-on-surface/50 text-sm">
                  <span className="material-symbols-outlined text-gold" style={{ fontSize: '16px' }}>location_on</span>
                  <span>{isEnglish ? 'Shanghai, China' : '中国·上海'}</span>
                </div>
              </div>
            </div>

            {/* Links */}
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="text-on-surface font-medium mb-4">
                  {isEnglish ? group.titleEn : group.title}
                </h4>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-on-surface/50 text-sm hover:text-gold transition-colors"
                      >
                        {isEnglish ? link.labelEn : link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="mt-16 pt-8 border-t border-outline/10">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <p className="text-on-surface/40 text-sm">
                © {currentYear} {t('app.name')}. {isEnglish ? 'All rights reserved.' : '保留所有权利。'}
              </p>
              
              <div className="flex items-center space-x-6">
                <Link to="/privacy" className="text-on-surface/40 text-sm hover:text-on-surface/60 transition-colors">
                  {isEnglish ? 'Privacy Policy' : '隐私政策'}
                </Link>
                <Link to="/terms" className="text-on-surface/40 text-sm hover:text-on-surface/60 transition-colors">
                  {isEnglish ? 'Terms of Service' : '服务条款'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
