"""模块5: 格局判定引擎 v2 — 基于规则的判定

AS3 源码分析结论:
  - 输入: JSON {sex, tg, dz, sg, f3z4: [命宫, 财帛, 官禄, 迁移], stars, fuStars, sihua}
  - 判定: 12 个分类数组硬编码每个格局的匹配组合（500+ 行）
  - 输出: [[matched_ids_for_pan0], [for_pan1], [for_pan2]]
  - 渲染: geJuData_CHS[matched_id] → HTML

本实现: 手写 Top 30 高频格局的 Python 判定规则"""

import json, os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# 宫位名 → 索引
GONG_IDX = {"命宫": 1, "兄弟": 2, "夫妻": 3, "子女": 4,
            "财帛": 5, "疾厄": 6, "迁移": 7, "交友": 8,
            "官禄": 9, "田宅": 10, "福德": 11, "父母": 12,
            "身宫": 0}

# 地支 → 宫位索引 (命宫在寅=1)
DZ_TO_GONG = {"寅": 1, "卯": 2, "辰": 3, "巳": 4, "午": 5, "未": 6,
              "申": 7, "酉": 8, "戌": 9, "亥": 10, "子": 11, "丑": 12}

# 三方关系
SANFANG_MAP = {
    1: [5, 9], 2: [6, 10], 3: [7, 11], 4: [8, 12],
    5: [1, 9], 6: [2, 10], 7: [3, 11], 8: [4, 12],
    9: [1, 5], 10: [2, 6], 11: [3, 7], 12: [4, 8],
}

# 对宫关系
DUIGONG = {1: 7, 2: 8, 3: 9, 4: 10, 5: 11, 6: 12,
           7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 6}


class GejuEngine:
    """紫微斗数格局判定引擎（逆向自文墨天机 v2.0.15）"""

    def __init__(self):
        with open(os.path.join(DATA_DIR, "geju_database.json"), encoding="utf-8") as f:
            self.db = json.load(f)
        self.db_idx = {g["id"]: g for g in self.db}
        # 名称 → ID 快速索引
        self.name_idx = {g["name"]: g["id"] for g in self.db}

    def _add_rule(self, rules: list, name: str, reason: str):
        """通过格局名称添加判定结果（自动查找ID）"""
        gid = self.name_idx.get(name)
        if gid and not any(r[0] == gid for r in rules):
            rules.append((gid, reason))

    # ========= 核心入口 =========

    def match(self, chart: dict) -> dict:
        """匹配格局

        chart = {
            "sex": 1,           # 1=阳/男, 2=阴/女
            "tg": 1,            # 年干: 甲1...癸10
            "dz_int": 1,        # 年支: 子1...亥12
            "ming_gong": 1,     # 命宫位 1-12 (地支寅=1)
            "shen_gong": 7,     # 身宫位 1-12
            "stars": {"紫微": 3, "天机": 5, ...},   # 14主星 → 宫位
            "fu_stars": {"文昌": 7, "左辅": 3, ...},  # 辅星 → 宫位
            "sihua": {          # 十天干四化
                "化禄": "廉贞", "化权": "破军",
                "化科": "武曲", "化忌": "太阳",
            },
        }
        """
        matched = []

        # 快速索引
        mg = chart.get("ming_gong", 1)      # 命宫
        sg = chart.get("shen_gong", 0)      # 身宫
        stars = chart.get("stars", {})
        fu = chart.get("fu_stars", {})
        tg = chart.get("tg", 1)
        dz = chart.get("dz_int", 1)
        sex = chart.get("sex", 1)
        sihua = chart.get("sihua", {})

        # 三方四正宫位
        sf = [mg] + SANFANG_MAP.get(mg, [])  # 命宫三方
        dg = DUIGONG.get(mg, 7)              # 命宫对宫
        sizheng = sf + [dg]                  # 四正

        # 便捷函数
        def in_gong(gong_idx: int) -> set:
            """返回该宫所有星"""
            s = set()
            for name, g in stars.items():
                if g == gong_idx:
                    s.add(name)
            for name, g in fu.items():
                if g == gong_idx:
                    s.add(name)
            return s

        def in_any_gong(*gongs) -> set:
            """返回多个宫的并集"""
            s = set()
            for g in gongs:
                s |= in_gong(g)
            return s

        def has_star(star_name: str, *gongs) -> bool:
            return any(star_name in in_gong(g) for g in gongs)

        def has_all_stars(*star_names, gongs=None) -> bool:
            if gongs is None:
                gongs = [mg]
            s = in_any_gong(*gongs)
            return all(n in s for n in star_names)

        def nian_gan_is(*gans) -> bool:
            gan_names = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
            return any(gan_names[tg - 1] == g for g in gans)

        def nian_zhi_is(*zhis) -> bool:
            zhi_names = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
            return any(zhi_names[dz - 1] == z for z in zhis)

        def is_male() -> bool: return sex == 1
        def is_yang() -> bool: return tg % 2 == 1

        # ---- 格局判定规则 ----
        rules = []

        # ---- 吉格 ----

        # 1. 紫府同宫格: 紫微天府同在命宫
        if has_all_stars("紫微", "天府"):
            self._add_rule(rules, "紫府同宫格", "紫微天府同在命宫")

        # 2. 紫府朝垣格: 紫微天府在三方四正
        if has_star("紫微", *sizheng) and has_star("天府", *sizheng):
            self._add_rule(rules, "紫府朝垣格", "紫微天府在三方四正")

        # 3. 府相朝垣格: 天府天相在三方
        if has_star("天府", *sf) and has_star("天相", *sf):
            self._add_rule(rules, "府相朝垣格", "天府天相在三方")

        # 4. 日月并明格: 太阳太阴俱在庙旺
        sun_wang = [4, 5, 7, 9]  # 巳午未申
        moon_wang = [8, 9, 10, 11]  # 酉戌亥子
        if any(has_star("太阳", g) for g in sun_wang) and any(has_star("太阴", g) for g in moon_wang):
            self._add_rule(rules, "日月并明格", "太阳太阴俱在庙旺")

        # 5. 日月同宫格: 太阳太阴同宫
        if has_all_stars("太阳", "太阴"):
            self._add_rule(rules, "日月同宫格", "太阳太阴同宫")

        # 6. 日月照壁格: 太阳太阴照田宅三方
        if has_star("太阳", *sf) and has_star("太阴", *sf):
            self._add_rule(rules, "日月照壁格", "太阳太阴照田宅三方")

        # 7. 七杀朝斗格: 七杀在子午寅申
        if has_star("七杀", 1, 5, 9, 11):
            self._add_rule(rules, "七杀朝斗格", "七杀在子午寅申")

        # 8. 极向离明格: 紫微坐午宫
        if has_star("紫微", 5):
            self._add_rule(rules, "极向离明格", "紫微坐午宫")

        # 9. 将星得地格: 武曲庙旺
        wq_wang = [2, 3, 7, 9, 10, 12]
        if any(has_star("武曲", g) for g in wq_wang):
            self._add_rule(rules, "将星得地格", "武曲庙旺")

        # 10. 贪武同行格: 武曲贪狼同宫
        if has_all_stars("贪狼", "武曲"):
            self._add_rule(rules, "贪武同行格", "武曲贪狼同宫")

        # 11. 三合火贪格: 贪狼火星同在命宫三方
        if has_all_stars("贪狼", "火星", gongs=sizheng):
            self._add_rule(rules, "三合火贪格", "贪狼火星同在命宫三方")

        # 12. 贪铃朝垣格: 贪狼铃星同在命宫三方
        if has_all_stars("贪狼", "铃星", gongs=sizheng):
            self._add_rule(rules, "贪铃朝垣格", "贪狼铃星同在命宫三方")

        # 13. 科名会禄格: 三奇嘉会
        hua_stars = {v for v in sihua.values() if v}
        hua_stars_in_sizheng = [s for s in hua_stars if has_star(s, *sizheng)]
        if len(hua_stars_in_sizheng) >= 3:
            self._add_rule(rules, "科名会禄格", f"三奇嘉会({', '.join(hua_stars_in_sizheng)}在四正)")

        # 14. 权禄巡逢格: 权禄巡逢
        hl_star = sihua.get("化禄", "")
        hq_star = sihua.get("化权", "")
        if hl_star and hq_star and has_star(hl_star, *sizheng) and has_star(hq_star, *sizheng):
            self._add_rule(rules, "权禄巡逢格", f"权禄巡逢({hl_star}禄+{hq_star}权)")
        elif hl_star and hq_star and len(hua_stars_in_sizheng) >= 3:
            self._add_rule(rules, "科名会禄格", f"三奇嘉会({', '.join(hua_stars_in_sizheng)}在四正)")

        # 15. 科权禄夹格: 科权夹命
        prev_gong = ((mg - 2) % 12) + 1
        next_gong = (mg % 12) + 1
        jia_stars = in_gong(prev_gong) | in_gong(next_gong)
        hk_star = sihua.get("化科", "")
        if hk_star and hq_star and hk_star in jia_stars and hq_star in jia_stars:
            self._add_rule(rules, "科权禄夹格", "科权夹命")

        # 16. 禄马交驰格: 禄马交驰
        if (has_all_stars("禄存", "天马") or
                (has_star("禄存", mg) and has_star("天马", dg)) or
                (has_star("天马", mg) and has_star("禄存", dg))):
            self._add_rule(rules, "禄马交驰格", "禄马交驰")

        # 17. 禄合鸳鸯格: 禄存+化禄同宫
        if has_star("禄存", mg):
            for h_type, h_star in sihua.items():
                if h_type == "化禄" and h_star in in_gong(mg):
                    self._add_rule(rules, "禄合鸳鸯格", f"禄合鸳鸯(禄存+{h_star}化禄同宫)")
                    break

        # 18. 左右同宫格: 左辅右弼同宫
        if has_all_stars("左辅", "右弼"):
            self._add_rule(rules, "左右同宫格", "左辅右弼同宫")

        # 19. 文桂文华格: 文昌文曲同宫
        if has_all_stars("文昌", "文曲"):
            self._add_rule(rules, "文桂文华格", "文昌文曲同宫")

        # 20. 双禄朝垣格: 双禄
        if has_star("禄存", mg):
            for h_type, h_star in sihua.items():
                if h_type == "化禄" and h_star in in_gong(*sf):
                    self._add_rule(rules, "双禄朝垣格", f"双禄({h_star}+禄存)")
                    break

        # 21. 擎羊入庙格: 擎羊守墓库
        if has_star("擎羊", 3, 5, 9, 11):
            self._add_rule(rules, "擎羊入庙格", "擎羊守墓库")

        # 22. 马头带箭格: 擎羊+贪狼/天同在午，丙戊年生人
        if has_star("擎羊", 5):
            if nian_gan_is("丙", "戊") and (has_star("天同", 5) or has_star("贪狼", 5)):
                star_in_mg = "贪狼" if has_star("贪狼", 5) else "天同"
                self._add_rule(rules, "马头带箭格", f"擎羊+{star_in_mg}在午，{('丙' if tg==3 else '戊')}年生人")

        # 23. 巨机同临格: 巨门天机同在卯宫
        if has_all_stars("巨门", "天机") and (stars.get("巨门") == 2 or stars.get("天机") == 2):
            self._add_rule(rules, "巨机同临格", "巨门天机同在卯宫")

        # 24. 紫府夹命格: 紫微天府夹命
        if "紫微" in jia_stars and "天府" in jia_stars:
            self._add_rule(rules, "紫府夹命格", "紫微天府夹命")

        # 25. 日月夹命格: 太阳太阴夹命
        if "太阳" in jia_stars and "太阴" in jia_stars:
            self._add_rule(rules, "日月夹命格", "太阳太阴夹命")

        # 26. 左右夹命格: 左辅右弼夹命
        if "左辅" in jia_stars and "右弼" in jia_stars:
            self._add_rule(rules, "左右夹命格", "左辅右弼夹命")

        # 27. 昌曲夹命格: 文昌文曲夹命
        if "文昌" in jia_stars and "文曲" in jia_stars:
            self._add_rule(rules, "昌曲夹命格", "文昌文曲夹命")

        # 28. 坐贵向贵格: 甲戊庚年生，魁钺在丑未
        if nian_gan_is("甲", "戊", "庚") and mg in [2, 8]:
            self._add_rule(rules, "坐贵向贵格", "甲戊庚年生，魁钺在丑未")

        # ---- 新增吉格 ----

        # 29. 机月同梁格: 天机太阴天同天梁在命宫三方四正会齐
        if (has_star("天机", *sizheng) and has_star("太阴", *sizheng) and
                has_star("天同", *sizheng) and has_star("天梁", *sizheng)):
            self._add_rule(rules, "机月同梁格", "天机太阴天同天梁会齐三方四正")

        # 30. 机梁加会格: 天机天梁在命宫三方四正会齐
        if has_star("天机", *sizheng) and has_star("天梁", *sizheng):
            self._add_rule(rules, "机梁加会格", "天机天梁会照命宫三方四正")

        # 31. 文梁振纪格: 文昌/文曲与天梁在命宫或对宫
        if ((has_star("文昌", mg) or has_star("文曲", mg)) and has_star("天梁", mg)):
            self._add_rule(rules, "文梁振纪格", "文昌/文曲与天梁同宫守命")
        elif ((has_star("文昌", dg) or has_star("文曲", dg)) and has_star("天梁", dg)):
            self._add_rule(rules, "文梁振纪格", "文昌/文曲与天梁在对宫")
        elif (has_star("文昌", mg) or has_star("文曲", mg)) and has_star("天梁", dg):
            self._add_rule(rules, "文梁振纪格", "文昌/文曲守命，天梁在对宫")
        elif (has_star("文昌", dg) or has_star("文曲", dg)) and has_star("天梁", mg):
            self._add_rule(rules, "文梁振纪格", "天梁守命，文昌/文曲在对宫")

        # 32. 巨日同宫格: 巨门太阳同宫在寅/申/卯/酉
        if has_all_stars("巨门", "太阳") and stars.get("巨门") in [1, 7, 2, 8]:
            gong_name = {1: "寅", 7: "申", 2: "卯", 8: "酉"}.get(stars.get("巨门"), "")
            self._add_rule(rules, "巨日同宫格", f"巨门太阳同在{gong_name}宫")

        # 33. 金灿光辉格: 太阳在午宫守命
        if has_star("太阳", 5):
            self._add_rule(rules, "金灿光辉格", "太阳在午宫守命")

        # 34. 日照雷门格: 太阳在卯宫守命
        if has_star("太阳", 2):
            self._add_rule(rules, "日照雷门格", "太阳在卯宫守命")

        # 35. 阳梁昌禄格: 太阳天梁文昌化禄在命宫三方四正
        if (has_star("太阳", *sizheng) and has_star("天梁", *sizheng) and
                (has_star("文昌", *sizheng) or has_star("文曲", *sizheng)) and
                has_star("禄存", *sizheng)):
            self._add_rule(rules, "阳梁昌禄格", "太阳天梁昌禄会照命宫三方四正")

        # 36. 明珠出海格: 太阳在卯宫，太阴在亥宫
        if has_star("太阳", 2) and has_star("太阴", 10):
            self._add_rule(rules, "明珠出海格", "太阳在卯，太阴在亥")

        # 37. 月朗天门格: 太阴在亥宫守命
        if has_star("太阴", 10):
            self._add_rule(rules, "月朗天门格", "太阴在亥宫守命")

        # 38. 月生沧海格: 太阴在子宫守命
        if has_star("太阴", 11):
            self._add_rule(rules, "月生沧海格", "太阴在子宫守命")

        # 39. 寿星入庙格: 天梁在子/午/寅/申庙旺守命
        if has_star("天梁", 1, 5, 9, 11):
            gong_name = {1: "寅", 5: "午", 9: "戌", 11: "子"}.get(stars.get("天梁", 0), "")
            self._add_rule(rules, "寿星入庙格", f"天梁在{gong_name}宫庙旺守命")

        # 40. 英星入庙格: 破军在子/午守命（据database定义）
        if has_star("破军", 11, 5):
            gong_name = {11: "子", 5: "午"}.get(stars.get("破军", 0), "")
            self._add_rule(rules, "英星入庙格", f"破军在{gong_name}宫守命")

        # 41. 石中隐玉格: 巨门在子/午守命
        if has_star("巨门", 11, 5):
            gong_name = {11: "子", 5: "午"}.get(stars.get("巨门", 0), "")
            self._add_rule(rules, "石中隐玉格", f"巨门在{gong_name}宫守命")

        # 42. 天乙拱命格: 天魁天钺在命宫三方四正
        if has_star("天魁", *sizheng) and has_star("天钺", *sizheng):
            self._add_rule(rules, "天乙拱命格", "天魁天钺会照命宫三方四正")

        # 43. 双禄夹命格: 化禄和禄存夹命宫
        if has_star("禄存", prev_gong, next_gong) and hl_star and hl_star in jia_stars:
            self._add_rule(rules, "双禄夹命格", "禄存与化禄夹命")
        elif has_star("禄存", prev_gong, next_gong) and hl_star and has_star(hl_star, prev_gong, next_gong):
            self._add_rule(rules, "双禄夹命格", "禄存与化禄夹命")

        # 44. 魁钺夹命格: 天魁天钺夹命宫
        if "天魁" in jia_stars and "天钺" in jia_stars:
            self._add_rule(rules, "魁钺夹命格", "天魁天钺夹命")

        # 45. 廉贞文武格: 廉贞与文昌/文曲同宫或会照
        if has_star("廉贞", mg) and (has_star("文昌", *sizheng) or has_star("文曲", *sizheng)):
            self._add_rule(rules, "廉贞文武格", "廉贞与昌曲同宫或会照")

        # 46. 权煞化禄格: 煞星坐命入庙且有化禄会照
        sha_in_mg = has_star("擎羊", mg) or has_star("陀罗", mg) or has_star("火星", mg) or has_star("铃星", mg)
        if sha_in_mg and hl_star and has_star(hl_star, *sizheng):
            sha_name = ""
            if has_star("擎羊", mg): sha_name = "擎羊"
            elif has_star("陀罗", mg): sha_name = "陀罗"
            elif has_star("火星", mg): sha_name = "火星"
            elif has_star("铃星", mg): sha_name = "铃星"
            self._add_rule(rules, "权煞化禄格", f"{sha_name}坐命入庙，化禄会照")

        # 47. 雄宿朝垣格: 廉贞在未/申宫守命
        if has_star("廉贞", 6, 7):
            gong_name = {6: "未", 7: "申"}.get(stars.get("廉贞", 0), "")
            self._add_rule(rules, "雄宿朝垣格", f"廉贞在{gong_name}宫守命")

        # 48. 辅拱文星格: 文昌/文曲守命，左辅/右弼拱照
        if (has_star("文昌", mg) or has_star("文曲", mg)) and (has_star("左辅", *sizheng) or has_star("右弼", *sizheng)):
            wen_star = "文昌" if has_star("文昌", mg) else "文曲"
            self._add_rule(rules, "辅拱文星格", f"{wen_star}守命，辅弼拱照")

        # 49. 禄文拱命格: 禄存守命，三方四正得昌曲拱冲
        if has_star("禄存", mg) and (has_star("文昌", *sf) or has_star("文曲", *sf)):
            self._add_rule(rules, "禄文拱命格", "禄存守命，昌曲拱照")

        # 50. 禄马佩印格: 禄存/化禄与天马天相同宫或会照
        lu_in_sizheng = has_star("禄存", *sizheng) or (hl_star and has_star(hl_star, *sizheng))
        if lu_in_sizheng and has_star("天马", *sizheng) and has_star("天相", *sizheng):
            self._add_rule(rules, "禄马佩印格", "禄存/化禄与天马天相会照")

        # 51. 二曜同临格: 安命丑宫日月在未，或安命未宫日月在丑
        if mg == 2 and has_star("太阳", 8) and has_star("太阴", 8):
            self._add_rule(rules, "二曜同临格", "命在丑，日月同在未")
        elif mg == 8 and has_star("太阳", 2) and has_star("太阴", 2):
            self._add_rule(rules, "二曜同临格", "命在未，日月同在丑")

        # 52. 丹墀桂墀格: 太阳在辰/巳守命，太阴在酉/戌守命
        if has_star("太阳", 3, 4):
            gong_name = {3: "辰", 4: "巳"}.get(stars.get("太阳", 0), "")
            self._add_rule(rules, "丹墀桂墀格", f"太阳在{gong_name}宫守命")
        if has_star("太阴", 8, 9):
            gong_name = {8: "酉", 9: "戌"}.get(stars.get("太阴", 0), "")
            self._add_rule(rules, "丹墀桂墀格", f"太阴在{gong_name}宫守命")

        # 53. 甲第登庸格: 化科在命宫，化权在三方朝
        if hk_star and has_star(hk_star, mg) and hq_star and has_star(hq_star, *sf):
            self._add_rule(rules, "甲第登庸格", f"化科({hk_star})守命，化权({hq_star})三方朝")

        # 54. 化星返贵格: 天同在戌宫丁年生，或巨门在辰宫辛年生
        if has_star("天同", 12) and nian_gan_is("丁"):
            self._add_rule(rules, "化星返贵格", "天同在戌宫，丁年生人")
        if has_star("巨门", 3) and nian_gan_is("辛"):
            self._add_rule(rules, "化星返贵格", "巨门在辰宫，辛年生人")

        # 55. 财禄夹马格: 化禄/禄存夹天马
        if has_star("天马", mg):
            ma_prev = in_gong(prev_gong)
            ma_next = in_gong(next_gong)
            lu_in_jia = "禄存" in ma_prev or "禄存" in ma_next
            hua_lu_in_jia = hl_star and (hl_star in ma_prev or hl_star in ma_next)
            if lu_in_jia and hua_lu_in_jia:
                self._add_rule(rules, "财禄夹马格", "禄存与化禄夹天马守命")

        # 56. 明禄暗禄格: 命宫有化禄/禄存，暗合宫有禄存/化禄
        # 暗合: 子丑合, 寅亥合, 卯戌合, 辰酉合, 巳申合, 午未合
        anhe_map = {1: 12, 2: 11, 3: 10, 4: 9, 5: 8, 6: 7,
                    7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1}
        anhe_gong = anhe_map.get(mg, 0)
        if anhe_gong:
            mg_has_lu = has_star("禄存", mg) or (hl_star and has_star(hl_star, mg))
            anhe_has_lu = has_star("禄存", anhe_gong) or (hl_star and has_star(hl_star, anhe_gong))
            if mg_has_lu and anhe_has_lu:
                self._add_rule(rules, "明禄暗禄格", "命宫与暗合宫皆有禄")

        # 57. 科明禄暗格: 化科守命宫，暗合宫有禄存
        if hk_star and has_star(hk_star, mg) and anhe_gong and has_star("禄存", anhe_gong):
            self._add_rule(rules, "科明禄暗格", f"化科({hk_star})守命，暗合宫有禄存")

        # 58. 文星拱命格: 文昌文曲在命宫三方四正
        if has_star("文昌", *sizheng) and has_star("文曲", *sizheng):
            self._add_rule(rules, "文星拱命格", "文昌文曲会照命宫三方四正")

        # 59. 财荫夹印格: 天相被化禄和天梁夹
        if has_star("天相", mg):
            tx_prev = in_gong(prev_gong)
            tx_next = in_gong(next_gong)
            has_liang_jia = "天梁" in tx_prev or "天梁" in tx_next
            has_hualu_jia = (hl_star and (hl_star in tx_prev or hl_star in tx_next)) or ("禄存" in tx_prev or "禄存" in tx_next)
            if has_liang_jia and has_hualu_jia:
                self._add_rule(rules, "财荫夹印格", "天相被天梁与化禄/禄存夹")

        # 60. 君臣庆会格: 紫微在命宫，左辅右弼会照
        if has_star("紫微", mg) and (has_star("左辅", *sizheng) or has_star("右弼", *sizheng)):
            self._add_rule(rules, "君臣庆会格", "紫微守命，辅弼会照")

        # ---- 凶格 ----

        # 61. 极居卯酉格: 紫微贪狼在卯酉
        if has_all_stars("紫微", "贪狼") and (stars.get("紫微") in [2, 8]):
            self._add_rule(rules, "极居卯酉格", "紫微贪狼在卯酉")

        # 62. 命无正曜格: 命宫无十四主星
        main_stars = {"紫微", "天机", "太阳", "武曲", "天同", "廉贞",
                       "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
                       "七杀", "破军"}
        mg_main = {s for s in in_gong(mg) if s in main_stars}
        if not mg_main:
            self._add_rule(rules, "命无正曜格", "命宫无十四主星")

        # 63. 命里逢空格: 地空地劫在命
        if has_star("地空", mg) or has_star("地劫", mg):
            self._add_rule(rules, "命里逢空格", "地空地劫在命")

        # 64. 空劫夹命格: 地空地劫夹命
        if "地空" in jia_stars and "地劫" in jia_stars:
            self._add_rule(rules, "空劫夹命格", "地空地劫夹命")

        # 65. 火铃夹命格: 火星铃星夹命
        if "火星" in jia_stars and "铃星" in jia_stars:
            self._add_rule(rules, "火铃夹命格", "火星铃星夹命")

        # 66. 贞杀同宫格: 廉贞七杀同宫
        if has_all_stars("廉贞", "七杀"):
            self._add_rule(rules, "贞杀同宫格", "廉贞七杀同宫")

        # 67. 刑囚夹印格: 廉贞天相擎羊同宫
        if has_all_stars("廉贞", "天相") and has_star("擎羊", mg):
            self._add_rule(rules, "刑囚夹印格", "廉贞天相擎羊同宫")

        # 68. 日月反背格: 日月反背
        if has_star("太阳", 10, 9) and has_star("太阴", 2, 3):
            self._add_rule(rules, "日月反背格", "日月反背")

        # 69. 禄逢冲破格: 禄存被空劫冲破
        if has_star("禄存", mg) and (has_star("地空", mg) or has_star("地劫", mg)):
            self._add_rule(rules, "禄逢冲破格", "禄存被空劫冲破")

        # 70. 羊陀夹忌格: 羊陀夹化忌
        hj_star = sihua.get("化忌", "")
        if hj_star and has_star(hj_star, mg) and has_star("擎羊", prev_gong) and has_star("陀罗", next_gong):
            self._add_rule(rules, "羊陀夹忌格", "羊陀夹化忌")

        # 71. 天机巳亥格: 天机在巳亥
        if has_star("天机", 4, 10):
            self._add_rule(rules, "天机巳亥格", "天机在巳亥")

        # 72. 巨机化酉格: 巨门天机在酉宫
        if has_all_stars("天机", "巨门") and (stars.get("天机") == 8 or stars.get("巨门") == 8):
            self._add_rule(rules, "巨机化酉格", "巨门天机在酉宫")

        # ---- 新增凶格 ----

        # 73. 马头带剑格: 擎羊在午宫守命（凶格版，区别于吉格马头带箭格）
        if has_star("擎羊", 5) and not (nian_gan_is("丙", "戊") and (has_star("天同", 5) or has_star("贪狼", 5))):
            self._add_rule(rules, "马头带剑格", "擎羊在午宫守命")

        # 74. 梁马飘荡格: 天梁天马在命宫或对宫
        if has_star("天梁", mg) and has_star("天马", mg):
            self._add_rule(rules, "梁马飘荡格", "天梁天马同在命宫")
        elif has_star("天梁", mg) and has_star("天马", dg):
            self._add_rule(rules, "梁马飘荡格", "天梁守命，天马在对宫")
        elif has_star("天梁", dg) and has_star("天马", dg):
            self._add_rule(rules, "梁马飘荡格", "天梁天马同在对宫")

        # 75. 巨逢四煞格: 巨门与四煞同宫或会照
        if has_star("巨门", mg):
            sha_count = sum(1 for s in ["擎羊", "陀罗", "火星", "铃星"] if has_star(s, *sizheng))
            if sha_count >= 2:
                sha_names = [s for s in ["擎羊", "陀罗", "火星", "铃星"] if has_star(s, *sizheng)]
                self._add_rule(rules, "巨逢四煞格", f"巨门守命，逢{'+'.join(sha_names)}")

        # 76. 文星遇夹格: 文昌/文曲被空劫夹
        if has_star("文昌", mg) and "地空" in jia_stars and "地劫" in jia_stars:
            self._add_rule(rules, "文星遇夹格", "文昌守命被空劫夹")
        elif has_star("文曲", mg) and "地空" in jia_stars and "地劫" in jia_stars:
            self._add_rule(rules, "文星遇夹格", "文曲守命被空劫夹")

        # 77. 羊陀夹命格: 擎羊陀罗夹命宫
        if "擎羊" in jia_stars and "陀罗" in jia_stars:
            self._add_rule(rules, "羊陀夹命格", "擎羊陀罗夹命")

        # 78. 刑忌夹印格: 天相被化忌和天梁/擎羊夹
        if has_star("天相", mg):
            xj_prev = in_gong(prev_gong)
            xj_next = in_gong(next_gong)
            has_hj_jia = hj_star and (hj_star in xj_prev or hj_star in xj_next)
            has_liang_jia_xj = "天梁" in xj_prev or "天梁" in xj_next
            has_qy_jia_xj = "擎羊" in xj_prev or "擎羊" in xj_next
            if has_hj_jia and has_liang_jia_xj:
                self._add_rule(rules, "刑忌夹印格", "天相被化忌与天梁夹")
            elif has_hj_jia and has_qy_jia_xj:
                self._add_rule(rules, "刑忌夹印格", "天相被化忌与擎羊夹")

        # 79. 马落空亡格: 天马与地空/地劫同宫
        if has_star("天马", mg) and (has_star("地空", mg) or has_star("地劫", mg)):
            kong_star = "地空" if has_star("地空", mg) else "地劫"
            self._add_rule(rules, "马落空亡格", f"天马与{kong_star}同宫")

        # 80. 两重华盖格: 禄存化禄同坐命遇地空地劫
        if has_star("禄存", mg) and hl_star and has_star(hl_star, mg) and (has_star("地空", mg) or has_star("地劫", mg)):
            self._add_rule(rules, "两重华盖格", "禄存化禄同宫遇空劫")

        # 81. 泛水桃花格: 贪狼在子/亥守命，有煞星会照
        if has_star("贪狼", 11, 10):
            sha_near = any(has_star(s, *sizheng) for s in ["擎羊", "陀罗", "火星", "铃星"])
            if sha_near:
                gong_name = {11: "子", 10: "亥"}.get(stars.get("贪狼", 0), "")
                self._add_rule(rules, "泛水桃花格", f"贪狼在{gong_name}宫守命，逢煞星")

        # 82. 风流彩杖格: 贪狼在寅/卯/酉守命，遇陀罗同宫
        if has_star("贪狼", 1, 2, 8) and has_star("陀罗", mg):
            gong_name = {1: "寅", 2: "卯", 8: "酉"}.get(stars.get("贪狼", 0), "")
            self._add_rule(rules, "风流彩杖格", f"贪狼在{gong_name}宫，遇陀罗同宫")

        # ---- 汇总 ----
        details = []
        for geju_id, reason in rules:
            g = self.db_idx.get(geju_id)
            if g:
                details.append({
                    "id": geju_id,
                    "name": g["name"],
                    "category": g["category"],
                    "reason": reason,
                    "confidence": 1.0,
                    "description": g["description"],
                    "example": g["example"],
                })
                matched.append(geju_id)

        return {"matched": matched, "details": details}


# ===== HTML 渲染 =====
def render_geju_html(match_result: dict) -> str:
    details = match_result.get("details", [])
    if not details:
        return '<div class="geju-empty"><p>未发现特殊格局。</p></div>'

    html = ['<div class="geju-results">']
    cat_order = ["吉格", "杂格", "凶格"]
    cat_icons = {"吉格": "✅", "凶格": "⚠️", "杂格": "ℹ️"}

    for cat in cat_order:
        items = [d for d in details if d["category"] == cat]
        if not items:
            continue
        html.append(f'<h4 class="geju-cat">{cat_icons.get(cat,"")} {cat} ({len(items)}个)</h4>')
        for d in items:
            desc = d.get("description", "")[:300]
            example = d.get("example", "")
            html.append(f'<div class="geju-item">')
            html.append(f'  <h5>{d["name"]}</h5>')
            html.append(f'  <p class="reason"><strong>判定依据：</strong>{d["reason"]}</p>')
            if desc:
                html.append(f'  <p class="desc">{desc}</p>')
            if example:
                html.append(f'  <p class="example"><em>案例：{example[:200]}...</em></p>')
            html.append(f'</div>')

    html.append('</div>')
    return '\n'.join(html)


# ===== 测试 =====
if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

    # 测试1: 紫微天府同宫(寅)
    chart1 = {
        "sex": 1, "tg": 1, "dz_int": 3, "ming_gong": 1, "shen_gong": 7,
        "stars": {"紫微": 1, "天府": 1, "贪狼": 7, "武曲": 9,
                  "天机": 5, "巨门": 3, "太阳": 11, "太阴": 5,
                  "天同": 3, "廉贞": 9, "天相": 11, "天梁": 1,
                  "七杀": 7, "破军": 9},
        "fu_stars": {"文昌": 2, "文曲": 8, "左辅": 1, "右弼": 7,
                      "天魁": 3, "天钺": 9, "禄存": 5, "火星": 5},
        "sihua": {"化禄": "廉贞", "化权": "破军", "化科": "武曲", "化忌": "太阳"},
    }
    print("=== 测试1: 紫微天府同宫，甲年生 ===")
    eng = GejuEngine()
    r = eng.match(chart1)
    for d in r["details"]:
        print(f'  [{d["id"]:2d}] {d["name"]:10s} ({d["category"]}) | {d["reason"]}')
    print(f"  匹配: {len(r['matched'])} 格局")

    # 测试2: 命无正曜
    chart2 = {
        "sex": 2, "tg": 5, "dz_int": 7, "ming_gong": 5, "shen_gong": 3,
        "stars": {"紫微": 9, "天府": 11, "贪狼": 3, "武曲": 7,
                  "天机": 11, "巨门": 1, "太阳": 7, "太阴": 9,
                  "天同": 1, "廉贞": 3, "天相": 5, "天梁": 9,
                  "七杀": 11, "破军": 1},
        "fu_stars": {"擎羊": 5, "地空": 5},
        "sihua": {"化禄": "贪狼", "化权": "太阴", "化科": "右弼", "化忌": "天机"},
    }
    print("\n=== 测试2: 命宫无主星 + 擎羊入庙 ===")
    r2 = eng.match(chart2)
    for d in r2["details"]:
        print(f'  [{d["id"]:2d}] {d["name"]:10s} ({d["category"]}) | {d["reason"]}')
    print(f"  匹配: {len(r2['matched'])} 格局")

    html = render_geju_html(r)
    print(f"\n  HTML: {len(html)} 字符")