import {
  DIZHI_TO_ZODIAC,
  ZODIAC_TABOO_RADICALS,
  getZodiacTaboo,
  checkCharZodiacTaboo,
  filterZodiacTabooChars,
} from '../zodiac-taboo';

describe('zodiac-taboo', () => {
  describe('DIZHI_TO_ZODIAC', () => {
    it('should map all 12 dizhi to zodiac animals', () => {
      expect(Object.keys(DIZHI_TO_ZODIAC)).toHaveLength(12);
      expect(DIZHI_TO_ZODIAC['子']).toBe('鼠');
      expect(DIZHI_TO_ZODIAC['丑']).toBe('牛');
      expect(DIZHI_TO_ZODIAC['寅']).toBe('虎');
      expect(DIZHI_TO_ZODIAC['卯']).toBe('兔');
      expect(DIZHI_TO_ZODIAC['辰']).toBe('龙');
      expect(DIZHI_TO_ZODIAC['巳']).toBe('蛇');
      expect(DIZHI_TO_ZODIAC['午']).toBe('马');
      expect(DIZHI_TO_ZODIAC['未']).toBe('羊');
      expect(DIZHI_TO_ZODIAC['申']).toBe('猴');
      expect(DIZHI_TO_ZODIAC['酉']).toBe('鸡');
      expect(DIZHI_TO_ZODIAC['戌']).toBe('狗');
      expect(DIZHI_TO_ZODIAC['亥']).toBe('猪');
    });
  });

  describe('ZODIAC_TABOO_RADICALS', () => {
    it('should have rules for all 12 zodiac animals', () => {
      const animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
      for (const animal of animals) {
        expect(ZODIAC_TABOO_RADICALS[animal]).toBeDefined();
        expect(ZODIAC_TABOO_RADICALS[animal].taboos.length).toBeGreaterThan(0);
        expect(ZODIAC_TABOO_RADICALS[animal].reason).toBeDefined();
        expect(ZODIAC_TABOO_RADICALS[animal].reason.length).toBeGreaterThan(0);
      }
    });

    it('鼠 should taboo 日 and 火', () => {
      expect(ZODIAC_TABOO_RADICALS['鼠'].taboos).toContain('日');
      expect(ZODIAC_TABOO_RADICALS['鼠'].taboos).toContain('火');
    });

    it('牛 should taboo 羊-related and 刀', () => {
      expect(ZODIAC_TABOO_RADICALS['牛'].taboos).toContain('羊');
      expect(ZODIAC_TABOO_RADICALS['牛'].taboos).toContain('刀');
    });

    it('龙 should taboo 虫 and 犬', () => {
      expect(ZODIAC_TABOO_RADICALS['龙'].taboos).toContain('虫');
      expect(ZODIAC_TABOO_RADICALS['龙'].taboos).toContain('犬');
    });
  });

  describe('getZodiacTaboo', () => {
    it('should return zodiac and rule for valid dizhi', () => {
      const result = getZodiacTaboo('子');
      expect(result).not.toBeNull();
      expect(result!.zodiac).toBe('鼠');
      expect(result!.rule.taboos).toContain('日');
    });

    it('should return null for unknown dizhi', () => {
      expect(getZodiacTaboo('x')).toBeNull();
      expect(getZodiacTaboo('')).toBeNull();
    });

    it('should work for all 12 dizhi', () => {
      const dizhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      for (const zhi of dizhiList) {
        const result = getZodiacTaboo(zhi);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('checkCharZodiacTaboo', () => {
    it('should detect 日 radical in 明 for 鼠 taboo', () => {
      const taboos = ZODIAC_TABOO_RADICALS['鼠'].taboos;
      const hits = checkCharZodiacTaboo('明', taboos);
      expect(hits).toContain('日');
    });

    it('should detect 火 radical in 炎 for 鼠 taboo', () => {
      const taboos = ZODIAC_TABOO_RADICALS['鼠'].taboos;
      const hits = checkCharZodiacTaboo('炎', taboos);
      expect(hits).toContain('火');
    });

    it('should return empty for safe character', () => {
      const taboos = ZODIAC_TABOO_RADICALS['鼠'].taboos;
      const hits = checkCharZodiacTaboo('林', taboos);
      expect(hits).toHaveLength(0);
    });

    it('should detect 刀 in characters for 牛 taboo', () => {
      const taboos = ZODIAC_TABOO_RADICALS['牛'].taboos;
      const hits = checkCharZodiacTaboo('剑', taboos);
      expect(hits.length).toBeGreaterThan(0);
    });

    it('should detect 氵 radical in 泽 for 蛇 taboo', () => {
      const taboos = ZODIAC_TABOO_RADICALS['蛇'].taboos;
      const hits = checkCharZodiacTaboo('泽', taboos);
      expect(hits).toContain('氵');
    });
  });

  describe('filterZodiacTabooChars', () => {
    it('should filter out taboo characters', () => {
      const chars = ['林', '明', '炎', '清', '泽'];
      const taboos = ZODIAC_TABOO_RADICALS['鼠'].taboos; // 忌日、火
      const result = filterZodiacTabooChars(chars, taboos);
      expect(result).not.toContain('明');  // 含日
      expect(result).not.toContain('炎');  // 含火
      expect(result).toContain('林');
      expect(result).toContain('清');
    });

    it('should return empty array when all chars are taboo', () => {
      const chars = ['明', '炎', '煜', '晖'];
      const taboos = ZODIAC_TABOO_RADICALS['鼠'].taboos;
      const result = filterZodiacTabooChars(chars, taboos);
      expect(result).toHaveLength(0);
    });

    it('should return all chars when none are taboo', () => {
      const chars = ['林', '森', '柏', '松'];
      const taboos = ZODIAC_TABOO_RADICALS['鼠'].taboos;
      const result = filterZodiacTabooChars(chars, taboos);
      expect(result).toHaveLength(4);
    });

    it('should handle empty input', () => {
      expect(filterZodiacTabooChars([], ['日'])).toHaveLength(0);
      expect(filterZodiacTabooChars(['林'], [])).toHaveLength(1);
    });
  });
});
