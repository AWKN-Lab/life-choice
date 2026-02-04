import { useState, useEffect } from 'react';
import type { UserBazi, HighlightDay } from './lib/bazi-engine';
import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import About from './sections/About';
import Readings from './sections/Readings';
import HowItWorks from './sections/HowItWorks';
import Testimonials from './sections/Testimonials';
import Blog from './sections/Blog';
import CTA from './sections/CTA';
import Footer from './sections/Footer';
import BirthInputModal from './components/BirthInputModal';
import ResultDashboard from './components/ResultDashboard';
import ParticleBackground from './components/ParticleBackground';
import LoginModal from './components/LoginModal';
import { initializeAuth, logout } from './services/authService';

function App() {
  const [scrolled, setScrolled] = useState(false);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [userBazi, setUserBazi] = useState<UserBazi | null>(null);
  const [highlightDays, setHighlightDays] = useState<HighlightDay[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [fourAspects, setFourAspects] = useState<{
    career: number;
    wealth: number;
    noble: number;
    romance: number;
  } | null>(null);
  // 认证相关状态
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = () => {
      const authenticated = initializeAuth();
      setIsAuthenticated(authenticated);
      
      // 禁用自动弹出登录页面
      // if (!authenticated) {
      //   setShowLoginModal(true);
      // }
    };

    initAuth();
  }, []);

  const handleStartClick = () => {
    setShowBirthModal(true);
  };

  const handleBirthSubmit = (response: any) => {
    const { userBazi, fourAspects, highlightDays, aiAnswer } = response;
    
    setUserBazi(userBazi);
    setHighlightDays(highlightDays);
    setFourAspects(fourAspects);
    if (aiAnswer) {
      setAiAnswer(aiAnswer);
    }
    setShowBirthModal(false);
    setShowResults(true);
    
    // 滚动到结果区域
    setTimeout(() => {
      const resultsSection = document.getElementById('results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setUserBazi(null);
    setHighlightDays([]);
    setAiAnswer('');
    setFourAspects(null);
  };

  // 处理登录/注册完成
  const handleAuthComplete = () => {
    setIsAuthenticated(true);
    setShowLoginModal(false);
  };

  // 处理登录按钮点击
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // 处理登出按钮点击
  const handleLogoutClick = () => {
    logout();
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      {/* 粒子背景 */}
      <ParticleBackground />
      
      {/* 导航栏 */}
      <Navbar 
        scrolled={scrolled} 
        onStartClick={handleStartClick}
        onLoginClick={handleLoginClick}
        onLogoutClick={handleLogoutClick}
        isAuthenticated={isAuthenticated}
      />
      
      {/* 主内容 */}
      <main className="relative z-10">
        {/* 结果展示区域 - 优先显示 */}
        {showResults && userBazi && (
          <div id="results-section">
            <ResultDashboard 
              bazi={userBazi}
              highlightDays={highlightDays}
              fourAspects={fourAspects}
              aiAnswer={aiAnswer}
              onClose={handleCloseResults}
            />
          </div>
        )}
        
        {/* 主页内容 - 仅在未显示结果时显示 */}
        {!showResults && (
          <>
            {/* 主视觉区 */}
            <Hero onStartClick={handleStartClick} />
            
            {/* 关于命理 */}
            <About />
            
            {/* 解读类型 */}
            <Readings />
            
            {/* 工作原理 */}
            <HowItWorks />
            
            {/* 客户评价 */}
            <Testimonials />
            
            {/* 博客 */}
            <Blog />
            
            {/* 行动号召 */}
            <CTA onStartClick={handleStartClick} />
          </>
        )}
      </main>
      
      {/* 页脚 */}
      <Footer />
      
      {/* 出生信息输入弹窗 */}
      {showBirthModal && (
        <BirthInputModal 
          onClose={() => setShowBirthModal(false)}
          onSubmit={handleBirthSubmit}
          onGoRegister={() => setShowLoginModal(true)}
        />
      )}
      
      {/* 登录/注册弹窗 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleAuthComplete}
        defaultTab="register"
      />
    </div>
  );
}

export default App;