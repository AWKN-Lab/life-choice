"""
十二长生引擎
来源：AAAI-qimendunjia (XuanxueUtil.java)
功能：十二长生计算、长生十二宫、运势分析
"""

from typing import Dict, List, Optional


class ZhangshengEngine:
    """十二长生引擎"""
    
    # 十二长生顺序
    ZHANGSHENG_ORDER = [
        "长生", "沐浴", "冠带", "临官", "帝旺",
        "衰", "病", "死", "墓", "绝", "胎", "养"
    ]
    
    # 十天干十二长生表（按地支顺序：子丑寅卯辰巳午未申酉戌亥）
    # 阳干顺行，阴干逆行
    GAN_ZHANGSHENG = {
        "甲": ["沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养", "长生"],
        "乙": ["死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养", "胎", "绝", "墓"],
        "丙": ["胎", "养", "长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝"],
        "丁": ["绝", "墓", "死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养", "胎"],
        "戊": ["胎", "养", "长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝"],
        "己": ["绝", "墓", "死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养", "胎"],
        "庚": ["死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养", "胎", "绝", "墓"],
        "辛": ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"],
        "壬": ["帝旺", "衰", "病", "死", "墓", "绝", "胎", "养", "长生", "沐浴", "冠带", "临官"],
        "癸": ["绝", "墓", "死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养", "胎"]
    }
    
    # 地支顺序
    ZHI_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    
    # 十二长生含义
    ZHANGSHENG_MEANING = {
        "长生": "出生、成长、新的开始，充满活力和希望",
        "沐浴": "洗礼、清洁，也代表桃花、感情",
        "冠带": "成年、礼仪、学业、考试",
        "临官": "事业、官运、工作、责任",
        "帝旺": "巅峰、强盛、权力、顶点",
        "衰": "衰退、走下坡路、需要调整",
        "病": "疾病、问题、困扰",
        "死": "结束、终止、转变",
        "墓": "收藏、积累、也代表困顿",
        "绝": "绝境、断绝、最低点",
        "胎": "孕育、酝酿、新的开始",
        "养": "养育、培养、成长"
    }
    
    # 十二长生分类
    ZHANGSHENG_CATEGORY = {
        "长生": "吉",
        "沐浴": "平",
        "冠带": "吉",
        "临官": "大吉",
        "帝旺": "大吉",
        "衰": "平",
        "病": "凶",
        "死": "大凶",
        "墓": "平",
        "绝": "大凶",
        "胎": "吉",
        "养": "吉"
    }
    
    def __init__(self):
        pass
    
    def get_zhangsheng(self, gan: str, zhi: str) -> str:
        """
        计算某天干在某地支的十二长生状态
        :param gan: 天干
        :param zhi: 地支
        :return: 十二长生状态
        """
        if gan not in self.GAN_ZHANGSHENG:
            return "未知"
        
        if zhi not in self.ZHI_ORDER:
            return "未知"
        
        zhi_index = self.ZHI_ORDER.index(zhi)
        zhangsheng_list = self.GAN_ZHANGSHENG[gan]
        
        return zhangsheng_list[zhi_index]
    
    def get_zhangsheng_index(self, zhangsheng: str) -> int:
        """
        获取十二长生的索引位置
        :param zhangsheng: 十二长生名称
        :return: 索引（0-11）
        """
        if zhangsheng in self.ZHANGSHENG_ORDER:
            return self.ZHANGSHENG_ORDER.index(zhangsheng)
        return -1
    
    def get_zhangsheng_meaning(self, zhangsheng: str) -> str:
        """
        获取十二长生的含义
        :param zhangsheng: 十二长生名称
        :return: 含义描述
        """
        return self.ZHANGSHENG_MEANING.get(zhangsheng, "未知")
    
    def get_zhangsheng_category(self, zhangsheng: str) -> str:
        """
        获取十二长生的吉凶分类
        :param zhangsheng: 十二长生名称
        :return: 吉凶（吉、大吉、平、凶、大凶）
        """
        return self.ZHANGSHENG_CATEGORY.get(zhangsheng, "未知")
    
    def analyze_gan_zhi_zhangsheng(self, gan_zhi: str) -> Dict:
        """
        分析干支的十二长生
        :param gan_zhi: 干支（如"甲子"）
        :return: 分析结果
        """
        if len(gan_zhi) != 2:
            return {}
        
        gan = gan_zhi[0]
        zhi = gan_zhi[1]
        
        zhangsheng = self.get_zhangsheng(gan, zhi)
        
        return {
            'gan_zhi': gan_zhi,
            'zhangsheng': zhangsheng,
            'meaning': self.get_zhangsheng_meaning(zhangsheng),
            'category': self.get_zhangsheng_category(zhangsheng),
            'index': self.get_zhangsheng_index(zhangsheng)
        }
    
    def analyze_bazi_zhangsheng(self, bazi: List[str]) -> Dict:
        """
        分析八字十二长生
        :param bazi: 八字（年柱、月柱、日柱、时柱）
        :return: 分析结果
        """
        result = {
            'year': None,
            'month': None,
            'day': None,
            'hour': None,
            'summary': []
        }
        
        positions = ['year', 'month', 'day', 'hour']
        
        for i, gan_zhi in enumerate(bazi):
            if len(gan_zhi) >= 2:
                analysis = self.analyze_gan_zhi_zhangsheng(gan_zhi)
                result[positions[i]] = analysis
                result['summary'].append(analysis)
        
        return result
    
    def get_day_master_strength(self, day_gan: str, month_zhi: str) -> str:
        """
        根据日干在月支的十二长生判断日主强弱
        :param day_gan: 日干
        :param month_zhi: 月支
        :return: 强弱描述
        """
        zhangsheng = self.get_zhangsheng(day_gan, month_zhi)
        
        # 得令（旺相）
        if zhangsheng in ["长生", "临官", "帝旺"]:
            return f"得令（{zhangsheng}），日主强旺"
        # 相地
        elif zhangsheng in ["冠带", "养", "胎"]:
            return f"得地（{zhangsheng}），日主偏强"
        # 失令
        elif zhangsheng in ["衰", "病", "死", "墓", "绝"]:
            return f"失令（{zhangsheng}），日主偏弱"
        else:
            return f"平运（{zhangsheng}），日主中和"
    
    def get_yun_shi_analysis(self, zhangsheng: str) -> Dict:
        """
        获取运势分析
        :param zhangsheng: 十二长生状态
        :return: 运势分析
        """
        analysis = {
            '长生': {
                'overall': '新的开始，充满希望',
                'career': '适合开始新计划、新项目',
                'wealth': '财运初起，宜稳健投资',
                'health': '精力充沛，注意过度消耗',
                'emotion': '感情萌芽，单身者有机会'
            },
            '沐浴': {
                'overall': '桃花旺盛，注意感情纠葛',
                'career': '人缘好，适合社交',
                'wealth': '花费较多，注意理财',
                'health': '注意肾脏、泌尿系统',
                'emotion': '桃花旺，易有感情困扰'
            },
            '冠带': {
                'overall': '学业事业有成',
                'career': '考试顺利，升职机会',
                'wealth': '正财稳定',
                'health': '健康状况良好',
                'emotion': '感情稳定，适合订婚'
            },
            '临官': {
                'overall': '事业巅峰，官运亨通',
                'career': '升职加薪，权力增大',
                'wealth': '财源广进',
                'health': '注意压力过大',
                'emotion': '感情稳定，家庭和睦'
            },
            '帝旺': {
                'overall': '运势达到顶峰',
                'career': '事业巅峰，但防物极必反',
                'wealth': '财运最旺，宜见好就收',
                'health': '注意心血管问题',
                'emotion': '感情强烈，防冲动'
            },
            '衰': {
                'overall': '运势走下坡，宜守不宜攻',
                'career': '事业发展放缓',
                'wealth': '财运平平，保守理财',
                'health': '注意身体保养',
                'emotion': '感情平淡'
            },
            '病': {
                'overall': '问题频发，需谨慎',
                'career': '工作多阻碍',
                'wealth': '破财可能，谨慎投资',
                'health': '注意健康问题',
                'emotion': '感情多争吵'
            },
            '死': {
                'overall': '运势低迷，宜静不宜动',
                'career': '事业停滞，不宜变动',
                'wealth': '财运差，防破财',
                'health': '注意重大疾病',
                'emotion': '感情冷淡，防分离'
            },
            '墓': {
                'overall': '积累期，宜学习沉淀',
                'career': '工作稳定，缺乏突破',
                'wealth': '财库丰盈，宜储蓄',
                'health': '注意慢性病',
                'emotion': '感情内敛'
            },
            '绝': {
                'overall': '最低谷，等待转机',
                'career': '事业困境，不宜冒险',
                'wealth': '财运极差，防破产',
                'health': '注意重症',
                'emotion': '感情破裂可能'
            },
            '胎': {
                'overall': '新的希望在孕育',
                'career': '新计划在酝酿',
                'wealth': '财运开始好转',
                'health': '身体状况改善',
                'emotion': '新感情萌芽'
            },
            '养': {
                'overall': '成长期，需要耐心',
                'career': '事业稳步发展',
                'wealth': '财运稳定增长',
                'health': '注意调养身体',
                'emotion': '感情培养期'
            }
        }
        
        return analysis.get(zhangsheng, {})


# 便捷函数
def get_zhangsheng(gan: str, zhi: str) -> str:
    """获取十二长生状态"""
    engine = ZhangshengEngine()
    return engine.get_zhangsheng(gan, zhi)


def analyze_zhangsheng(gan_zhi: str) -> Dict:
    """分析干支十二长生"""
    engine = ZhangshengEngine()
    return engine.analyze_gan_zhi_zhangsheng(gan_zhi)


def get_zhangsheng_meaning(zhangsheng: str) -> str:
    """获取十二长生含义"""
    engine = ZhangshengEngine()
    return engine.get_zhangsheng_meaning(zhangsheng)


# 测试
if __name__ == "__main__":
    engine = ZhangshengEngine()
    
    print("十二长生顺序：")
    print(" → ".join(engine.ZHANGSHENG_ORDER))
    
    print("\n示例：甲木在各地支的十二长生")
    for zhi in engine.ZHI_ORDER:
        zhangsheng = engine.get_zhangsheng("甲", zhi)
        meaning = engine.get_zhangsheng_meaning(zhangsheng)
        category = engine.get_zhangsheng_category(zhangsheng)
        print(f"甲{zhi}: {zhangsheng} ({category}) - {meaning[:20]}...")
    
    print("\n示例：分析八字十二长生")
    bazi = ["甲子", "丙寅", "戊辰", "壬戌"]
    result = engine.analyze_bazi_zhangsheng(bazi)
    for position in ['year', 'month', 'day', 'hour']:
        if result[position]:
            print(f"{position}: {result[position]['gan_zhi']} - {result[position]['zhangsheng']}")
