"""
紫微斗数六层流盘端到端测试

5 组测试用例：
  1. 1990-06-15 14:00 男 → 2026年流盘
  2. 1988-08-08 08:00 女 → 2026年流盘
  3. 2000-01-01 00:00 男 → 2025年流盘
  4. 1985-12-22 10:00 女 → 2030年流盘
  5. 1995-05-20 16:00 男 → 2024年流盘

验证项：
  - 大限方向正确（阳男阴女顺行，阴男阳女逆行）
  - 流年命宫正确
  - 小限宫位正确
  - 流昌流曲正确
"""

import unittest
import sys
import os

# 确保可以导入同目录模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ziwei import (
    paipan_from_solar, TIANGAN, DIZHI, WU_HU_DUN,
    SIHUA_TABLE, STAR_NAMES, normalize_1_12,
)
from liupan import (
    calc_daxian, calc_xiaoxian, calc_liunian, calc_liuyue,
    calc_liuri, calc_liushi, calc_tongxian, calc_liupan,
    liupan_summary,
    _AX_XIAOXIAN_ARR, _AX_LC_ARR, _AX_LIUQU_ARR,
    DaxianResult, XiaoxianResult, LiunianResult, LiupanResult,
)


class TestLiupanCase1(unittest.TestCase):
    """测试用例1: 1990-06-15 14:00 男 → 2026年流盘"""

    @classmethod
    def setUpClass(cls):
        """排本命盘"""
        cls.pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
        cls.target_year = 2026
        cls.age = 2026 - 1990 + 1  # 虚岁37

    def test_daxian_direction(self):
        """大限方向：1990年=庚午年，年干庚=7(奇数)→阳，男→阳男顺行"""
        yang_yin = 2 if self.pp.year_gan % 2 == 0 else 1
        # 庚=7, 奇数→阳=1
        self.assertEqual(yang_yin, 1, "庚年为阳年")
        # 阳男→顺行
        shun_xing = (yang_yin == 1 and self.pp.sex == 1)
        self.assertTrue(shun_xing, "阳男应顺行")

    def test_daxian_index(self):
        """大限序号：虚岁37，五行局数=self.pp.wuxing_ju"""
        ju = self.pp.wuxing_ju
        dx_index = (self.age - ju) // 10 + 1
        dx = calc_daxian(self.pp, dx_index)
        self.assertEqual(dx.index, dx_index)
        # 验证年龄范围
        self.assertLessEqual(dx.age_start, self.age)
        self.assertGreaterEqual(dx.age_end, self.age)

    def test_daxian_ming_gong(self):
        """大限命宫位置：阳男顺行，命宫偏移dx_index-1位"""
        ju = self.pp.wuxing_ju
        dx_index = (self.age - ju) // 10 + 1
        dx = calc_daxian(self.pp, dx_index)
        # 顺行：大限命宫 = 本命命宫 + dx_index - 1
        expected_pos = normalize_1_12(self.pp.ming_gong_pos + dx_index - 1)
        self.assertEqual(dx.ming_gong_pos, expected_pos)

    def test_daxian_sihua(self):
        """大限四化：大限天干驱动的四化"""
        ju = self.pp.wuxing_ju
        dx_index = (self.age - ju) // 10 + 1
        dx = calc_daxian(self.pp, dx_index)
        # 大限天干
        dx_tg = self.pp.get_gong(dx.ming_gong_pos).tiangan
        self.assertEqual(dx.tiangan, dx_tg)
        # 四化应与SIHUA_TABLE[天干]对应
        raw = SIHUA_TABLE[dx_tg]
        hua_labels = ["化禄", "化权", "化科", "化忌"]
        for i, label in enumerate(hua_labels):
            self.assertEqual(dx.sihua[label][0], raw[i],
                             f"大限{label}星编号应为{raw[i]}")

    def test_liunian_ming_gong(self):
        """流年命宫：2026年地支对应的宫位"""
        ln = calc_liunian(self.pp, self.target_year)
        year_dz = (self.target_year - 4) % 12 + 1
        self.assertEqual(ln.dizhi, year_dz, "流年地支应正确")
        self.assertEqual(ln.ming_gong_pos, year_dz, "流年命宫=流年地支宫位")

    def test_liunian_tiangan(self):
        """流年天干"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1
        self.assertEqual(ln.tiangan, year_tg)

    def test_liunian_sihua(self):
        """流年四化"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1
        raw = SIHUA_TABLE[year_tg]
        hua_labels = ["化禄", "化权", "化科", "化忌"]
        for i, label in enumerate(hua_labels):
            self.assertEqual(ln.sihua[label][0], raw[i])

    def test_liunian_liuchang_liuqu(self):
        """流昌流曲"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1
        self.assertEqual(ln.liuchang_pos, _AX_LC_ARR[year_tg])
        self.assertEqual(ln.liuqu_pos, _AX_LIUQU_ARR[year_tg])

    def test_xiaoxian(self):
        """小限宫位"""
        xx = calc_xiaoxian(self.pp, self.age)
        # 小限起宫
        xiaoxian_start = _AX_XIAOXIAN_ARR[self.pp.ming_gong_pos]
        # 男顺行，找到当前年龄所在宫位
        found = False
        for i in range(1, 13):
            xx_name = 1 + i - xiaoxian_start
            if xx_name <= 0:
                xx_name += 12
            if (self.age - xx_name) % 12 == 0:
                self.assertEqual(xx.ming_gong_pos, i)
                found = True
                break
        self.assertTrue(found, "应找到小限命宫")

    def test_tongxian(self):
        """童限起运年龄"""
        tx = calc_tongxian(self.pp)
        self.assertEqual(tx.start_age, self.pp.wuxing_ju)

    def test_liuyue(self):
        """流月计算"""
        ln = calc_liunian(self.pp, self.target_year)
        ly = calc_liuyue(ln, 6)  # 6月
        # 正月天干 = WU_HU_DUN[流年天干]
        first_gan = WU_HU_DUN[ln.tiangan]
        expected_tg = first_gan + 5  # 6月 = 正月+5
        while expected_tg > 10:
            expected_tg -= 10
        self.assertEqual(ly.tiangan, expected_tg)
        # 6月地支 = (6+2)%12 = 8 = 未
        self.assertEqual(ly.dizhi, 8)

    def test_full_liupan(self):
        """完整流盘"""
        lr = calc_liupan(self.pp, self.target_year, target_month=6, target_day=15)
        self.assertIsNotNone(lr.daxian)
        self.assertIsNotNone(lr.xiaoxian)
        self.assertIsNotNone(lr.liunian)
        self.assertIsNotNone(lr.liuyue)
        # 流日可能因 sxtwl 不可用而跳过
        # 摘要输出
        summary = liupan_summary(lr)
        self.assertIn("大限", summary)
        self.assertIn("流年", summary)


class TestLiupanCase2(unittest.TestCase):
    """测试用例2: 1988-08-08 08:00 女 → 2026年流盘"""

    @classmethod
    def setUpClass(cls):
        cls.pp = paipan_from_solar(1988, 8, 8, 8, sex=2)
        cls.target_year = 2026
        cls.age = 2026 - 1988 + 1  # 虚岁39

    def test_daxian_direction(self):
        """大限方向：1988年=戊辰年，年干戊=5(奇数)→阳，女→阳女逆行"""
        yang_yin = 2 if self.pp.year_gan % 2 == 0 else 1
        # 戊=5, 奇数→阳=1
        self.assertEqual(yang_yin, 1, "戊年为阳年")
        # 阳女→逆行
        shun_xing = (yang_yin == 1 and self.pp.sex == 1) or (yang_yin == 2 and self.pp.sex == 2)
        self.assertFalse(shun_xing, "阳女应逆行")

    def test_daxian_ming_gong(self):
        """大限命宫：阳女逆行"""
        ju = self.pp.wuxing_ju
        dx_index = (self.age - ju) // 10 + 1
        dx = calc_daxian(self.pp, dx_index)
        # 逆行：大限命宫 = 本命命宫 - (dx_index - 1)
        expected_pos = normalize_1_12(self.pp.ming_gong_pos - (dx_index - 1))
        self.assertEqual(dx.ming_gong_pos, expected_pos)

    def test_liunian_ming_gong(self):
        """流年命宫"""
        ln = calc_liunian(self.pp, self.target_year)
        year_dz = (self.target_year - 4) % 12 + 1
        self.assertEqual(ln.ming_gong_pos, year_dz)

    def test_xiaoxian(self):
        """小限：女逆行"""
        xx = calc_xiaoxian(self.pp, self.age)
        xiaoxian_start = _AX_XIAOXIAN_ARR[self.pp.ming_gong_pos]
        found = False
        for i in range(1, 13):
            xx_name = 1 - i + xiaoxian_start  # 女逆行
            if xx_name <= 0:
                xx_name += 12
            if (self.age - xx_name) % 12 == 0:
                self.assertEqual(xx.ming_gong_pos, i)
                found = True
                break
        self.assertTrue(found)

    def test_liunian_liuchang_liuqu(self):
        """流昌流曲"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1
        self.assertEqual(ln.liuchang_pos, _AX_LC_ARR[year_tg])
        self.assertEqual(ln.liuqu_pos, _AX_LIUQU_ARR[year_tg])


class TestLiupanCase3(unittest.TestCase):
    """测试用例3: 2000-01-01 00:00 男 → 2025年流盘"""

    @classmethod
    def setUpClass(cls):
        cls.pp = paipan_from_solar(2000, 1, 1, 0, sex=1)
        cls.target_year = 2025
        cls.age = 2025 - 2000 + 1  # 虚岁26

    def test_daxian_direction(self):
        """大限方向：2000年1月1日立春前=己卯年，年干己=6(偶数)→阴，男→阴男逆行"""
        yang_yin = 2 if self.pp.year_gan % 2 == 0 else 1
        self.assertEqual(yang_yin, 2, "己年为阴年")
        shun_xing = (yang_yin == 1 and self.pp.sex == 1) or (yang_yin == 2 and self.pp.sex == 2)
        self.assertFalse(shun_xing, "阴男应逆行")

    def test_daxian_ming_gong(self):
        """大限命宫（阴男逆行）"""
        ju = self.pp.wuxing_ju
        dx_index = (self.age - ju) // 10 + 1
        dx = calc_daxian(self.pp, dx_index)
        # 阴男逆行：命宫偏移 -(dx_index-1) 位
        expected_pos = normalize_1_12(self.pp.ming_gong_pos - (dx_index - 1))
        self.assertEqual(dx.ming_gong_pos, expected_pos)

    def test_liunian(self):
        """流年：2025年"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1  # 2025: (2025-4)%10+1 = 2021%10+1 = 1+1 = 2 → 乙
        year_dz = (self.target_year - 4) % 12 + 1  # 2025: (2025-4)%12+1 = 2021%12+1 = 5+1 = 6 → 巳
        self.assertEqual(ln.tiangan, year_tg)
        self.assertEqual(ln.dizhi, year_dz)
        self.assertEqual(ln.ming_gong_pos, year_dz)

    def test_xiaoxian(self):
        """小限"""
        xx = calc_xiaoxian(self.pp, self.age)
        self.assertGreaterEqual(xx.ming_gong_pos, 1)
        self.assertLessEqual(xx.ming_gong_pos, 12)

    def test_liuchang_liuqu(self):
        """流昌流曲"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1
        self.assertEqual(ln.liuchang_pos, _AX_LC_ARR[year_tg])
        self.assertEqual(ln.liuqu_pos, _AX_LIUQU_ARR[year_tg])


class TestLiupanCase4(unittest.TestCase):
    """测试用例4: 1985-12-22 10:00 女 → 2030年流盘"""

    @classmethod
    def setUpClass(cls):
        cls.pp = paipan_from_solar(1985, 12, 22, 10, sex=2)
        cls.target_year = 2030
        cls.age = 2030 - 1985 + 1  # 虚岁46

    def test_daxian_direction(self):
        """大限方向：1985年=乙丑年，年干乙=2(偶数)→阴，女→阴女顺行"""
        yang_yin = 2 if self.pp.year_gan % 2 == 0 else 1
        # 乙=2, 偶数→阴=2
        self.assertEqual(yang_yin, 2, "乙年为阴年")
        # 阴女→顺行
        shun_xing = (yang_yin == 1 and self.pp.sex == 1) or (yang_yin == 2 and self.pp.sex == 2)
        self.assertTrue(shun_xing, "阴女应顺行")

    def test_daxian_ming_gong(self):
        """大限命宫：阴女顺行"""
        ju = self.pp.wuxing_ju
        dx_index = (self.age - ju) // 10 + 1
        dx = calc_daxian(self.pp, dx_index)
        expected_pos = normalize_1_12(self.pp.ming_gong_pos + dx_index - 1)
        self.assertEqual(dx.ming_gong_pos, expected_pos)

    def test_liunian(self):
        """流年：2030年"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1  # 2030: (2030-4)%10+1 = 2026%10+1 = 6+1 = 7 → 庚
        year_dz = (self.target_year - 4) % 12 + 1  # 2030: (2030-4)%12+1 = 2026%12+1 = 10+1 = 11 → 戌
        self.assertEqual(ln.tiangan, year_tg)
        self.assertEqual(ln.dizhi, year_dz)

    def test_xiaoxian(self):
        """小限：女逆行"""
        xx = calc_xiaoxian(self.pp, self.age)
        self.assertGreaterEqual(xx.ming_gong_pos, 1)
        self.assertLessEqual(xx.ming_gong_pos, 12)

    def test_liuchang_liuqu(self):
        """流昌流曲"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1
        self.assertEqual(ln.liuchang_pos, _AX_LC_ARR[year_tg])
        self.assertEqual(ln.liuqu_pos, _AX_LIUQU_ARR[year_tg])


class TestLiupanCase5(unittest.TestCase):
    """测试用例5: 1995-05-20 16:00 男 → 2024年流盘"""

    @classmethod
    def setUpClass(cls):
        cls.pp = paipan_from_solar(1995, 5, 20, 16, sex=1)
        cls.target_year = 2024
        cls.age = 2024 - 1995 + 1  # 虚岁30

    def test_daxian_direction(self):
        """大限方向：1995年=乙亥年，年干乙=2(偶数)→阴，男→阴男逆行"""
        yang_yin = 2 if self.pp.year_gan % 2 == 0 else 1
        # 乙=2, 偶数→阴=2
        self.assertEqual(yang_yin, 2, "乙年为阴年")
        # 阴男→逆行
        shun_xing = (yang_yin == 1 and self.pp.sex == 1) or (yang_yin == 2 and self.pp.sex == 2)
        self.assertFalse(shun_xing, "阴男应逆行")

    def test_daxian_ming_gong(self):
        """大限命宫：阴男逆行"""
        ju = self.pp.wuxing_ju
        dx_index = (self.age - ju) // 10 + 1
        dx = calc_daxian(self.pp, dx_index)
        expected_pos = normalize_1_12(self.pp.ming_gong_pos - (dx_index - 1))
        self.assertEqual(dx.ming_gong_pos, expected_pos)

    def test_liunian(self):
        """流年：2024年"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1  # 2024: (2024-4)%10+1 = 2020%10+1 = 0+1 = 1 → 甲
        year_dz = (self.target_year - 4) % 12 + 1  # 2024: (2024-4)%12+1 = 2020%12+1 = 4+1 = 5 → 辰
        self.assertEqual(ln.tiangan, year_tg)
        self.assertEqual(ln.dizhi, year_dz)

    def test_liunian_sihua_2024(self):
        """2024年=甲年，四化应为：廉贞化禄/破军化权/武曲化科/太阳化忌"""
        ln = calc_liunian(self.pp, self.target_year)
        year_tg = (self.target_year - 4) % 10 + 1
        self.assertEqual(year_tg, 1, "2024年天干应为甲(1)")
        # 甲干四化: [6,14,4,3] → 廉贞/破军/武曲/太阳
        self.assertEqual(ln.sihua["化禄"][0], 6)   # 廉贞
        self.assertEqual(ln.sihua["化权"][0], 14)  # 破军
        self.assertEqual(ln.sihua["化科"][0], 4)   # 武曲
        self.assertEqual(ln.sihua["化忌"][0], 3)   # 太阳

    def test_xiaoxian(self):
        """小限"""
        xx = calc_xiaoxian(self.pp, self.age)
        self.assertGreaterEqual(xx.ming_gong_pos, 1)
        self.assertLessEqual(xx.ming_gong_pos, 12)

    def test_liuchang_liuqu_2024(self):
        """2024年=甲年，流昌=寅(3), 流曲=酉(10)"""
        ln = calc_liunian(self.pp, self.target_year)
        self.assertEqual(ln.liuchang_pos, 3, "甲年流昌应在寅宫(3)")
        self.assertEqual(ln.liuqu_pos, 10, "甲年流曲应在酉宫(10)")


class TestLiupanHelperFunctions(unittest.TestCase):
    """辅助函数和边界条件测试"""

    def test_gong_names_from_ming(self):
        """宫名编号计算：命宫在子(1)"""
        from liupan import _calc_gong_names_from_ming
        names = _calc_gong_names_from_ming(1)
        self.assertEqual(names[1], 1)   # 子=命宫
        self.assertEqual(names[12], 2)  # 亥=兄弟宫（逆时针）
        self.assertEqual(names[11], 3)  # 戌=夫妻宫

    def test_gong_names_from_ming_yin(self):
        """宫名编号计算：命宫在寅(3)"""
        from liupan import _calc_gong_names_from_ming
        names = _calc_gong_names_from_ming(3)
        self.assertEqual(names[3], 1)   # 寅=命宫
        self.assertEqual(names[2], 2)   # 丑=兄弟宫
        self.assertEqual(names[1], 3)   # 子=夫妻宫

    def test_liuyue_tiangan(self):
        """流月天干推算：甲年正月=丙寅"""
        # 构造一个流年结果
        ln = LiunianResult(year=2024, tiangan=1, dizhi=5, ming_gong_pos=5)
        ly = calc_liuyue(ln, 1)  # 正月
        # 甲年正月天干 = WU_HU_DUN[1] = 3 → 丙
        self.assertEqual(ly.tiangan, 3, "甲年正月天干应为丙(3)")
        # 正月地支 = (1+2)%12 = 3 → 寅
        self.assertEqual(ly.dizhi, 3, "正月地支应为寅(3)")

    def test_liuyue_tiangan_gui_year(self):
        """流月天干推算：癸年正月=甲寅"""
        ln = LiunianResult(year=2023, tiangan=10, dizhi=4, ming_gong_pos=4)
        ly = calc_liuyue(ln, 1)
        # 癸年正月天干 = WU_HU_DUN[10] = 1 → 甲
        self.assertEqual(ly.tiangan, 1, "癸年正月天干应为甲(1)")

    def test_liushi_tiangan(self):
        """流时天干推算：甲日子时→甲子时"""
        lri = type('LiuriResult', (), {
            'tiangan': 1, 'dizhi': 1, 'ming_gong_pos': 1,
            'gong_names': [0]*13, 'sihua': {}, 'year': 2024,
            'month': 6, 'day': 15,
        })()
        ls = calc_liushi(lri, 1)  # 子时
        # 甲日子时天干 = 1 → 甲
        self.assertEqual(ls.tiangan, 1, "甲日子时应为甲子时")

    def test_liushi_tiangan_jia_chou(self):
        """流时天干推算：甲日丑时→乙丑时"""
        lri = type('LiuriResult', (), {
            'tiangan': 1, 'dizhi': 1, 'ming_gong_pos': 1,
            'gong_names': [0]*13, 'sihua': {}, 'year': 2024,
            'month': 6, 'day': 15,
        })()
        ls = calc_liushi(lri, 2)  # 丑时
        # 甲日丑时天干 = 1+1 = 2 → 乙
        self.assertEqual(ls.tiangan, 2, "甲日丑时应为乙丑时")

    def test_liushi_tiangan_yi_zi(self):
        """流时天干推算：乙日子时→丙子时"""
        lri = type('LiuriResult', (), {
            'tiangan': 2, 'dizhi': 1, 'ming_gong_pos': 1,
            'gong_names': [0]*13, 'sihua': {}, 'year': 2024,
            'month': 6, 'day': 15,
        })()
        ls = calc_liushi(lri, 1)  # 子时
        # 乙日子时天干 = 3 → 丙
        self.assertEqual(ls.tiangan, 3, "乙日子时应为丙子时")

    def test_xiaoxian_start_table(self):
        """小限起宫表验证"""
        # 命宫在子(1) → 起宫=11(戌)
        self.assertEqual(_AX_XIAOXIAN_ARR[1], 11)
        # 命宫在寅(3) → 起宫=5(辰)
        self.assertEqual(_AX_XIAOXIAN_ARR[3], 5)

    def test_liuchang_table(self):
        """流昌表验证：甲年→寅(3), 丙年→巳(6)"""
        self.assertEqual(_AX_LC_ARR[1], 3)   # 甲→寅
        self.assertEqual(_AX_LC_ARR[3], 6)   # 丙→巳
        self.assertEqual(_AX_LC_ARR[10], 1)  # 癸→子

    def test_liuqu_table(self):
        """流曲表验证：甲年→酉(10), 丙年→午(7)"""
        self.assertEqual(_AX_LIUQU_ARR[1], 10)  # 甲→酉
        self.assertEqual(_AX_LIUQU_ARR[3], 7)    # 丙→午
        self.assertEqual(_AX_LIUQU_ARR[10], 12)  # 癸→亥

    def test_daxian_age_range(self):
        """大限年龄范围验证"""
        pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
        # 第一大限
        dx1 = calc_daxian(pp, 1)
        self.assertEqual(dx1.age_start, pp.wuxing_ju)
        self.assertEqual(dx1.age_end, pp.wuxing_ju + 9)
        # 第二大限
        dx2 = calc_daxian(pp, 2)
        self.assertEqual(dx2.age_start, pp.wuxing_ju + 10)
        self.assertEqual(dx2.age_end, pp.wuxing_ju + 19)

    def test_tongxian_all_ju(self):
        """童限起运年龄验证：各五行局"""
        for ju, expected_age in [(2, 2), (3, 3), (4, 4), (5, 5), (6, 6)]:
            pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
            pp.wuxing_ju = ju
            tx = calc_tongxian(pp)
            self.assertEqual(tx.start_age, expected_age,
                             f"五行局{ju}起运年龄应为{expected_age}")


class TestLiupanIntegration(unittest.TestCase):
    """集成测试：calc_liupan 统一入口"""

    def test_calc_liupan_basic(self):
        """基本流盘计算（仅大限/小限/流年）"""
        pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
        lr = calc_liupan(pp, 2026)
        self.assertIsNotNone(lr.daxian)
        self.assertIsNotNone(lr.xiaoxian)
        self.assertIsNotNone(lr.liunian)
        self.assertIsNone(lr.liuyue)
        self.assertIsNone(lr.liuri)
        self.assertIsNone(lr.liushi)

    def test_calc_liupan_with_month(self):
        """流盘计算（含流月）"""
        pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
        lr = calc_liupan(pp, 2026, target_month=6)
        self.assertIsNotNone(lr.liuyue)
        self.assertEqual(lr.liuyue.month_index, 6)

    def test_calc_liupan_with_day(self):
        """流盘计算（含流日，需 sxtwl）"""
        try:
            import sxtwl
        except ImportError:
            self.skipTest("sxtwl 库未安装，跳过流日测试")
        pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
        lr = calc_liupan(pp, 2026, target_month=6, target_day=15)
        self.assertIsNotNone(lr.liuri)
        self.assertEqual(lr.liuri.year, 2026)
        self.assertEqual(lr.liuri.month, 6)
        self.assertEqual(lr.liuri.day, 15)

    def test_calc_liupan_with_hour(self):
        """流盘计算（含流时，需 sxtwl）"""
        try:
            import sxtwl
        except ImportError:
            self.skipTest("sxtwl 库未安装，跳过流时测试")
        pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
        lr = calc_liupan(pp, 2026, target_month=6, target_day=15, target_hour=8)
        self.assertIsNotNone(lr.liushi)
        self.assertEqual(lr.liushi.hour_index, 8)

    def test_liupan_summary(self):
        """流盘摘要输出"""
        pp = paipan_from_solar(1990, 6, 15, 14, sex=1)
        lr = calc_liupan(pp, 2026, target_month=6)
        summary = liupan_summary(lr)
        self.assertIn("大限", summary)
        self.assertIn("小限", summary)
        self.assertIn("流年", summary)
        self.assertIn("流月", summary)
        self.assertIn("童限", summary)


if __name__ == "__main__":
    unittest.main(verbosity=2)
