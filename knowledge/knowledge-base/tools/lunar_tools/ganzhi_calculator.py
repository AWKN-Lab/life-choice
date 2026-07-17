"""
天干地支计算器
来源：AAAI-qimendunjia (XuanxueUtil.java)
功能：年柱、月柱、日柱、时柱计算
"""

from datetime import datetime
from typing import Tuple, Optional


class GanzhiCalculator:
    """天干地支计算器"""
    
    GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    
    # 五行属性
    GAN_WUXING = {
        "甲": "木", "乙": "木",
        "丙": "火", "丁": "火",
        "戊": "土", "己": "土",
        "庚": "金", "辛": "金",
        "壬": "水", "癸": "水"
    }
    
    ZHI_WUXING = {
        "子": "水", "丑": "土",
        "寅": "木", "卯": "木",
        "辰": "土", "巳": "火",
        "午": "火", "未": "土",
        "申": "金", "酉": "金",
        "戌": "土", "亥": "水"
    }
    
    # 阴阳属性
    GAN_YINYANG = {
        "甲": "阳", "乙": "阴",
        "丙": "阳", "丁": "阴",
        "戊": "阳", "己": "阴",
        "庚": "阳", "辛": "阴",
        "壬": "阳", "癸": "阴"
    }
    
    ZHI_YINYANG = {
        "子": "阳", "丑": "阴",
        "寅": "阳", "卯": "阴",
        "辰": "阳", "巳": "阴",
        "午": "阳", "未": "阴",
        "申": "阳", "酉": "阴",
        "戌": "阳", "亥": "阴"
    }
    
    def __init__(self):
        pass
    
    def get_year_gan_zhi(self, year: int) -> str:
        """
        计算年柱
        :param year: 公历年份
        :return: 年柱干支
        """
        gan_index = (year - 4) % 10
        zhi_index = (year - 4) % 12
        return f"{self.GAN[gan_index]}{self.ZHI[zhi_index]}"
    
    def get_month_gan_zhi(self, year: int, month: int, jieqi: str = None) -> str:
        """
        计算月柱（基于节气）
        :param year: 年份
        :param month: 月份（1-12）
        :param jieqi: 节气（用于精确判断月份）
        :return: 月柱干支
        """
        # 年上起月法（五虎遁元）
        # 甲己之年丙作首，乙庚之岁戊为头
        # 丙辛之岁寻庚上，丁壬壬寅顺水流
        # 若问戊癸何处起，甲寅之上好追求
        
        gan_index = (year - 4) % 10
        
        # 确定正月天干
        if gan_index in [0, 5]:  # 甲、己年
            start_gan = 2  # 丙
        elif gan_index in [1, 6]:  # 乙、庚年
            start_gan = 4  # 戊
        elif gan_index in [2, 7]:  # 丙、辛年
            start_gan = 6  # 庚
        elif gan_index in [3, 8]:  # 丁、壬年
            start_gan = 8  # 壬
        else:  # 戊、癸年
            start_gan = 0  # 甲
        
        # 正月建寅（地支索引 2）
        zhi_index = (month + 1) % 12
        gan_index = (start_gan + month - 1) % 10
        
        return f"{self.GAN[gan_index]}{self.ZHI[zhi_index]}"
    
    def get_day_gan_zhi(self, date: datetime) -> str:
        """
        计算日柱
        :param date: 公历日期
        :return: 日柱干支
        """
        # 以 1900 年 1 月 31 日（甲子日）为基准
        base_date = datetime(1900, 1, 31)
        delta_days = (date - base_date).days
        
        gan_index = delta_days % 10
        zhi_index = delta_days % 12
        
        return f"{self.GAN[gan_index]}{self.ZHI[zhi_index]}"
    
    def get_hour_gan_zhi(self, date: datetime, day_gan_zhi: str = None) -> str:
        """
        计算时柱
        :param date: 公历日期时间
        :param day_gan_zhi: 日柱干支（可选，如果不提供会自动计算）
        :return: 时柱干支
        """
        # 计算时辰地支
        hour = date.hour
        if hour == 23:
            hour_zhi_index = 0  # 子时
        else:
            hour_zhi_index = ((hour + 1) // 2) % 12
        
        # 日上起时法（五鼠遁元）
        # 甲己还加甲，乙庚丙作初
        # 丙辛从戊起，丁壬庚子居
        # 戊癸何方发，壬子是真途
        
        if not day_gan_zhi:
            day_gan_zhi = self.get_day_gan_zhi(date)
        
        day_gan = day_gan_zhi[0]
        
        if day_gan in ["甲", "己"]:
            start_gan = 0  # 甲
        elif day_gan in ["乙", "庚"]:
            start_gan = 2  # 丙
        elif day_gan in ["丙", "辛"]:
            start_gan = 4  # 戊
        elif day_gan in ["丁", "壬"]:
            start_gan = 6  # 庚
        else:  # 戊、癸
            start_gan = 8  # 壬
        
        gan_index = (start_gan + hour_zhi_index) % 10
        
        return f"{self.GAN[gan_index]}{self.ZHI[hour_zhi_index]}"
    
    def get_four_pillars(self, date: datetime) -> dict:
        """
        计算四柱八字
        :param date: 公历日期时间
        :return: 四柱信息
        """
        year_gan_zhi = self.get_year_gan_zhi(date.year)
        month_gan_zhi = self.get_month_gan_zhi(date.year, date.month)
        day_gan_zhi = self.get_day_gan_zhi(date)
        hour_gan_zhi = self.get_hour_gan_zhi(date, day_gan_zhi)
        
        return {
            'year': year_gan_zhi,
            'month': month_gan_zhi,
            'day': day_gan_zhi,
            'hour': hour_gan_zhi,
            'year_gan': year_gan_zhi[0],
            'year_zhi': year_gan_zhi[1],
            'month_gan': month_gan_zhi[0],
            'month_zhi': month_gan_zhi[1],
            'day_gan': day_gan_zhi[0],
            'day_zhi': day_gan_zhi[1],
            'hour_gan': hour_gan_zhi[0],
            'hour_zhi': hour_gan_zhi[1]
        }
    
    def get_gan_wuxing(self, gan: str) -> str:
        """获取天干五行"""
        return self.GAN_WUXING.get(gan, "未知")
    
    def get_zhi_wuxing(self, zhi: str) -> str:
        """获取地支五行"""
        return self.ZHI_WUXING.get(zhi, "未知")
    
    def get_gan_yinyang(self, gan: str) -> str:
        """获取天干阴阳"""
        return self.GAN_YINYANG.get(gan, "未知")
    
    def get_zhi_yinyang(self, zhi: str) -> str:
        """获取地支阴阳"""
        return self.ZHI_YINYANG.get(zhi, "未知")
    
    def analyze_ganzhi(self, gan_zhi: str) -> dict:
        """
        分析干支的五行和阴阳属性
        :param gan_zhi: 干支（如"甲子"）
        :return: 分析结果
        """
        if len(gan_zhi) != 2:
            return {}
        
        gan = gan_zhi[0]
        zhi = gan_zhi[1]
        
        return {
            'gan': gan,
            'zhi': zhi,
            'gan_wuxing': self.get_gan_wuxing(gan),
            'zhi_wuxing': self.get_zhi_wuxing(zhi),
            'gan_yinyang': self.get_gan_yinyang(gan),
            'zhi_yinyang': self.get_zhi_yinyang(zhi)
        }


# 便捷函数
def calculate_four_pillars(year: int, month: int, day: int, hour: int = 0, minute: int = 0) -> dict:
    """计算四柱八字"""
    calculator = GanzhiCalculator()
    date = datetime(year, month, day, hour, minute)
    return calculator.get_four_pillars(date)


def analyze_ganzhi(gan_zhi: str) -> dict:
    """分析干支属性"""
    calculator = GanzhiCalculator()
    return calculator.analyze_ganzhi(gan_zhi)


# 测试
if __name__ == "__main__":
    calculator = GanzhiCalculator()
    
    # 测试四柱计算
    test_date = datetime(2024, 1, 15, 10, 30)
    four_pillars = calculator.get_four_pillars(test_date)
    
    print(f"公历：{test_date.strftime('%Y-%m-%d %H:%M')}")
    print(f"八字：{four_pillars['year']} {four_pillars['month']} {four_pillars['day']} {four_pillars['hour']}")
    print(f"年柱：{four_pillars['year']} ({calculator.analyze_ganzhi(four_pillars['year'])})")
    print(f"月柱：{four_pillars['month']} ({calculator.analyze_ganzhi(four_pillars['month'])})")
    print(f"日柱：{four_pillars['day']} ({calculator.analyze_ganzhi(four_pillars['day'])})")
    print(f"时柱：{four_pillars['hour']} ({calculator.analyze_ganzhi(four_pillars['hour'])})")
