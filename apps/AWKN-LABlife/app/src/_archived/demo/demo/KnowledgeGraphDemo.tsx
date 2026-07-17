/**
 * 知识图谱可视化演示页面
 * 用于测试和展示代码结构可视化功能
 * 来源：时空剧场/game/knowledge-graph.js
 */

import React, { useState } from 'react';
import { KnowledgeGraph, PresetGraphSelector, GraphLegend } from '@/components/KnowledgeGraph/KnowledgeGraphViz';
import { CODE_STRUCTURE_PRESETS, DEFAULT_GRAPH_CONFIG } from '@/types/knowledgeGraph';
import type { GraphData, GraphNode } from '@/types/knowledgeGraph';
import { GraphNodeType } from '@/types/knowledgeGraph';

export default function KnowledgeGraphDemoPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>('projectArchitecture');
  const [activeTab, setActiveTab] = useState<'preset' | 'custom' | 'generate'>('preset');
  const [customData, setCustomData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // 获取当前预设数据
  const currentPreset = CODE_STRUCTURE_PRESETS[selectedPreset as keyof typeof CODE_STRUCTURE_PRESETS];
  const currentData: GraphData = currentPreset ? ({
    nodes: currentPreset.nodes.map(n => ({ ...n })),
    links: currentPreset.links.map(l => ({ ...l }))
  } as GraphData) : { nodes: [], links: [] };

  // 节点点击处理
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  // 添加自定义节点
  const handleAddNode = () => {
    const newNode: GraphNode = {
      id: `custom_${Date.now()}`,
      label: `新节点${customData.nodes.length + 1}`,
      type: GraphNodeType.MINOR,
      category: 'custom',
      description: '自定义节点'
    };

    setCustomData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  };

  // 移除节点
  const handleRemoveNode = (nodeId: string) => {
    setCustomData(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      links: prev.links.filter(l => l.source !== nodeId && l.target !== nodeId)
    }));
  };

  // 生成随机图谱
  const handleGenerateRandom = () => {
    const categories = ['模块A', '模块B', '模块C', '模块D'];
    const types: GraphNodeType[] = [GraphNodeType.CORE, GraphNodeType.MAJOR, GraphNodeType.MINOR];

    const nodes: GraphNode[] = [];
    const links: { source: string; target: string }[] = [];

    // 生成8个节点
    for (let i = 0; i < 8; i++) {
      nodes.push({
        id: `node_${i}`,
        label: `${categories[Math.floor(i / 2)]}_${i % 2 === 0 ? '主' : '副'}`,
        type: i < 2 ? GraphNodeType.CORE : i < 5 ? GraphNodeType.MAJOR : GraphNodeType.MINOR,
        category: categories[Math.floor(i / 2)],
        description: `这是节点 ${i} 的描述`
      });
    }

    // 生成随机连接
    for (let i = 0; i < nodes.length; i++) {
      const numLinks = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < numLinks; j++) {
        const target = Math.floor(Math.random() * nodes.length);
        if (target !== i) {
          links.push({
            source: nodes[i].id,
            target: nodes[target].id
          });
        }
      }
    }

    setCustomData({ nodes, links });
  };

  return (
    <div className="min-h-screen bg-surface-base p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">
            🕸️ 知识图谱可视化
          </h1>
          <p className="text-on-surface-variant/70">
            基于D3.js力导向图 - 用于代码结构可视化
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'preset', label: '预设模板', icon: '📋' },
            { key: 'custom', label: '自定义编辑', icon: '✏️' },
            { key: 'generate', label: '随机生成', icon: '🎲' }
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
          {/* Tab: 预设模板 */}
          {activeTab === 'preset' && currentPreset && (
            <div className="space-y-6">
              {/* 预设选择器 */}
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">选择预设模板</h3>
                <PresetGraphSelector
                  presets={Object.entries(CODE_STRUCTURE_PRESETS).map(([key, preset]) => ({
                    id: key,
                    name: preset.name,
                    description: preset.description,
                    data: { nodes: preset.nodes, links: preset.links } as GraphData
                  }))}
                  selectedId={selectedPreset}
                  onSelect={setSelectedPreset}
                />
                <p className="text-sm text-on-surface-variant/60 mt-2">
                  {currentPreset.description}
                </p>
              </div>

              {/* 图例 */}
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <GraphLegend config={DEFAULT_GRAPH_CONFIG} />
              </div>

              {/* 图谱展示 */}
              <KnowledgeGraph
                data={currentData}
                onNodeClick={handleNodeClick}
                className="h-96"
              />

              {/* 节点信息 */}
              {selectedNode && (
                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                  <h3 className="text-lg font-medium text-on-surface mb-4">选中节点</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-on-surface-variant/60">ID</div>
                      <div className="text-on-surface">{selectedNode.id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-on-surface-variant/60">名称</div>
                      <div className="text-on-surface">{selectedNode.label}</div>
                    </div>
                    <div>
                      <div className="text-sm text-on-surface-variant/60">类型</div>
                      <div className="text-on-surface capitalize">{selectedNode.type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-on-surface-variant/60">分类</div>
                      <div className="text-on-surface">{selectedNode.category || '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: 自定义编辑 */}
          {activeTab === 'custom' && (
            <div className="grid grid-cols-2 gap-6">
              {/* 编辑器 */}
              <div className="space-y-4">
                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-on-surface">节点列表</h3>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1.5 bg-green-600 text-on-primary rounded-lg text-sm hover:bg-green-700"
                        onClick={handleAddNode}
                      >
                        + 添加节点
                      </button>
                      <button
                        className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-sm hover:bg-primary-dim"
                        onClick={handleGenerateRandom}
                      >
                        随机生成
                      </button>
                    </div>
                  </div>

                  {customData.nodes.length === 0 ? (
                    <div className="text-center text-on-surface-variant/50 py-8">
                      暂无节点，点击上方按钮添加
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customData.nodes.map(node => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between bg-surface-container-low rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-3 h-3 rounded-full
                              ${node.type === 'core' ? 'bg-amber-500' : node.type === 'major' ? 'bg-primary' : 'bg-primary/50'}
                            `} />
                            <span className="text-on-surface">{node.label}</span>
                          </div>
                          <button
                            className="text-red-500 hover:text-red-600 text-sm"
                            onClick={() => handleRemoveNode(node.id)}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                  <h3 className="text-lg font-medium text-on-surface mb-4">连接列表</h3>
                  {customData.links.length === 0 ? (
                    <div className="text-center text-on-surface-variant/50 py-4">
                      暂无连接
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {customData.links.map((link, i) => (
                        <div key={i} className="text-sm text-on-surface-variant/60">
                          {link.source} → {link.target}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 预览 */}
              <div className="space-y-4">
                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                  <h3 className="text-lg font-medium text-on-surface mb-4">图谱预览</h3>
                  <KnowledgeGraph
                    data={customData}
                    onNodeClick={handleNodeClick}
                    className="h-96"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: 随机生成 */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                <h3 className="text-lg font-medium text-on-surface mb-4">快速生成图谱</h3>
                <div className="flex gap-4">
                  <button
                    className="px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-primary-dim transition-colors"
                    onClick={handleGenerateRandom}
                  >
                    🎲 生成随机图谱
                  </button>
                  <button
                    className="px-6 py-3 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors"
                    onClick={() => setCustomData({ nodes: [], links: [] })}
                  >
                    🗑️ 清空
                  </button>
                </div>
              </div>

              {/* 生成结果 */}
              <KnowledgeGraph
                data={customData}
                onNodeClick={handleNodeClick}
                className="h-96"
              />

              {/* 统计信息 */}
              {customData.nodes.length > 0 && (
                <div className="bg-surface-container-low/50 backdrop-blur-sm rounded-xl p-4 border border-outline/20">
                  <h3 className="text-lg font-medium text-on-surface mb-4">图谱统计</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-on-surface">{customData.nodes.length}</div>
                      <div className="text-sm text-on-surface-variant/60">总节点数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600">
                        {customData.nodes.filter(n => n.type === 'core').length}
                      </div>
                      <div className="text-sm text-on-surface-variant/60">核心节点</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {customData.nodes.filter(n => n.type === 'major').length}
                      </div>
                      <div className="text-sm text-on-surface-variant/60">重要节点</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary/60">
                        {customData.nodes.filter(n => n.type === 'minor').length}
                      </div>
                      <div className="text-sm text-on-surface-variant/60">次要节点</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
