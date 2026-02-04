import { useState, useEffect } from 'react';
import { X, Calendar, User, Sparkles } from 'lucide-react';
import { calculateBazi, calculateHighlightDays } from '../lib/bazi-engine';
import type { BirthInfo, UserBazi } from '../lib/bazi-engine';
import { getPointsData, reducePoints } from '../utils/pointsSystem';
import PointsInsufficientModal from './PointsInsufficientModal';

interface BirthInputModalProps {
  onClose: () => void;
  onSubmit: (response: any) => void;
  onGoRegister?: () => void;
}

export default function BirthInputModal({ onClose, onSubmit, onGoRegister }: BirthInputModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [userBazi, setUserBazi] = useState<UserBazi | null>(null);
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    year: 1995,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    isLunar: false,
    gender: 'male'
  });
  // 积分不足提示窗口状态
  const [showPointsModal, setShowPointsModal] = useState(false);
  // 生成决策分析所需积分
  const REQUIRED_POINTS = 100;

  const handleSubmit = async () => {
    if (step === 1) {
      // 步骤1：只计算八字，进入步骤2
      setLoading(true);
      try {
        const userBazi = calculateBazi(birthInfo);
        setUserBazi(userBazi);
        setStep(2);
      } catch (error) {
        console.error('计算八字失败:', error);
        alert('计算八字失败，请重试');
      } finally {
        setLoading(false);
      }
    } else {
      // 步骤2：处理数据并提交
      // 检查积分
      const pointsData = getPointsData();
      
      if (pointsData.balance < REQUIRED_POINTS) {
        // 积分不足，显示提示窗口
        setShowPointsModal(true);
        return;
      }
      
      // 积分足够，扣除积分
      const success = reducePoints(REQUIRED_POINTS, '生成决策分析');
      if (!success) {
        // 扣除积分失败
        alert('积分扣除失败，请重试');
        return;
      }
      
      setLoading(true);
      try {
        // 1. 前端计算八字和高光日
        const userBazi = calculateBazi(birthInfo);
        const highlightDays = calculateHighlightDays(userBazi);
        
        // 2. 模拟AI回答（实际项目中需要在后端调用DashScope API）
        let aiAnswer = '';
        try {
          // 这里应该是后端API调用，现在使用模拟数据
          // 注意：dashscope是Node.js包，不能在浏览器中直接使用
          // 实际项目中需要在后端实现API调用
          aiAnswer = '根据您的八字分析，2026年是您事业发展的重要年份。建议您在贵人相助的月份主动寻求合作机会，在财运亨通的时期谨慎投资，同时保持良好的人际关系。';
          setAiAnswer(aiAnswer);
        } catch (error) {
          console.error('API调用失败:', error);
          aiAnswer = '抱歉，AI服务暂时不可用。请稍后再试。';
          setAiAnswer(aiAnswer);
        }
        
        // 3. 构建响应数据
        const data = {
          userBazi,
          highlightDays,
          fourAspects: {
            career: highlightDays.filter(day => day.type === '事业高升').length,
            wealth: highlightDays.filter(day => day.type === '财运亨通').length,
            noble: highlightDays.filter(day => day.type === '贵人相助').length,
            romance: highlightDays.filter(day => day.type === '桃花盛开').length
          },
          aiAnswer
        };
        
        onSubmit(data);
        onClose();
      } catch (error) {
        console.error('处理数据失败:', error);
        const aiAnswer = '抱歉，服务暂时不可用。请稍后再试。';
        setAiAnswer(aiAnswer);
        
        // 即使出错也计算八字和高光日
        const userBazi = calculateBazi(birthInfo);
        const highlightDays = calculateHighlightDays(userBazi);
        
        const data = {
          userBazi,
          highlightDays,
          fourAspects: {
            career: highlightDays.filter(day => day.type === '事业高升').length,
            wealth: highlightDays.filter(day => day.type === '财运亨通').length,
            noble: highlightDays.filter(day => day.type === '贵人相助').length,
            romance: highlightDays.filter(day => day.type === '桃花盛开').length
          },
          aiAnswer
        };
        
        onSubmit(data);
        onClose();
      } finally {
        setLoading(false);
      }
    }
  };

  const years = Array.from({ length: 60 }, (_, i) => 1970 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // 处理积分不足提示窗口的回调
  const handleGoRegister = () => {
    // 保存用户数据到localStorage
    const userData = {
      birthInfo,
      userQuestion,
      step,
      userBazi,
      timestamp: Date.now()
    };
    localStorage.setItem('birthInputData', JSON.stringify(userData));
    
    setShowPointsModal(false);
    if (onGoRegister) {
      onGoRegister();
    }
  };

  // 数据恢复功能
  useEffect(() => {
    // 检查是否有保存的数据
    const savedData = localStorage.getItem('birthInputData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // 恢复数据
        setBirthInfo(parsedData.birthInfo);
        setUserQuestion(parsedData.userQuestion);
        setStep(parsedData.step);
        if (parsedData.userBazi) {
          setUserBazi(parsedData.userBazi);
        }
        // 清除保存的数据，因为已经恢复
        localStorage.removeItem('birthInputData');
      } catch (error) {
        console.error('恢复数据失败:', error);
        localStorage.removeItem('birthInputData');
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-2xl border border-[#efaf5a]/30 shadow-2xl overflow-hidden animate-scale-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        {/* 头部 */}
        <div className="p-8 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#efaf5a] to-[#f3c039] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="font-display text-2xl text-white">开启你的2026高光之旅</h3>
              <p className="text-white/50 text-sm">输入出生信息，获取专属高光日历</p>
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-[#efaf5a]' : 'bg-white/10'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-[#efaf5a]' : 'bg-white/10'}`} />
          </div>
        </div>

        {/* 表单内容 */}
        <div className="p-8 pt-0">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              {/* 日历类型选择 */}
              <div>
                <label className="block text-sm text-white/70 mb-3">日历类型</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setBirthInfo({ ...birthInfo, isLunar: false })}
                    className={`flex-1 py-4 px-6 rounded-xl border transition-all ${
                      !birthInfo.isLunar 
                        ? 'border-[#efaf5a] bg-[#efaf5a]/10 text-[#efaf5a]' 
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    <Calendar className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">阳历</span>
                  </button>
                  <button
                    onClick={() => setBirthInfo({ ...birthInfo, isLunar: true })}
                    className={`flex-1 py-4 px-6 rounded-xl border transition-all ${
                      birthInfo.isLunar 
                        ? 'border-[#efaf5a] bg-[#efaf5a]/10 text-[#efaf5a]' 
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    <Calendar className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">农历</span>
                  </button>
                </div>
              </div>

              {/* 出生日期 */}
              <div>
                <label className="block text-sm text-white/70 mb-3">出生日期</label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={birthInfo.year}
                    onChange={(e) => setBirthInfo({ ...birthInfo, year: parseInt(e.target.value) })}
                    className="select-mystic"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                  <select
                    value={birthInfo.month}
                    onChange={(e) => setBirthInfo({ ...birthInfo, month: parseInt(e.target.value) })}
                    className="select-mystic"
                  >
                    {months.map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                  <select
                    value={birthInfo.day}
                    onChange={(e) => setBirthInfo({ ...birthInfo, day: parseInt(e.target.value) })}
                    className="select-mystic"
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}日</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 出生时间 */}
              <div>
                <label className="block text-sm text-white/70 mb-3">出生时间</label>
                <div className="flex gap-3">
                  <select
                    value={birthInfo.hour}
                    onChange={(e) => setBirthInfo({ ...birthInfo, hour: parseInt(e.target.value) })}
                    className="select-mystic flex-1"
                  >
                    {hours.map(hour => (
                      <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={birthInfo.minute}
                    onChange={(e) => setBirthInfo({ ...birthInfo, minute: parseInt(e.target.value) })}
                    className="select-mystic flex-1"
                  >
                    {minutes.map(minute => (
                      <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 性别 */}
              <div>
                <label className="block text-sm text-white/70 mb-3">性别</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setBirthInfo({ ...birthInfo, gender: 'male' })}
                    className={`flex-1 py-4 px-6 rounded-xl border transition-all ${
                      birthInfo.gender === 'male' 
                        ? 'border-[#efaf5a] bg-[#efaf5a]/10 text-[#efaf5a]' 
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    <User className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">男</span>
                  </button>
                  <button
                    onClick={() => setBirthInfo({ ...birthInfo, gender: 'female' })}
                    className={`flex-1 py-4 px-6 rounded-xl border transition-all ${
                      birthInfo.gender === 'female' 
                        ? 'border-[#efaf5a] bg-[#efaf5a]/10 text-[#efaf5a]' 
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    <User className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">女</span>
                  </button>
                </div>
              </div>

              {/* 下一步按钮 */}
              <button
                onClick={handleSubmit}
                className="btn-primary w-full mt-8"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    计算中...
                  </span>
                ) : (
                  '下一步'
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              {/* 确认信息 */}
              <div className="bg-white/5 rounded-xl p-6 space-y-4">
                <h4 className="font-display text-lg text-white mb-4">人生决策红绿灯</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/50">日历类型：</span>
                    <span className="text-white">{birthInfo.isLunar ? '农历' : '阳历'}</span>
                  </div>
                  <div>
                    <span className="text-white/50">性别：</span>
                    <span className="text-white">{birthInfo.gender === 'male' ? '男' : '女'}</span>
                  </div>
                  <div>
                    <span className="text-white/50">出生日期：</span>
                    <span className="text-white">{birthInfo.year}年{birthInfo.month}月{birthInfo.day}日</span>
                  </div>
                  <div>
                    <span className="text-white/50">出生时间：</span>
                    <span className="text-white">{String(birthInfo.hour).padStart(2, '0')}:{String(birthInfo.minute).padStart(2, '0')}</span>
                  </div>
                </div>
                {userBazi && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-xs text-white/50 mb-1">年柱</div>
                        <div className="text-lg font-display text-[#efaf5a]">{userBazi.yearPillar}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 mb-1">月柱</div>
                        <div className="text-lg font-display text-[#efaf5a]">{userBazi.monthPillar}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 mb-1">日柱</div>
                        <div className="text-lg font-display text-[#efaf5a]">{userBazi.dayPillar}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 mb-1">时柱</div>
                        <div className="text-lg font-display text-[#efaf5a]">{userBazi.hourPillar}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 说明文字 */}
              <div className="flex items-start gap-3 text-sm text-white/50">
                <Sparkles className="w-5 h-5 text-[#efaf5a] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <textarea
                    placeholder="请输入您的问题..."
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    className="input-mystic w-full min-h-[100px] resize-none"
                  />
                </div>
              </div>

              {/* AI回答显示 */}
              {aiAnswer && (
                <div className="bg-[#efaf5a]/10 rounded-xl p-6 border border-[#efaf5a]/30">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#efaf5a] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-display text-lg text-white mb-2">AI回答</h5>
                      <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 按钮组 */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  返回修改
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      生成中...
                    </span>
                  ) : (
                    '生成决策分析'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 积分不足提示窗口 */}
      <PointsInsufficientModal
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        onGoRegister={handleGoRegister}
        currentPoints={getPointsData().balance}
        requiredPoints={REQUIRED_POINTS}
      />
    </div>
  );
}