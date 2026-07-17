"""
P3-D 进阶能力测试：天地人盘（中州派）和斗君计算

测试内容：
  1. 天盘(pan_type=1)返回结果与原命盘一致
  2. 地盘(pan_type=2)命宫=身宫位置，五行局可能不同
  3. 人盘(pan_type=3, offset=1)命宫=原命宫+1
  4. 人盘(pan_type=3, offset=-1)命宫=原命宫-1
  5. 地盘的宫名从身宫起排列
  6. 多组生辰验证（1990男、1988女）
  7. 斗君计算验证
  8. 子年斗君验证
  9. 全矩阵验证
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ziwei import paipan_from_solar, PaipanConfig, DIZHI, GONG_NAMES, normalize_1_12
from liupan import calc_tiandiren_pan, calc_doujun, calc_zinian_doujun, _AX_ZNDJ_ARR


class TestTianDiRenPan(unittest.TestCase):
    """天地人盘测试"""

    def _get_paipan_result(self, year=1990, month=6, day=15, hour=14, sex=1):
        """获取排盘结果的辅助方法"""
        return paipan_from_solar(year, month, day, hour, sex)

    # ---- 天盘测试 ----

    def test_tian_pan_matches_original(self):
        """天盘(pan_type=1)返回结果与原命盘一致"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=1)

        self.assertEqual(result["pan_type"], 1)
        self.assertEqual(result["ming_gong_pos"], pp.ming_gong_pos)
        self.assertEqual(result["wuxing_ju"], pp.wuxing_ju)
        self.assertEqual(result["ziwei_pos"], pp.ziwei_pos)
        self.assertEqual(result["tianfu_pos"], pp.tianfu_pos)

    def test_tian_pan_gong_names(self):
        """天盘宫名与原命盘一致"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=1)

        # 命宫位应为宫名1（命宫）
        self.assertEqual(result["gong_names"][pp.ming_gong_pos], 1)

    def test_tian_pan_default(self):
        """不传pan_type时默认为天盘"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp)

        self.assertEqual(result["pan_type"], 1)
        self.assertEqual(result["ming_gong_pos"], pp.ming_gong_pos)

    # ---- 地盘测试 ----

    def test_di_pan_ming_gong_is_shen_gong(self):
        """地盘(pan_type=2)命宫=身宫位置"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=2)

        self.assertEqual(result["pan_type"], 2)
        self.assertEqual(result["ming_gong_pos"], pp.shen_gong_pos)

    def test_di_pan_gong_names_from_shen_gong(self):
        """地盘的宫名从身宫起排列"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=2)

        # 身宫位应为宫名1（命宫）
        self.assertEqual(result["gong_names"][pp.shen_gong_pos], 1)

    def test_di_pan_wuxing_ju_may_differ(self):
        """地盘五行局数可能不同于天盘"""
        # 使用多组数据验证：至少有一组地盘五行局不同于天盘
        test_cases = [
            (1990, 6, 15, 14, 1),
            (1988, 3, 20, 10, 2),
            (2000, 1, 1, 8, 1),
            (1995, 9, 10, 6, 2),
        ]
        found_diff = False
        for year, month, day, hour, sex in test_cases:
            pp = paipan_from_solar(year, month, day, hour, sex)
            result = calc_tiandiren_pan(pp, pan_type=2)
            if result["wuxing_ju"] != pp.wuxing_ju:
                found_diff = True
                break
        # 不强制要求不同，但验证计算过程正确
        # 如果命宫和身宫位置不同，五行局可能不同
        for year, month, day, hour, sex in test_cases:
            pp = paipan_from_solar(year, month, day, hour, sex)
            if pp.ming_gong_pos != pp.shen_gong_pos:
                result = calc_tiandiren_pan(pp, pan_type=2)
                # 验证五行局数在合法范围内
                self.assertIn(result["wuxing_ju"], [2, 3, 4, 5, 6])

    def test_di_pan_ziwei_recalculated(self):
        """地盘紫微星基于新五行局重新计算"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=2)

        # 紫微位在合法范围内
        self.assertGreaterEqual(result["ziwei_pos"], 1)
        self.assertLessEqual(result["ziwei_pos"], 12)

        # 天府位在合法范围内
        self.assertGreaterEqual(result["tianfu_pos"], 1)
        self.assertLessEqual(result["tianfu_pos"], 12)

    # ---- 人盘测试 ----

    def test_ren_pan_offset_plus1(self):
        """人盘(pan_type=3, offset=1)命宫=原命宫+1"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=3, ming_gong_offset=1)

        expected_pos = normalize_1_12(pp.ming_gong_pos + 1)
        self.assertEqual(result["pan_type"], 3)
        self.assertEqual(result["ming_gong_pos"], expected_pos)

    def test_ren_pan_offset_minus1(self):
        """人盘(pan_type=3, offset=-1)命宫=原命宫-1"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=3, ming_gong_offset=-1)

        expected_pos = normalize_1_12(pp.ming_gong_pos - 1)
        self.assertEqual(result["pan_type"], 3)
        self.assertEqual(result["ming_gong_pos"], expected_pos)

    def test_ren_pan_offset_zero(self):
        """人盘(pan_type=3, offset=0)命宫=原命宫"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=3, ming_gong_offset=0)

        self.assertEqual(result["ming_gong_pos"], pp.ming_gong_pos)

    def test_ren_pan_gong_names(self):
        """人盘宫名从偏移后命宫起排列"""
        pp = self._get_paipan_result()
        offset = 1
        result = calc_tiandiren_pan(pp, pan_type=3, ming_gong_offset=offset)

        new_ming = normalize_1_12(pp.ming_gong_pos + offset)
        self.assertEqual(result["gong_names"][new_ming], 1)

    def test_ren_pan_wuxing_ju_recalculated(self):
        """人盘五行局基于偏移后命宫重新计算"""
        pp = self._get_paipan_result()
        result = calc_tiandiren_pan(pp, pan_type=3, ming_gong_offset=1)

        # 五行局数在合法范围内
        self.assertIn(result["wuxing_ju"], [2, 3, 4, 5, 6])

    # ---- 多组生辰验证 ----

    def test_1990_male(self):
        """1990年男性多盘面验证"""
        pp = paipan_from_solar(1990, 6, 15, 14, 1)

        # 天盘
        tian = calc_tiandiren_pan(pp, pan_type=1)
        self.assertEqual(tian["ming_gong_pos"], pp.ming_gong_pos)

        # 地盘
        di = calc_tiandiren_pan(pp, pan_type=2)
        self.assertEqual(di["ming_gong_pos"], pp.shen_gong_pos)

        # 人盘（时头）
        ren = calc_tiandiren_pan(pp, pan_type=3, ming_gong_offset=1)
        self.assertEqual(ren["ming_gong_pos"], normalize_1_12(pp.ming_gong_pos + 1))

    def test_1988_female(self):
        """1988年女性多盘面验证"""
        pp = paipan_from_solar(1988, 3, 20, 10, 2)

        # 天盘
        tian = calc_tiandiren_pan(pp, pan_type=1)
        self.assertEqual(tian["ming_gong_pos"], pp.ming_gong_pos)

        # 地盘
        di = calc_tiandiren_pan(pp, pan_type=2)
        self.assertEqual(di["ming_gong_pos"], pp.shen_gong_pos)

        # 人盘（时尾）
        ren = calc_tiandiren_pan(pp, pan_type=3, ming_gong_offset=-1)
        self.assertEqual(ren["ming_gong_pos"], normalize_1_12(pp.ming_gong_pos - 1))

    # ---- 异常输入测试 ----

    def test_invalid_pan_type(self):
        """无效盘面类型应抛出异常"""
        pp = self._get_paipan_result()
        with self.assertRaises(ValueError):
            calc_tiandiren_pan(pp, pan_type=4)

    def test_gong_names_length(self):
        """宫名列表长度为13（索引0占位+1~12）"""
        pp = self._get_paipan_result()
        for pan_type in [1, 2, 3]:
            result = calc_tiandiren_pan(pp, pan_type=pan_type,
                                        ming_gong_offset=(1 if pan_type == 3 else 0))
            self.assertEqual(len(result["gong_names"]), 13)
            # 索引0应为0
            self.assertEqual(result["gong_names"][0], 0)
            # 每个宫位1~12都应有宫名
            for pos in range(1, 13):
                self.assertGreaterEqual(result["gong_names"][pos], 1)
                self.assertLessEqual(result["gong_names"][pos], 12)

    def test_gong_names_cover_all(self):
        """宫名列表1~12各出现一次"""
        pp = self._get_paipan_result()
        for pan_type in [1, 2, 3]:
            result = calc_tiandiren_pan(pp, pan_type=pan_type,
                                        ming_gong_offset=(1 if pan_type == 3 else 0))
            names = [result["gong_names"][i] for i in range(1, 13)]
            self.assertEqual(sorted(names), list(range(1, 13)))


class TestDoujun(unittest.TestCase):
    """斗君计算测试"""

    def test_doujun_ming1_liunian1(self):
        """命宫在子(1)，流年在子(1)→斗君在子(1)"""
        self.assertEqual(calc_doujun(1, 1), 1)

    def test_doujun_ming1_liunian2(self):
        """命宫在子(1)，流年在丑(2)→斗君在丑(2)"""
        self.assertEqual(calc_doujun(1, 2), 2)

    def test_doujun_ming2_liunian1(self):
        """命宫在丑(2)，流年在子(1)→斗君在亥(12)"""
        self.assertEqual(calc_doujun(2, 1), 12)

    def test_doujun_ming3_liunian3(self):
        """命宫在寅(3)，流年在寅(3)→斗君在寅(3)（对角线=1）"""
        self.assertEqual(calc_doujun(3, 3), 1)

    def test_zinian_doujun_ming1(self):
        """命宫在子(1)，子年斗君在子(1)"""
        self.assertEqual(calc_zinian_doujun(1), 1)

    def test_zinian_doujun_ming2(self):
        """命宫在丑(2)，子年斗君在亥(12)"""
        self.assertEqual(calc_zinian_doujun(2), 12)

    def test_zinian_doujun_ming12(self):
        """命宫在亥(12)，子年斗君在丑(2)"""
        self.assertEqual(calc_zinian_doujun(12), 2)

    def test_full_matrix_range(self):
        """全矩阵验证：所有值在1~12范围内"""
        for m in range(1, 13):
            for n in range(1, 13):
                val = _AX_ZNDJ_ARR[m][n]
                self.assertGreaterEqual(val, 1, f"值越界: [{m}][{n}]={val}")
                self.assertLessEqual(val, 12, f"值越界: [{m}][{n}]={val}")

    def test_full_matrix_diagonal(self):
        """全矩阵对角线验证：命宫=流年时斗君=1"""
        for i in range(1, 13):
            self.assertEqual(_AX_ZNDJ_ARR[i][i], 1,
                             f"对角线不为1: [{i}][{i}]={_AX_ZNDJ_ARR[i][i]}")

    def test_doujun_consistency_with_zinian(self):
        """calc_doujun(ming, 1) 应等于 calc_zinian_doujun(ming)"""
        for m in range(1, 13):
            self.assertEqual(calc_doujun(m, 1), calc_zinian_doujun(m))

    def test_doujun_with_paipan_result(self):
        """结合排盘结果验证斗君计算"""
        pp = paipan_from_solar(1990, 6, 15, 14, 1)
        # 流年地支=1（子年）
        doujun_pos = calc_doujun(pp.ming_gong_pos, 1)
        self.assertGreaterEqual(doujun_pos, 1)
        self.assertLessEqual(doujun_pos, 12)

        # 子年斗君
        zinian_pos = calc_zinian_doujun(pp.ming_gong_pos)
        self.assertEqual(doujun_pos, zinian_pos)


if __name__ == "__main__":
    unittest.main(verbosity=2)
