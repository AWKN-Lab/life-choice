import { useState } from 'react';
import { Menu, X, Sparkles, User, LogOut } from 'lucide-react';
import { getUserInfo } from '../services/authService';
import { getPointsData, formatPoints } from '../utils/pointsSystem';

interface NavbarProps {
  scrolled: boolean;
  onStartClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  isAuthenticated: boolean;
}

export default function Navbar({ scrolled, onStartClick, onLoginClick, onLogoutClick, isAuthenticated }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // 获取用户信息
  const userInfo = getUserInfo();
  const pointsData = getPointsData();

  const navLinks = [
    { label: '首页', href: '#hero' },
    { label: '决策模型', href: '#about' },
    { label: '算法原理', href: '#readings' },
    { label: '案例库', href: '#how-it-works' },
    { label: '博客', href: '#blog' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <a 
          href="#hero" 
          onClick={(e) => { e.preventDefault(); scrollToSection('#hero'); }}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#efaf5a] to-[#f3c039] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <span className="font-display text-xl text-white tracking-wider">
            人生决策红绿灯
          </span>
        </a>

        {/* 桌面导航 */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
              className="text-sm text-white/70 hover:text-[#efaf5a] transition-colors duration-300 relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-1/2 w-0 h-px bg-[#efaf5a] transition-all duration-300 group-hover:w-full group-hover:left-0" />
            </a>
          ))}
        </div>

        {/* 用户信息和登录/登出按钮 */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              {/* 用户信息 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#efaf5a] to-[#f3c039] flex items-center justify-center">
                  <User className="w-4 h-4 text-black" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/70">{userInfo.email}</div>
                  <div className="text-xs text-[#efaf5a]">积分: {formatPoints(pointsData.balance)}</div>
                </div>
              </div>
              {/* 登出按钮 */}
              <button
                onClick={onLogoutClick}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-[#efaf5a] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>登出</span>
              </button>
            </div>
          ) : (
            /* 登录按钮 */
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-[#efaf5a] transition-colors"
            >
              <User className="w-4 h-4" />
              <span>登录</span>
            </button>
          )}
        </div>

        {/* CTA按钮 */}
        <div className="hidden md:block">
          <button
            onClick={onStartClick}
            className="btn-primary text-sm py-3 px-6"
          >
            开启人生外挂
          </button>
        </div>

        {/* 移动端菜单按钮 */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 glass border-t border-[#efaf5a]/20">
            <div className="py-4 px-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                  className="block text-white/70 hover:text-[#efaf5a] transition-colors py-2"
                >
                  {link.label}
                </a>
              ))}
              
              {/* 用户信息和登录/登出按钮 */}
              {isAuthenticated ? (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#efaf5a] to-[#f3c039] flex items-center justify-center">
                      <User className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <div className="text-sm text-white/70">{userInfo.email}</div>
                      <div className="text-xs text-[#efaf5a]">积分: {formatPoints(pointsData.balance)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogoutClick();
                    }}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-[#efaf5a] transition-colors py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>登出</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-[#efaf5a] transition-colors py-2"
                >
                  <User className="w-4 h-4" />
                  <span>登录</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartClick();
                }}
                className="btn-primary w-full text-sm py-3 mt-4"
              >
                开启人生外挂
              </button>
            </div>
          </div>
        )}
    </nav>
  );
}
