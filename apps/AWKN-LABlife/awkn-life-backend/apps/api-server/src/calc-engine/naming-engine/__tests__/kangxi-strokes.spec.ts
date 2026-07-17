import { getKangxiStroke, getAllKangxiChars, KANGXI_STROKES } from '../kangxi-strokes';

describe('kangxi-strokes', () => {
  describe('KANGXI_STROKES 数据表', () => {
    it('应包含足够数量的汉字', () => {
      const chars = getAllKangxiChars();
      // 原始文件约 1071 个唯一字符（含复姓条目）
      expect(chars.length).toBeGreaterThanOrEqual(1050);
    });

    it('笔画值范围 1-30', () => {
      for (const [char, stroke] of Object.entries(KANGXI_STROKES)) {
        expect(stroke).toBeGreaterThanOrEqual(1);
        expect(stroke).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('基础笔画查询', () => {
    // 1画
    it('一 = 1画', () => expect(getKangxiStroke('一')).toBe(1));
    it('乙 = 1画', () => expect(getKangxiStroke('乙')).toBe(1));

    // 2画 — 包含之前因 section header bug 被覆盖的字
    it('十 = 2画', () => expect(getKangxiStroke('十')).toBe(2));
    it('七 = 2画', () => expect(getKangxiStroke('七')).toBe(2));
    it('八 = 2画', () => expect(getKangxiStroke('八')).toBe(2));
    it('九 = 2画', () => expect(getKangxiStroke('九')).toBe(2));
    it('人 = 2画', () => expect(getKangxiStroke('人')).toBe(2));

    // 3画
    it('三 = 3画', () => expect(getKangxiStroke('三')).toBe(3));
    it('口 = 3画', () => expect(getKangxiStroke('口')).toBe(3));

    // 4画
    it('王 = 4画', () => expect(getKangxiStroke('王')).toBe(4));
    it('不 = 4画', () => expect(getKangxiStroke('不')).toBe(4));
    it('中 = 4画', () => expect(getKangxiStroke('中')).toBe(4));

    // 5画
    it('四 = 5画', () => expect(getKangxiStroke('四')).toBe(5));
    it('田 = 5画', () => expect(getKangxiStroke('田')).toBe(5));

    // 6画
    it('六 = 6画', () => expect(getKangxiStroke('六')).toBe(6));

    // 7画
    it('李 = 7画', () => expect(getKangxiStroke('李')).toBe(7));
    it('江 = 7画', () => expect(getKangxiStroke('江')).toBe(7));

    // 8画
    it('明 = 8画', () => expect(getKangxiStroke('明')).toBe(8));
    it('林 = 8画', () => expect(getKangxiStroke('林')).toBe(8));
    it('金 = 8画', () => expect(getKangxiStroke('金')).toBe(8));

    // 9画
    it('胡 = 9画', () => expect(getKangxiStroke('胡')).toBe(9));

    // 11画
    it('偉 = 11画', () => expect(getKangxiStroke('偉')).toBe(11));
    it('伟 = 11画', () => expect(getKangxiStroke('伟')).toBe(11));
    it('陳 = 11画', () => expect(getKangxiStroke('陳')).toBe(11));
    it('張 = 11画', () => expect(getKangxiStroke('張')).toBe(11));

    // 15画
    it('劉 = 15画', () => expect(getKangxiStroke('劉')).toBe(15));

    // 17画
    it('陽 = 17画', () => expect(getKangxiStroke('陽')).toBe(17));
    it('阳 = 17画', () => expect(getKangxiStroke('阳')).toBe(17));

    // 复姓条目
    it('歐陽 = 11画', () => expect(getKangxiStroke('歐陽')).toBe(11));
    it('司徒 = 10画', () => expect(getKangxiStroke('司徒')).toBe(10));
    it('司馬 = 10画', () => expect(getKangxiStroke('司馬')).toBe(10));
  });

  describe('起名引擎关键字符（锁定 naming-calculator 测试依赖值）', () => {
    // 这些值被 naming-calculator.spec.ts 中的五格计算测试直接使用
    it('王=4, 伟=11 → 天格5, 人格15, 地格12, 总格15', () => {
      expect(getKangxiStroke('王')).toBe(4);
      expect(getKangxiStroke('伟')).toBe(11);
    });

    it('李=7, 小=3, 明=8 → 天格8, 人格10, 地格11', () => {
      expect(getKangxiStroke('李')).toBe(7);
      expect(getKangxiStroke('小')).toBe(3);
      expect(getKangxiStroke('明')).toBe(8);
    });

    it('欧=11, 阳=17, 静=16 → 天格28, 人格33, 地格17', () => {
      expect(getKangxiStroke('欧')).toBe(11);
      expect(getKangxiStroke('阳')).toBe(17);
      expect(getKangxiStroke('静')).toBe(16);
    });
  });

  describe('getKangxiStroke 边界行为', () => {
    it('未知字符返回 0', () => {
      expect(getKangxiStroke('🎉')).toBe(0);
      expect(getKangxiStroke('')).toBe(0);
      expect(getKangxiStroke('X')).toBe(0);
    });

    it('支持 trim() 回退', () => {
      expect(getKangxiStroke(' 王 ')).toBe(4);
    });
  });

  describe('getAllKangxiChars', () => {
    it('返回的数组与 KANGXI_STROKES 的 key 数量一致', () => {
      expect(getAllKangxiChars().length).toBe(Object.keys(KANGXI_STROKES).length);
    });
  });
});
