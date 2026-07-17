import { NamingCalculator } from '../naming-calculator';

describe('NamingCalculator', () => {
  const calc = new NamingCalculator();

  describe('computeWuge', () => {
    it('should compute 五格 for 单姓单名', () => {
      const result = calc.computeWuge({ surname: '王', givenName: '伟' });
      expect(result.tiange).toBe(5);
      expect(result.renge).toBe(15);
      expect(result.dige).toBe(12);
      expect(result.zongge).toBe(15);
      expect(result.scores.total).toBeGreaterThan(0);
    });

    it('should compute 五格 for 单姓双名', () => {
      const result = calc.computeWuge({ surname: '李', givenName: '小明' });
      expect(result.tiange).toBe(8);
      expect(result.renge).toBe(10);
      expect(result.dige).toBe(11);
      expect(result.tiangeWuxing).toBeDefined();
      expect(result.rengeWuxing).toBeDefined();
      expect(result.digeWuxing).toBeDefined();
    });

    it('should compute 三才 for common name', () => {
      const result = calc.computeWuge({ surname: '陈', givenName: '雅文' });
      expect(result.sancai).toBeDefined();
      expect(result.sancai.tian).toBeDefined();
      expect(result.sancai.ren).toBeDefined();
      expect(result.sancai.di).toBeDefined();
      expect(result.sancaiDesc).toBeTruthy();
    });

    it('should provide score breakdown', () => {
      const result = calc.computeWuge({ surname: '张', givenName: '伟杰' });
      expect(result.scores.tiange).toBeGreaterThanOrEqual(0);
      expect(result.scores.renge).toBeGreaterThanOrEqual(0);
      expect(result.scores.dige).toBeGreaterThanOrEqual(0);
      expect(result.scores.waige).toBeGreaterThanOrEqual(0);
      expect(result.scores.zongge).toBeGreaterThanOrEqual(0);
      expect(result.scores.sancai).toBeGreaterThanOrEqual(0);
      expect(result.scores.total).toBeGreaterThanOrEqual(0);
      expect(result.scores.total).toBeLessThanOrEqual(100);
    });

    it('should handle compound surname', () => {
      const result = calc.computeWuge({ surname: '欧阳', givenName: '静', isCompoundSurname: true });
      expect(result.tiange).toBe(28);
      expect(result.renge).toBe(33);
      expect(result.dige).toBe(17);
    });

    it('should return details for each格', () => {
      const result = calc.computeWuge({ surname: '刘', givenName: '芳华' });
      expect(result.details.tiange.num).toBeGreaterThan(0);
      expect(result.details.tiange.wuxing).toBeDefined();
      expect(result.details.tiange.desc).toBeTruthy();
    });
  });
});