/**
 * 配置驱动状态机组件
 * 用于awkn-programmer - 可视化配置和运行状态机
 */

import React, { useState, useMemo } from 'react';
import { 
  PRESET_STATE_MACHINES, 
  StateMachineConfig,
  validateStateMachineConfig,
  generateStateMachineCode,
  type StateMachineContext,
  type TransitionResult,
  StateType
} from '../../types/stateMachine';
import { useStateMachine } from '../../store/stateMachineStore';
import styles from './StateMachine.module.css';

// 状态节点颜色映射
const STATE_COLORS: Record<StateType, string> = {
  [StateType.INITIAL]: '#10b981',   // 绿色 - 初始
  [StateType.NORMAL]: '#3b82f6',    // 蓝色 - 普通
  [StateType.FINAL]: '#ef4444',     // 红色 - 终态
  [StateType.CHOICE]: '#f59e0b',   // 橙色 - 决策
  [StateType.PARALLEL]: '#8b5cf6', // 紫色 - 并行
  [StateType.JOIN]: '#6366f1',     // 靛蓝 - 合并
};

// 小型状态机可视化
interface MiniStateMachineVizProps {
  config: StateMachineConfig;
  currentState: string;
  size?: number;
}

function MiniStateMachineViz({ config, currentState, size = 300 }: MiniStateMachineVizProps) {
  // 计算节点位置（圆形布局）
  const nodes = useMemo(() => {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    
    return config.states.map((state, index) => {
      const angle = (2 * Math.PI * index) / config.states.length - Math.PI / 2;
      return {
        ...state,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        isActive: state.id === currentState,
        isFinal: config.finalStates?.includes(state.id),
      };
    });
  }, [config, currentState, size]);

  return (
    <div className={styles.miniViz} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 转换箭头 */}
        {config.transitions.slice(0, 10).map((t, i) => {
          const fromNode = nodes.find(n => n.id === t.from);
          const toNode = nodes.find(n => n.id === t.to);
          if (!fromNode || !toNode) return null;
          
          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const offset = 15;
          
          return (
            <line
              key={i}
              x1={fromNode.x + (dx / dist) * offset}
              y1={fromNode.y + (dy / dist) * offset}
              x2={toNode.x - (dx / dist) * offset}
              y2={toNode.y - (dy / dist) * offset}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.6"
            />
          );
        })}
        
        {/* 节点 */}
        {nodes.map(node => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.isActive ? 18 : 14}
              fill={node.isActive ? STATE_COLORS[node.type] : 'white'}
              stroke={STATE_COLORS[node.type]}
              strokeWidth={node.isActive ? 3 : 2}
              opacity={node.isActive ? 1 : 0.8}
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fontSize="10"
              fill={node.isActive ? 'white' : STATE_COLORS[node.type]}
              fontWeight={node.isActive ? 'bold' : 'normal'}
            >
              {node.name.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// 状态机配置面板
interface ConfigPanelProps {
  config: StateMachineConfig;
  onConfigChange: (config: StateMachineConfig) => void;
}

function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'states' | 'events' | 'transitions'>('states');

  return (
    <div className={styles.configPanel}>
      <div className={styles.configTabs}>
        <button 
          className={selectedTab === 'states' ? styles.active : ''}
          onClick={() => setSelectedTab('states')}
        >
          状态 ({config.states.length})
        </button>
        <button 
          className={selectedTab === 'events' ? styles.active : ''}
          onClick={() => setSelectedTab('events')}
        >
          事件 ({config.events.length})
        </button>
        <button 
          className={selectedTab === 'transitions' ? styles.active : ''}
          onClick={() => setSelectedTab('transitions')}
        >
          转换 ({config.transitions.length})
        </button>
      </div>

      <div className={styles.configContent}>
        {selectedTab === 'states' && (
          <div className={styles.stateList}>
            {config.states.map(state => (
              <div key={state.id} className={styles.stateItem}>
                <span 
                  className={styles.stateDot}
                  style={{ backgroundColor: STATE_COLORS[state.type] }}
                />
                <span className={styles.stateName}>{state.name}</span>
                <span className={styles.stateType}>{state.type}</span>
                {config.finalStates?.includes(state.id) && (
                  <span className={styles.finalBadge}>终</span>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'events' && (
          <div className={styles.eventList}>
            {config.events.map(event => (
              <div key={event.id} className={styles.eventItem}>
                <span className={styles.eventName}>{event.name}</span>
                {event.description && (
                  <span className={styles.eventDesc}>{event.description}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'transitions' && (
          <div className={styles.transitionList}>
            {config.transitions.map(t => (
              <div key={t.id} className={styles.transitionItem}>
                <span className={styles.fromState}>{config.states.find(s => s.id === t.from)?.name}</span>
                <span className={styles.arrow}>→</span>
                <span className={styles.eventName}>{config.events.find(e => e.id === t.event)?.name}</span>
                <span className={styles.arrow}>→</span>
                <span className={styles.toState}>{config.states.find(s => s.id === t.to)?.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 主要状态机组件
interface ConfigDrivenStateMachineProps {
  className?: string;
}

export function ConfigDrivenStateMachine({ className }: ConfigDrivenStateMachineProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('npcFate');
  const [showCode, setShowCode] = useState(false);

  const preset = PRESET_STATE_MACHINES[selectedPreset];
  const { context, send, reset } = useStateMachine(preset) as any;

  const handleEvent = (eventId: string) => {
    send(eventId);
  };

  const handleReset = () => {
    reset();
  };

  const codeOutput = useMemo(() => {
    return generateStateMachineCode(preset);
  }, [preset]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <h3>配置驱动状态机</h3>
        <select 
          value={selectedPreset}
          onChange={e => setSelectedPreset(e.target.value)}
          className={styles.presetSelect}
        >
          {Object.entries(PRESET_STATE_MACHINES).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.content}>
        {/* 左侧：状态机可视化 */}
        <div className={styles.visualization}>
          <MiniStateMachineViz 
            config={preset} 
            currentState={context.currentState}
            size={280}
          />
          
          {/* 事件按钮 */}
          <div className={styles.eventButtons}>
            {preset.events.map(event => (
              <button
                key={event.id}
                onClick={() => handleEvent(event.id)}
                className={styles.eventButton}
                title={event.description}
              >
                {event.name}
              </button>
            ))}
          </div>

          <div className={styles.controls}>
            <button onClick={handleReset} className={styles.resetButton}>
              重置
            </button>
            <button onClick={() => setShowCode(!showCode)} className={styles.codeButton}>
              {showCode ? '隐藏代码' : '生成代码'}
            </button>
          </div>
        </div>

        {/* 右侧：配置面板 */}
        <div className={styles.rightPanel}>
          <ConfigPanel config={preset} onConfigChange={() => {}} />
          
          {/* 运行时状态 */}
          <div className={styles.runtimeInfo}>
            <h4>运行时状态</h4>
            <div className={styles.contextInfo}>
              <div className={styles.contextItem}>
                <span className={styles.label}>当前状态:</span>
                <span className={styles.value}>
                  {preset.states.find(s => s.id === context.currentState)?.name || context.currentState}
                </span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.label}>上一状态:</span>
                <span className={styles.value}>
                  {context.previousState ? 
                    preset.states.find(s => s.id === context.previousState)?.name || context.previousState 
                    : '-'}
                </span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.label}>历史:</span>
                <span className={styles.value}>{context.history.length} 步</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 代码生成面板 */}
      {showCode && (
        <div className={styles.codePanel}>
          <div className={styles.codeHeader}>
            <h4>生成的代码</h4>
            <span className={styles.codeInfo}>
              {codeOutput.length} 个文件
            </span>
          </div>
          <div className={styles.codeFiles}>
            {codeOutput.map((file, index) => (
              <div key={index} className={styles.codeFile}>
                <div className={styles.codeFilename}>{file.filename}</div>
                <pre className={styles.codeContent}>{file.content}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 状态历史时间线
interface StateTimelineProps {
  history: string[];
  states: StateMachineConfig['states'];
}

export function StateTimeline({ history, states }: StateTimelineProps) {
  return (
    <div className={styles.timeline}>
      <div className={styles.timelineTrack}>
        {history.map((stateId, index) => {
          const state = states.find(s => s.id === stateId);
          return (
            <div key={index} className={styles.timelineItem}>
              <div 
                className={styles.timelineDot}
                style={{ backgroundColor: STATE_COLORS[state?.type || StateType.NORMAL] }}
              />
              <div className={styles.timelineContent}>
                <span className={styles.timelineState}>{state?.name || stateId}</span>
                <span className={styles.timelineIndex}>#{index + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConfigDrivenStateMachine;