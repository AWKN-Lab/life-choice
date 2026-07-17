/**
 * 配置驱动状态机演示页面
 */

import React, { useState } from 'react';
import { ConfigDrivenStateMachine, StateTimeline } from '../../components/StateMachine/ConfigDrivenStateMachine';
import { PRESET_STATE_MACHINES, StateMachineConfig } from '../../types/stateMachine';
import { useMultiStateMachineStore } from '../../store/stateMachineStore';
import styles from './StateMachineDemo.module.css';

// 多状态机管理演示
function MultiMachineDemo() {
  const { machines, initMachine, sendTo, resetMachine, removeMachine } = useMultiStateMachineStore();
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [machineConfigs, setMachineConfigs] = useState<Record<string, StateMachineConfig>>({});

  const createMachine = (presetKey: string) => {
    const config = PRESET_STATE_MACHINES[presetKey];
    const machineId = `machine_${Date.now()}`;
    initMachine(machineId, config);
    setMachineConfigs(prev => ({ ...prev, [machineId]: config }));
    setSelectedMachine(machineId);
  };

  const handleSend = (machineId: string, eventId: string) => {
    const config = machineConfigs[machineId];
    if (config) {
      sendTo(machineId, eventId, config);
    }
  };

  return (
    <div className={styles.multiDemo}>
      <div className={styles.controls}>
        <h4>多状态机管理</h4>
        <div className={styles.createButtons}>
          {Object.keys(PRESET_STATE_MACHINES).map(key => (
            <button
              key={key}
              onClick={() => createMachine(key)}
              className={styles.createBtn}
            >
              + {PRESET_STATE_MACHINES[key].name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.machinesList}>
        {Object.entries(machines).map(([id, context]) => {
          const config = machineConfigs[id];
          if (!config) return null;
          
          return (
            <div 
              key={id} 
              className={`${styles.machineCard} ${selectedMachine === id ? styles.selected : ''}`}
              onClick={() => setSelectedMachine(id)}
            >
              <div className={styles.machineHeader}>
                <span className={styles.machineId}>{id.slice(0, 12)}...</span>
                <span className={styles.currentState}>
                  {config.states.find(s => s.id === context.currentState)?.name || context.currentState}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeMachine(id); }}
                  className={styles.removeBtn}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.machineHistory}>
                {context.history.slice(-5).map((stateId, i) => (
                  <span key={i} className={styles.historyItem}>
                    {config.states.find(s => s.id === stateId)?.name}
                    {i < context.history.slice(-5).length - 1 && ' → '}
                  </span>
                ))}
              </div>

              <div className={styles.quickActions}>
                {config.events.slice(0, 3).map(event => (
                  <button
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); handleSend(id, event.id); }}
                    className={styles.quickBtn}
                  >
                    {event.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedMachine && machineConfigs[selectedMachine] && (
        <div className={styles.detailPanel}>
          <StateTimeline 
            history={machines[selectedMachine].history}
            states={machineConfigs[selectedMachine].states}
          />
          <button 
            onClick={() => resetMachine(selectedMachine, machineConfigs[selectedMachine])}
            className={styles.resetBtn}
          >
            重置此状态机
          </button>
        </div>
      )}
    </div>
  );
}

// 预设模板对比
function PresetComparison() {
  return (
    <div className={styles.comparison}>
      <h4>预设模板</h4>
      <div className={styles.presetGrid}>
        {Object.entries(PRESET_STATE_MACHINES).map(([key, config]) => (
          <div key={key} className={styles.presetCard}>
            <h5>{config.name}</h5>
            <p>{config.description}</p>
            <div className={styles.presetStats}>
              <span>{config.states.length} 状态</span>
              <span>{config.events.length} 事件</span>
              <span>{config.transitions.length} 转换</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 主页面
export default function StateMachineDemo() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>配置驱动状态机</h2>
        <p>通过JSON配置定义状态机，自动生成TypeScript代码和Zustand Store</p>
      </div>

      <div className={styles.main}>
        {/* 主要演示 */}
        <section className={styles.section}>
          <h3>实时状态机演示</h3>
          <ConfigDrivenStateMachine />
        </section>

        {/* 多状态机 */}
        <section className={styles.section}>
          <MultiMachineDemo />
        </section>

        {/* 预设模板 */}
        <section className={styles.section}>
          <PresetComparison />
        </section>
      </div>
    </div>
  );
}