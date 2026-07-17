/**
 * 知识图谱可视化类型定义
 * 简化版：用于代码结构可视化
 * 来源：时空剧场/game/knowledge-graph.js - D3.js力导向图
 */

import { z } from 'zod';

/**
 * 图谱节点类型
 */
export enum GraphNodeType {
  /** 核心节点 - 最大最亮 */
  CORE = 'core',
  /** 重要节点 */
  MAJOR = 'major',
  /** 次要节点 */
  MINOR = 'minor'
}

/**
 * 图谱节点
 */
export interface GraphNode {
  /** 节点ID */
  id: string;
  /** 显示名称 */
  label: string;
  /** 节点类型 */
  type: GraphNodeType;
  /** 所属分类/模块 */
  category?: string;
  /** 节点大小（覆盖默认值） */
  size?: number;
  /** 颜色（覆盖默认值） */
  color?: string;
  /** 描述 */
  description?: string;
  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 图谱连接
 */
export interface GraphLink {
  /** 连接ID */
  id?: string;
  /** 源节点ID */
  source: string;
  /** 目标节点ID */
  target: string;
  /** 连接类型 */
  type?: 'default' | 'import' | 'inherit' | 'associate' | 'reference';
  /** 连接强度（0-1） */
  strength?: number;
  /** 标签 */
  label?: string;
}

/**
 * 图谱数据
 */
export interface GraphData {
  /** 节点列表 */
  nodes: GraphNode[];
  /** 连接列表 */
  links: GraphLink[];
}

/**
 * 图谱配置
 */
export interface GraphConfig {
  /** 是否启用物理仿真 */
  enableSimulation: boolean;
  /** 是否显示连接标签 */
  showLinkLabels: boolean;
  /** 是否显示节点描述 */
  showNodeDescription: boolean;
  /** 是否允许拖拽 */
  enableDrag: boolean;
  /** 节点大小映射 */
  nodeSizeMap: {
    core: number;
    major: number;
    minor: number;
  };
  /** 透明度映射 */
  opacityMap: {
    core: number;
    major: number;
    minor: number;
  };
  /** 颜色配置 */
  colors: {
    core: string;
    major: string;
    minor: string;
    link: string;
    background: string;
  };
  /** 发光效果 */
  glow: {
    enabled: boolean;
    blur: number;
  };
}

/**
 * 默认图谱配置
 */
export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  enableSimulation: true,
  showLinkLabels: false,
  showNodeDescription: true,
  enableDrag: true,
  nodeSizeMap: {
    core: 14,
    major: 8,
    minor: 5
  },
  opacityMap: {
    core: 1.0,
    major: 0.7,
    minor: 0.4
  },
  colors: {
    core: '#efbd8a',   // 金色（核心节点）
    major: '#b6c4ff',  // 蓝色（重要节点）
    minor: '#a0c0e0',  // 浅蓝（次要节点）
    link: 'rgba(255,255,255,0.3)',
    background: 'transparent'
  },
  glow: {
    enabled: true,
    blur: 3
  }
};

/**
 * 代码结构图谱预设
 * 用于awkn-programmer技能系统的代码结构可视化
 */
export const CODE_STRUCTURE_PRESETS = {
  /** React组件结构 */
  reactComponent: {
    name: 'React组件结构',
    description: '展示React组件的构成关系',
    nodes: [
      { id: 'component', label: '组件', type: GraphNodeType.CORE, category: 'component' },
      { id: 'state', label: 'State', type: GraphNodeType.MAJOR, category: 'state' },
      { id: 'props', label: 'Props', type: GraphNodeType.MAJOR, category: 'props' },
      { id: 'hooks', label: 'Hooks', type: GraphNodeType.MAJOR, category: 'logic' },
      { id: 'render', label: 'Render', type: GraphNodeType.MINOR, category: 'render' },
      { id: 'effect', label: 'Effect', type: GraphNodeType.MINOR, category: 'logic' }
    ],
    links: [
      { source: 'component', target: 'state', type: 'associate', strength: 0.8 },
      { source: 'component', target: 'props', type: 'associate', strength: 0.8 },
      { source: 'component', target: 'hooks', type: 'associate', strength: 0.7 },
      { source: 'component', target: 'render', type: 'default', strength: 0.9 },
      { source: 'hooks', target: 'effect', type: 'default', strength: 0.6 }
    ]
  },
  
  /** TypeScript模块结构 */
  typescriptModule: {
    name: 'TypeScript模块结构',
    description: '展示TypeScript模块的导入导出关系',
    nodes: [
      { id: 'module', label: '模块', type: GraphNodeType.CORE, category: 'module' },
      { id: 'type', label: '类型定义', type: GraphNodeType.MAJOR, category: 'type' },
      { id: 'interface', label: '接口', type: GraphNodeType.MAJOR, category: 'type' },
      { id: 'function', label: '函数', type: GraphNodeType.MAJOR, category: 'logic' },
      { id: 'constant', label: '常量', type: GraphNodeType.MINOR, category: 'data' },
      { id: 'enum', label: '枚举', type: GraphNodeType.MINOR, category: 'type' }
    ],
    links: [
      { source: 'module', target: 'type', type: 'default', strength: 0.8 },
      { source: 'module', target: 'interface', type: 'default', strength: 0.8 },
      { source: 'module', target: 'function', type: 'default', strength: 0.9 },
      { source: 'module', target: 'constant', type: 'default', strength: 0.7 },
      { source: 'module', target: 'enum', type: 'default', strength: 0.6 }
    ]
  },
  
  /** 项目架构结构 */
  projectArchitecture: {
    name: '项目架构结构',
    description: '展示项目整体架构',
    nodes: [
      { id: 'app', label: '应用入口', type: GraphNodeType.CORE, category: 'entry' },
      { id: 'pages', label: '页面', type: GraphNodeType.MAJOR, category: 'view' },
      { id: 'components', label: '组件', type: GraphNodeType.MAJOR, category: 'view' },
      { id: 'store', label: '状态管理', type: GraphNodeType.MAJOR, category: 'state' },
      { id: 'api', label: 'API层', type: GraphNodeType.MAJOR, category: 'data' },
      { id: 'utils', label: '工具函数', type: GraphNodeType.MINOR, category: 'logic' },
      { id: 'types', label: '类型定义', type: GraphNodeType.MINOR, category: 'type' },
      { id: 'hooks', label: '自定义Hooks', type: GraphNodeType.MINOR, category: 'logic' }
    ],
    links: [
      { source: 'app', target: 'pages', type: 'associate', strength: 0.9 },
      { source: 'app', target: 'components', type: 'associate', strength: 0.8 },
      { source: 'app', target: 'store', type: 'associate', strength: 0.7 },
      { source: 'app', target: 'api', type: 'associate', strength: 0.7 },
      { source: 'components', target: 'store', type: 'reference', strength: 0.6 },
      { source: 'pages', target: 'components', type: 'associate', strength: 0.8 },
      { source: 'pages', target: 'hooks', type: 'reference', strength: 0.5 }
    ]
  }
};

/**
 * Zod Schema 用于数据验证
 */
export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.nativeEnum(GraphNodeType),
  category: z.string().optional(),
  size: z.number().optional(),
  color: z.string().optional(),
  description: z.string().optional()
});

export const GraphLinkSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  strength: z.number().min(0).max(1).optional(),
  label: z.string().optional()
});

export const GraphDataSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  links: z.array(GraphLinkSchema)
});

/**
 * 类型导出
 */
export type NodeType = keyof typeof GraphNodeType;
export type PresetKey = keyof typeof CODE_STRUCTURE_PRESETS;