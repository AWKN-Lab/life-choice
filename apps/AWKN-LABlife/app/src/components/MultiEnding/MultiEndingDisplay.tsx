/**
 * 多结局引擎UI组件
 * 基于时空剧场四维数值展示 + 结局触发UI
 * 来源：时空剧场 DESIGN.md - 数值HUD设计
 */

import React from 'react';
import { useMultiEndingStore, getEndingStatus } from '@/store/multiEndingStore';
import { PRESET_ENDINGS, EndingType, FourDimensionalValues } from '@/types/multiEnding';

/**
 * 四维数值仪表盘
 */
interface ValuesDashboardProps {
  compact?: boolean;
  showLabels?: boolean;
}

export const ValuesDashboard: React.FC<ValuesDashboardProps> = ({ 
  compact = false,
  showLabels = true 
}) => {
  const values = useMultiEndingStore(state => state.values);
  
  const dimensions: (keyof FourDimensionalValues)[] = ['freedom', 'equality', 'rule', 'justice'];
  
  const dimensionConfig = {
    freedom: { label: '自由', icon: '🦅', color: 'blue' },
    equality: { label: '平等', icon: '⚖️', color: 'purple' },
    rule: { label: '规则', icon: '📜', color: 'amber' },
    justice: { label: '正义', icon: '⚔️', color: 'emerald' }
  };
  
  const colorClasses = {
    blue: { bar: 'bg-blue-500', text: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    purple: { bar: 'bg-purple-500', text: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' }
  };
  
  if (compact) {
    // 紧凑模式：横向进度条
    return (
      <div className="flex gap-3">
        {dimensions.map(dim => {
          const config = dimensionConfig[dim];
          const colors = colorClasses[config.color as keyof typeof colorClasses];
          const value = values[dim];
          
          return (
            <div key={dim} className="flex items-center gap-2">
              <span className="text-sm">{config.icon}</span>
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`${colors.bar} h-full rounded-full transition-all duration-300`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${colors.text}`}>{value}</span>
            </div>
          );
        })}
      </div>
    );
  }
  
  // 完整模式
  return (
    <div className="grid grid-cols-2 gap-4">
      {dimensions.map(dim => {
        const config = dimensionConfig[dim];
        const colors = colorClasses[config.color as keyof typeof colorClasses];
        const value = values[dim];
        
        return (
          <div 
            key={dim}
            className={`${colors.bg} rounded-xl p-4 transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config.icon}</span>
                {showLabels && (
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {config.label}
                  </span>
                )}
              </div>
              <span className={`text-2xl font-bold ${colors.text}`}>
                {value}
              </span>
            </div>
            
            {/* 进度条 */}
            <div className="h-3 bg-gray-300/50 dark:bg-gray-600/50 rounded-full overflow-hidden">
              <div 
                className={`${colors.bar} h-full rounded-full transition-all duration-500`}
                style={{ width: `${value}%` }}
              />
            </div>
            
            {/* 分段提示 */}
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * 结局解锁状态面板
 */
interface EndingStatusPanelProps {
  showPreview?: boolean;
}

export const EndingStatusPanel: React.FC<EndingStatusPanelProps> = ({ 
  showPreview = false 
}) => {
  const { unlockedEndings, preview } = getEndingStatus();
  
  const endingConfig = {
    [EndingType.HISTORICAL]: { label: '历史线', icon: '📜', color: 'amber' },
    [EndingType.DRAMATIC]: { label: '戏剧线', icon: '🎭', color: 'blue' },
    [EndingType.AFTERLIFE]: { label: '轮回线', icon: '🔄', color: 'purple' },
    [EndingType.NORMAL]: { label: '普通', icon: '📖', color: 'gray' }
  };
  
  const colorClasses = {
    amber: 'border-amber-400 bg-amber-50 dark:bg-amber-900/30',
    blue: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30',
    purple: 'border-purple-400 bg-purple-50 dark:bg-purple-900/30',
    gray: 'border-gray-400 bg-gray-50 dark:bg-gray-800'
  };
  
  return (
    <div className="space-y-3">
      {Object.values(EndingType).map(endingType => {
        const config = endingConfig[endingType as keyof typeof endingConfig];
        const isUnlocked = unlockedEndings.includes(endingType);
        const previewData = showPreview ? preview.find(p => p.type === endingType) : null;
        
        return (
          <div 
            key={endingType}
            className={`
              border-2 rounded-xl p-4 transition-all
              ${isUnlocked ? colorClasses[config.color as keyof typeof colorClasses] : 'border-gray-200 dark:border-gray-700 opacity-50'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}>
                  {config.icon}
                </span>
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {config.label}
                  </div>
                  {isUnlocked && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      ✓ 已解锁
                    </div>
                  )}
                </div>
              </div>
              
              {showPreview && previewData && !isUnlocked && (
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {previewData.progress}%
                  </div>
                  <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${previewData.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* 未解锁时的缺失条件 */}
            {showPreview && previewData && !isUnlocked && previewData.missing.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                缺失: {previewData.missing.join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * 数值变化通知
 */
interface ValueChangeNotificationProps {
  changes: { dimension: string; delta: number }[];
  onClose: () => void;
}

export const ValueChangeNotification: React.FC<ValueChangeNotificationProps> = ({ 
  changes,
  onClose 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed bottom-4 left-4 bg-on-surface/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-xl z-50">
      <div className="font-medium text-gray-800 dark:text-gray-200 mb-2">
        数值变化
      </div>
      <div className="space-y-1">
        {changes.map((change, i) => (
          <div 
            key={i}
            className={`text-sm ${change.delta > 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {change.dimension}: {change.delta > 0 ? '+' : ''}{change.delta}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 结局达成弹窗
 */
interface EndingAchievedModalProps {
  endingType: EndingType;
  onClose: () => void;
}

export const EndingAchievedModal: React.FC<EndingAchievedModalProps> = ({ 
  endingType,
  onClose 
}) => {
  const ending = PRESET_ENDINGS[endingType];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-container rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-scale-in">
        <div className="text-center">
          <div className="text-6xl mb-4">{ending.icon}</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            达成结局
          </h2>
          <h3 className="text-xl text-blue-600 dark:text-blue-400 mb-4">
            {ending.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {ending.description}
          </p>
          <button
            className="px-6 py-2 bg-blue-500 text-on-surface rounded-lg hover:bg-blue-600 transition-colors"
            onClick={onClose}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 决策选择卡片
 */
interface DecisionCardProps {
  option: {
    id: string;
    title: string;
    description?: string;
    valueChanges: { dimension: string; delta: number }[];
    isCritical?: boolean;
  };
  onSelect: (id: string) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ option, onSelect }) => {
  return (
    <div 
      className={`
        bg-surface-container rounded-xl p-4 border-2
        hover:border-blue-400 cursor-pointer transition-all
        ${option.isCritical ? 'border-amber-400' : 'border-gray-200 dark:border-gray-700'}
      `}
      onClick={() => onSelect(option.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {option.title}
            </span>
            {option.isCritical && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                关键
              </span>
            )}
          </div>
          
          {option.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {option.description}
            </p>
          )}
          
          {/* 数值变化预览 */}
          <div className="flex gap-2">
            {option.valueChanges.map((change, i) => (
              <span 
                key={i}
                className={`text-xs px-2 py-0.5 rounded ${
                  change.delta > 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {change.dimension}: {change.delta > 0 ? '+' : ''}{change.delta}
              </span>
            ))}
          </div>
        </div>
        
        <div className="text-xl text-gray-400">→</div>
      </div>
    </div>
  );
};

// === 默认导出 ===
export default {
  ValuesDashboard,
  EndingStatusPanel,
  ValueChangeNotification,
  EndingAchievedModal,
  DecisionCard
};