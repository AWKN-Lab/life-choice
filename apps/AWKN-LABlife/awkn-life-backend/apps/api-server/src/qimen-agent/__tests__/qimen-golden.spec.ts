import { TimeDunjia } from '../../lib/dunjia-stub';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 奇门遁甲 Golden Fixture 交叉验证
 *
 * Golden 数据来源: Go qimen-go (github.com/deminzhang/qimen-go)
 * 参考实现: C++ ZhouYiLab
 *
 * 注意: JS stub 的算法是近似的（基于简化启发式），
 * 因此本测试仅验证:
 * 1. 结构完整性（9宫格，无空值）
 * 2. 八门集合正确（8门各出现一次，不含中宫）
 * 3. 九星集合正确
 * 4. 八神集合正确
 * 5. 天干地支格式合法
 */

interface GoldenPalace {
  idx: number;
  hostGan: string;
  guestGan: string;
  star: string;
  door: string;
  god: string;
}

interface GoldenCase {
  label: string;
  solarDate: string;
  yuan3: number;
  ju: number;
  jieQi: string;
  gan: string;
  zhi: string;
  xun: string;
  dutyStar: string;
  dutyDoor: string;
  palaces: GoldenPalace[];
}

const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const VALID_GATES = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];
const VALID_STARS = ['蓬', '芮', '冲', '辅', '禽', '心', '柱', '任', '英'];
const VALID_GODS = ['值符', '螣蛇', '太阴', '六合', '勾陈', '朱雀', '九天', '九地', '玄武', '白虎', '腾蛇'];

function loadGoldenFixtures(): GoldenCase[] {
  const fixturePath = path.join(__dirname, 'fixtures', 'qimen-golden-go.json');
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(raw);
}

function parseDateTime(solarDate: string): Date {
  const [datePart, timePart] = solarDate.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

describe('Qimen Golden Fixture 交叉验证', () => {
  let goldenCases: GoldenCase[];

  beforeAll(() => {
    goldenCases = loadGoldenFixtures();
  });

  it('should load golden fixtures from Go implementation', () => {
    expect(goldenCases).toBeDefined();
    expect(goldenCases.length).toBe(3);
  });

  describe('Golden fixture data integrity', () => {
    for (let i = 0; i < 3; i++) {
      it(`Go Case ${i + 1} should have 9 palaces with valid data`, () => {
        const gc = goldenCases[i];
        expect(gc.palaces).toHaveLength(9);
        expect(gc.ju).not.toBe(0);

        // 验证每个宫位的星/门/神都在合法集合中
        for (const p of gc.palaces) {
          if (p.idx === 5) continue; // 中宫跳过
          expect(VALID_STARS).toContain(p.star);
          expect(VALID_GATES).toContain(p.door);
          expect(TIANGAN).toContain(p.hostGan);
          expect(TIANGAN).toContain(p.guestGan);
        }
      });

      it(`Go Case ${i + 1} gates should have no duplicates (8 gates for 8 non-center palaces)`, () => {
        const gc = goldenCases[i];
        const gates = gc.palaces.filter(p => p.idx !== 5).map(p => p.door);
        expect(gates).toHaveLength(8);
        expect(new Set(gates).size).toBe(8);
        for (const g of gates) {
          expect(VALID_GATES).toContain(g);
        }
      });

      it(`Go Case ${i + 1} stars should have no duplicates`, () => {
        const gc = goldenCases[i];
        const stars = gc.palaces.filter(p => p.idx !== 5).map(p => p.star);
        expect(stars).toHaveLength(8);
        expect(new Set(stars).size).toBe(8);
      });
    }
  });

  describe('JS Stub structural validation against golden dates', () => {
    for (let i = 0; i < 3; i++) {
      it(`Stub Case ${i + 1} (${goldenCases?.[i]?.label || 'unknown'}) should produce 9 palaces`, () => {
        if (!goldenCases) return;
        const gc = goldenCases[i];
        const datetime = parseDateTime(gc.solarDate);
        const board = TimeDunjia.create({ datetime, type: 'hour' });

        expect(board.meta).toBeDefined();
        expect(board.meta.yinyang).toBeDefined();
        expect(board.meta.juNumber).toBeGreaterThan(0);

        // 验证9宫格都有数据
        for (let p = 0; p < 9; p++) {
          const palace = board.palace(p);
          expect(palace).toBeDefined();
          expect(palace.star).not.toBeNull();
          expect(palace.door).not.toBeNull();
          expect(palace.god).not.toBeNull();
        }
      });

      it(`Stub Case ${i + 1} gates should not contain duplicates (BA_MEN fix validation)`, () => {
        if (!goldenCases) return;
        const gc = goldenCases[i];
        const datetime = parseDateTime(gc.solarDate);
        const board = TimeDunjia.create({ datetime, type: 'hour' });

        const gates: string[] = [];
        for (let p = 0; p < 9; p++) {
          const palace = board.palace(p);
          if (palace.door && palace.door.shortName) {
            gates.push(palace.door.shortName);
          }
        }

        // 9个门中，中宫的门是占位符（可能重复），其余8门应各不相同
        const nonCenterGates = gates.filter((_, idx) => idx !== 4);
        const uniqueGates = new Set(nonCenterGates);
        expect(uniqueGates.size).toBe(nonCenterGates.length);
      });

      it(`Stub Case ${i + 1} yin/yang dun should be either 阴 or 阳`, () => {
        if (!goldenCases) return;
        const gc = goldenCases[i];
        const datetime = parseDateTime(gc.solarDate);
        const board = TimeDunjia.create({ datetime, type: 'hour' });

        expect(['阴', '阳']).toContain(board.meta.yinyang);
      });

      it(`Stub Case ${i + 1} ju number should be 1-9`, () => {
        if (!goldenCases) return;
        const gc = goldenCases[i];
        const datetime = parseDateTime(gc.solarDate);
        const board = TimeDunjia.create({ datetime, type: 'hour' });

        expect(board.meta.juNumber).toBeGreaterThanOrEqual(1);
        expect(board.meta.juNumber).toBeLessThanOrEqual(9);
      });
    }
  });

  describe('Go golden data: specific assertions', () => {
    it('Case 1 (2011-06-18): 阳遁9局, 值符=英, 值使=景', () => {
      const gc = goldenCases[0];
      expect(gc.ju).toBe(9);
      expect(gc.dutyStar).toBe('英');
      expect(gc.dutyDoor).toBe('景');
      // 兑7宫应该是开门
      const dui = gc.palaces.find(p => p.idx === 7);
      expect(dui!.door).toBe('死');
      // 坎1宫应该是开门
      const kan = gc.palaces.find(p => p.idx === 1);
      expect(kan!.door).toBe('开');
    });

    it('Case 2 (2002-11-19): 阴遁3局 (ju=-3), 值符=蓬, 值使=休', () => {
      const gc = goldenCases[1];
      expect(gc.ju).toBe(-3); // 负数=阴遁
      expect(gc.dutyStar).toBe('蓬');
      expect(gc.dutyDoor).toBe('休');
    });

    it('Case 3 (2023-06-21): 阳遁6局, 值符=柱, 值使=惊', () => {
      const gc = goldenCases[2];
      expect(gc.ju).toBe(6);
      expect(gc.dutyStar).toBe('柱');
      expect(gc.dutyDoor).toBe('惊');
    });
  });
});
