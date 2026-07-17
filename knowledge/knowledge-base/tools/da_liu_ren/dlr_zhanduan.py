"""
大六壬断语规则模块
来源：大六壬银河棹正附集 + 六壬大全 + 大六壬指南

分类占断规则：
1. 天时门 - 占天气
2. 人宅门 - 占家宅
3. 身命门 - 占命运
4. 婚姻门 - 占婚姻
5. 求财门 - 占财运
6. 行人门 - 占行人
7. 疾病门 - 占疾病
8. 官禄门 - 占官运
9. 讼狱门 - 占诉讼
"""

from typing import Dict, List, Tuple, Optional
from .dlr_basic import DLRBasicTools


class DLRZhanduan:
    """大六壬断语判断器"""
    
    TIANJIANG_JIXIONG = {
        "贵人": "吉", "螣蛇": "凶", "朱雀": "凶", "六合": "吉",
        "勾陈": "凶", "青龙": "吉", "天空": "凶", "白虎": "大凶",
        "太常": "吉", "玄武": "凶", "太阴": "吉", "天后": "吉"
    }
    
    TIANJIANG_WUXING = {
        "贵人": "土", "螣蛇": "火", "朱雀": "火", "六合": "木",
        "勾陈": "土", "青龙": "木", "天空": "土", "白虎": "金",
        "太常": "土", "玄武": "水", "太阴": "金", "天后": "水"
    }
    
    TIANJIANG_MEANING = {
        "贵人": "主宰、升迁、贵人相助",
        "螣蛇": "惊忧、虚惊、怪异、缠绕",
        "朱雀": "口舌、文书、信息、是非",
        "六合": "和合、婚姻、交易、媒介",
        "勾陈": "争斗、田宅、迟滞、阻碍",
        "青龙": "喜庆、财货、吉庆、升迁",
        "天空": "虚耗、欺诈、空亡、不实",
        "白虎": "凶丧、疾病、血光、道路",
        "太常": "宴乐、酒食、常事、印信",
        "玄武": "盗贼、失脱、阴私、暗昧",
        "太阴": "隐秘、谋事、阴佑、妇女",
        "天后": "阴私、妇女、恩泽、婚姻"
    }
    
    ZHAN_TIANSHI = {
        "青龙乘水": "主大雨",
        "青龙乘木": "主小雨",
        "青龙乘火": "主晴雨相间",
        "白虎乘金": "主大风",
        "白虎乘木": "主微风",
        "白虎乘火": "主风中有雷",
        "朱雀乘火": "主大雷",
        "朱雀乘木": "主小雷",
        "朱雀乘水": "主雷中有雨",
        "玄武乘水": "主乌云密布",
        "玄武乘土": "主多云",
        "玄武乘金": "主云散",
        "天空乘土": "主晴朗无云",
        "天空乘金": "主晴中有风",
        "天后乘水": "主阴天",
        "天后乘土": "主阴中有雨"
    }
    
    ZHAN_JIAZHAI = {
        "日支乘吉神": "主家宅平安，人口兴旺",
        "日支乘凶神": "主家宅不宁，有灾祸",
        "三传生合日支": "主家宅兴隆，添丁进口",
        "三传克害日支": "主家宅衰败，人口离散",
        "日支空亡": "主家宅空虚，或有迁移之兆"
    }
    
    ZHAN_SHENGMING = {
        "日干乘吉神": "主一生富贵，平安吉祥",
        "日干乘凶神": "主一生贫苦，多灾多难",
        "三传生合日干": "主一生顺利，步步高升",
        "三传克害日干": "主一生坎坷，多有挫折",
        "日干逢空亡": "主一生漂泊，无依无靠"
    }
    
    ZHAN_HUNYIN = {
        "日干日支相生合": "主婚姻美满，夫妻和睦",
        "日干日支相克害": "主婚姻不睦，夫妻反目",
        "三传生合日干日支": "主婚姻成功，百年好合",
        "三传克害日干日支": "主婚姻失败，中途离异",
        "吉神临日干日支": "主婚姻吉祥",
        "凶神临日干日支": "主婚姻有阻"
    }
    
    ZHAN_QIUCAI = {
        "青龙乘木": "主财来自东方",
        "青龙乘火": "主财来自南方",
        "青龙乘金": "主财来自西方",
        "青龙乘水": "主财来自北方",
        "青龙乘土": "主财来自中央",
        "三传生合青龙": "主求财成功，财源广进",
        "三传克害青龙": "主求财失败，血本无归",
        "青龙临日干": "主财到手，富贵荣华",
        "青龙空亡": "主财虚无，求而不得"
    }
    
    ZHAN_XINGREN = {
        "三传生合日干": "主行人平安，早日归来",
        "三传克害日干": "主行人有阻，归期延迟",
        "吉神临三传": "主行人顺利",
        "凶神临三传": "主行人有险",
        "初传": "起程",
        "中传": "途中",
        "末传": "归期"
    }
    
    ZHAN_JIBING = {
        "三传生合日干": "主疾病早日痊愈",
        "三传克害日干": "主疾病难以痊愈",
        "吉神临三传": "主疾病轻，容易治疗",
        "凶神临三传": "主疾病重，难以治疗",
        "白虎临三传": "主疾病凶险",
        "青龙太常临三传": "主疾病有转机"
    }
    
    KETI_MEANING = {
        "元首": "上克下，事从外来，主速成",
        "重审": "下克上，事从内起，主迟缓",
        "知一": "比用克贼，择一而用，主分明",
        "比用": "比用克贼，择一而用，主分明",
        "涉害": "涉害取深，主艰难",
        "遥克": "遥克为用，主远事",
        "蒿矢": "神遥克日，主虚惊",
        "弹射": "日遥克神，主有伤",
        "昴星阳日": "阳日昴星，主惊恐",
        "昴星阴日": "阴日昴星，主暗昧",
        "别责": "别责合神，主依附",
        "八专": "干支同位，主专一",
        "伏吟": "天地相同，主不动",
        "返吟": "天地对冲，主反复"
    }
    
    def __init__(self):
        self.tools = DLRBasicTools()
    
    def analyze(self, sike: Dict, sanchuan: Tuple, keti: str, 
                tianjiang: List[str], day_gan: str, day_zhi: str,
                question: str = "通用") -> Dict:
        result = {
            "question": question,
            "keti": keti,
            "keti_meaning": self.KETI_MEANING.get(keti, "未知课体"),
            "sanchuan_analysis": self._analyze_sanchuan(sanchuan, tianjiang),
            "day_analysis": self._analyze_day(day_gan, day_zhi, sike, tianjiang),
            "category_analysis": self._category_analysis(question, sanchuan, tianjiang, day_gan, day_zhi),
            "overall_fortune": self._calculate_fortune(sanchuan, tianjiang, keti),
            "advice": ""
        }
        
        result["advice"] = self._generate_advice(result)
        
        return result
    
    def _analyze_sanchuan(self, sanchuan: Tuple, tianjiang: List[str]) -> Dict:
        if len(sanchuan) < 3 or len(tianjiang) < 3:
            return {"error": "三传或天将数据不完整"}
        
        chuanchuan, zhongchuan, mochuan = sanchuan[0], sanchuan[1], sanchuan[2]
        tj1, tj2, tj3 = tianjiang[0], tianjiang[1], tianjiang[2]
        
        analysis = {
            "初传": {
                "zhi": chuanchuan,
                "tianjiang": tj1,
                "jixiong": self.TIANJIANG_JIXIONG.get(tj1, "未知"),
                "meaning": self.TIANJIANG_MEANING.get(tj1, "未知"),
                "stage": "事之始，主近期"
            },
            "中传": {
                "zhi": zhongchuan,
                "tianjiang": tj2,
                "jixiong": self.TIANJIANG_JIXIONG.get(tj2, "未知"),
                "meaning": self.TIANJIANG_MEANING.get(tj2, "未知"),
                "stage": "事之中，主中期"
            },
            "末传": {
                "zhi": mochuan,
                "tianjiang": tj3,
                "jixiong": self.TIANJIANG_JIXIONG.get(tj3, "未知"),
                "meaning": self.TIANJIANG_MEANING.get(tj3, "未知"),
                "stage": "事之终，主远期"
            }
        }
        
        return analysis
    
    def _analyze_day(self, day_gan: str, day_zhi: str, sike: Dict, tianjiang: List[str]) -> Dict:
        gan_shang = sike.get('gan_shang', '')
        zhi_shang = sike.get('zhi_shang', '')
        
        analysis = {
            "日干": {
                "value": day_gan,
                "wuxing": self.tools.get_gan_wuxing(day_gan),
                "上神": gan_shang,
                "上神五行": self.tools.get_zhi_wuxing(gan_shang) if gan_shang else "未知"
            },
            "日支": {
                "value": day_zhi,
                "wuxing": self.tools.get_zhi_wuxing(day_zhi),
                "上神": zhi_shang,
                "上神五行": self.tools.get_zhi_wuxing(zhi_shang) if zhi_shang else "未知"
            }
        }
        
        if gan_shang and zhi_shang:
            gan_shang_wx = self.tools.get_zhi_wuxing(gan_shang)
            zhi_shang_wx = self.tools.get_zhi_wuxing(zhi_shang)
            
            if self.tools.is_sheng(gan_shang_wx, zhi_shang_wx):
                analysis["干支关系"] = "干上神生支上神，主外助内"
            elif self.tools.is_ke(gan_shang_wx, zhi_shang_wx):
                analysis["干支关系"] = "干上神克支上神，主外制内"
            elif self.tools.is_sheng(zhi_shang_wx, gan_shang_wx):
                analysis["干支关系"] = "支上神生干上神，主内助外"
            elif self.tools.is_ke(zhi_shang_wx, gan_shang_wx):
                analysis["干支关系"] = "支上神克干上神，主内制外"
            else:
                analysis["干支关系"] = "干支上神比和"
        
        return analysis
    
    def _category_analysis(self, question: str, sanchuan: Tuple, tianjiang: List[str],
                          day_gan: str, day_zhi: str) -> Dict:
        category_rules = {
            "天时": self.ZHAN_TIANSHI,
            "家宅": self.ZHAN_JIAZHAI,
            "身命": self.ZHAN_SHENGMING,
            "婚姻": self.ZHAN_HUNYIN,
            "求财": self.ZHAN_QIUCAI,
            "行人": self.ZHAN_XINGREN,
            "疾病": self.ZHAN_JIBING
        }
        
        result = {
            "category": question,
            "rules": category_rules.get(question, {}),
            "interpretation": self._interpret_category(question, sanchuan, tianjiang, day_gan, day_zhi)
        }
        
        return result
    
    def _interpret_category(self, question: str, sanchuan: Tuple, tianjiang: List[str],
                           day_gan: str, day_zhi: str) -> str:
        if len(tianjiang) < 3:
            return "天将数据不完整"
        
        tj1, tj2, tj3 = tianjiang[0], tianjiang[1], tianjiang[2]
        
        interpretations = []
        
        if question == "天时":
            if tj1 == "青龙":
                wx = self.TIANJIANG_WUXING.get(tj1, "")
                interpretations.append(self.ZHAN_TIANSHI.get(f"青龙乘{wx}", ""))
            elif tj1 == "白虎":
                wx = self.TIANJIANG_WUXING.get(tj1, "")
                interpretations.append(self.ZHAN_TIANSHI.get(f"白虎乘{wx}", ""))
            elif tj1 == "朱雀":
                interpretations.append("主有雷雨")
            elif tj1 == "玄武":
                interpretations.append("主多云有雨")
            else:
                interpretations.append("主天气平稳")
        
        elif question == "家宅":
            if self.TIANJIANG_JIXIONG.get(tj1, "") == "吉":
                interpretations.append("家宅平安，人口兴旺")
            else:
                interpretations.append("家宅有阻，宜谨慎")
            
            if tj1 == "勾陈":
                interpretations.append("主有田宅争斗")
            elif tj1 == "六合":
                interpretations.append("主家宅和合")
        
        elif question == "婚姻":
            if tj1 in ["六合", "青龙", "天后"]:
                interpretations.append("婚姻吉祥，可成")
            elif tj1 in ["白虎", "勾陈", "玄武"]:
                interpretations.append("婚姻有阻，需谨慎")
            else:
                interpretations.append("婚姻平平，顺其自然")
        
        elif question == "求财":
            if tj1 == "青龙":
                interpretations.append("求财有利，财源广进")
            elif tj1 == "玄武":
                interpretations.append("求财防失，宜谨慎")
            elif tj1 == "太常":
                interpretations.append("求财平稳，小有收获")
            else:
                interpretations.append("求财一般，宜守不宜攻")
        
        elif question == "行人":
            if self.TIANJIANG_JIXIONG.get(tj1, "") == "吉":
                interpretations.append("行人平安，可归")
            else:
                interpretations.append("行人有阻，归期延迟")
            
            if tj1 == "白虎":
                interpretations.append("行人有险，宜速寻")
            elif tj1 == "青龙":
                interpretations.append("行人顺利，即将归来")
        
        elif question == "疾病":
            if tj1 == "白虎":
                interpretations.append("疾病凶险，宜速治")
            elif tj1 in ["青龙", "太常", "天后"]:
                interpretations.append("疾病有转机，可愈")
            else:
                interpretations.append("疾病平稳，静养为宜")
        
        else:
            if self.TIANJIANG_JIXIONG.get(tj1, "") == "吉":
                interpretations.append("事有转机，可成")
            else:
                interpretations.append("事有阻碍，宜谨慎")
        
        return "；".join([i for i in interpretations if i])
    
    def _calculate_fortune(self, sanchuan: Tuple, tianjiang: List[str], keti: str) -> str:
        if len(tianjiang) < 3:
            return "未知"
        
        tj1, tj2, tj3 = tianjiang[0], tianjiang[1], tianjiang[2]
        
        jixiong_count = {"吉": 0, "凶": 0, "大凶": 0}
        
        for tj in [tj1, tj2, tj3]:
            jx = self.TIANJIANG_JIXIONG.get(tj, "")
            if jx in jixiong_count:
                jixiong_count[jx] += 1
        
        if jixiong_count["大凶"] > 0:
            return "凶"
        elif jixiong_count["吉"] >= 2:
            return "吉"
        elif jixiong_count["凶"] >= 2:
            return "凶"
        else:
            return "平"
    
    def _generate_advice(self, result: Dict) -> str:
        fortune = result.get("overall_fortune", "平")
        keti = result.get("keti", "")
        
        advice_parts = []
        
        if fortune == "吉":
            advice_parts.append("整体运势向好，可积极进取")
        elif fortune == "凶":
            advice_parts.append("整体运势有阻，宜谨慎行事")
        else:
            advice_parts.append("整体运势平稳，宜守不宜攻")
        
        keti_meaning = self.KETI_MEANING.get(keti, "")
        if keti_meaning:
            advice_parts.append(f"课体{keti}：{keti_meaning}")
        
        category_analysis = result.get("category_analysis", {})
        interpretation = category_analysis.get("interpretation", "")
        if interpretation:
            advice_parts.append(interpretation)
        
        return "。".join(advice_parts) + "。"


def zhanduan(sike: Dict, sanchuan: Tuple, keti: str, tianjiang: List[str],
             day_gan: str, day_zhi: str, question: str = "通用") -> Dict:
    calc = DLRZhanduan()
    return calc.analyze(sike, sanchuan, keti, tianjiang, day_gan, day_zhi, question)


if __name__ == "__main__":
    print("=" * 60)
    print("大六壬断语规则测试")
    print("=" * 60)
    
    test_sike = {
        "gan_lu": "寅", "gan_shang": "午", "gan_yin": "戌",
        "zhi_shang": "申", "zhi_yin": "子"
    }
    test_sanchuan = ("午", "戌", "寅")
    test_tianjiang = ["青龙", "太常", "天后"]
    test_keti = "元首"
    
    result = zhanduan(test_sike, test_sanchuan, test_keti, test_tianjiang, "甲", "子", "求财")
    
    print(f"\n问事：{result['question']}")
    print(f"课体：{result['keti']} - {result['keti_meaning']}")
    print(f"\n三传分析：")
    for key, value in result['sanchuan_analysis'].items():
        if isinstance(value, dict):
            print(f"  {key}: {value.get('zhi', '')} 乘{value.get('tianjiang', '')} ({value.get('jixiong', '')})")
    
    print(f"\n日干支分析：")
    for key, value in result['day_analysis'].items():
        if isinstance(value, dict):
            print(f"  {key}: {value}")
    
    print(f"\n分类占断：{result['category_analysis'].get('interpretation', '')}")
    print(f"\n整体运势：{result['overall_fortune']}")
    print(f"\n建议：{result['advice']}")
    
    print("\n" + "=" * 60)
