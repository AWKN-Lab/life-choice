/**
 * Prompt Layers 测试 — 记忆回流到 Prompt
 *
 * 验证：
 * - buildContextLayer 注入 memorySummary
 * - buildSystemPromptFromLayers 完整组装
 * - memorySummary 为空时不注入多余内容
 */

import { buildContextLayer, buildSystemPromptFromLayers, buildIdentityLayer, buildCapabilityLayer, buildDynamicLayer, buildLifeStageLayer } from '../../orchestrator/prompt-layers';
import type { LifeStageContext } from '../../orchestrator/prompt-layers';

describe('Prompt Layers — 记忆回流', () => {
  describe('buildContextLayer', () => {
    it('注入 memorySummary', () => {
      const result = buildContextLayer({
        memorySummary: '用户上次问了事业运势，判断为稳中有进',
        emotionInstruction: '保持沉稳',
      });
      expect(result).toContain('用户上次问了事业运势');
      expect(result).toContain('保持沉稳');
    });

    it('memorySummary 为空时显示"首次咨询"', () => {
      const result = buildContextLayer({
        memorySummary: '',
        emotionInstruction: '保持沉稳',
      });
      expect(result).toContain('首次咨询');
    });

    it('注入记忆锚点', () => {
      const result = buildContextLayer({
        memorySummary: '用户上次问了事业运势',
        emotionInstruction: '保持沉稳',
        memoryAnchor: '上次你问事业运势时，我说稳中有进',
      });
      expect(result).toContain('记忆锚点');
      expect(result).toContain('上次你问事业运势时');
    });
  });

  describe('buildSystemPromptFromLayers', () => {
    it('完整组装包含所有 5 层', () => {
      const result = buildSystemPromptFromLayers({
        scenarioName: '八字分析',
        primaryAgent: 'ziping',
        secondaryAgent: null,
        availableTools: ['bazi'],
        memorySummary: '用户上次问了事业运势',
        emotionInstruction: '保持沉稳',
        question: '今年事业怎么样',
        agentName: '八字分析',
        agentSummary: '事业稳中有进',
        secondarySection: '',
      });
      expect(result).toContain('张半山');
      expect(result).toContain('用户上次问了事业运势');
      expect(result).toContain('今年事业怎么样');
    });

    it('无 memorySummary 时不包含记忆段', () => {
      const result = buildSystemPromptFromLayers({
        scenarioName: '八字分析',
        primaryAgent: 'ziping',
        secondaryAgent: null,
        availableTools: ['bazi'],
        memorySummary: '',
        emotionInstruction: '保持沉稳',
        question: '今年事业怎么样',
        agentName: '八字分析',
        agentSummary: '事业稳中有进',
        secondarySection: '',
      });
      expect(result).toContain('首次咨询');
    });
  });

  describe('buildIdentityLayer', () => {
    it('包含角色核心定义', () => {
      const result = buildIdentityLayer();
      expect(result).toContain('张半山');
      expect(result).toContain('陪断者');
      expect(result).toContain('代价');
    });

    it('包含禁区表达', () => {
      const result = buildIdentityLayer();
      expect(result).toContain('命中注定');
      expect(result).toContain('天意如此');
    });
  });

  // 任务 2.6: 3 条问事引用 K线/潮汐验证
  describe('任务 2.6 — buildLifeStageLayer（K线/潮汐状态窗口注入）', () => {
    it('用例1：仅 klineStage 时正确生成 K线6态状态段', () => {
      const input: LifeStageContext = {
        klineStage: {
          stage: 'breakthrough',
          stageLabel: '突破',
          reason: '综合潮汐分82，扩张概率68%，主升窗口已打开',
          actionAdvice: '可推进关键决策，把握当前窗口',
          windowTip: '未来2周是关键发力期',
          signalLabel: '主升窗口',
          tideScore: 82,
          targetDate: '2026-06',
        },
      };
      const result = buildLifeStageLayer(input);
      expect(result).toContain('【人生状态窗口】');
      expect(result).toContain('突破');
      expect(result).toContain('breakthrough');
      expect(result).toContain('主升窗口');
      expect(result).toContain('82');
      expect(result).toContain('可推进关键决策');
      expect(result).toContain('未来2周是关键发力期');
      // 不应包含潮汐相位段
      expect(result).not.toContain('潮汐相位');
    });

    it('用例2：仅 tideStatus 时正确生成潮汐12维相位段（三组判断齐全）', () => {
      const input: LifeStageContext = {
        tideStatus: {
          phaseJudgment: '时位心三盘共振上行，宜主动出击',
          shortDirective: '本周可推进关键决策',
          windowTip: '未来3天是最佳窗口',
          actionAdvice: '聚焦事业主线，暂缓副业扩张',
          timeStatus: { score: 78, level: 'high', label: '时机强' },
          positionStatus: { score: 65, level: 'mid', label: '根基稳' },
          mindStatus: { score: 72, level: 'high', label: '心能足' },
          quadrant: 'prosperous',
          targetDate: '2026-06',
        },
      };
      const result = buildLifeStageLayer(input);
      expect(result).toContain('潮汐相位');
      expect(result).toContain('时位心三盘共振上行');
      expect(result).toContain('时（时机）：时机强（78）');
      expect(result).toContain('位（根基）：根基稳（65）');
      expect(result).toContain('心（心能）：心能足（72）');
      expect(result).toContain('象限：prosperous');
      expect(result).toContain('本周可推进关键决策');
      // 不应包含 K线状态段
      expect(result).not.toContain('K线状态');
    });

    it('用例3：buildSystemPromptFromLayers 传入 lifeStage 时完整注入状态窗口+应用要求', () => {
      const lifeStage: LifeStageContext = {
        klineStage: {
          stage: 'attack',
          stageLabel: '进攻',
          reason: '主升窗口已开，综合分75',
          actionAdvice: '可推进决策',
          windowTip: '本周发力',
        },
        tideStatus: {
          phaseJudgment: '三盘共振',
          shortDirective: '主动出击',
          windowTip: '3天窗口',
          actionAdvice: '聚焦主线',
          timeStatus: { score: 78, level: 'high', label: '时机强' },
          positionStatus: { score: 65, level: 'mid', label: '根基稳' },
          mindStatus: { score: 72, level: 'high', label: '心能足' },
        },
      };
      const result = buildSystemPromptFromLayers({
        scenarioName: '八字分析',
        primaryAgent: 'ziping',
        secondaryAgent: null,
        availableTools: ['bazi'],
        memorySummary: '',
        emotionInstruction: '保持沉稳',
        question: '今年事业怎么样',
        agentName: '八字分析',
        agentSummary: '事业稳中有进',
        secondarySection: '',
        lifeStage,
      });
      // 验证状态窗口已注入 system prompt
      expect(result).toContain('【人生状态窗口】');
      expect(result).toContain('进攻');
      expect(result).toContain('潮汐相位');
      expect(result).toContain('三盘共振');
      // 验证状态窗口应用要求已注入
      expect(result).toContain('【状态窗口应用要求】');
      expect(result).toContain('不能脱离状态空谈');
      expect(result).toContain('保持一致方向');
      // 验证其他层未被破坏
      expect(result).toContain('张半山');
      expect(result).toContain('今年事业怎么样');
    });
  });
});
