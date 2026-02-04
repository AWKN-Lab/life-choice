from lunar_python import Solar, Lunar 
import datetime 

# --- 配置区域 --- 
# 五行定义字典 
WU_XING = { 
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", 
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水" 
} 

# 阴阳定义字典 (True为阳, False为阴) 
YIN_YANG = { 
    "甲": True, "乙": False, "丙": True, "丁": False, "戊": True, 
    "己": False, "庚": True, "辛": False, "壬": True, "癸": False 
} 

# 十神关系映射表 
TEN_GODS_MAP = { 
    ("生我", True): "偏印", ("生我", False): "正印", 
    ("我生", True): "食神", ("我生", False): "伤官", 
    ("克我", True): "七杀", ("克我", False): "正官", 
    ("我克", True): "偏财", ("我克", False): "正财", 
    ("同我", True): "比肩", ("同我", False): "劫财" 
} 

def get_relation(master_element, target_element): 
    """判断五行生克关系"""
    relations = ["木", "火", "土", "金", "水"]
    m_idx = relations.index(master_element)
    t_idx = relations.index(target_element)
    
    diff = (t_idx - m_idx) % 5
    if diff == 0: return "同我"
    if diff == 1: return "我生"
    if diff == 2: return "我克"
    if diff == 3: return "克我"
    if diff == 4: return "生我"

def calculate_shishen(day_master, target_stem): 
    """计算十神：根据日主(Day Master)计算目标天干(Target Stem)的十神"""
    if not target_stem or target_stem not in WU_XING: return ""
    
    m_element = WU_XING[day_master]
    t_element = WU_XING[target_stem]
    m_pol = YIN_YANG[day_master]
    t_pol = YIN_YANG[target_stem]
    
    relation = get_relation(m_element, t_element)
    # 同性为True(阳阳/阴阴)，异性为False
    is_same_polarity = (m_pol == t_pol)
    
    return TEN_GODS_MAP[(relation, is_same_polarity)]

def run_bazi_chart(year, month, day, hour, minute, longitude): 
    """
    执行八字排盘
    :param longitude: 出生经度，用于计算真太阳时
    """
    print(f"--- 排盘信息：{year}-{month}-{day} {hour}:{minute} (经度:{longitude}) ---") 
    
    # 1. 初始时间对象
    # 注意：lunar_python 的 Solar 对象默认不做时区转换，需手动处理真太阳时
    # 简单算法：经度每差1度，时间差4分钟
    # 标准时间经度：120度 (UTC+8)
    time_offset_minutes = (longitude - 120) * 4
    base_time = datetime.datetime(year, month, day, hour, minute)
    true_solar_time = base_time + datetime.timedelta(minutes=time_offset_minutes)
    
    print(f"真太阳时修正：{true_solar_time.strftime('%Y-%m-%d %H:%M:%S')}")

    # 2. 调用库生成八字
    # 使用修正后的时间生成 Solar 对象
    solar = Solar.fromYmdHms( 
        true_solar_time.year, 
        true_solar_time.month, 
        true_solar_time.day, 
        true_solar_time.hour, 
        true_solar_time.minute, 
        true_solar_time.second 
    )
    lunar = solar.getLunar()
    bazi = lunar.getEightChar()
    
    # 获取四柱
    pillars = { 
        "年柱": bazi.getYear(), 
        "月柱": bazi.getMonth(), 
        "日柱": bazi.getDay(), 
        "时柱": bazi.getTime() 
    }
    
    # 3. 计算十神
    # 日主（日干）是核心
    day_master = pillars["日柱"][0] # 取日柱天干
    
    print(f"\n日元(日主)：{day_master} ({WU_XING[day_master]})")
    print("-" * 30)
    print(f"{'位置':<6} | {'天干':<6} | {'地支':<6} | {'主星(天干十神)':<10}")
    print("-" * 30)
    
    order = ["时柱", "日柱", "月柱", "年柱"] # 传统排盘习惯从左到右：时、日、月、年
    
    for p in order: 
        gan = pillars[p][0]
        zhi = pillars[p][1]
        
        # 计算天干十神 (日柱天干对自己本身通常不标十神，或者标为日元)
        if p == "日柱": 
            shishen = "日元"
        else: 
            shishen = calculate_shishen(day_master, gan)
            
        print(f"{p:<6} | {gan:<6} | {zhi:<6} | {shishen:<10}")

    # 4. 藏干深度分析 (示例：仅展示日支藏干)
    day_zhi = pillars["日柱"][1]
    # 注意：lunar-python 库的 EightChar 对象没有 getDayMz 方法
    # 这里使用简化的藏干信息
    zanggan_map = {
        "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"],
        "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"],
        "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"],
        "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"]
    }
    hiddens = zanggan_map.get(day_zhi, [])
    hidden_str = "/".join([f"{h} ({calculate_shishen(day_master, h)})" for h in hiddens])
    print("-" * 30)
    print(f"日支[{day_zhi}]藏干透析: {hidden_str}")

    return pillars

# --- 执行入口 --- 
if __name__ == "__main__":
    # 测试用例1: 1983年5月20日0点30分
    print("\n" + "="*60)
    print("测试用例1: 1983年5月20日0点30分 (经度: 120.0)")
    print("期望结果：年柱癸亥 月柱丁巳 日柱戊申 时柱壬子")
    print("="*60)
    result1 = run_bazi_chart(1983, 5, 20, 0, 30, longitude=120.0)
    
    # 测试用例2: 1994年11月21日23点10分
    print("\n" + "="*60)
    print("测试用例2: 1994年11月21日23点10分 (经度: 120.0)")
    print("期望结果：年柱甲戌 月柱乙亥 日柱辛亥 时柱庚子")
    print("="*60)
    result2 = run_bazi_chart(1994, 11, 21, 23, 10, longitude=120.0)
    
    # 测试用例3: 2011年3月20日7点30分
    print("\n" + "="*60)
    print("测试用例3: 2011年3月20日7点30分 (经度: 120.0)")
    print("期望结果：年柱辛卯 月柱辛卯 日柱甲戌 时柱戊辰")
    print("="*60)
    result3 = run_bazi_chart(2011, 3, 20, 7, 30, longitude=120.0)
