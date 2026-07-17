/**
 * 经验卡牌系统演示页面
 * 用于测试和展示卡牌收集功能
 */

import React, { useState } from 'react';
import { CardCollectionPanel, CardNotification, CardTriggerButton, Card } from '@/components/Card/CardDisplay';
import { PRESET_CARDS, CardRarity } from '@/types/card';

export default function CardDemoPage() {
  const [notificationCardId, setNotificationCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'collect' | 'library' | 'test'>('collect');

  // 测试触发卡牌收集
  const handleCollect = (cardId: string) => {
    setNotificationCardId(cardId);
  };

  const closeNotification = () => {
    setNotificationCardId(null);
  };

  return (
    <div className="min-h-screen bg-surface-base p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">
            🎴 经验卡牌系统
          </h1>
          <p className="text-on-surface-variant/70">
            基于时空剧场卡牌机制迁移的智能体经验收集系统
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'collect', label: '我的收藏', icon: '📦' },
            { key: 'library', label: '卡牌图鉴', icon: '📚' },
            { key: 'test', label: '测试触发', icon: '🧪' }
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
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {/* Tab 1: 我的收藏 */}
          {activeTab === 'collect' && (
            <div className="space-y-6">
              <CardCollectionPanel />

              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-6 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">
                  功能说明
                </h3>
                <ul className="space-y-2 text-on-surface-variant/80">
                  <li>• 完成不同类型的任务可获得对应卡牌</li>
                  <li>• 卡牌具有稀有度等级：普通 &lt; 稀有 &lt; 史诗 &lt; 传说</li>
                  <li>• 每张卡牌具有独特的效果和属性加成</li>
                  <li>• 卡牌收集自动持久化到本地存储</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 2: 卡牌图鉴 */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-on-surface mb-4">
                📚 卡牌图鉴
              </h3>

              {/* 按稀有度分组展示 */}
              {Object.values(CardRarity).map(rarity => {
                const cards = Object.values(PRESET_CARDS).filter(c => c.rarity === rarity);
                if (cards.length === 0) return null;

                return (
                  <div key={rarity} className="space-y-3">
                    <h4 className={`
                      text-lg font-semibold capitalize
                      ${rarity === CardRarity.COMMON ? 'text-on-surface-variant/60' : ''}
                      ${rarity === CardRarity.RARE ? 'text-primary' : ''}
                      ${rarity === CardRarity.EPIC ? 'text-purple-600' : ''}
                      ${rarity === CardRarity.LEGENDARY ? 'text-amber-600' : ''}
                    `}>
                      {rarity} ({cards.length})
                    </h4>

                    <div className="grid grid-cols-4 gap-4">
                      {cards.map(card => (
                        <Card
                          key={card.id}
                          cardId={card.id}
                          showDetails
                          size="md"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 3: 测试触发 */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-6 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">
                  🧪 卡牌触发测试
                </h3>
                <p className="text-on-surface-variant/60 mb-4">
                  点击下方按钮模拟完成任务并触发卡牌收集
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.values(PRESET_CARDS).slice(0, 8).map(card => (
                    <CardTriggerButton
                      key={card.id}
                      cardId={card.id}
                      label={card.name}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-6 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">
                  📊 状态导出
                </h3>
                <pre className="bg-surface-container-lowest rounded-lg p-4 text-sm text-on-surface-variant/80 overflow-auto">
                  {JSON.stringify({
                    presetCards: Object.keys(PRESET_CARDS),
                    rarityLevels: Object.values(CardRarity),
                    effectTypes: ['value_add', 'value_sub', 'unlock_ability', 'buff', 'debuff']
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 通知弹窗 */}
      {notificationCardId && (
        <CardNotification
          cardId={notificationCardId}
          onClose={closeNotification}
          duration={3000}
        />
      )}
    </div>
  );
}
