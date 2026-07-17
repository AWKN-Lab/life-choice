/**
 * T2.1-T2.3: 追问服务单元测试
 *
 * 覆盖：
 * 1. 槽位 schema 定义正确（每种类型有必填槽位）
 * 2. CompletenessAssessorService：
 *    - 咨询类型识别（career/relationship/wealth/health/general）
 *    - 信息完整时不需追问
 *    - 信息缺失时需要追问
 *    - LLM 失败时降级为规则匹配
 * 3. ClarificationService：
 *    - assessAndClarify 返回正确的 assessment 和 clarifyingQuestion
 *    - generateClarifyingQuestion 生成问句
 *    - shouldContinueClarifying 判断是否继续追问
 *
 * Mock 策略：LlmProvidersService 被完全 mock，不依赖真实 LLM API。
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LlmProvidersService } from '../../../llm-providers/llm-providers.service';
import {
  SLOT_SCHEMAS,
  CONSULT_TYPE_KEYWORDS,
  getRequiredSlots,
  findSlot,
  ConsultType,
} from '../slot-schema';
import { CompletenessAssessorService } from '../completeness-assessor.service';
import {
  ClarificationService,
  MAX_CLARIFICATION_ROUNDS,
} from '../clarification.service';

describe('Clarification Module', () => {
  // ─── T2.1: 槽位 Schema ───

  describe('Slot Schema (T2.1)', () => {
    it('每种咨询类型都有定义', () => {
      const expectedTypes: ConsultType[] = ['career', 'relationship', 'wealth', 'health', 'general'];
      for (const t of expectedTypes) {
        expect(SLOT_SCHEMAS[t]).toBeDefined();
        expect(Array.isArray(SLOT_SCHEMAS[t])).toBe(true);
        expect(SLOT_SCHEMAS[t].length).toBeGreaterThan(0);
      }
    });

    it('每种类型至少有一个必填槽位', () => {
      const types = Object.keys(SLOT_SCHEMAS) as ConsultType[];
      for (const t of types) {
        const required = getRequiredSlots(t);
        expect(required.length).toBeGreaterThan(0);
      }
    });

    it('career 类型有正确的必填槽位', () => {
      const required = getRequiredSlots('career');
      const requiredNames = required.map(s => s.name);
      expect(requiredNames).toContain('issue_domain');
      expect(requiredNames).toContain('current_situation');
      expect(requiredNames).toContain('core_conflict');
      // time_urgency 是选填
      expect(requiredNames).not.toContain('time_urgency');
    });

    it('relationship 类型有正确的必填槽位', () => {
      const required = getRequiredSlots('relationship');
      const requiredNames = required.map(s => s.name);
      expect(requiredNames).toContain('relationship_status');
      expect(requiredNames).toContain('core_conflict');
      expect(requiredNames).toContain('user_expectation');
      // partner_attitude 是选填
      expect(requiredNames).not.toContain('partner_attitude');
    });

    it('wealth 类型有正确的必填槽位', () => {
      const required = getRequiredSlots('wealth');
      const requiredNames = required.map(s => s.name);
      expect(requiredNames).toContain('decision_type');
      expect(requiredNames).toContain('core_conflict');
      // amount_range / risk_preference 是选填
      expect(requiredNames).not.toContain('amount_range');
      expect(requiredNames).not.toContain('risk_preference');
    });

    it('health 类型有正确的必填槽位', () => {
      const required = getRequiredSlots('health');
      const requiredNames = required.map(s => s.name);
      expect(requiredNames).toContain('symptom');
      expect(requiredNames).toContain('core_concern');
      // duration / action_taken 是选填
      expect(requiredNames).not.toContain('duration');
      expect(requiredNames).not.toContain('action_taken');
    });

    it('general 类型有 core_question 必填槽位', () => {
      const required = getRequiredSlots('general');
      const requiredNames = required.map(s => s.name);
      expect(requiredNames).toContain('core_question');
      // background 是选填
      expect(requiredNames).not.toContain('background');
    });

    it('findSlot 能根据 name 查找槽位', () => {
      const slot = findSlot('career', 'issue_domain');
      expect(slot).toBeDefined();
      expect(slot?.label).toBe('问题领域');
      expect(slot?.required).toBe(true);
    });

    it('findSlot 查找不存在的槽位返回 undefined', () => {
      const slot = findSlot('career', 'non_existent');
      expect(slot).toBeUndefined();
    });

    it('CONSULT_TYPE_KEYWORDS 为每种类型定义关键词', () => {
      expect(CONSULT_TYPE_KEYWORDS.career).toContain('事业');
      expect(CONSULT_TYPE_KEYWORDS.career).toContain('工作');
      expect(CONSULT_TYPE_KEYWORDS.relationship).toContain('感情');
      expect(CONSULT_TYPE_KEYWORDS.wealth).toContain('投资');
      expect(CONSULT_TYPE_KEYWORDS.health).toContain('健康');
      // general 兜底类型，关键词为空数组
      expect(Array.isArray(CONSULT_TYPE_KEYWORDS.general)).toBe(true);
    });
  });

  // ─── T2.2: CompletenessAssessorService ───

  describe('CompletenessAssessorService (T2.2)', () => {
    let assessor: CompletenessAssessorService;
    let llmProviders: any;

    beforeEach(async () => {
      llmProviders = {
        chatCheap: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CompletenessAssessorService,
          { provide: LlmProvidersService, useValue: llmProviders },
        ],
      }).compile();

      assessor = module.get<CompletenessAssessorService>(CompletenessAssessorService);
    });

    describe('detectConsultType', () => {
      it('识别 career 类型（事业关键词）', () => {
        const type = assessor.detectConsultType('我想问问事业方向');
        expect(type).toBe('career');
      });

      it('识别 career 类型（工作关键词）', () => {
        const type = assessor.detectConsultType('最近工作不顺');
        expect(type).toBe('career');
      });

      it('识别 relationship 类型（感情关键词）', () => {
        const type = assessor.detectConsultType('感情出了问题');
        expect(type).toBe('relationship');
      });

      it('识别 relationship 类型（婚姻关键词）', () => {
        const type = assessor.detectConsultType('婚姻亮红灯了');
        expect(type).toBe('relationship');
      });

      it('识别 wealth 类型（投资关键词）', () => {
        const type = assessor.detectConsultType('想投资股票');
        expect(type).toBe('wealth');
      });

      it('识别 wealth 类型（财运关键词）', () => {
        const type = assessor.detectConsultType('今年财运怎么样');
        expect(type).toBe('wealth');
      });

      it('识别 health 类型（健康关键词）', () => {
        const type = assessor.detectConsultType('最近健康出问题');
        expect(type).toBe('health');
      });

      it('识别 health 类型（失眠关键词）', () => {
        const type = assessor.detectConsultType('长期失眠怎么办');
        expect(type).toBe('health');
      });

      it('无匹配关键词时降级为 general', () => {
        const type = assessor.detectConsultType('随便看看');
        expect(type).toBe('general');
      });

      it('结合对话历史识别类型', () => {
        // 单看问题不够明确，但对话历史中有"工作"关键词
        const type = assessor.detectConsultType('怎么办', [
          { role: 'user', content: '工作压力大' },
        ]);
        expect(type).toBe('career');
      });

      it('多类型命中时取命中数最多的', () => {
        // 同时有"工作"和"投资"，但 wealth 关键词更多
        const type = assessor.detectConsultType('工作投资股票基金买房');
        // career: 工作(1) = 1
        // wealth: 投资(1)+股票(1)+基金(1)+买房(1) = 4
        expect(type).toBe('wealth');
      });
    });

    describe('assessCompleteness - LLM 成功路径', () => {
      it('信息完整时不需追问', async () => {
        llmProviders.chatCheap.mockResolvedValue({
          content: JSON.stringify({
            filledSlots: ['issue_domain', 'current_situation', 'core_conflict'],
          }),
        });

        const result = await assessor.assessCompleteness({
          question: '我在互联网公司做产品经理，现在面临升职还是跳槽的抉择，很纠结',
        });

        expect(result.consultType).toBe('career');
        expect(result.filledSlots).toContain('issue_domain');
        expect(result.filledSlots).toContain('current_situation');
        expect(result.filledSlots).toContain('core_conflict');
        expect(result.clarityScore).toBe(1);
        expect(result.needsClarification).toBe(false);
        expect(result.clarifyingTarget).toBe('');
      });

      it('信息缺失时需要追问', async () => {
        llmProviders.chatCheap.mockResolvedValue({
          content: JSON.stringify({
            filledSlots: ['issue_domain'], // 只填了 1 个必填
          }),
        });

        const result = await assessor.assessCompleteness({
          question: '事业方面',
        });

        expect(result.consultType).toBe('career');
        expect(result.needsClarification).toBe(true);
        expect(result.clarityScore).toBeLessThan(1);
        // 第一个缺失的必填槽位
        expect(result.clarifyingTarget).toBe('current_situation');
      });

      it('clarityScore 计算正确（部分必填槽位填充）', async () => {
        // career 必填：issue_domain, current_situation, core_conflict（共 3 个）
        llmProviders.chatCheap.mockResolvedValue({
          content: JSON.stringify({
            filledSlots: ['issue_domain', 'current_situation'],
          }),
        });

        const result = await assessor.assessCompleteness({
          question: '事业方面的工作问题',
        });

        expect(result.consultType).toBe('career');
        expect(result.clarityScore).toBeCloseTo(2 / 3, 2);
        expect(result.needsClarification).toBe(true); // 仍有 core_conflict 缺失
        expect(result.clarifyingTarget).toBe('core_conflict');
      });

      it('general 类型信息完整时不需追问', async () => {
        llmProviders.chatCheap.mockResolvedValue({
          content: JSON.stringify({
            filledSlots: ['core_question'],
          }),
        });

        const result = await assessor.assessCompleteness({
          question: '帮我看看今年的运势',
        });

        expect(result.consultType).toBe('general');
        expect(result.filledSlots).toContain('core_question');
        expect(result.clarityScore).toBe(1);
        expect(result.needsClarification).toBe(false);
      });

      it('LLM 返回非法 JSON 时降级为规则匹配', async () => {
        llmProviders.chatCheap.mockResolvedValue({
          content: '这不是 JSON',
        });

        const result = await assessor.assessCompleteness({
          question: '我想问问事业方向，目前在互联网公司做产品，面临升职还是跳槽的抉择', // 长输入
        });

        expect(result.consultType).toBe('career');
        // 降级规则：长输入填充所有必填槽位
        expect(result.filledSlots).toContain('issue_domain');
        expect(result.filledSlots).toContain('current_situation');
        expect(result.filledSlots).toContain('core_conflict');
        expect(result.needsClarification).toBe(false);
      });

      it('LLM 返回包含 JSON 的混合文本时能提取', async () => {
        llmProviders.chatCheap.mockResolvedValue({
          content: '好的，分析结果：{"filledSlots": ["issue_domain"]} 完毕',
        });

        const result = await assessor.assessCompleteness({
          question: '事业方面',
        });

        expect(result.consultType).toBe('career');
        expect(result.filledSlots).toContain('issue_domain');
        expect(result.needsClarification).toBe(true);
      });

      it('LLM 返回的非法槽位名被过滤', async () => {
        llmProviders.chatCheap.mockResolvedValue({
          content: JSON.stringify({
            filledSlots: ['issue_domain', 'invalid_slot', 'current_situation'],
          }),
        });

        const result = await assessor.assessCompleteness({
          question: '事业方面',
        });

        expect(result.filledSlots).toContain('issue_domain');
        expect(result.filledSlots).toContain('current_situation');
        expect(result.filledSlots).not.toContain('invalid_slot');
      });
    });

    describe('assessCompleteness - LLM 失败降级', () => {
      it('LLM 抛错时降级为规则匹配', async () => {
        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 服务不可用'));

        const result = await assessor.assessCompleteness({
          question: '我想问问事业方向，目前在互联网公司做产品，面临升职还是跳槽的抉择', // 长输入
        });

        expect(result.consultType).toBe('career');
        // 降级规则：长输入（≥20字符）填充所有必填槽位
        expect(result.filledSlots).toContain('issue_domain');
        expect(result.filledSlots).toContain('current_situation');
        expect(result.filledSlots).toContain('core_conflict');
        expect(result.needsClarification).toBe(false);
      });

      it('LLM 失败 + 短输入 → 仅填充第一个必填槽位', async () => {
        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 服务不可用'));

        const result = await assessor.assessCompleteness({
          question: '事业', // 短输入
        });

        expect(result.consultType).toBe('career');
        // 降级规则：短输入仅填充第一个必填槽位
        expect(result.filledSlots).toContain('issue_domain');
        expect(result.filledSlots).not.toContain('current_situation');
        expect(result.needsClarification).toBe(true);
      });
    });

    describe('assessCompleteness - 无 LLM 场景', () => {
      it('无 LlmProvidersService 时直接走规则匹配', async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [CompletenessAssessorService],
        }).compile();
        const assessorNoLlm = module.get<CompletenessAssessorService>(CompletenessAssessorService);

        const result = await assessorNoLlm.assessCompleteness({
          question: '我想问问事业方向，目前在互联网公司做产品，面临升职还是跳槽的抉择',
        });

        expect(result.consultType).toBe('career');
        expect(result.filledSlots).toContain('issue_domain');
        expect(result.needsClarification).toBe(false);
      });
    });
  });

  // ─── T2.3: ClarificationService ───

  describe('ClarificationService (T2.3)', () => {
    let clarificationService: ClarificationService;
    let assessor: any;
    let llmProviders: any;

    beforeEach(async () => {
      assessor = {
        assessCompleteness: jest.fn(),
      };
      llmProviders = {
        chatCheap: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ClarificationService,
          { provide: CompletenessAssessorService, useValue: assessor },
          { provide: LlmProvidersService, useValue: llmProviders },
        ],
      }).compile();

      clarificationService = module.get<ClarificationService>(ClarificationService);
    });

    describe('assessAndClarify', () => {
      it('不需追问时返回 clarifyingQuestion=null', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'career',
          filledSlots: ['issue_domain', 'current_situation', 'core_conflict'],
          missingSlots: ['time_urgency'],
          clarityScore: 1,
          needsClarification: false,
          clarifyingTarget: '',
        });

        const result = await clarificationService.assessAndClarify('完整的问题描述');

        expect(result.assessment.needsClarification).toBe(false);
        expect(result.clarifyingQuestion).toBeNull();
      });

      it('需要追问时返回 assessment 和 clarifyingQuestion', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'career',
          filledSlots: ['issue_domain'],
          missingSlots: ['current_situation', 'core_conflict', 'time_urgency'],
          clarityScore: 1 / 3,
          needsClarification: true,
          clarifyingTarget: 'current_situation',
        });

        llmProviders.chatCheap.mockResolvedValue({
          content: '说说你目前的工作状态？',
        });

        const result = await clarificationService.assessAndClarify('事业方面');

        expect(result.assessment.needsClarification).toBe(true);
        expect(result.assessment.clarifyingTarget).toBe('current_situation');
        expect(result.clarifyingQuestion).toBe('说说你目前的工作状态？');
      });

      it('needsClarification=true 但 clarifyingTarget 为空时不追问', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'career',
          filledSlots: [],
          missingSlots: [],
          clarityScore: 1,
          needsClarification: true, // 异常情况
          clarifyingTarget: '',
        });

        const result = await clarificationService.assessAndClarify('测试');

        expect(result.clarifyingQuestion).toBeNull();
      });

      it('LLM 生成追问失败时降级为模板话术', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'career',
          filledSlots: [],
          missingSlots: ['issue_domain', 'current_situation', 'core_conflict'],
          clarityScore: 0,
          needsClarification: true,
          clarifyingTarget: 'issue_domain',
        });

        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 不可用'));

        const result = await clarificationService.assessAndClarify('事业');

        expect(result.clarifyingQuestion).toBe(
          '你具体想问事业的哪个方向？比如升职、跳槽还是创业？',
        );
      });

      it('传入对话历史给 assessor', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'general',
          filledSlots: ['core_question'],
          missingSlots: ['background'],
          clarityScore: 1,
          needsClarification: false,
          clarifyingTarget: '',
        });

        const history = [{ role: 'user', content: '之前的问题' }];
        await clarificationService.assessAndClarify('新问题', history);

        expect(assessor.assessCompleteness).toHaveBeenCalledWith({
          question: '新问题',
          dialogueHistory: history,
        });
      });
    });

    describe('generateClarifyingQuestion', () => {
      it('LLM 生成问句成功', async () => {
        llmProviders.chatCheap.mockResolvedValue({
          content: '你目前的工作状态是什么？',
        });

        const question = await clarificationService.generateClarifyingQuestion(
          'current_situation',
          'career',
          '用户问事业',
        );

        expect(question).toBe('你目前的工作状态是什么？');
        expect(llmProviders.chatCheap).toHaveBeenCalledTimes(1);
      });

      it('LLM 返回超长问句时截断到 30 字', async () => {
        const longQuestion = '这是一段非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的问句超过三十字';
        llmProviders.chatCheap.mockResolvedValue({
          content: longQuestion,
        });

        const question = await clarificationService.generateClarifyingQuestion(
          'current_situation',
          'career',
          '上下文',
        );

        expect(question.length).toBeLessThanOrEqual(30);
      });

      it('LLM 失败时降级为模板（career:issue_domain）', async () => {
        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 不可用'));

        const question = await clarificationService.generateClarifyingQuestion(
          'issue_domain',
          'career',
          '上下文',
        );

        expect(question).toBe('你具体想问事业的哪个方向？比如升职、跳槽还是创业？');
      });

      it('LLM 失败时降级为模板（relationship:relationship_status）', async () => {
        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 不可用'));

        const question = await clarificationService.generateClarifyingQuestion(
          'relationship_status',
          'relationship',
          '上下文',
        );

        expect(question).toBe('你目前的关系状态是？单身、恋爱中还是已婚？');
      });

      it('LLM 失败时降级为模板（wealth:decision_type）', async () => {
        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 不可用'));

        const question = await clarificationService.generateClarifyingQuestion(
          'decision_type',
          'wealth',
          '上下文',
        );

        expect(question).toBe('这是投资、消费、储蓄还是借贷的决策？');
      });

      it('LLM 失败时降级为模板（health:symptom）', async () => {
        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 不可用'));

        const question = await clarificationService.generateClarifyingQuestion(
          'symptom',
          'health',
          '上下文',
        );

        expect(question).toBe('具体是哪里不舒服？身体还是情绪？');
      });

      it('槽位不存在时返回默认话术', async () => {
        const question = await clarificationService.generateClarifyingQuestion(
          'non_existent_slot',
          'career',
          '上下文',
        );

        expect(question).toBe('能再多说一些细节吗？这样我才能给你更准的判断。');
      });

      it('无匹配模板时返回默认话术', async () => {
        llmProviders.chatCheap.mockRejectedValue(new Error('LLM 不可用'));

        // general:background 有模板，验证一下
        const question = await clarificationService.generateClarifyingQuestion(
          'background',
          'general',
          '上下文',
        );

        expect(question).toBe('能补充一些相关背景吗？');
      });
    });

    describe('shouldContinueClarify', () => {
      it('达到最大追问轮次时返回 false', async () => {
        const result = await clarificationService.shouldContinueClarifying(
          '用户回复',
          {
            consultType: 'career',
            filledSlots: ['issue_domain'],
            missingSlots: ['current_situation'],
            clarityScore: 0.33,
            needsClarification: true,
            clarifyingTarget: 'current_situation',
          },
          [],
          MAX_CLARIFICATION_ROUNDS, // 已达上限
        );

        expect(result).toBe(false);
        expect(assessor.assessCompleteness).not.toHaveBeenCalled();
      });

      it('重新评估后仍需追问时返回 true', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'career',
          filledSlots: ['issue_domain'],
          missingSlots: ['current_situation', 'core_conflict'],
          clarityScore: 0.33,
          needsClarification: true,
          clarifyingTarget: 'current_situation',
        });

        const result = await clarificationService.shouldContinueClarifying(
          '用户补充了一些信息',
          {
            consultType: 'career',
            filledSlots: [],
            missingSlots: ['issue_domain', 'current_situation', 'core_conflict'],
            clarityScore: 0,
            needsClarification: true,
            clarifyingTarget: 'issue_domain',
          },
          [],
          1, // 第 1 轮，未达上限
        );

        expect(result).toBe(true);
        // 验证将 userReply 加入 dialogueHistory
        expect(assessor.assessCompleteness).toHaveBeenCalledWith({
          question: '用户补充了一些信息',
          dialogueHistory: [{ role: 'user', content: '用户补充了一些信息' }],
        });
      });

      it('重新评估后信息完整时返回 false', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'career',
          filledSlots: ['issue_domain', 'current_situation', 'core_conflict'],
          missingSlots: [],
          clarityScore: 1,
          needsClarification: false,
          clarifyingTarget: '',
        });

        const result = await clarificationService.shouldContinueClarifying(
          '用户提供了完整的背景信息',
          {
            consultType: 'career',
            filledSlots: ['issue_domain'],
            missingSlots: ['current_situation', 'core_conflict'],
            clarityScore: 0.33,
            needsClarification: true,
            clarifyingTarget: 'current_situation',
          },
          [],
          1,
        );

        expect(result).toBe(false);
      });

      it('将历史对话和 userReply 一起传入评估', async () => {
        assessor.assessCompleteness.mockResolvedValue({
          consultType: 'career',
          filledSlots: ['issue_domain', 'current_situation', 'core_conflict'],
          missingSlots: [],
          clarityScore: 1,
          needsClarification: false,
          clarifyingTarget: '',
        });

        const history = [
          { role: 'user', content: '原始问题' },
          { role: 'zhangbanshan', content: '追问1' },
        ];

        await clarificationService.shouldContinueClarifying(
          '用户回复',
          {
            consultType: 'career',
            filledSlots: [],
            missingSlots: [],
            clarityScore: 0,
            needsClarification: true,
            clarifyingTarget: 'issue_domain',
          },
          history,
          1,
        );

        expect(assessor.assessCompleteness).toHaveBeenCalledWith({
          question: '用户回复',
          dialogueHistory: [
            ...history,
            { role: 'user', content: '用户回复' },
          ],
        });
      });
    });
  });

  // ─── 模块集成测试 ───

  describe('Module Integration', () => {
    it('ClarificationModule 能正确装配所有 provider', async () => {
      const { ClarificationModule } = require('../clarification.module');
      const module: TestingModule = await Test.createTestingModule({
        imports: [ClarificationModule],
      })
        .overrideProvider(LlmProvidersService)
        .useValue({ chatCheap: jest.fn() })
        .compile();

      const assessor = module.get<CompletenessAssessorService>(CompletenessAssessorService);
      const clarification = module.get<ClarificationService>(ClarificationService);

      expect(assessor).toBeInstanceOf(CompletenessAssessorService);
      expect(clarification).toBeInstanceOf(ClarificationService);
    });

    it('MAX_CLARIFICATION_ROUNDS 等于 2', () => {
      expect(MAX_CLARIFICATION_ROUNDS).toBe(2);
    });
  });
});
