import { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Gift } from 'lucide-react';
import { getPointsData, addPoints, formatPoints, checkDailyLoginReward, initializeAdminPoints } from '../utils/pointsSystem';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export default function LoginModal({ isOpen, onClose, defaultTab = 'login' }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pointsInfo, setPointsInfo] = useState(() => getPointsData());

  const ADMIN_EMAIL = '10919669@qq.com';
  const ADMIN_PASSWORD = 'DOSSEN123456';

  useEffect(() => {
    setPointsInfo(getPointsData());
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      
      if (activeTab === 'login') {
        // 初始化管理员积分
        initializeAdminPoints();
        
        // 检查每日登录奖励
        const loginReward = checkDailyLoginReward();
        
        if (formData.email === ADMIN_EMAIL && formData.password === ADMIN_PASSWORD) {
          const pointsAfterReward = getPointsData().balance;
          alert(`管理员登录成功！欢迎回来，院长LAY。\n\n🎁 每日登录奖励：+${loginReward.points} 积分\n\n当前积分：${formatPoints(pointsAfterReward)}\n\n管理员拥有无限积分，可免费使用所有功能。`);
          localStorage.setItem('userRole', 'admin');
          localStorage.setItem('userEmail', formData.email);
          setPointsInfo(getPointsData());
          onClose();
        } else {
          const pointsAfterReward = getPointsData().balance;
          alert(`登录成功！欢迎加入AWKN LAB。\n\n🎁 每日登录奖励：+${loginReward.points} 积分\n\n当前积分：${formatPoints(pointsAfterReward)}\n\n使用积分可以：\n• 与院长LAY对话（100积分/次）\n• 其他会员权益功能`);
          localStorage.setItem('userRole', 'user');
          localStorage.setItem('userEmail', formData.email);
          setPointsInfo(getPointsData());
          onClose();
        }
      } else {
          addPoints(1000, 'register', '注册赠送');
          const pointsAfterReward = getPointsData().balance;
          alert(`注册成功！欢迎加入AWKN LAB。\n\n🎁 新人礼包已发放：\n• 积分 +1000\n• 每日签到 +100 积分\n• 充值 1元 = 500 积分\n\n当前积分：${formatPoints(pointsAfterReward)}\n\n使用积分可以：\n• 与院长LAY对话（100积分/次）\n• 其他会员权益功能`);
          localStorage.setItem('userRole', 'user');
          localStorage.setItem('userEmail', formData.email);
          setPointsInfo(getPointsData());
          onClose();
        }
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in z-[10000]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center hover:bg-[#e5e5e5] transition-colors z-10"
        >
          <X className="w-5 h-5 text-[#666666]" />
        </button>

        <div className="bg-gradient-to-br from-[#d4acfe] to-[#b388ff] p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            {activeTab === 'login' ? '欢迎回来' : '加入AWKN'}
          </h2>
          <p className="text-white/80 text-sm">
            {activeTab === 'login' 
              ? '登录你的账户，开启智慧决策之旅' 
              : '注册成为研究员，建立你的战略体系'}
          </p>
        </div>

        <div className="flex border-b border-[#e5e5e5]">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'login'
                ? 'text-[#d4acfe] border-b-2 border-[#d4acfe]'
                : 'text-[#666666] hover:text-[#1a1a1a]'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'register'
                ? 'text-[#d4acfe] border-b-2 border-[#d4acfe]'
                : 'text-[#666666] hover:text-[#1a1a1a]'
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {activeTab === 'register' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
              <input
                type="text"
                name="username"
                placeholder="用户名"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#d4acfe]/50 focus:border-[#d4acfe] transition-all"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
            <input
                type="email"
                name="email"
                placeholder="邮箱地址"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#d4acfe]/50 focus:border-[#d4acfe] transition-all"
                required
              />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
            <input
                type="password"
                name="password"
                placeholder="密码"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#d4acfe]/50 focus:border-[#d4acfe] transition-all"
                required
              />
          </div>

          {activeTab === 'register' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="确认密码"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3.5 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#d4acfe]/50 focus:border-[#d4acfe] transition-all"
                required
              />
            </div>
          )}

          {activeTab === 'login' && (
            <div className="flex justify-end">
              <a href="#" className="text-sm text-[#d4acfe] hover:underline">
                忘记密码？
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#d4acfe] to-[#b388ff] text-white py-4 rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {activeTab === 'login' ? '登录中...' : '注册中...'}
              </span>
            ) : (
              activeTab === 'login' ? '登录' : '注册'
            )}
          </button>
        </form>

        <div className="px-6 pb-6 text-center">
          {activeTab === 'login' && pointsInfo.balance > 0 && (
            <div className="bg-gradient-to-r from-[#d4acfe]/10 to-[#b388ff]/10 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-center gap-2">
                <Gift className="w-5 h-5 text-[#d4acfe]" />
                <span className="text-sm font-medium text-[#1a1a1a]">
                  当前积分：<span className="text-[#d4acfe] font-bold">{formatPoints(pointsInfo.balance)}</span>
                </span>
              </div>
            </div>
          )}
          
          <p className="text-xs text-[#999999]">
            {activeTab === 'login' 
              ? '还没有账户？' 
              : '已有账户？'}
            <button
              onClick={() => setActiveTab(activeTab === 'login' ? 'register' : 'login')}
              className="text-[#d4acfe] hover:underline ml-1"
            >
              {activeTab === 'login' ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
