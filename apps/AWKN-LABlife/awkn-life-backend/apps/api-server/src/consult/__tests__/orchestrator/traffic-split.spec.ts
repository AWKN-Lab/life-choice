import { trafficSplit } from '../../orchestrator/orchestrator.service';

describe('trafficSplit', () => {
  describe('边界条件', () => {
    it('ratio=1.00 时全部通过', () => {
      for (let i = 0; i < 100; i++) {
        expect(trafficSplit(`session-${i}`, undefined, 1.0)).toBe(true);
      }
    });

    it('ratio=0 时全部拒绝', () => {
      for (let i = 0; i < 100; i++) {
        expect(trafficSplit(`session-${i}`, undefined, 0)).toBe(false);
      }
    });

    it('无 sessionId 和 userId 时不抛异常', () => {
      expect(() => trafficSplit(undefined, undefined, 0.5)).not.toThrow();
    });
  });

  describe('哈希确定性', () => {
    it('同一 sessionId 多次调用返回一致结果', () => {
      const results = Array.from({ length: 10 }, () => trafficSplit('fixed-session', undefined, 0.5));
      const first = results[0];
      results.forEach(r => expect(r).toBe(first));
    });
  });

  describe('分布检验', () => {
    it('ratio=0.50 时 1000 样本约 50% 通过', () => {
      let passed = 0;
      const total = 1000;
      for (let i = 0; i < total; i++) {
        if (trafficSplit(`session-${i}`, undefined, 0.5)) passed++;
      }
      const rate = passed / total;
      // 允许 ±10% 误差
      expect(rate).toBeGreaterThan(0.40);
      expect(rate).toBeLessThan(0.60);
    });

    it('ratio=0.10 时 1000 样本约 10% 通过', () => {
      let passed = 0;
      const total = 1000;
      for (let i = 0; i < total; i++) {
        if (trafficSplit(`session-${i}`, undefined, 0.1)) passed++;
      }
      const rate = passed / total;
      expect(rate).toBeGreaterThan(0.05);
      expect(rate).toBeLessThan(0.17);
    });
  });

  describe('userId 降级', () => {
    it('sessionId 为空时使用 userId', () => {
      const r1 = trafficSplit(undefined, 'user-a', 0.5);
      const r2 = trafficSplit(undefined, 'user-a', 0.5);
      expect(r1).toBe(r2); // 确定性
    });

    it('不同 userId 产生不同分配', () => {
      const results = new Set<boolean>();
      for (let i = 0; i < 100; i++) {
        results.add(trafficSplit(undefined, `user-${i}`, 0.5));
      }
      // 100 个用户应覆盖 true 和 false
      expect(results.size).toBe(2);
    });
  });

  describe('灰度阶段模拟', () => {
    it('10% → 50% → 100% 渐进放量', () => {
      // 同一个 session，ratio 增长后应当保持或扩展覆盖
      const sessionId = 'gradual-test';
      const r10 = trafficSplit(sessionId, undefined, 0.10);
      const r50 = trafficSplit(sessionId, undefined, 0.50);
      const r100 = trafficSplit(sessionId, undefined, 1.00);

      // 如果 10% 时已通过，50% 和 100% 也必须通过
      if (r10) {
        expect(r50).toBe(true);
        expect(r100).toBe(true);
      }
      // 100% 必须全部通过
      expect(r100).toBe(true);
    });
  });
});