"""
紫微斗数技能包

完整的紫微斗数排盘和解盘系统
支持 14 主星、辅星、煞星的安星算法
支持 12 宫位的排盘和大限、流年计算

版本: v1.0
作者: 天师 (tianhuo)
"""

from .zw_core import ZiWeiCalculator, ZiWeiPan
from .zw_api import ziwei_paipan, ziwei_jiepan

__all__ = [
    'ZiWeiCalculator',
    'ZiWeiPan',
    'ziwei_paipan',
    'ziwei_jiepan'
]

__version__ = '1.0.0'
