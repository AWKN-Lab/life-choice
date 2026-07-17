/**
 * 初步结论UI方案预览页面
 * 同时展示三套设计方案：A传统经典 / B现代简约 / C新中式
 */

import React, { useState } from 'react';
import TraditionalConclusionA from './TraditionalConclusionA';
import ModernConclusionB from './ModernConclusionB';
import ChineseConclusionC from './ChineseConclusionC';

type SchemeType = 'A' | 'B' | 'C';

const schemes = [
  { id: 'A' as const, name: '方案A', subtitle: '传统经典', color: '#dc2626' },
  { id: 'B' as const, name: '方案B', subtitle: '现代简约', color: '#00d4ff' },
  { id: 'C' as const, name: '方案C', subtitle: '新中式', color: '#166534' },
];

const ConclusionPreview: React.FC = () => {
  const [activeScheme, setActiveScheme] = useState<SchemeType>('A');

  const renderScheme = () => {
    switch (activeScheme) {
      case 'A':
        return <TraditionalConclusionA />;
      case 'B':
        return <ModernConclusionB />;
      case 'C':
        return <ChineseConclusionC />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 顶部切换栏 */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-outline/10">
        <div className="flex items-center justify-center gap-2 p-4">
          {schemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => setActiveScheme(scheme.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeScheme === scheme.id
                  ? 'bg-surface-container text-on-surface'
                  : 'bg-on-surface/10 text-on-surface/60 hover:bg-on-surface/20'
              }`}
            >
              <span className="mr-1">{scheme.name}</span>
              <span 
                className="text-xs opacity-60"
                style={{ color: activeScheme === scheme.id ? scheme.color : undefined }}
              >
                {scheme.subtitle}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 方案内容 */}
      <div className="max-w-md mx-auto">
        {renderScheme()}
      </div>

      {/* 底部说明 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-outline/10 p-4">
        <div className="max-w-md mx-auto text-center">
          <div 
            className="text-sm font-medium mb-1"
            style={{ color: schemes.find(s => s.id === activeScheme)?.color }}
          >
            {schemes.find(s => s.id === activeScheme)?.name} · {schemes.find(s => s.id === activeScheme)?.subtitle}
          </div>
          <div className="text-xs text-on-surface/40">
            点击上方按钮切换方案 | 目标用户：35-50岁命理爱好者
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConclusionPreview;
