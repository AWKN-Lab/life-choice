import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(__dirname, '..', '..', 'data');

function loadData(filename: string) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
}

describe('BaZi Data Integrity', () => {
  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const WUXING = ['木', '火', '土', '金', '水'];

  describe('tiangandizhi.json', () => {
    it('should have 10 heavenly stems', () => {
      const data = loadData('tiangandizhi.json');
      const tiangan = data.tian_gan || data.tiangan;
      expect(tiangan).toBeDefined();
      expect(tiangan.length).toBe(10);
      tiangan.forEach((g: any) => expect(GAN).toContain(g.name || g));
    });

    it('should have 12 earthly branches', () => {
      const data = loadData('tiangandizhi.json');
      const dizhi = data.di_zhi || data.dizhi;
      expect(dizhi).toBeDefined();
      expect(dizhi.length).toBe(12);
      dizhi.forEach((z: any) => expect(ZHI).toContain(z.name || z));
    });
  });

  describe('zanggan.json', () => {
    it('should have 12 earthly branches with hidden stems', () => {
      const data = loadData('zanggan.json');
      expect(data.zanggan.length).toBe(12);
      data.zanggan.forEach((item: any) => {
        expect(ZHI).toContain(item.di_zhi);
        expect(item.main).toBeDefined();
        expect(GAN).toContain(item.main);
        if (item.middle) expect(GAN).toContain(item.middle);
        if (item.residual) expect(GAN).toContain(item.residual);
      });
    });

    it('should cover all 12 branches', () => {
      const data = loadData('zanggan.json');
      const branches = data.zanggan.map((item: any) => item.di_zhi);
      ZHI.forEach((z) => expect(branches).toContain(z));
    });
  });

  describe('nayin.json', () => {
    it('should have all 60 jiazi nayin entries', () => {
      const data = loadData('nayin.json');
      expect(data.nayin.length).toBe(60);

      data.nayin.forEach((item: any) => {
        expect(item.ganzhi).toBeDefined();
        expect(item.nayin).toBeDefined();
        expect(item.element).toBeDefined();
        expect(WUXING).toContain(item.element);
      });
    });

    it('should cover all 60 jiazi combinations', () => {
      const data = loadData('nayin.json');
      const allGanZhi: string[] = [];
      for (let i = 0; i < 60; i++) {
        allGanZhi.push(GAN[i % 10] + ZHI[i % 12]);
      }
      const coveredGanZhi = data.nayin.map((item: any) => item.ganzhi);
      allGanZhi.forEach((gz) => expect(coveredGanZhi).toContain(gz));
    });
  });

  describe('kongwang.json', () => {
    it('should have 6 xun groups', () => {
      const data = loadData('kongwang.json');
      expect(data.kongwang.length).toBe(6);
    });

    it('each xun should have 10 ganzhi and 2 kongwang zhi', () => {
      const data = loadData('kongwang.json');
      data.kongwang.forEach((xun: any) => {
        expect(xun.range.length).toBe(10);
        expect(xun.kongwang.length).toBe(2);
        xun.kongwang.forEach((z: string) => expect(ZHI).toContain(z));
      });
    });

    it('all 60 jiazi should be covered across 6 xun', () => {
      const data = loadData('kongwang.json');
      const allCovered: string[] = [];
      data.kongwang.forEach((xun: any) => {
        allCovered.push(...xun.range);
      });
      expect(allCovered.length).toBe(60);

      const allGanZhi: string[] = [];
      for (let i = 0; i < 60; i++) {
        allGanZhi.push(GAN[i % 10] + ZHI[i % 12]);
      }
      allGanZhi.forEach((gz) => expect(allCovered).toContain(gz));
    });

    it('kongwang zhi should not appear in the xun range', () => {
      const data = loadData('kongwang.json');
      data.kongwang.forEach((xun: any) => {
        xun.kongwang.forEach((kw: string) => {
          xun.range.forEach((gz: string) => {
            expect(gz[1]).not.toBe(kw);
          });
        });
      });
    });
  });

  describe('changsheng.json', () => {
    it('should have 12 stages defined', () => {
      const data = loadData('changsheng.json');
      expect(data.stages.length).toBe(12);
    });

    it('should have changsheng table for all 10 tiangan', () => {
      const data = loadData('changsheng.json');
      expect(Object.keys(data.table).length).toBe(10);
      GAN.forEach((g) => {
        expect(data.table[g]).toBeDefined();
        expect(Object.keys(data.table[g]).length).toBe(12);
        data.stages.forEach((stage: string) => {
          expect(data.table[g][stage]).toBeDefined();
          expect(ZHI).toContain(data.table[g][stage]);
        });
      });
    });
  });

  describe('shishen.json', () => {
    it('should have lookup table for all 10 tiangan', () => {
      const data = loadData('shishen.json');
      expect(Object.keys(data.lookup_table).length).toBe(10);
      GAN.forEach((g) => {
        expect(data.lookup_table[g]).toBeDefined();
      });
    });

    it('each tiangan should map to 5 wuxing with 2 shishen each', () => {
      const data = loadData('shishen.json');
      GAN.forEach((g) => {
        const mapping = data.lookup_table[g];
        expect(Object.keys(mapping).length).toBe(5);
        WUXING.forEach((wx) => {
          expect(mapping[wx]).toBeDefined();
          expect(mapping[wx].length).toBe(2);
        });
      });
    });

    it('should have 5 relation types defined', () => {
      const data = loadData('shishen.json');
      expect(data.relations.length).toBe(5);
    });
  });

  describe('shensha.json', () => {
    it('should have at least 8 shensha types', () => {
      const data = loadData('shensha.json');
      expect(data.shensha.length).toBeGreaterThanOrEqual(8);
    });

    const requiredShensha = ['天乙贵人', '太极贵人', '文昌贵人', '羊刃', '桃花（咸池）', '将星', '华盖', '驿马'];
    requiredShensha.forEach((name) => {
      it(`should include ${name}`, () => {
        const data = loadData('shensha.json');
        const found = data.shensha.find((s: any) => s.name === name);
        expect(found).toBeDefined();
        expect(found.detail).toBeDefined();
      });
    });

    it('each shensha should have lookup_by and detail', () => {
      const data = loadData('shensha.json');
      data.shensha.forEach((s: any) => {
        expect(s.name).toBeDefined();
        expect(s.lookup_by).toBeDefined();
        expect(s.detail).toBeDefined();
      });
    });
  });

  describe('wuhudun.json', () => {
    it('should have 5 rules (one per gan pair)', () => {
      const data = loadData('wuhudun.json');
      expect(data.rules.length).toBe(5);
    });

    it('each rule should have 12 month sequences', () => {
      const data = loadData('wuhudun.json');
      data.rules.forEach((rule: any) => {
        expect(rule.sequence.length).toBe(12);
        rule.sequence.forEach((g: string) => expect(GAN).toContain(g));
      });
    });

    it('should have 12 month_di_zhi', () => {
      const data = loadData('wuhudun.json');
      expect(data.month_di_zhi.length).toBe(12);
    });
  });

  describe('wushudun.json', () => {
    it('should have 5 rules (one per gan pair)', () => {
      const data = loadData('wushudun.json');
      expect(data.rules.length).toBe(5);
    });

    it('each rule should have 10 hour sequences', () => {
      const data = loadData('wushudun.json');
      data.rules.forEach((rule: any) => {
        expect(rule.sequence.length).toBe(10);
        rule.sequence.forEach((g: string) => expect(GAN).toContain(g));
      });
    });

    it('should have 12 hour_di_zhi', () => {
      const data = loadData('wushudun.json');
      expect(data.hour_di_zhi.length).toBe(12);
    });
  });

  describe('dayun.json', () => {
    it('should have 4 direction rules', () => {
      const data = loadData('dayun.json');
      expect(data.direction_rules.length).toBe(4);
    });

    it('should have yang_gan and yin_gan arrays', () => {
      const data = loadData('dayun.json');
      expect(data.yang_gan.length).toBe(5);
      expect(data.yin_gan.length).toBe(5);
    });

    it('should have start_age_formula', () => {
      const data = loadData('dayun.json');
      expect(data.start_age_formula).toBeDefined();
      expect(data.start_age_formula.forward).toBeDefined();
      expect(data.start_age_formula.backward).toBeDefined();
    });

    it('should have 12 jieqi for dayun', () => {
      const data = loadData('dayun.json');
      expect(data.jieqi_for_dayun.length).toBe(12);
    });
  });

  describe('dihe_relation.json', () => {
    it('should have liu_he (6 pairs)', () => {
      const data = loadData('dihe_relation.json');
      expect(data.liu_he.length).toBe(6);
    });

    it('should have san_he (4 groups)', () => {
      const data = loadData('dihe_relation.json');
      expect(data.san_he.length).toBe(4);
    });

    it('should have san_hui (4 groups)', () => {
      const data = loadData('dihe_relation.json');
      expect(data.san_hui.length).toBe(4);
    });

    it('should have liu_chong (6 pairs)', () => {
      const data = loadData('dihe_relation.json');
      expect(data.liu_chong.length).toBe(6);
    });

    it('should have liu_hai (6 pairs)', () => {
      const data = loadData('dihe_relation.json');
      expect(data.liu_hai.length).toBe(6);
    });

    it('should have san_xing (3 groups)', () => {
      const data = loadData('dihe_relation.json');
      expect(data.san_xing.length).toBe(3);
    });

    it('should have zi_xing (4 pairs)', () => {
      const data = loadData('dihe_relation.json');
      expect(data.zi_xing.length).toBe(4);
    });

    it('should have priority_rules', () => {
      const data = loadData('dihe_relation.json');
      expect(data.priority_rules).toBeDefined();
    });
  });

  describe('tiangan_detail.json', () => {
    it('should have details for all 10 tiangan', () => {
      const data = loadData('tiangan_detail.json');
      expect(data.tiangan.length).toBe(10);
      const names = data.tiangan.map((t: any) => t.name);
      GAN.forEach((g) => expect(names).toContain(g));
    });

    it('each tiangan should have changsheng sub-table', () => {
      const data = loadData('tiangan_detail.json');
      data.tiangan.forEach((t: any) => {
        expect(t.changsheng).toBeDefined();
        expect(Object.keys(t.changsheng).length).toBe(12);
      });
    });
  });

  describe('dizhi_detail.json', () => {
    it('should have details for all 12 dizhi', () => {
      const data = loadData('dizhi_detail.json');
      expect(data.dizhi.length).toBe(12);
      const names = data.dizhi.map((d: any) => d.name);
      ZHI.forEach((z) => expect(names).toContain(z));
    });

    it('each dizhi should have zanggan sub-object', () => {
      const data = loadData('dizhi_detail.json');
      data.dizhi.forEach((d: any) => {
        expect(d.zanggan).toBeDefined();
        expect(d.zanggan.main).toBeDefined();
      });
    });
  });
});
