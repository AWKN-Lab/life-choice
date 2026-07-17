/**
 * 多结局引擎演示页面
 * 用于测试和展示四维数值系统 + 多结局逻辑
 */

import React, { useState } from 'react';
import { ValuesDashboard, EndingStatusPanel, EndingAchievedModal, DecisionCard } from '@/components/MultiEnding/MultiEndingDisplay';
import { useMultiEndingStore, makeDecisionWithFeedback } from '@/store/multiEndingStore';
import { EndingType, PRESET_ENDINGS } from '@/types/multiEnding';
import type { DecisionScene } from '@/types/multiEnding';

/** 示例决策场景 */
const SAMPLE_SCENES: DecisionScene[] = [
  {
    id: 'scene_1',
    title: '代码审查发现严重问题',
    description: '在代码审查过程中，你发现了一个潜在的安全漏洞，需要在项目截止日期前做出决定。',
    options: [
      {
        id: 'opt_1a',
        title: '立即修复，延迟上线',
        description: '优先解决安全问题，确保系统安全',
        valueChanges: [
          { dimension: 'rule', delta: 15, reason: '遵守安全规范' },
          { dimension: 'justice', delta: 10, reason: '保护用户权益' }
        ],
        isCritical: true
      },
      {
        id: 'opt_1b',
        title: '暂时忽略，按时上线',
        description: '优先满足业务需求，之后再修复',
        valueChanges: [
          { dimension: 'freedom', delta: 10, reason: '灵活应对' },
          { dimension: 'equality', delta: -5, reason: '可能影响团队公平' }
        ]
      }
    ]
  },
  {
    id: 'scene_2',
    title: '团队成员意见分歧',
    description: '团队中两位核心成员对技术方案有不同看法，你需要做出仲裁。',
    options: [
      {
        id: 'opt_2a',
        title: '采纳方案A，尊重老员工经验',
        description: '维护团队稳定，尊重经验',
        valueChanges: [
          { dimension: 'rule', delta: 10, reason: '维护秩序' },
          { dimension: 'equality', delta: -5, reason: '可能忽视新观点' }
        ],
        isCritical: true
      },
      {
        id: 'opt_2b',
        title: '采纳方案B，支持创新',
        description: '鼓励创新，支持新想法',
        valueChanges: [
          { dimension: 'freedom', delta: 15, reason: '支持创新' },
          { dimension: 'equality', delta: 5, reason: '给予平等机会' }
        ]
      },
      {
        id: 'opt_2c',
        title: '组织投票，共同决策',
        description: '民主决策，让团队共同决定',
        valueChanges: [
          { dimension: 'equality', delta: 15, reason: '民主决策' },
          { dimension: 'rule', delta: -5, reason: '可能效率降低' }
        ]
      }
    ]
  },
  {
    id: 'scene_3',
    title: '客户提出紧急变更',
    description: '客户在项目进行中提出紧急需求变更，可能会影响项目进度。',
    options: [
      {
        id: 'opt_3a',
        title: '接受变更，延长工期',
        description: '满足客户需求，确保质量',
        valueChanges: [
          { dimension: 'justice', delta: 10, reason: '履行承诺' },
          { dimension: 'rule', delta: 5, reason: '遵循变更流程' }
        ],
        isCritical: true
      },
      {
        id: 'opt_3b',
        title: '接受变更，保持工期',
        description: '满足客户但压缩团队',
        valueChanges: [
          { dimension: 'freedom', delta: 10, reason: '灵活应对' },
          { dimension: 'equality', delta: -10, reason: '团队压力增大' }
        ]
      }
    ]
  }
];

export default function MultiEndingDemoPage() {
  const store = useMultiEndingStore();
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [achievedEnding, setAchievedEnding] = useState<EndingType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'values' | 'endings' | 'decisions'>('values');

  const currentScene = SAMPLE_SCENES[currentSceneIndex];

  const handleDecision = (optionId: string) => {
    const option = currentScene.options.find(o => o.id === optionId);
    if (!option) return;

    const result = makeDecisionWithFeedback(`scene_${currentSceneIndex}_${optionId}`, option);

    setFeedbackMessage(result.feedback);

    if (result.ending) {
      setAchievedEnding(result.ending);
    }

    // 模拟延迟后进入下一个场景
    setTimeout(() => {
      if (currentSceneIndex < SAMPLE_SCENES.length - 1) {
        setCurrentSceneIndex(prev => prev + 1);
        setFeedbackMessage('');
      }
    }, 2000);
  };

  const closeEndingModal = () => {
    setAchievedEnding(null);
  };

  const resetGame = () => {
    store.clearHistory();
    store.resetValues();
    setCurrentSceneIndex(0);
    setFeedbackMessage('');
  };

  return (
    <div className="min-h-screen bg-surface-base p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">
            🎭 多结局引擎
          </h1>
          <p className="text-on-surface-variant/70">
            基于时空剧场四维数值系统 - 自由/平等/规则/正义
          </p>
        </div>

        {/* 数值仪表盘 */}
        <div className="mb-6">
          <ValuesDashboard />
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'values', label: '数值面板', icon: '📊' },
            { key: 'endings', label: '结局状态', icon: '🏆' },
            { key: 'decisions', label: '决策场景', icon: '⚖️' }
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
            onClick={resetGame}
          >
            🔄 重置
          </button>
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {/* Tab: 数值面板 */}
          {activeTab === 'values' && (
            <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-6 border border-outline/20">
              <h3 className="text-lg font-medium text-on-surface mb-4">当前数值状态</h3>

              {/* 详细数值 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.entries(store.values).map(([key, value]) => (
                  <div key={key} className="bg-surface-container-low rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant/60 capitalize">{key}</span>
                      <span className="text-2xl font-bold text-on-surface">{value}</span>
                    </div>
                    <div className="mt-2 h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 数值摘要 */}
              <div className="bg-surface-container-low/30 rounded-lg p-4">
                <div className="text-sm text-on-surface-variant/60">数值摘要</div>
                <div className="text-on-surface font-mono mt-1">
                  {store.getValuesSummary()}
                </div>
              </div>
            </div>
          )}

          {/* Tab: 结局状态 */}
          {activeTab === 'endings' && (
            <div className="space-y-6">
              <EndingStatusPanel showPreview />

              {/* 历史记录 */}
              {store.endingHistory.length > 0 && (
                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-6 border border-outline/20">
                  <h3 className="text-lg font-medium text-on-surface mb-4">历史结局</h3>
                  <div className="space-y-2">
                    {store.endingHistory.map((record, i) => (
                      <div key={i} className="flex items-center gap-4 bg-surface-container-low rounded-lg p-3">
                        <span className="text-2xl">{PRESET_ENDINGS[record.endingId as EndingType]?.icon}</span>
                        <div className="flex-1">
                          <div className="text-on-surface">{PRESET_ENDINGS[record.endingId as EndingType]?.name}</div>
                          <div className="text-sm text-on-surface-variant/60">
                            {new Date(record.achievedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: 决策场景 */}
          {activeTab === 'decisions' && (
            <div className="space-y-6">
              {/* 当前场景 */}
              {currentScene && (
                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-6 border border-outline/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-on-surface">
                      场景 {currentSceneIndex + 1}/{SAMPLE_SCENES.length}
                    </h3>
                    <span className="text-sm text-on-surface-variant/60">
                      关键决策: {currentScene.options.filter(o => o.isCritical).length}
                    </span>
                  </div>

                  <h4 className="text-xl font-semibold text-on-surface mb-2">
                    {currentScene.title}
                  </h4>
                  <p className="text-on-surface-variant/80 mb-6">
                    {currentScene.description}
                  </p>

                  {/* 决策选项 */}
                  <div className="space-y-3">
                    {currentScene.options.map(option => (
                      <DecisionCard
                        key={option.id}
                        option={option}
                        onSelect={handleDecision}
                      />
                    ))}
                  </div>

                  {/* 反馈消息 */}
                  {feedbackMessage && (
                    <div className="mt-4 p-4 bg-primary/20 border border-primary/40 rounded-lg">
                      <div className="text-primary">{feedbackMessage}</div>
                    </div>
                  )}
                </div>
              )}

              {/* 决策历史 */}
              {store.decisionHistory.length > 0 && (
                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-6 border border-outline/20">
                  <h3 className="text-lg font-medium text-on-surface mb-4">决策历史</h3>
                  <div className="text-sm text-on-surface-variant/60">
                    已完成 {store.decisionHistory.length} 个决策
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 结局达成弹窗 */}
      {achievedEnding && (
        <EndingAchievedModal
          endingType={achievedEnding}
          onClose={closeEndingModal}
        />
      )}
    </div>
  );
}
