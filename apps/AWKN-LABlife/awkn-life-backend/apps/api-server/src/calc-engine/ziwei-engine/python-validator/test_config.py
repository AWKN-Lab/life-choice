"""
紫微斗数排盘引擎 P3-C 配置变体层测试

测试 PaipanConfig 各配置项对排盘结果的影响，覆盖：
  1. 向后兼容（不传 config == 传 PaipanConfig()）
  2. 安天马（year_zhi / month_zhi）
  3. 安天空（standard / shun_jia）
  4. 安魁钺（method 1~4）
  5. 安命主（quanshu / zhongzhou）
  6. 长生十二神（yinyang / shuitu / huotu）
  7. 闰月处理（benyue / xiayue / yuezhong）
  8. 子时处理（dang_ri / ci_ri）
  9. CLI --config 参数
  10. PaipanConfig 序列化
"""

import unittest
import sys
import os
import json
import tempfile
import subprocess
from dataclasses import asdict

sys.path.insert(0, os.path.dirname(__file__))

from ziwei import paipan, paipan_from_solar, PaipanConfig, PaipanResult


# ============================================================
# 辅助函数
# ============================================================

def find_star_pos(result, star_id):
    """在排盘结果中查找指定星曜的宫位"""
    for g in result.gongs:
        for s in g.stars:
            if s.name_index == star_id:
                return g.pos
    return None


def results_core_equal(r1, r2):
    """比较两个排盘结果的核心字段是否一致（忽略 config 引用差异）"""
    if r1.ming_gong_pos != r2.ming_gong_pos:
        return False
    if r1.shen_gong_pos != r2.shen_gong_pos:
        return False
    if r1.wuxing_ju != r2.wuxing_ju:
        return False
    if r1.ziwei_pos != r2.ziwei_pos:
        return False
    if r1.tianfu_pos != r2.tianfu_pos:
        return False
    if r1.mingzhu != r2.mingzhu:
        return False
    if r1.shenzhu != r2.shenzhu:
        return False
    if len(r1.gongs) != len(r2.gongs):
        return False
    for g1, g2 in zip(r1.gongs, r2.gongs):
        if g1.pos != g2.pos:
            return False
        stars1 = sorted([(s.name_index, s.gong_pos) for s in g1.stars])
        stars2 = sorted([(s.name_index, s.gong_pos) for s in g2.stars])
        if stars1 != stars2:
            return False
    return True


# ============================================================
# 1. 向后兼容测试
# ============================================================

class TestBackwardCompat(unittest.TestCase):
    """不传 config 与传 PaipanConfig() 结果应完全一致"""

    def test_paipan_from_solar_no_config_equals_default(self):
        r1 = paipan_from_solar(1990, 6, 15, 14, 1)
        r2 = paipan_from_solar(1990, 6, 15, 14, 1, config=PaipanConfig())
        self.assertTrue(results_core_equal(r1, r2),
                        "paipan_from_solar 不传config应与传PaipanConfig()一致")

    def test_paipan_no_config_equals_default(self):
        r1 = paipan(7, 7, 5, 23, 8, 1)
        r2 = paipan(7, 7, 5, 23, 8, 1, config=PaipanConfig())
        self.assertTrue(results_core_equal(r1, r2),
                        "paipan 不传config应与传PaipanConfig()一致")


# ============================================================
# 2. 安天马配置测试
# ============================================================

class TestTianmaConfig(unittest.TestCase):
    """
    天马安星：year_zhi 按年支查表，month_zhi 按月支查表
    测试数据：year_zhi=7(午), lunar_month=7 → month_zhi=8(未)
      TIANMA_ARR[7]=3, TIANMA_MONTH_ARR[8]=11 → 位置不同
    """

    def test_tianma_year_zhi(self):
        config = PaipanConfig(an_tianma="year_zhi")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        pos = find_star_pos(result, 22)
        self.assertIsNotNone(pos, "天马(22)应存在")
        self.assertEqual(pos, 3, "年支=7(午) → 天马应在3(寅)")

    def test_tianma_month_zhi(self):
        config = PaipanConfig(an_tianma="month_zhi")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        pos = find_star_pos(result, 22)
        self.assertIsNotNone(pos, "天马(22)应存在")
        self.assertEqual(pos, 11, "月支=8(未) → 天马应在11(戌)")

    def test_tianma_year_vs_month_diff(self):
        r1 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_tianma="year_zhi"))
        r2 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_tianma="month_zhi"))
        pos1 = find_star_pos(r1, 22)
        pos2 = find_star_pos(r2, 22)
        self.assertNotEqual(pos1, pos2,
                            "年支=7→天马3, 月支=8→天马11, 位置应不同")


# ============================================================
# 3. 安天空配置测试
# ============================================================

class TestTiankongConfig(unittest.TestCase):
    """
    天空安星：standard=命宫对宫逆1宫, shun_jia=命宫对宫+时辰-1
    shi_chen=8 时两者必然不同
    """

    def test_tiankong_standard(self):
        config = PaipanConfig(an_tiankong="standard")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        pos = find_star_pos(result, 36)
        self.assertIsNotNone(pos, "天空(36)应存在")

    def test_tiankong_shun_jia(self):
        config = PaipanConfig(an_tiankong="shun_jia")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        pos = find_star_pos(result, 36)
        self.assertIsNotNone(pos, "天空(36)应存在")

    def test_tiankong_standard_vs_shun_jia_diff(self):
        r1 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_tiankong="standard"))
        r2 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_tiankong="shun_jia"))
        pos1 = find_star_pos(r1, 36)
        pos2 = find_star_pos(r2, 36)
        self.assertNotEqual(pos1, pos2,
                            "shi_chen=8时, standard与shun_jia天空位置应不同")


# ============================================================
# 4. 安魁钺配置测试
# ============================================================

class TestKuiyueConfig(unittest.TestCase):
    """
    魁钺安星 4 种方法，庚年(7)和辛年(8)是关键区分点：
      method1(六辛逢虎马): 庚→[2,8], 辛→[3,7]
      method2(庚辛逢马虎): 庚→[3,7], 辛→[4,6]
      method3(庚辛逢虎马): 庚→[2,8], 辛→[3,7]
      method4(六辛逢马虎): 庚→[3,7], 辛→[4,6]
    """

    def test_kuiyue_method1(self):
        config = PaipanConfig(an_kuiyue=1)
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        kui = find_star_pos(result, 19)
        yue = find_star_pos(result, 20)
        self.assertIsNotNone(kui, "天魁(19)应存在")
        self.assertIsNotNone(yue, "天钺(20)应存在")

    def test_kuiyue_method2(self):
        config = PaipanConfig(an_kuiyue=2)
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        kui = find_star_pos(result, 19)
        yue = find_star_pos(result, 20)
        self.assertIsNotNone(kui)
        self.assertIsNotNone(yue)

    def test_kuiyue_method3(self):
        config = PaipanConfig(an_kuiyue=3)
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        kui = find_star_pos(result, 19)
        yue = find_star_pos(result, 20)
        self.assertIsNotNone(kui)
        self.assertIsNotNone(yue)

    def test_kuiyue_method4(self):
        config = PaipanConfig(an_kuiyue=4)
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        kui = find_star_pos(result, 19)
        yue = find_star_pos(result, 20)
        self.assertIsNotNone(kui)
        self.assertIsNotNone(yue)

    def test_kuiyue_geng_method1_vs_2(self):
        """庚年(7): method1→魁2, method2→魁3"""
        r1 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_kuiyue=1))
        r2 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_kuiyue=2))
        kui1 = find_star_pos(r1, 19)
        kui2 = find_star_pos(r2, 19)
        self.assertNotEqual(kui1, kui2, "庚年 method1 魁位≠method2 魁位")

    def test_kuiyue_xin_method1_vs_2(self):
        """辛年(8): method1→魁3, method2→魁4"""
        r1 = paipan(8, 8, 7, 15, 8, 1, config=PaipanConfig(an_kuiyue=1))
        r2 = paipan(8, 8, 7, 15, 8, 1, config=PaipanConfig(an_kuiyue=2))
        kui1 = find_star_pos(r1, 19)
        kui2 = find_star_pos(r2, 19)
        self.assertNotEqual(kui1, kui2, "辛年 method1 魁位≠method2 魁位")


# ============================================================
# 5. 安命主配置测试
# ============================================================

class TestMingzhuConfig(unittest.TestCase):
    """
    命主星：quanshu 按命宫地支查表, zhongzhou 按年支查表
    测试数据：year_zhi=7, month_zhi=8, shi_chen=8 → ming_gong_pos=3
      MINGZHU_TABLE[3]=21, MINGZHU_BY_YEAR[7]=14 → 不同
    """

    def test_mingzhu_quanshu(self):
        config = PaipanConfig(an_mingzhu="quanshu")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        self.assertGreater(result.mingzhu, 0, "命主星应大于0")

    def test_mingzhu_zhongzhou(self):
        config = PaipanConfig(an_mingzhu="zhongzhou")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        self.assertGreater(result.mingzhu, 0, "命主星应大于0")

    def test_mingzhu_quanshu_vs_zhongzhou(self):
        r1 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_mingzhu="quanshu"))
        r2 = paipan(7, 7, 7, 15, 8, 1, config=PaipanConfig(an_mingzhu="zhongzhou"))
        # ming_gong_pos=3 ≠ year_zhi=7, 所以命主星应不同
        self.assertNotEqual(r1.ming_gong_pos, r2.year_zhi,
                            "测试前提：命宫位应不等于年支")
        self.assertNotEqual(r1.mingzhu, r2.mingzhu,
                            "全书(命宫位3→21)与中州(年支7→14)命主星应不同")


# ============================================================
# 6. 长生十二神配置测试
# ============================================================

class TestChangshengConfig(unittest.TestCase):
    """
    长生十二神三种起法：yinyang/shuitu/huotu
    注：当前 _CHANGSHENG_SHEN 全为0（占位），位置不写入结果，
    因此仅验证配置被接受且排盘不报错，以及 config 正确存储。
    """

    def test_changsheng_yinyang(self):
        config = PaipanConfig(an_changsheng="yinyang")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        self.assertIsNotNone(result)
        self.assertEqual(result.config.an_changsheng, "yinyang")

    def test_changsheng_shuitu(self):
        config = PaipanConfig(an_changsheng="shuitu")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        self.assertIsNotNone(result)
        self.assertEqual(result.config.an_changsheng, "shuitu")

    def test_changsheng_huotu(self):
        config = PaipanConfig(an_changsheng="huotu")
        result = paipan(7, 7, 7, 15, 8, 1, config=config)
        self.assertIsNotNone(result)
        self.assertEqual(result.config.an_changsheng, "huotu")

    def test_changsheng_all_methods_valid(self):
        """三种长生方法都应产出有效排盘结果"""
        for method in ["yinyang", "shuitu", "huotu"]:
            config = PaipanConfig(an_changsheng=method)
            result = paipan(7, 7, 7, 15, 8, 1, config=config)
            self.assertEqual(result.year_gan, 7)
            self.assertEqual(result.year_zhi, 7)
            self.assertGreater(result.wuxing_ju, 0)
            self.assertEqual(len(result.gongs), 12)


# ============================================================
# 7. 闰月配置测试
# ============================================================

class TestRunYueConfig(unittest.TestCase):
    """
    闰月处理：lunar_month<0 表示闰月
      benyue  → abs(lunar_month) = 5
      xiayue  → abs(lunar_month) + 1 = 6
      yuezhong → abs(lunar_month) = 5（当前与 benyue 相同）
    """

    def test_run_yue_benyue(self):
        config = PaipanConfig(run_yue="benyue")
        result = paipan(7, 7, -5, 15, 8, 1, config=config)
        self.assertEqual(result.lunar_month, 5)

    def test_run_yue_xiayue(self):
        config = PaipanConfig(run_yue="xiayue")
        result = paipan(7, 7, -5, 15, 8, 1, config=config)
        self.assertEqual(result.lunar_month, 6)

    def test_run_yue_yuezhong(self):
        config = PaipanConfig(run_yue="yuezhong")
        result = paipan(7, 7, -5, 15, 8, 1, config=config)
        self.assertEqual(result.lunar_month, 5)

    def test_run_yue_benyue_vs_xiayue_diff(self):
        """benyue(5月)与xiayue(6月)排盘结果应不同"""
        r1 = paipan(7, 7, -5, 15, 8, 1, config=PaipanConfig(run_yue="benyue"))
        r2 = paipan(7, 7, -5, 15, 8, 1, config=PaipanConfig(run_yue="xiayue"))
        self.assertFalse(results_core_equal(r1, r2),
                         "闰月 benyue(5月)与 xiayue(6月)排盘结果应不同")

    def test_run_yue_benyue_equals_yuezhong(self):
        """当前实现中 benyue 与 yuezhong 行为一致"""
        r1 = paipan(7, 7, -5, 15, 8, 1, config=PaipanConfig(run_yue="benyue"))
        r2 = paipan(7, 7, -5, 15, 8, 1, config=PaipanConfig(run_yue="yuezhong"))
        self.assertTrue(results_core_equal(r1, r2),
                        "benyue 与 yuezhong 当前实现一致")


# ============================================================
# 8. 子时配置测试
# ============================================================

class TestZiShiConfig(unittest.TestCase):
    """
    子时处理：hour=23 时
      dang_ri → 日期不变（默认）
      ci_ri   → 日期+1天
    1990-06-15 23时 → ci_ri 变为 1990-06-16，农历日期不同
    """

    def test_zi_shi_dang_ri(self):
        config = PaipanConfig(zi_shi="dang_ri")
        result = paipan_from_solar(1990, 6, 15, 23, 1, config=config)
        self.assertIsNotNone(result)
        self.assertEqual(result.solar_day, 15)

    def test_zi_shi_ci_ri(self):
        config = PaipanConfig(zi_shi="ci_ri")
        result = paipan_from_solar(1990, 6, 15, 23, 1, config=config)
        self.assertIsNotNone(result)
        self.assertEqual(result.solar_day, 16)

    def test_zi_shi_dang_ri_vs_ci_ri_diff(self):
        r1 = paipan_from_solar(1990, 6, 15, 23, 1,
                               config=PaipanConfig(zi_shi="dang_ri"))
        r2 = paipan_from_solar(1990, 6, 15, 23, 1,
                               config=PaipanConfig(zi_shi="ci_ri"))
        self.assertFalse(results_core_equal(r1, r2),
                         "子时当日与次日排盘结果应不同")


# ============================================================
# 9. CLI --config 参数测试
# ============================================================

class TestCLIConfig(unittest.TestCase):
    """CLI 使用 --config 参数加载 JSON 配置文件"""

    def test_cli_with_config_file(self):
        """CLI 使用 --config 参数运行成功并输出有效 JSON"""
        config_dict = {"an_tianma": "month_zhi", "an_tiankong": "shun_jia"}
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False, encoding='utf-8'
        ) as f:
            json.dump(config_dict, f)
            config_path = f.name

        try:
            cli_path = os.path.join(os.path.dirname(__file__), 'paipan_cli.py')
            proc = subprocess.run(
                [sys.executable, cli_path, '1990', '6', '15', '14', '1',
                 '--config', config_path],
                capture_output=True, text=True, timeout=30,
            )
            self.assertEqual(proc.returncode, 0,
                             f"CLI 应成功退出, stderr: {proc.stderr}")
            output = json.loads(proc.stdout)
            self.assertIn("palaces", output, "输出应包含 palaces 字段")
        finally:
            os.unlink(config_path)

    def test_cli_config_affects_output(self):
        """使用非默认 config 的 CLI 输出应与默认输出不同"""
        # an_kuiyue=2 对庚年(7)产生不同魁钺位置，确保输出差异
        config_dict = {"an_kuiyue": 2}
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False, encoding='utf-8'
        ) as f:
            json.dump(config_dict, f)
            config_path = f.name

        try:
            cli_path = os.path.join(os.path.dirname(__file__), 'paipan_cli.py')
            # 默认输出
            r1 = subprocess.run(
                [sys.executable, cli_path, '1990', '6', '15', '14', '1'],
                capture_output=True, text=True, timeout=30,
            )
            # 使用 config 输出
            r2 = subprocess.run(
                [sys.executable, cli_path, '1990', '6', '15', '14', '1',
                 '--config', config_path],
                capture_output=True, text=True, timeout=30,
            )
            self.assertEqual(r1.returncode, 0)
            self.assertEqual(r2.returncode, 0)
            self.assertNotEqual(r1.stdout, r2.stdout,
                                "使用不同 config 的 CLI 输出应不同")
        finally:
            os.unlink(config_path)


# ============================================================
# 10. PaipanConfig 序列化测试
# ============================================================

class TestPaipanConfigSerialization(unittest.TestCase):
    """PaipanConfig 的 asdict / **dict 往返序列化"""

    def test_asdict_default(self):
        """默认 PaipanConfig 可被 asdict() 转换为字典"""
        config = PaipanConfig()
        d = asdict(config)
        self.assertIsInstance(d, dict)
        self.assertIn("an_tianma", d)
        self.assertEqual(d["an_tianma"], "year_zhi")
        self.assertIn("an_kuiyue", d)
        self.assertEqual(d["an_kuiyue"], 1)
        self.assertIn("run_yue", d)
        self.assertEqual(d["run_yue"], "yuezhong")

    def test_from_dict_default(self):
        """默认字典可通过 PaipanConfig(**d) 还原"""
        config = PaipanConfig()
        d = asdict(config)
        config2 = PaipanConfig(**d)
        self.assertEqual(config, config2)

    def test_roundtrip_custom(self):
        """自定义配置的序列化往返"""
        config = PaipanConfig(
            an_tianma="month_zhi",
            an_tiankong="shun_jia",
            an_kuiyue=3,
            an_mingzhu="zhongzhou",
            an_changsheng="shuitu",
            run_yue="xiayue",
            zi_shi="ci_ri",
        )
        d = asdict(config)
        config2 = PaipanConfig(**d)
        self.assertEqual(config, config2)
        self.assertEqual(config2.an_tianma, "month_zhi")
        self.assertEqual(config2.an_kuiyue, 3)
        self.assertEqual(config2.zi_shi, "ci_ri")

    def test_asdict_all_fields_present(self):
        """asdict 结果应包含所有配置字段"""
        config = PaipanConfig()
        d = asdict(config)
        expected_fields = [
            "an_tianma", "an_tiankong", "an_kuiyue", "an_mingzhu",
            "an_changsheng", "an_jkxk", "an_tianshi",
            "sihua_jia", "sihua_wu", "sihua_geng", "sihua_xin",
            "sihua_ren", "sihua_gui",
            "brightness_method", "run_yue", "zi_shi",
            "liunian_sihua", "xiaoxian_method", "skin",
        ]
        for field in expected_fields:
            self.assertIn(field, d, f"asdict 结果缺少字段: {field}")


if __name__ == "__main__":
    unittest.main()
