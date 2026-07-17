/**
 * 经验卡牌收集Store
 * 基于时空剧场卡牌收集机制迁移
 * 来源：时空剧场/game/engine.js - collectCard(), collectedItems
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CollectedCard,
  CardCollectionState,
  CardSystemConfig,
  CardId,
  CardMap
} from '../types/card';
import { PRESET_CARDS } from '../types/card';

/**
 * 卡牌Store状态接口
 */
interface CardStoreState {
  /** 收集状态 */
  collection: CardCollectionState;
  /** 系统配置 */
  config: CardSystemConfig;
  
  // === Actions ===
  
  /** 添加卡牌到收藏 */
  addCard: (cardId: CardId) => void;
  
  /** 批量添加卡牌 */
  addCards: (cardIds: CardId[]) => void;
  
  /** 激活卡牌效果 */
  activateCard: (cardId: CardId) => void;
  
  /** 解锁卡牌 */
  unlockCard: (cardId: CardId) => void;
  
  /** 获取已收集的卡牌列表 */
  getCollectedCards: () => CollectedCard[];
  
  /** 获取卡牌基础信息 */
  getCardInfo: (cardId: CardId) => CardMap[CardId] | undefined;
  
  /** 获取所有已解锁的卡牌 */
  getUnlockedCards: () => CardMap;
  
  /** 检查卡牌是否已收集 */
  isCardCollected: (cardId: CardId) => boolean;
  
  /** 检查卡牌是否已解锁 */
  isCardUnlocked: (cardId: CardId) => boolean;
  
  /** 清空收藏 */
  clearCollection: () => void;
  
  /** 重置系统配置 */
  resetConfig: () => void;
  
  /** 更新配置 */
  updateConfig: (config: Partial<CardSystemConfig>) => void;
  
  /** 获取统计信息 */
  getStats: () => {
    totalCollected: number;
    rareCount: number;
    epicCount: number;
    legendaryCount: number;
    activatedCount: number;
  };
}

/** 默认配置 */
const defaultConfig: CardSystemConfig = {
  enabled: true,
  autoCollect: true,
  showNotification: true,
  maxCollection: 0  // 0表示无限制
};

/** 初始收藏状态 */
const initialCollection: CardCollectionState = {
  cards: [],
  unlockedCardIds: [],
  totalCollected: 0,
  rareCount: 0
};

/**
 * 卡牌收集Store
 * 使用Zustand + persist中间件实现持久化
 * 命名空间: st_cards_ (spacetime theater cards)
 */
export const useCardStore = create<CardStoreState>()(
  persist(
    (set, get) => ({
      // === 初始状态 ===
      collection: { ...initialCollection },
      config: { ...defaultConfig },
      
      // === Actions ===
      
      /**
       * 添加单张卡牌
       * 来源：时空剧场 engine.js collectCard() 函数
       */
      addCard: (cardId: CardId) => {
        const { collection, config } = get();
        
        // 检查是否已收集（去重）
        if (collection.cards.some(c => c.cardId === cardId)) {
          return;
        }
        
        // 检查最大收集数
        if (config.maxCollection > 0 && collection.cards.length >= config.maxCollection) {
          return;
        }
        
        // 检查卡牌是否存在
        const cardInfo = PRESET_CARDS[cardId];
        if (!cardInfo) {
          console.warn(`[CardStore] 卡牌 ${cardId} 不存在于预设库`);
          return;
        }
        
        const newCard: CollectedCard = {
          cardId,
          collectedAt: Date.now(),
          isActivated: false
        };
        
        set(state => ({
          collection: {
            ...state.collection,
            cards: [...state.collection.cards, newCard],
            totalCollected: state.collection.totalCollected + 1,
            // 稀有度及以上自动计入rareCount
            rareCount: cardInfo.rarity !== 'common' 
              ? state.collection.rareCount + 1 
              : state.collection.rareCount
          }
        }));
        
      },
      
      /**
       * 批量添加卡牌
       */
      addCards: (cardIds: CardId[]) => {
        cardIds.forEach(cardId => get().addCard(cardId));
      },
      
      /**
       * 激活卡牌效果
       * 激活后卡牌效果生效
       */
      activateCard: (cardId: CardId) => {
        set(state => ({
          collection: {
            ...state.collection,
            cards: state.collection.cards.map(card => 
              card.cardId === cardId 
                ? { ...card, isActivated: true, activatedAt: Date.now() }
                : card
            )
          }
        }));
        
        const cardInfo = PRESET_CARDS[cardId];
      },
      
      /**
       * 解锁卡牌（不自动收集，仅标记为可收集）
       */
      unlockCard: (cardId: CardId) => {
        const { collection } = get();
        
        if (collection.unlockedCardIds.includes(cardId)) {
          return;
        }
        
        set(state => ({
          collection: {
            ...state.collection,
            unlockedCardIds: [...state.collection.unlockedCardIds, cardId]
          }
        }));
      },
      
      /**
       * 获取已收集卡牌列表（包含详细信息）
       */
      getCollectedCards: () => {
        return get().collection.cards;
      },
      
      /**
       * 获取卡牌基础信息
       */
      getCardInfo: (cardId: CardId) => {
        return PRESET_CARDS[cardId];
      },
      
      /**
       * 获取所有已解锁卡牌（基础信息）
       */
      getUnlockedCards: () => {
        const { collection } = get();
        const unlocked: CardMap = {};
        
        collection.unlockedCardIds.forEach(cardId => {
          if (PRESET_CARDS[cardId]) {
            unlocked[cardId] = PRESET_CARDS[cardId];
          }
        });
        
        return unlocked;
      },
      
      /**
       * 检查卡牌是否已收集
       */
      isCardCollected: (cardId: CardId) => {
        return get().collection.cards.some(c => c.cardId === cardId);
      },
      
      /**
       * 检查卡牌是否已解锁
       */
      isCardUnlocked: (cardId: CardId) => {
        return get().collection.unlockedCardIds.includes(cardId);
      },
      
      /**
       * 清空收藏（重置）
       */
      clearCollection: () => {
        set({ collection: { ...initialCollection } });
      },
      
      /**
       * 重置配置
       */
      resetConfig: () => {
        set({ config: { ...defaultConfig } });
      },
      
      /**
       * 更新配置
       */
      updateConfig: (newConfig: Partial<CardSystemConfig>) => {
        set(state => ({
          config: { ...state.config, ...newConfig }
        }));
      },
      
      /**
       * 获取统计信息
       */
      getStats: () => {
        const { collection } = get();
        
        let epicCount = 0;
        let legendaryCount = 0;
        let activatedCount = 0;
        
        collection.cards.forEach(card => {
          const cardInfo = PRESET_CARDS[card.cardId];
          if (cardInfo) {
            if (cardInfo.rarity === 'epic') epicCount++;
            if (cardInfo.rarity === 'legendary') legendaryCount++;
          }
          if (card.isActivated) activatedCount++;
        });
        
        return {
          totalCollected: collection.totalCollected,
          rareCount: collection.rareCount,
          epicCount,
          legendaryCount,
          activatedCount
        };
      }
    }),
    {
      name: 'st_cards_store',  // 命名空间前缀，与时空剧场一致
      partialize: (state) => ({
        collection: state.collection,
        config: state.config
      })
    }
  )
);

/**
 * 辅助函数：触发卡牌收集
 * 用于在任务完成时调用
 * 
 * 用法示例：
 * ```typescript
 * import { triggerCardReward } from '@/store/cardStore';
 * 
 * // 任务完成时
 * triggerCardReward('code_review');
 * ```
 */
export function triggerCardReward(cardId: CardId): void {
  const store = useCardStore.getState();
  store.addCard(cardId);
  store.activateCard(cardId);
}

/**
 * 辅助函数：批量触发卡牌奖励
 */
export function triggerCardRewards(cardIds: CardId[]): void {
  const store = useCardStore.getState();
  store.addCards(cardIds);
}

/**
 * 辅助函数：检查并解锁卡牌
 * 用于条件触发解锁
 */
export function unlockCardIf(cardId: CardId, condition: boolean): void {
  if (condition) {
    const store = useCardStore.getState();
    store.unlockCard(cardId);
  }
}