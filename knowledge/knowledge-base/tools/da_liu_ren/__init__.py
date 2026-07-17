"""
大六壬排盘系统
来源：大六壬指南 + 六壬毕法赋 + 大六壬银河棹正附集
功能：完整的大六壬占卜系统

模块列表：
- dlr_basic: 基础工具（天干地支、五行生克、十干寄宫、十二天将）
- dlr_yuejiang: 月将计算（节气、真太阳时、中气换将）
- dlr_tiandi: 天地盘布盘
- dlr_sike: 四课起出
- dlr_sanchuan: 三传发用（九宗门）
- dlr_keti: 课体判名（集成银河棹）
- dlr_shensha: 神煞查询（集成银河棹）
- dlr_bifa: 毕法赋格局匹配（集成银河棹口诀）
- dlr_zhanduan: 分类占断（婚姻、求财、疾病等）
- dlr_core: 核心排盘引擎
"""

from .dlr_basic import DLRBasicTools
from .dlr_yuejiang import YuejiangCalculator, true_solar_time
from .dlr_tiandi import TiandiPan, bu_tiandi_pan
from .dlr_sike import SikeCalculator, qi_sike
from .dlr_sanchuan import SanchuanCalculator, fa_sanchuan
from .dlr_keti import Ketipan, judge_keti, get_keti_analysis
from .dlr_shensha import ShenshaLookup, lookup_shensha
from .dlr_bifa import BifaPatterns, match_bifa_patterns
from .dlr_zhanduan import DLRZhanduan, zhanduan
from .dlr_core import DaLiuRenCore, qike

__version__ = '1.0.0'
__author__ = '天师 (CTO)'
__source__ = '大六壬指南 + 六壬毕法赋 + 大六壬银河棹正附集'

__all__ = [
    # 基础工具
    'DLRBasicTools',
    
    # 月将计算
    'YuejiangCalculator',
    'true_solar_time',
    
    # 天地盘
    'TiandiPan',
    'bu_tiandi_pan',
    
    # 四课
    'SikeCalculator',
    'qi_sike',
    
    # 三传
    'SanchuanCalculator',
    'fa_sanchuan',
    
    # 课体
    'Ketipan',
    'judge_keti',
    'get_keti_analysis',
    
    # 神煞
    'ShenshaLookup',
    'lookup_shensha',
    
    # 毕法赋
    'BifaPatterns',
    'match_bifa_patterns',
    
    # 分类占断
    'DLRZhanduan',
    'zhanduan',
    
    # 核心引擎
    'DaLiuRenCore',
    'qike'
]
