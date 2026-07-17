import { Test, TestingModule } from '@nestjs/testing';
import { AdlGuardService } from './adl-guard.service';

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

  describe('check - 正常用户未超限', () => {
    it('首次查询 allow=true 且不触发反思', () => {
      const r = service.check('user-first');
      expect(r.allow).toBe(true);
      expect(r.appendReflection).toBe(false);
      expect(r.escalate).toBe(false);
    });

    it('连续查询 4 次（未达阈值 5）仍不触发反思', () => {
      const uid = 'user-normal';
      for (let i = 0; i < 3; i++) {
        const r = service.check(uid);
        expect(r.allow).toBe(true);
        expect(r.appendReflection).toBe(false);
      }
      const r4 = service.check(uid);
      expect(r4.allow).toBe(true);
      expect(r4.appendReflection).toBe(false);
      expect(r4.escalate).toBe(false);
    });
  });

  describe('check - 超限触发反思（达到 maxConsecutiveQueries=5）', () => {
    it('第 5 次查询触发 appendReflection 但不 escalate', () => {
      const uid = 'user-threshold';
      for (let i = 0; i < 4; i++) service.check(uid);
      const r5 = service.check(uid);
      expect(r5.allow).toBe(true);
      expect(r5.appendReflection).toBe(true);
      expect(r5.escalate).toBe(false);
      expect(r5.reflectionPrompt).toBeTruthy();
    });
  });

  describe('check - 严重超限触发升级（达到 escalationThreshold=10）', () => {
    it('第 10 次查询触发 escalate=true', () => {
      const uid = 'user-escalate';
      for (let i = 0; i < 9; i++) service.check(uid);
      const r10 = service.check(uid);
      expect(r10.allow).toBe(true);
      expect(r10.appendReflection).toBe(true);
      expect(r10.escalate).toBe(true);
      expect(r10.reflectionPrompt).toContain('专业心理');
    });
  });

  describe('reset - 重置后恢复', () => {
    it('reset 后再次 check 应从 1 开始且不触发反思', () => {
      const uid = 'user-reset';
      for (let i = 0; i < 5; i++) service.check(uid);
      const before = service.check(uid);
      expect(before.appendReflection).toBe(true);

      service.reset(uid);

      const after = service.check(uid);
      expect(after.allow).toBe(true);
      expect(after.appendReflection).toBe(false);
      expect(after.escalate).toBe(false);
    });

    it('reset 未注册用户不报错', () => {
      expect(() => service.reset('user-not-exist')).not.toThrow();
    });
  });

  describe('check - 冷却期外重置计数', () => {
    it('超过 cooldownMinutes(30min) 后查询应重置为 1', () => {
      jest.useFakeTimers();
      try {
        const t0 = new Date('2026-06-19T10:00:00Z').getTime();
        jest.setSystemTime(t0);
        const uid = 'user-cooldown';
        service.check(uid);
        service.check(uid);
        jest.setSystemTime(t0 + 31 * 60 * 1000);
        const r = service.check(uid);
        expect(r.allow).toBe(true);
        expect(r.appendReflection).toBe(false);
        expect(r.escalate).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('冷却期内（<30min）查询不重置计数', () => {
      jest.useFakeTimers();
      try {
        const t0 = new Date('2026-06-19T10:00:00Z').getTime();
        jest.setSystemTime(t0);
        const uid = 'user-within-cooldown';
        for (let i = 0; i < 4; i++) service.check(uid);
        jest.setSystemTime(t0 + 10 * 60 * 1000);
        const r = service.check(uid);
        expect(r.appendReflection).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});