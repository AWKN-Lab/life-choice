"""
玄学工具包
来源：AAAI-qimendunjia + DhdReactNativeCalendar
功能：农历转换、天干地支、时辰计算、五行生克、十二长生、八门九星
"""

from .lunar_converter import LunarConverter, solar_to_lunar, lunar_to_solar
from .ganzhi_calculator import GanzhiCalculator, calculate_four_pillars, analyze_ganzhi
from .shichen_calculator import ShichenCalculator, get_chinese_hour, get_shichen_info
from .wuxing_engine import WuxingEngine, wuxing_sheng, wuxing_ke, get_wuxing_relationship
from .zhangsheng_engine import ZhangshengEngine, get_zhangsheng, analyze_zhangsheng
from .bamen_jiuxing import BamenJiuxingEngine, get_bamen, get_jiuxing, get_qimen_info

__version__ = '1.0.0'
__author__ = '天师 (CTO)'
__source__ = 'AAAI-qimendunjia + DhdReactNativeCalendar'

__all__ = [
    # 农历转换
    'LunarConverter',
    'solar_to_lunar',
    'lunar_to_solar',
    
    # 天干地支
    'GanzhiCalculator',
    'calculate_four_pillars',
    'analyze_ganzhi',
    
    # 时辰计算
    'ShichenCalculator',
    'get_chinese_hour',
    'get_shichen_info',
    
    # 五行生克
    'WuxingEngine',
    'wuxing_sheng',
    'wuxing_ke',
    'get_wuxing_relationship',
    
    # 十二长生
    'ZhangshengEngine',
    'get_zhangsheng',
    'analyze_zhangsheng',
    
    # 八门九星
    'BamenJiuxingEngine',
    'get_bamen',
    'get_jiuxing',
    'get_qimen_info'
]
