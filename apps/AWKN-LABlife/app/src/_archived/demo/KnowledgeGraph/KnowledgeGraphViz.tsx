/**
 * 知识图谱可视化组件
 * 基于D3.js力导向图实现
 * 来源：时空剧场/game/knowledge-graph.js
 * 简化版本用于代码结构可视化
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { GraphData, GraphNode, GraphLink, GraphConfig } from '@/types/knowledgeGraph';
import { DEFAULT_GRAPH_CONFIG, GraphNodeType } from '@/types/knowledgeGraph';

interface KnowledgeGraphProps {
  /** 图谱数据 */
  data: GraphData;
  /** 配置（可选） */
  config?: Partial<GraphConfig>;
  /** 节点点击回调 */
  onNodeClick?: (node: GraphNode) => void;
  /** 容器样式 */
  className?: string;
}

/**
 * 获取节点大小
 */
function getNodeSize(type: GraphNodeType, config: GraphConfig): number {
  switch (type) {
    case GraphNodeType.CORE:
      return config.nodeSizeMap.core;
    case GraphNodeType.MAJOR:
      return config.nodeSizeMap.major;
    case GraphNodeType.MINOR:
      return config.nodeSizeMap.minor;
    default:
      return config.nodeSizeMap.minor;
  }
}

/**
 * 获取节点透明度
 */
function getNodeOpacity(type: GraphNodeType, config: GraphConfig): number {
  switch (type) {
    case GraphNodeType.CORE:
      return config.opacityMap.core;
    case GraphNodeType.MAJOR:
      return config.opacityMap.major;
    case GraphNodeType.MINOR:
      return config.opacityMap.minor;
    default:
      return config.opacityMap.minor;
  }
}

/**
 * 获取节点颜色
 */
function getNodeColor(node: GraphNode, config: GraphConfig): string {
  if (node.color) return node.color;
  
  switch (node.type) {
    case GraphNodeType.CORE:
      return config.colors.core;
    case GraphNodeType.MAJOR:
      return config.colors.major;
    case GraphNodeType.MINOR:
      return config.colors.minor;
    default:
      return config.colors.minor;
  }
}

/**
 * 知识图谱组件
 */
export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  config: userConfig,
  onNodeClick,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  
  const config = useMemo(() => ({ ...DEFAULT_GRAPH_CONFIG, ...userConfig }), [userConfig]);
  
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;
    
    const svg = d3.select(svgRef.current);
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    
    // 清除旧内容
    svg.selectAll('*').remove();
    
    // 设置SVG尺寸
    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);
    
    // 创建defs（用于发光效果）
    const defs = svg.append('defs');
    
    if (config.glow.enabled) {
      const glowFilter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
      
      glowFilter.append('feGaussianBlur')
        .attr('stdDeviation', config.glow.blur)
        .attr('result', 'coloredBlur');
      
      const feMerge = glowFilter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }
    
    // 准备数据（深度复制避免修改原数据）
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));
    
    // 创建力导向模拟
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(100)
        .strength((d: any) => d.strength || 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // 绘制连接线
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', config.colors.link)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);
    
    // 连接线标签（如果启用）
    let linkLabel: any = null;
    if (config.showLinkLabels) {
      linkLabel = svg.append('g')
        .selectAll('text')
        .data(links)
        .join('text')
        .attr('font-size', 10)
        .attr('fill', 'rgba(255,255,255,0.5)')
        .attr('text-anchor', 'middle')
        .text(d => d.label || '');

      linkLabel.attr('x', (d: any) => (d.source as any).x)
        .attr('y', (d: any) => (d.source as any).y);
    }
    
    // 绘制节点组
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', config.enableDrag ? 'pointer' : 'default')
      .call(config.enableDrag ? d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any : () => {});
    
    // 节点圆圈
    node.append('circle')
      .attr('r', d => getNodeSize(d.type, config))
      .attr('fill', d => getNodeColor(d, config))
      .attr('opacity', d => getNodeOpacity(d.type, config))
      .attr('filter', config.glow.enabled ? 'url(#glow)' : null)
      .on('mouseover', (event, d) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            x: event.clientX - rect.left + 10,
            y: event.clientY - rect.top - 10,
            content: config.showNodeDescription && d.description 
              ? `${d.label}\n${d.description}` 
              : d.label
          });
        }
        
        // 高亮连接
        link.attr('stroke-opacity', l => 
          (l.source as any).id === d.id || (l.target as any).id === d.id ? 1 : 0.3
        );
      })
      .on('mouseout', () => {
        setTooltip(null);
        link.attr('stroke-opacity', 0.6);
      })
      .on('click', (_, d) => {
        if (onNodeClick) onNodeClick(d);
      });
    
    // 节点标签
    node.append('text')
      .attr('dy', d => getNodeSize(d.type, config) + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', 12)
      .text(d => d.label);
    
    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      
      if (config.showLinkLabels) {
        linkLabel
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
      }
    });
    
    return () => {
      simulation.stop();
    };
  }, [data, config, onNodeClick]);
  
  return (
    <div 
      ref={containerRef}
      className={`relative bg-slate-900/50 rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: 400 }}
    >
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-gray-800/95 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y, zIndex: 10 }}
        >
          <div className="text-sm whitespace-pre-wrap">{tooltip.content}</div>
        </div>
      )}
      
      {/* 空状态 */}
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          暂无图谱数据
        </div>
      )}
    </div>
  );
};

/**
 * 预设图谱选择器
 */
interface PresetGraphSelectorProps {
  presets: { id: string; name: string; description: string; data: GraphData }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const PresetGraphSelector: React.FC<PresetGraphSelectorProps> = ({
  presets,
  selectedId,
  onSelect
}) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {presets.map(preset => (
        <button
          key={preset.id}
          className={`
            px-4 py-2 rounded-lg transition-colors
            ${selectedId === preset.id 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
          `}
          onClick={() => onSelect(preset.id)}
          title={preset.description}
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
};

/**
 * 图例组件
 */
interface GraphLegendProps {
  config: GraphConfig;
}

export const GraphLegend: React.FC<GraphLegendProps> = ({ config }) => {
  return (
    <div className="flex gap-4 text-sm text-gray-400">
      <div className="flex items-center gap-2">
        <div 
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: config.colors.core }}
        />
        <span>核心节点</span>
      </div>
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: config.colors.major }}
        />
        <span>重要节点</span>
      </div>
      <div className="flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.colors.minor }}
        />
        <span>次要节点</span>
      </div>
    </div>
  );
};

/**
 * 简化版图谱（静态展示，无需D3）
 * 用于不需要交互的简单图谱
 */
interface StaticGraphProps {
  data: GraphData;
  className?: string;
}

export const StaticGraph: React.FC<StaticGraphProps> = ({ data, className = '' }) => {
  // 简单横向布局
  const centerX = 50;
  const centerY = 50;
  
  // 计算节点位置
  const nodePositions = data.nodes.map((node, index) => {
    const totalNodes = data.nodes.length;
    const angle = (2 * Math.PI * index) / totalNodes - Math.PI / 2;
    const radius = 35;
    
    return {
      node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });
  
  return (
    <div className={`relative bg-slate-900/50 rounded-xl p-8 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* 连接线 */}
        {data.links.map((link, i) => {
          const source = nodePositions.find(p => p.node.id === link.source);
          const target = nodePositions.find(p => p.node.id === link.target);
          
          if (!source || !target) return null;
          
          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.5"
            />
          );
        })}
        
        {/* 节点 */}
        {nodePositions.map(({ node, x, y }) => {
          const size = node.type === GraphNodeType.CORE ? 3 : node.type === GraphNodeType.MAJOR ? 2 : 1.5;
          const color = node.type === GraphNodeType.CORE ? '#efbd8a' : node.type === GraphNodeType.MAJOR ? '#b6c4ff' : '#a0c0e0';
          
          return (
            <g key={node.id}>
              <circle cx={x} cy={y} r={size} fill={color} />
              <text 
                x={x} 
                y={y + size + 3} 
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="3"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// === 默认导出 ===
export default {
  KnowledgeGraph,
  PresetGraphSelector,
  GraphLegend,
  StaticGraph
};