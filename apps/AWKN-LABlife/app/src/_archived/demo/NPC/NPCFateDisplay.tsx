/**
 * NPC命运追踪UI组件
 * 基于时空剧场NPC状态展示 + 命运追踪界面
 */

import React from 'react';
import { useNPCFateStore } from '@/store/npcFateStore';
import { PRESET_NPCS, NPC_FATE_STATE_LABELS, NPCFateState } from '@/types/npcFate';

/**
 * NPC状态徽章
 */
interface NPCStateBadgeProps {
  state: NPCFateState;
  size?: 'sm' | 'md' | 'lg';
}

export const NPCStateBadge: React.FC<NPCStateBadgeProps> = ({ state, size = 'md' }) => {
  const stateConfig = {
    [NPCFateState.INITIAL]: { bg: 'bg-gray-100 text-gray-600', label: '未知' },
    [NPCFateState.HISTORICAL]: { bg: 'bg-amber-100 text-amber-700', label: '历史线' },
    [NPCFateState.DRAMATIC]: { bg: 'bg-blue-100 text-blue-700', label: '戏剧线' },
    [NPCFateState.AFTERLIFE]: { bg: 'bg-purple-100 text-purple-700', label: '轮回线' },
    [NPCFateState.DEATH]: { bg: 'bg-red-100 text-red-700', label: '消亡' },
    [NPCFateState.SHADOW]: { bg: 'bg-gray-800 text-gray-300', label: '隐没' }
  };
  
  const config = stateConfig[state];
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  return (
    <span className={`${config.bg} ${sizeClasses[size]} rounded-full font-medium`}>
      {config.label}
    </span>
  );
};

/**
 * 单个NPC卡片
 */
interface NPCCardProps {
  npcId: string;
  onClick?: () => void;
  showDetails?: boolean;
}

export const NPCCard: React.FC<NPCCardProps> = ({ npcId, onClick, showDetails = false }) => {
  const npcInfo = PRESET_NPCS[npcId];
  const fateStatus = useNPCFateStore(state => state.npcFates[npcId]);
  const relationship = useNPCFateStore(state => state.getNPCRelationship(npcId));
  
  if (!npcInfo) return null;
  
  const currentState = fateStatus?.currentState || npcInfo.initialState;
  
  // 关系值颜色
  const getRelationshipColor = (value: number) => {
    if (value >= 50) return 'text-green-600';
    if (value >= 0) return 'text-blue-600';
    if (value >= -50) return 'text-orange-600';
    return 'text-red-600';
  };
  
  return (
    <div 
      className={`
        bg-white dark:bg-gray-800 rounded-xl p-4 
        border-2 border-gray-200 dark:border-gray-700
        hover:border-blue-400 cursor-pointer transition-all
        ${currentState === NPCFateState.DEATH ? 'opacity-50' : ''}
        ${currentState === NPCFateState.SHADOW ? 'hidden' : ''}
      `}
      onClick={onClick}
    >
      {/* 头像和名称 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{npcInfo.icon}</span>
        <div className="flex-1">
          <div className="font-medium text-gray-800 dark:text-gray-200">
            {npcInfo.name}
          </div>
          <NPCStateBadge state={currentState} size="sm" />
        </div>
      </div>
      
      {/* 关系值 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">关系值</span>
        <span className={`font-bold ${getRelationshipColor(relationship)}`}>
          {relationship > 0 ? '+' : ''}{relationship}
        </span>
      </div>
      
      {/* 关系进度条 */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full transition-all ${
            relationship >= 0 ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.abs(relationship) / 2}%` }}
        />
      </div>
      
      {/* 交互次数 */}
      {fateStatus && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          交互 {fateStatus.interactionCount} 次
          {fateStatus.lastInteractionAt && (
            <span> · 最后于 {new Date(fateStatus.lastInteractionAt).toLocaleDateString()}</span>
          )}
        </div>
      )}
      
      {/* 详细信息 */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {npcInfo.description}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * NPC列表面板
 */
interface NPCListPanelProps {
  filter?: NPCFateState[];
  showLocked?: boolean;
}

export const NPCListPanel: React.FC<NPCListPanelProps> = ({ 
  filter,
  showLocked = false 
}) => {
  const npcFates = useNPCFateStore(state => state.npcFates);
  
  // 过滤NPC
  const filteredNPCs = Object.keys(PRESET_NPCS).filter(npcId => {
    // 过滤状态
    if (filter && filter.length > 0) {
      const currentState = npcFates[npcId]?.currentState || PRESET_NPCS[npcId].initialState;
      if (!filter.includes(currentState)) return false;
    }
    
    // 过滤锁定的
    if (!showLocked && !npcFates[npcId]) return false;
    
    return true;
  });
  
  if (filteredNPCs.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        暂无NPC数据
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredNPCs.map(npcId => (
        <NPCCard 
          key={npcId} 
          npcId={npcId}
          showDetails
        />
      ))}
    </div>
  );
};

/**
 * NPC命运时间线
 */
interface NPCFateTimelineProps {
  npcId: string;
}

export const NPCFateTimeline: React.FC<NPCFateTimelineProps> = ({ npcId }) => {
  const fateStatus = useNPCFateStore(state => state.npcFates[npcId]);
  const npcInfo = PRESET_NPCS[npcId];
  
  if (!fateStatus || !npcInfo) return null;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{npcInfo.icon}</span>
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {npcInfo.name} - 命运轨迹
          </h3>
          <NPCStateBadge state={fateStatus.currentState} />
        </div>
      </div>
      
      {/* 时间线 */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
        
        <div className="space-y-4">
          {fateStatus.stateHistory.map((entry, index) => (
            <div key={index} className="relative pl-10">
              {/* 时间线节点 */}
              <div className={`
                absolute left-2 w-4 h-4 rounded-full border-2 
                ${index === fateStatus.stateHistory.length - 1 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
              `} />
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <NPCStateBadge state={entry.state} size="sm" />
                  <span className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                {entry.reason && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {fateStatus.interactionCount}
          </div>
          <div className="text-xs text-gray-500">交互次数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {Math.round(fateStatus.endingContribution)}%
          </div>
          <div className="text-xs text-gray-500">结局贡献</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {fateStatus.stateHistory.length}
          </div>
          <div className="text-xs text-gray-500">状态变化</div>
        </div>
      </div>
    </div>
  );
};

/**
 * NPC关系雷达图（简化版）
 */
export const NPCRelationshipRadar: React.FC = () => {
  const npcFates = useNPCFateStore(state => state.npcFates);
  const getNPCRelationship = useNPCFateStore(state => state.getNPCRelationship);
  
  // 获取所有已激活的NPC
  const activeNPCs = Object.keys(npcFates);
  
  if (activeNPCs.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        暂无NPC关系数据
      </div>
    );
  }
  
  // 简化柱状图展示
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
        NPC关系网络
      </h3>
      
      <div className="space-y-3">
        {activeNPCs.map(npcId => {
          const npcInfo = PRESET_NPCS[npcId];
          const relationship = getNPCRelationship(npcId);
          const isPositive = relationship >= 0;
          
          return (
            <div key={npcId} className="flex items-center gap-3">
              <span className="text-xl w-8">{npcInfo?.icon}</span>
              <span className="w-20 text-sm text-gray-600 dark:text-gray-400">
                {npcInfo?.name}
              </span>
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    isPositive ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.abs(relationship) / 2}%`,
                    marginLeft: isPositive ? '50%' : 'auto',
                    marginRight: isPositive ? 'auto' : '50%'
                  }}
                />
              </div>
              <span className={`w-12 text-right text-sm ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {relationship > 0 ? '+' : ''}{relationship}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * NPC选择器（用于对话/交互）
 */
interface NPCSelectorProps {
  onSelect: (npcId: string) => void;
  filterState?: NPCFateState[];
}

export const NPCSelector: React.FC<NPCSelectorProps> = ({ 
  onSelect,
  filterState 
}) => {
  const npcFates = useNPCFateStore(state => state.npcFates);
  const isNPCUnlocked = useNPCFateStore(state => state.isNPCUnlocked);
  
  const availableNPCs = Object.keys(PRESET_NPCS).filter(npcId => {
    if (!isNPCUnlocked(npcId)) return false;
    if (filterState && filterState.length > 0) {
      const currentState = npcFates[npcId]?.currentState;
      if (!currentState || !filterState.includes(currentState)) return false;
    }
    return true;
  });
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {availableNPCs.map(npcId => {
        const npcInfo = PRESET_NPCS[npcId];
        
        return (
          <button
            key={npcId}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onSelect(npcId)}
          >
            <span className="text-2xl">{npcInfo.icon}</span>
            <span className="text-gray-700 dark:text-gray-300">
              {npcInfo.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// === 默认导出 ===
export default {
  NPCStateBadge,
  NPCCard,
  NPCListPanel,
  NPCFateTimeline,
  NPCRelationshipRadar,
  NPCSelector
};