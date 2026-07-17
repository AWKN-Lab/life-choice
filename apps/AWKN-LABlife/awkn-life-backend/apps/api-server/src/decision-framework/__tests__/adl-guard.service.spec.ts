/**
 * AdlGuardService 测试 - ADL 防退化机制
 *
 * 来源：天火吸收计划 E28 零测试门禁
 * 防止用户对智能体产生过度依赖
 * 覆盖：check（首次/5次/10次）+ cooldown 重置 + reset
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AdlGuardService } from '../adl-guard.service';

describe('AdlGuardService - ADL 防退化机制', () => {
  let service: AdlGuardService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [AdlGuardService],
    }).compile();
    service = moduleRef.get(AdlGuardService);
  });

  afterAll(() => moduleRef.close());

  // ============ 正常：首次 check ============

  describe('check - 首次查询', () => {
    it('首次 check 应 allow=true 且不触发反思', () => {
      // 正常：首次 check 应 allow=true
      const r = service.check('user-first');
      expect(r.allow).toBe(true);
      expect(r.appendReflection).toBe(false);
      expect(r.escalate).toBe(false);
      expect(r.reflectionPrompt).toBeUndefined();
    });
  });

  // ============ 正常：连续 5 次触发反思 ============

  describe('check - 连续查询达到 maxConsecutiveQueries(5)', () => {
    it('连续 check 5 次后应 appendReflection=true', () => {
      // 正常：连续 check 5 次后应 appendReflection=true
      const uid = 'user-threshold-5';
      // 前 4 次不触发
      for (let i = 0; i < 4; i++) {
        const r = service.check(uid);
        expect(r.allow).toBe(true);
        expect(r.appendReflection).toBe(false);
      }
      // 第 5 次触发反思但不升级
      const r5 = service.check(uid);
      expect(r5.allow).toBe(true);
      expect(r5.appendReflection).toBe(true);
      expect(r5.escalate).toBe(false);
      expect(r5.reflectionPrompt).toBeTruthy();
    });
  });

  // ============ 正常：连续 10 次触发升级 ============

  describe('check - 连续查询达到 escalationThreshold(10)', () => {
    it('连续 check 10 次后应 escalate=true', () => {
      // 正常：连续 check 10 次后应 escalate=true
      const uid = 'user-escalate-10';
      for (let i = 0; i < 9; i++) service.check(uid);
      const r10 = service.check(uid);
      expect(r10.allow).toBe(true);
      expect(r10.appendReflection).toBe(true);
      expect(r10.escalate).toBe(true);
      expect(r10.reflectionPrompt).toContain('专业心理');
    });
  });

  // ============ 边界：cooldown 后重置 ============

  describe('check - cooldown 后重置', () => {
    it('超过 cooldownMinutes(30min) 后查询应重置计数', () => {
      // 边界：cooldown 后重置（mock Date.now）
      jest.useFakeTimers();
      try {
        const t0 = new Date('2026-06-19T10:00:00Z').getTime();
        jest.setSystemTime(t0);
        const uid = 'user-cooldown-reset';
        // 累计 5 次触发反思
        for (let i = 0; i < 5; i++) service.check(uid);
        const before = service.check(uid);
        expect(before.appendReflection).toBe(true);

        // 推进时间超过 30 分钟 cooldown
        jest.setSystemTime(t0 + 31 * 60 * 1000);
        const after = service.check(uid);
        expect(after.allow).toBe(true);
        expect(after.appendReflection).toBe(false);
        expect(after.escalate).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('冷却期内（<30min）查询不应重置计数', () => {
      // 边界：cooldown 内不重置
      jest.useFakeTimers();
      try {
        const t0 = new Date('2026-06-19T10:00:00Z').getTime();
        jest.setSystemTime(t0);
        const uid = 'user-within-cooldown';
        for (let i = 0; i < 4; i++) service.check(uid);
        // 推进 10 分钟（未超 30 分钟）
        jest.setSystemTime(t0 + 10 * 60 * 1000);
        const r = service.check(uid);
        expect(r.appendReflection).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ============ 正常：reset 后状态清空 ============

  describe('reset - 重置状态', () => {
    it('reset 后状态清空，再次 check 应从 1 开始', () => {
      // 正常：reset 后状态清空
      const uid = 'user-reset-test';
      // 累计 5 次触发反思
      for (let i = 0; i < 5; i++) service.check(uid);
      const before = service.check(uid);
      expect(before.appendReflection).toBe(true);

      // reset 后应从 1 开始
      service.reset(uid);
      const after = service.check(uid);
      expect(after.allow).toBe(true);
      expect(after.appendReflection).toBe(false);
      expect(after.escalate).toBe(false);
    });

    it('reset 未注册用户不应报错', () => {
      // 边界：reset 不存在的用户
      expect(() => service.reset('user-not-exist')).not.toThrow();
    });
  });

  // ============ onModuleDestroy 清理 ============
  // 注：onModuleDestroy 是 NestJS 生命周期钩子，受 isolatedModules 影响在测试中可能不可用，
  // 且不在任务要求的 5 条核心用例内，故不测试。
});
