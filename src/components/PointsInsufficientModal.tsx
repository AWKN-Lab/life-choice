
import { X, Gift, AlertCircle } from 'lucide-react';

interface PointsInsufficientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoRegister: () => void;
  currentPoints: number;
  requiredPoints: number;
}

export default function PointsInsufficientModal({
  isOpen,
  onClose,
  onGoRegister,
  currentPoints,
  requiredPoints
}: PointsInsufficientModalProps) {
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

        <div className="bg-gradient-to-br from-[#ff6b6b] to-[#ee5a52] p-8 text-center">
          <AlertCircle className="w-12 h-12 text-white mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">积分不足</h2>
          <p className="text-white/80 text-sm">
            生成决策分析需要 {requiredPoints} 积分
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#f8f8f8] rounded-xl p-4 text-center">
            <p className="text-[#666666] mb-2">当前积分</p>
            <p className="text-3xl font-bold text-[#ff6b6b]">{currentPoints}</p>
          </div>

          <div className="bg-gradient-to-r from-[#4ecdc4]/10 to-[#45b7d1]/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-5 h-5 text-[#4ecdc4] flex-shrink-0" />
              <h3 className="font-medium text-[#1a1a1a]">注册即送1000积分</h3>
            </div>
            <p className="text-sm text-[#666666] ml-8">
              完成注册后，您将获得1000积分奖励，可立即使用所有功能
            </p>
          </div>

          <div className="space-y-3 mt-4">
            <button
              onClick={onGoRegister}
              className="w-full bg-gradient-to-r from-[#4ecdc4] to-[#45b7d1] text-white py-4 rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              去注册
            </button>
            <button
              onClick={onClose}
              className="w-full border border-[#e5e5e5] text-[#666666] py-4 rounded-xl font-medium hover:bg-[#f8f8f8] transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
