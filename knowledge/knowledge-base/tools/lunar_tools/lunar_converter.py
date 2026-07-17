"""
农历转换工具
来源：AAAI-qimendunjia (XuanxueUtil.java)
功能：公历农历互转、闰月判断、大小月计算
"""

from datetime import datetime
from typing import Tuple, Optional


class LunarConverter:
    """农历转换器（1900-2050 年）"""
    
    LUNAR_INFO = [
        0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
        0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
        0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
        0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
        0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
        0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
        0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
        0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
        0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
        0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
        0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
        0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
        0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
        0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
        0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0
    ]
    
    GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]
    MONTH_NAMES = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"]
    
    def __init__(self):
        pass
    
    def leap_month(self, year: int) -> int:
        """计算闰月，返回闰几月（0 表示无闰月）"""
        return self.LUNAR_INFO[year - 1900] & 0xf
    
    def leap_days(self, year: int) -> int:
        """计算闰月天数"""
        if self.leap_month(year):
            return 29 if (self.LUNAR_INFO[year - 1900] & 0x10000) else 30
        return 0
    
    def month_days(self, year: int, month: int) -> int:
        """计算农历月份天数"""
        return 29 if (self.LUNAR_INFO[year - 1900] & (0x10000 >> month)) else 30
    
    def year_days(self, year: int) -> int:
        """计算农历年总天数"""
        sum_days = 348
        # 检查 12 个月（从 1 月到 12 月）
        for i in range(12):
            if self.LUNAR_INFO[year - 1900] & (0x10000 >> (i + 1)):
                sum_days += 1
        return sum_days + self.leap_days(year)
    
    def convert_to_lunar(self, date: datetime) -> dict:
        """
        公历转农历
        :param date: 公历日期
        :return: 农历信息字典
        """
        year, month, day = date.year, date.month, date.day
        
        # 计算从 1900 年 1 月 31 日到当前日期的总天数
        base_date = datetime(1900, 1, 31)
        delta_days = (date - base_date).days
        
        # 计算年
        lunar_year = 1900
        while lunar_year < 2051 and delta_days >= self.year_days(lunar_year):
            delta_days -= self.year_days(lunar_year)
            lunar_year += 1
        
        # 计算月
        lunar_month = 1
        leap_month = self.leap_month(lunar_year)
        is_leap = False
        
        while lunar_month <= 12:
            month_days_count = self.month_days(lunar_year, lunar_month)
            
            # 如果有闰月且当前是闰月
            if leap_month > 0 and lunar_month == leap_month:
                # 先过闰月
                leap_days = self.leap_days(lunar_year)
                if delta_days < leap_days:
                    is_leap = True
                    break
                delta_days -= leap_days
                is_leap = True
            
            if delta_days < month_days_count:
                break
            delta_days -= month_days_count
            lunar_month += 1
        
        # 计算日
        lunar_day = delta_days + 1
        
        return {
            'year': lunar_year,
            'month': lunar_month,
            'day': lunar_day,
            'is_leap': is_leap,
            'year_gan_zhi': self.get_year_gan_zhi(lunar_year),
            'month_gan_zhi': self.get_month_gan_zhi(lunar_year, lunar_month, is_leap),
            'animal': self.ANIMALS[(lunar_year - 4) % 12]
        }
    
    def convert_to_solar(self, lunar_year: int, lunar_month: int, lunar_day: int, is_leap: bool = False) -> datetime:
        """
        农历转公历
        :param lunar_year: 农历年
        :param lunar_month: 农历月
        :param lunar_day: 农历日
        :param is_leap: 是否闰月
        :return: 公历日期
        """
        # 计算从 1900 年 1 月 31 日开始的总天数
        offset = 0
        
        # 累加年天数
        for year in range(1900, lunar_year):
            offset += self.year_days(year)
        
        # 累加月天数
        leap_month = self.leap_month(lunar_year)
        for month in range(1, lunar_month + 1):
            if leap_month > 0 and month == (leap_month + 1) and not is_leap:
                month -= 1
            else:
                offset += self.month_days(lunar_year, month)
        
        # 加上日
        offset += lunar_day - 1
        
        # 计算公历日期
        base_date = datetime(1900, 1, 31)
        from datetime import timedelta
        return base_date + timedelta(days=offset)
    
    def get_year_gan_zhi(self, year: int) -> str:
        """获取年柱干支"""
        gan_index = (year - 4) % 10
        zhi_index = (year - 4) % 12
        return f"{self.GAN[gan_index]}{self.ZHI[zhi_index]}"
    
    def get_month_gan_zhi(self, year: int, month: int, is_leap: bool = False) -> str:
        """获取月柱干支（节气月）"""
        # 年上起月法（五虎遁元）
        # 甲己之年丙作首，乙庚之岁戊为头
        # 丙辛之岁寻庚上，丁壬壬寅顺水流
        # 若问戊癸何处起，甲寅之上好追求
        
        gan_index = (year - 4) % 10
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
    
    def format_lunar_date(self, lunar_info: dict) -> str:
        """格式化农历日期"""
        month_str = "闰" if lunar_info['is_leap'] else ""
        month_str += f"{self.MONTH_NAMES[lunar_info['month'] - 1]}月"
        
        day_str = self.format_lunar_day(lunar_info['day'])
        
        return f"{lunar_info['year']}年 {month_str} {day_str} ({lunar_info['year_gan_zhi']}年 {lunar_info['animal']})"
    
    def format_lunar_day(self, day: int) -> str:
        """格式化农历日"""
        if day == 10:
            return "初十"
        elif day == 20:
            return "二十"
        elif day == 30:
            return "三十"
        
        ten = day // 10
        unit = day % 10
        
        gan_names = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
        
        if ten == 0:
            return f"初{gan_names[unit - 1]}"
        elif ten == 1:
            return f"十{gan_names[unit - 1]}" if unit > 0 else "十"
        else:
            return f"二十{gan_names[unit - 1]}" if unit > 0 else "二十"


# 便捷函数
def solar_to_lunar(year: int, month: int, day: int) -> dict:
    """公历转农历"""
    converter = LunarConverter()
    date = datetime(year, month, day)
    return converter.convert_to_lunar(date)


def lunar_to_solar(lunar_year: int, lunar_month: int, lunar_day: int, is_leap: bool = False) -> datetime:
    """农历转公历"""
    converter = LunarConverter()
    return converter.convert_to_solar(lunar_year, lunar_month, lunar_day, is_leap)


# 测试
if __name__ == "__main__":
    converter = LunarConverter()
    
    # 测试公历转农历
    test_date = datetime(2024, 1, 1)
    lunar = converter.convert_to_lunar(test_date)
    print(f"公历：{test_date.strftime('%Y-%m-%d')}")
    print(f"农历：{converter.format_lunar_date(lunar)}")
    print(f"详细信息：{lunar}")
    print()
    
    # 测试农历转公历
    solar = converter.convert_to_solar(2023, 12, 1, False)
    print(f"农历：2023 年 腊月 初一")
    print(f"公历：{solar.strftime('%Y-%m-%d')}")
