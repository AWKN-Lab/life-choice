/**
 * NPC命运追踪演示页面
 * 用于测试和展示NPC命运追踪功能
 */

import React, { useState } from 'react';
import { NPCCard, NPCListPanel, NPCFateTimeline, NPCRelationshipRadar, NPCSelector } from '@/components/NPC/NPCFateDisplay';
import { useNPCFateStore, triggerNPCEvent, initializeAllNPCs } from '@/store/npcFateStore';
import { PRESET_NPCS, NPCFateState, NPC_FATE_STATE_LABELS } from '@/types/npcFate';
import { useMultiEndingStore } from '@/store/multiEndingStore';

export default function NPCFateDemoPage() {
  const store = useNPCFateStore();
  const multiEndingStore = useMultiEndingStore();

  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'details' | 'interact'>('list');
  const [eventLog, setEventLog] = useState<string[]>([]);

  // 初始化NPC
  React.useEffect(() => {
    initializeAllNPCs();
  }, []);

  // 添加事件日志
  const addLog = (message: string) => {
    setEventLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 19)]);
  };

  // 触发NPC交互事件
  const handleNPCInteraction = (
    npcId: string,
    eventType: 'dialog' | 'choice' | 'event',
    description: string
  ) => {
    // 获取当前数值
    const values = multiEndingStore.getCurrentValues();

    triggerNPCEvent(npcId, eventType, description, {
      affectRelationship: eventType === 'dialog' ? 5 : eventType === 'choice' ? 10 : 0,
      triggerStateCheck: true,
      values: values as unknown as Record<string, number>
    });

    addLog(`${PRESET_NPCS[npcId]?.name}: ${description}`);
  };

  // 重置所有NPC
  const handleReset = () => {
    store.resetAllNPCs();
    initializeAllNPCs();
    setEventLog([]);
    addLog('所有NPC已重置');
  };

  return (
    <div className="min-h-screen bg-surface-base p-8">
      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">
            🎭 NPC命运追踪
          </h1>
          <p className="text-on-surface-variant/70">
            基于时空剧场NPC状态机 - 追踪角色命运变化
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'list', label: 'NPC列表', icon: '👥' },
            { key: 'details', label: '命运详情', icon: '📜' },
            { key: 'interact', label: '交互测试', icon: '🎮' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${activeTab === tab.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}
              `}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          <button
            className="ml-auto px-4 py-2 bg-red-500 text-on-primary rounded-lg hover:bg-red-600 transition-colors"
            onClick={handleReset}
          >
            🔄 重置
          </button>
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {/* Tab: NPC列表 */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              {/* 统计概览 */}
              <div className="grid grid-cols-4 gap-4">
                {Object.values(NPCFateState).map(state => {
                  const count = Object.values(store.npcFates).filter(
                    f => f.currentState === state
                  ).length;

                  return (
                    <div
                      key={state}
                      className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 text-center border border-outline/20"
                    >
                      <div className="text-2xl font-bold text-on-surface">{count}</div>
                      <div className="text-sm text-on-surface-variant/60">{NPC_FATE_STATE_LABELS[state]}</div>
                    </div>
                  );
                })}
              </div>

              {/* NPC列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(PRESET_NPCS).map(npcId => {
                  const fateStatus = store.npcFates[npcId];

                  // 隐藏未解锁的shadow NPC
                  if (!fateStatus && npcId === 'shadow') return null;

                  return (
                    <div
                      key={npcId}
                      onClick={() => {
                        setSelectedNPC(npcId);
                        setActiveTab('details');
                      }}
                      className="cursor-pointer"
                    >
                      <NPCCard npcId={npcId} showDetails />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: 命运详情 */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* NPC选择器 */}
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">选择NPC</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.keys(PRESET_NPCS).map(npcId => {
                    const isSelected = selectedNPC === npcId;

                    return (
                      <button
                        key={npcId}
                        className={`
                          px-4 py-2 rounded-lg transition-colors
                          ${isSelected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}
                        `}
                        onClick={() => setSelectedNPC(npcId)}
                      >
                        {PRESET_NPCS[npcId].icon} {PRESET_NPCS[npcId].name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 命运时间线 */}
              {selectedNPC && (
                <NPCFateTimeline npcId={selectedNPC} />
              )}

              {/* 关系雷达 */}
              <NPCRelationshipRadar />
            </div>
          )}

          {/* Tab: 交互测试 */}
          {activeTab === 'interact' && (
            <div className="space-y-6">
              {/* 当前数值状态 */}
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">当前数值状态</h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(multiEndingStore.values).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-2xl font-bold text-on-surface">{value}</div>
                      <div className="text-xs text-on-surface-variant/60 uppercase">{key}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NPC选择 */}
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">选择NPC进行交互</h3>
                <NPCSelector
                  onSelect={(npcId) => {
                    handleNPCInteraction(npcId, 'dialog', '开始对话');
                  }}
                />
              </div>

              {/* 预设交互按钮 */}
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">快速交互</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(PRESET_NPCS).slice(0, 4).map(npcId => {
                    const npc = PRESET_NPCS[npcId];

                    return (
                      <div key={npcId} className="space-y-2">
                        <div className="text-center text-xl">{npc.icon} {npc.name}</div>
                        <button
                          className="w-full px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30"
                          onClick={() => handleNPCInteraction(npcId, 'dialog', '进行对话')}
                        >
                          对话
                        </button>
                        <button
                          className="w-full px-3 py-1.5 bg-green-600/20 text-green-600 rounded-lg text-sm hover:bg-green-600/30"
                          onClick={() => handleNPCInteraction(npcId, 'choice', '做出选择')}
                        >
                          选择
                        </button>
                        <button
                          className="w-full px-3 py-1.5 bg-purple-600/20 text-purple-600 rounded-lg text-sm hover:bg-purple-600/30"
                          onClick={() => handleNPCInteraction(npcId, 'event', '触发事件')}
                        >
                          事件
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 事件日志 */}
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">事件日志</h3>
                {eventLog.length === 0 ? (
                  <div className="text-center text-on-surface-variant/50 py-4">
                    暂无事件记录
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {eventLog.map((log, i) => (
                      <div key={i} className="text-sm text-on-surface-variant/70 font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
