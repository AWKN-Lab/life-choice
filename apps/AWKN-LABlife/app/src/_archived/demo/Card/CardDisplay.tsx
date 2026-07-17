/**
 * 经验卡牌展示组件
 * 基于时空剧场卡牌UI设计
 * 来源：时空剧场 DESIGN.md - 卡牌样式
 */

import React, { useState } from 'react';
import { useCardStore, triggerCardReward } from '@/store/cardStore';
import { PRESET_CARDS, CardRarity } from '@/types/card';
import type { CollectedCard, CardBase } from '@/types/card';

/**
 * 卡牌稀有度样式配置
 */
const rarityStyles: Record<CardRarity, { bg: string; border: string; glow: string; label: string }> = {
  [CardRarity.COMMON]: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    glow: 'shadow-gray-400/50',
    label: 'text-gray-600 dark:text-gray-400'
  },
  [CardRarity.RARE]: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-400 dark:border-blue-500',
    glow: 'shadow-blue-400/50',
    label: 'text-blue-600 dark:text-blue-400'
  },
  [CardRarity.EPIC]: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    border: 'border-purple-400 dark:border-purple-500',
    glow: 'shadow-purple-400/50',
    label: 'text-purple-600 dark:text-purple-400'
  },
  [CardRarity.LEGENDARY]: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-400 dark:border-amber-500',
    glow: 'shadow-amber-400/50',
    label: 'text-amber-600 dark:text-amber-400'
  }
};

/**
 * 单张卡牌组件
 */
interface CardProps {
  cardId: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  cardId, 
  showDetails = false,
  size = 'md',
  onClick 
}) => {
  const cardInfo = PRESET_CARDS[cardId];
  
  if (!cardInfo) {
    return (
      <div className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xs">
        Unknown
      </div>
    );
  }
  
  const rarityStyle = rarityStyles[cardInfo.rarity];
  
  const sizeClasses = {
    sm: 'w-16 h-24 text-xs p-2',
    md: 'w-24 h-32 text-sm p-3',
    lg: 'w-32 h-40 text-base p-4'
  };
  
  return (
    <div 
      className={`
        ${sizeClasses[size]}
        ${rarityStyle.bg}
        border-2 ${rarityStyle.border}
        rounded-xl
        shadow-lg ${rarityStyle.glow}
        transition-all duration-200
        hover:scale-105 hover:shadow-xl
        cursor-pointer
        flex flex-col items-center justify-between
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={onClick}
    >
      {/* 图标 */}
      <div className="text-2xl">{cardInfo.icon}</div>
      
      {/* 名称 */}
      <div className={`font-medium text-center ${rarityStyle.label}`}>
        {cardInfo.name}
      </div>
      
      {/* 稀有度标签 */}
      <div className={`text-xs ${rarityStyle.label} capitalize`}>
        {cardInfo.rarity}
      </div>
      
      {/* 详细信息 */}
      {showDetails && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
          {cardInfo.effect.description}
        </div>
      )}
    </div>
  );
};

/**
 * 卡牌收集展示面板
 */
interface CardCollectionPanelProps {
  className?: string;
}

export const CardCollectionPanel: React.FC<CardCollectionPanelProps> = ({ className = '' }) => {
  const { collection, getStats } = useCardStore();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const stats = getStats();
  const collectedCards = collection.cards;
  
  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-lg ${className}`}>
      {/* 标题栏 */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🎴</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            经验卡牌
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({stats.totalCollected})
          </span>
        </div>
        
        {/* 统计标签 */}
        <div className="flex gap-2">
          {stats.legendaryCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
              传说 {stats.legendaryCount}
            </span>
          )}
          {stats.epicCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
              史诗 {stats.epicCount}
            </span>
          )}
          {stats.rareCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
              稀有 {stats.rareCount}
            </span>
          )}
        </div>
      </div>
      
      {/* 展开的卡牌列表 */}
      {isExpanded && (
        <div className="mt-4">
          {collectedCards.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              暂无收集的卡牌
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {collectedCards.map((collected) => (
                <Card 
                  key={collected.cardId}
                  cardId={collected.cardId}
                  showDetails
                  size="sm"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 卡牌收集通知组件
 * 完成任务时弹出
 */
interface CardNotificationProps {
  cardId: string;
  onClose: () => void;
  duration?: number;
}

export const CardNotification: React.FC<CardNotificationProps> = ({ 
  cardId, 
  onClose,
  duration = 3000 
}) => {
  const cardInfo = PRESET_CARDS[cardId];
  
  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  if (!cardInfo) return null;
  
  const rarityStyle = rarityStyles[cardInfo.rarity];
  
  return (
    <div className={`
      fixed bottom-4 right-4
      ${rarityStyle.bg}
      border-2 ${rarityStyle.border}
      rounded-xl p-4 shadow-xl
      animate-slide-up
      max-w-xs
      z-50
    `}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{cardInfo.icon}</div>
        <div className="flex-1">
          <div className="font-medium text-gray-800 dark:text-gray-200">
            获得新卡牌！
          </div>
          <div className={`text-sm ${rarityStyle.label}`}>
            {cardInfo.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {cardInfo.source}
          </div>
        </div>
        <button 
          className="text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/**
 * 卡牌收集触发按钮（测试用）
 */
interface CardTriggerButtonProps {
  cardId: string;
  label?: string;
}

export const CardTriggerButton: React.FC<CardTriggerButtonProps> = ({ 
  cardId,
  label 
}) => {
  const cardInfo = PRESET_CARDS[cardId];
  
  if (!cardInfo) return null;
  
  return (
    <button
      className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
      onClick={() => triggerCardReward(cardId)}
    >
      {label || `获得 ${cardInfo.name}`} {cardInfo.icon}
    </button>
  );
};

/**
 * 卡牌展示骨架屏
 */
export const CardSkeleton: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-24',
    md: 'w-24 h-32',
    lg: 'w-32 h-40'
  };
  
  return (
    <div className={`
      ${sizeClasses[size]}
      bg-gray-200 dark:bg-gray-700
      rounded-xl
      animate-pulse
    `} />
  );
};

// === 默认导出 ===
export default {
  Card,
  CardCollectionPanel,
  CardNotification,
  CardTriggerButton,
  CardSkeleton
};