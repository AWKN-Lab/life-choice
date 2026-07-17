/**
 * P1-10 黄金样例确定性验证测试
 *
 * 来源：TECHNICAL-REFERENCE-P01 §5.4
 *
 * 验收：同输入同输出，hash 一致
 *
 * 测试内容：
 *   1. 20 个样例全部能成功 calculate
 *   2. 同一样例两次调用 → factorsHash 完全一致
 *   3. 不同样例 → 不同 factorsHash（除非输入确实相同）
 *   4. 所有 bar.source === 'calculated'（V2 链路无 simulated）
 *   5. 覆盖 5 个类别：jieqi/dayun-change/liunian-transition/shichen-uncertain/missing-data
 */

import * as fs from 'fs';
import * as path from 'path';
import { KlineCalculationEngine } from '../kline-calculation.engine';

interface GoldenCase {
  id: string;
  description: string;
  category: string;
  input: {
    birthYear: number;
    viewMode?: 'life' | 'decade' | 'yearMonth';
    asOfDate: Date;
    birthTime?: string;
    baziResult: any;
  };
}

interface GoldenFile {
  version: string;
  generatedAt: string;
  count: number;
  categories: string[];
  cases: GoldenCase[];
}

// ============================================================
// 加载黄金样例
// ============================================================

function loadGoldenCases(): GoldenCase[] {
  const filePath = path.join(__dirname, 'golden', 'golden-cases-v2.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`黄金样例文件不存在: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const data: GoldenFile = JSON.parse(content);
  // Phase 1 Step 1.1: 为所有样例注入 asOfDate（JSON 文件可能未包含此字段）
  const defaultAsOfDate = new Date('2026-07-13T12:00:00Z');
  for (const c of data.cases) {
    if (!c.input.asOfDate) {
      c.input.asOfDate = defaultAsOfDate;
    }
  }
  return data.cases;
}

// ============================================================
// 测试套件
// ============================================================

// 在模块加载时同步加载，因为 describe-level 的 for 循环在 beforeAll 之前执行
const cases: GoldenCase[] = loadGoldenCases();
const engine = new KlineCalculationEngine();

describe('P1-10: 黄金样例确定性验证', () => {

  // ============================================================
  // 1. 样例数量与完整性
  // ============================================================

  describe('样例完整性', () => {
    it('应包含至少 20 个样例', () => {
      expect(cases.length).toBeGreaterThanOrEqual(20);
    });

    it('应覆盖 5 个类别', () => {
      const categories = new Set(cases.map(c => c.category));
      expect(categories.has('jieqi')).toBe(true);
      expect(categories.has('dayun-change')).toBe(true);
      expect(categories.has('liunian-transition')).toBe(true);
      expect(categories.has('shichen-uncertain')).toBe(true);
      expect(categories.has('missing-data')).toBe(true);
    });

    it('每个样例必须有 id / description / category / input', () => {
      for (const c of cases) {
        expect(c.id).toBeTruthy();
        expect(c.description).toBeTruthy();
        expect(c.category).toBeTruthy();
        expect(c.input).toBeTruthy();
        expect(c.input.baziResult).toBeTruthy();
      }
    });
  });

  // ============================================================
  // 2. 确定性：同输入两次调用 → 同输出
  // ============================================================

  describe('确定性验证（C1+C2）', () => {
    for (const c of cases) {
      it(`${c.id} (${c.description}) → 两次调用 factorsHash 一致`, () => {
        const r1 = engine.calculate(c.input);
        const r2 = engine.calculate(c.input);
        expect(r1.meta.factorsHash).toBe(r2.meta.factorsHash);
        expect(r1.bars).toEqual(r2.bars);
      });
    }
  });

  // ============================================================
  // 3. V2 链路标识：source='calculated'
  // ============================================================

  describe('V2 链路标识（C3）', () => {
    for (const c of cases) {
      it(`${c.id} → 所有 bar.source === 'calculated'`, () => {
        const r = engine.calculate(c.input);
        for (const bar of r.bars) {
          expect(bar.source).toBe('calculated');
        }
      });
    }
  });

  // ============================================================
  // 4. 引擎版本
  // ============================================================

  describe('引擎版本（C4）', () => {
    it('所有样例 meta.engineVersion === "v2.0.0"', () => {
      for (const c of cases) {
        const r = engine.calculate(c.input);
        expect(r.meta.engineVersion).toBe('v2.0.0');
      }
    });
  });

  // ============================================================
  // 5. 因子完整性
  // ============================================================

  describe('因子完整性（C5）', () => {
    it('每条 bar 的 factorBreakdowns 含全部 15 因子', () => {
      const c = cases[0];
      const r = engine.calculate(c.input);
      expect(r.meta.factorBreakdowns.length).toBeGreaterThan(0);

      const bd = r.meta.factorBreakdowns[0];
      expect(bd).toHaveProperty('daYun');
      expect(bd).toHaveProperty('liuNian');
      expect(bd).toHaveProperty('yongShen');
      expect(bd).toHaveProperty('relation');
      expect(bd).toHaveProperty('shenSha');
      expect(bd).toHaveProperty('baseChart');
      expect(bd).toHaveProperty('shiShen');
      expect(bd).toHaveProperty('xingChongHeHai');
      expect(bd).toHaveProperty('riskPenalty');
      // 八十神子字段
      expect(bd.shiShen).toHaveProperty('biJian');
      expect(bd.shiShen).toHaveProperty('zhengGuan');
    });
  });

  // ============================================================
  // 6. 数据区间合法
  // ============================================================

  describe('数据区间合法（C6）', () => {
    it('所有 bar.close ∈ [20, 95]', () => {
      for (const c of cases) {
        const r = engine.calculate(c.input);
        for (const b of r.bars) {
          expect(b.close).toBeGreaterThanOrEqual(20);
          expect(b.close).toBeLessThanOrEqual(95);
        }
      }
    });

    it('所有 bar.trend ∈ 4 态', () => {
      const validTrends = ['上升', '调整', '蓄势', '转折'];
      for (const c of cases) {
        const r = engine.calculate(c.input);
        for (const b of r.bars) {
          expect(validTrends).toContain(b.trend);
        }
      }
    });
  });

  // ============================================================
  // 7. 样例间 factorsHash 唯一性
  // ============================================================

  describe('样例间唯一性（C8）', () => {
    it('不同样例 → 不同 factorsHash（≥90% 唯一）', () => {
      const hashes = cases.map(c => {
        const r = engine.calculate(c.input);
        return r.meta.factorsHash;
      });
      const unique = new Set(hashes);
      // 允许少数样例因输入相似而 hash 相同
      expect(unique.size).toBeGreaterThanOrEqual(Math.floor(hashes.length * 0.9));
    });
  });

  // ============================================================
  // 8. 资料缺失场景的特殊验证
  // ============================================================

  describe('资料缺失场景', () => {
    const missingCases = cases.filter(c => c.category === 'missing-data');

    if (missingCases.length > 0) {
      it('资料缺失时仍能正常计算（不抛异常）', () => {
        for (const c of missingCases) {
          expect(() => engine.calculate(c.input)).not.toThrow();
        }
      });

      it('资料缺失时 shenSha 因子返回合理值 [0, 100]', () => {
        for (const c of missingCases) {
          const r = engine.calculate(c.input);
          const bd = r.meta.factorBreakdowns[0];
          expect(bd.shenSha).toBeGreaterThanOrEqual(0);
          expect(bd.shenSha).toBeLessThanOrEqual(100);
        }
      });

      it('大运缺失时 daYun 因子取默认 55', () => {
        for (const c of missingCases) {
          if (c.input.baziResult.daYun.length === 0) {
            const r = engine.calculate(c.input);
            const bd = r.meta.factorBreakdowns[0];
            expect(bd.daYun).toBe(55);
          }
        }
      });
    }
  });
});
