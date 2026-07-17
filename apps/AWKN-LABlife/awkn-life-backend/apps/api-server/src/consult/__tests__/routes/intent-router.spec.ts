﻿﻿﻿/**
 * 4 路由 e2e 测试 — IntentRouter 单元测试 + 路由决策验证
 *
 * 验证 IntentRouterService 的 4 种路由决策：
 * - ziping：有出生信息 + 子平类问题
 * - liuren：六壬类问题
 * - mixed：有出生信息 + 六壬类问题
 * - clarify：无出生信息 + 非明确问题
 */

import { IntentRouterService, RouteType } from '../../orchestrator/intent-router.service';

describe('IntentRouterService — 4 路由决策', () => {
  let router: IntentRouterService;

  beforeEach(() => {
    router = new IntentRouterService();
  });

  describe('ziping 路由', () => {
    it('有出生信息 + "今年事业" → ziping', () => {
      const result = router.route({
        question: '今年事业运势怎么样',
        hasBirthInfo: true,
        
      });
      expect(result).toBe('ziping');
    });

    it('有出生信息 + "财运" → ziping', () => {
      const result = router.route({
        question: '我的财运如何',
        hasBirthInfo: true,
        
      });
      expect(result).toBe('ziping');
    });

    it('有出生信息 + "感情" → ziping', () => {
      const result = router.route({
        question: '我的感情运势',
        hasBirthInfo: true,
        
      });
      expect(result).toBe('ziping');
    });

    it('有出生信息 + "大运" → ziping', () => {
      const result = router.route({
        question: '我下一步大运怎么样',
        hasBirthInfo: true,
        
      });
      expect(result).toBe('ziping');
    });
  });

  describe('liuren 路由', () => {
    it('无出生信息 + "现在能不能" → clarify（非 liuren，因为无出生信息默认 clarify）', () => {
      const result = router.route({
        question: '现在能不能投资',
        hasBirthInfo: false,
        
      });
      // 无出生信息时走 clarify，不是 liuren
      expect(result).toBe('clarify');
    });

    it('有出生信息 + "现在要不要" → mixed（同时命中 liuren 和 ziping 关键词）', () => {
      const result = router.route({
        question: '现在要不要跳槽',
        hasBirthInfo: true,
        
      });
      // "现在"命中liuren，"跳槽"不在任何列表中，但hasBirthInfo + liurenScore >= 1 → mixed
      expect(result).toBe('mixed');
    });

    it('有出生信息 + "这次投资" → mixed', () => {
      const result = router.route({
        question: '这次投资能不能成',
        hasBirthInfo: true,
        
      });
      expect(result).toBe('mixed');
    });
  });

  describe('mixed 路由', () => {
    it('有出生信息 + "问合作" → mixed（liuren关键词 + hasBirthInfo）', () => {
      const result = router.route({
        question: '问一下合作的事',
        hasBirthInfo: true,
        
      });
      expect(result).toBe('mixed');
    });

    it('有出生信息 + "能不能" → mixed', () => {
      const result = router.route({
        question: '能不能换工作',
        hasBirthInfo: true,
        
      });
      expect(result).toBe('mixed');
    });
  });

  describe('clarify 路由', () => {
    it('无出生信息 → clarify', () => {
      const result = router.route({
        question: '帮我看看',
        hasBirthInfo: false,
        
      });
      expect(result).toBe('clarify');
    });

    it('无出生信息 + "事业" → clarify（即使命中ziping关键词，无出生信息也走 clarify）', () => {
      const result = router.route({
        question: '我的事业运怎么样',
        hasBirthInfo: false,
        
      });
      expect(result).toBe('clarify');
    });

    it('无出生信息 + "投资" → clarify', () => {
      const result = router.route({
        question: '投资能不能成',
        hasBirthInfo: false,
        
      });
      expect(result).toBe('clarify');
    });
  });

  describe('边界条件', () => {
    it('空问题 + 无出生信息 → clarify', () => {
      const result = router.route({
        question: '',
        hasBirthInfo: false,
        
      });
      expect(result).toBe('clarify');
    });

    it('有出生信息 + 无关键词匹配 → ziping（默认）', () => {
      const result = router.route({
        question: '天气怎么样',
        hasBirthInfo: true,
        
      });
      // 无关键词命中，hasBirthInfo=true → 默认 ziping
      expect(result).toBe('ziping');
    });

    it('仅 hasBirthInfo 决定路由（hasAskTime 已从接口移除）', () => {
      const result = router.route({
        question: '今年事业运势怎么样',
        hasBirthInfo: true,
      });
      expect(result).toBe('ziping');
    });
  });
});
