import cnlunar
import datetime

# 五行定义字典
WU_XING = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水"
}

def calculate_bazi(year, month, day, hour, minute):
    """
    使用cnlunar库计算八字排盘
    参数:
        year: 年份
        month: 月份
        day: 日期
        hour: 小时
        minute: 分钟
    返回:
        包含八字排盘结果的字典
    """
    # 初始化历法工具类
    dt_object = datetime.datetime(year, month, day, hour, minute)
    cn_calendar = cnlunar.Lunar(dt_object, allow_None_limit=False)
    
    # 获取干支信息
    # 格式: ['庚子', '戊寅', '癸亥', '壬子']
    gz_list = cn_calendar.get_strong_ganzhi()
    
    # 定义输出标签
    pillars = ["年柱", "月柱", "日柱", "时柱"]
    
    # 结构化输出
    bazi_result = {}
    for i in range(len(pillars)):
        bazi_result[pillars[i]] = gz_list[i]
    
    # 获取日主
    bazi_result["日主"] = gz_list[2][0]
    
    return bazi_result

def get_lunar_info(year, month, day):
    """
    获取农历信息
    """
    dt_object = datetime.datetime(year, month, day, 12, 0)
    cn_calendar = cnlunar.Lunar(dt_object, allow_None_limit=False)
    return {
        "农历年份": cn_calendar.year,
        "农历月份": cn_calendar.month,
        "农历日期": cn_calendar.day,
        "农历月份类型": "闰月" if cn_calendar.is_leap else "平月"
    }

if __name__ == "__main__":
    # 测试用例1: 1983年5月20日0点30分
    print("\n" + "="*60)
    print("测试用例1: 1983年5月20日0点30分")
    print("期望结果：年柱癸亥 月柱丁巳 日柱戊申 时柱壬子")
    print("="*60)
    test_data1 = (1983, 5, 20, 0, 30)
    result1 = calculate_bazi(*test_data1)
    lunar_info1 = get_lunar_info(*test_data1[:3])
    print(f"公历时间：{test_data1}")
    print(f"农历信息：{lunar_info1}")
    print(f"排盘结果：{result1}")
    print(f"日元(日主)：{result1['日主']} ({WU_XING.get(result1['日主'], '')})")
    
    # 测试用例2: 1994年11月21日23点10分
    print("\n" + "="*60)
    print("测试用例2: 1994年11月21日23点10分")
    print("期望结果：年柱甲戌 月柱乙亥 日柱辛亥 时柱庚子")
    print("="*60)
    test_data2 = (1994, 11, 21, 23, 10)
    result2 = calculate_bazi(*test_data2)
    lunar_info2 = get_lunar_info(*test_data2[:3])
    print(f"公历时间：{test_data2}")
    print(f"农历信息：{lunar_info2}")
    print(f"排盘结果：{result2}")
    print(f"日元(日主)：{result2['日主']} ({WU_XING.get(result2['日主'], '')})")
    
    # 测试用例3: 2011年3月20日7点30分
    print("\n" + "="*60)
    print("测试用例3: 2011年3月20日7点30分")
    print("期望结果：年柱辛卯 月柱辛卯 日柱甲戌 时柱戊辰")
    print("="*60)
    test_data3 = (2011, 3, 20, 7, 30)
    result3 = calculate_bazi(*test_data3)
    lunar_info3 = get_lunar_info(*test_data3[:3])
    print(f"公历时间：{test_data3}")
    print(f"农历信息：{lunar_info3}")
    print(f"排盘结果：{result3}")
    print(f"日元(日主)：{result3['日主']} ({WU_XING.get(result3['日主'], '')})")
