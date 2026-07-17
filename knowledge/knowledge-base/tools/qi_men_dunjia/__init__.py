"""
奇门遁甲技能包

时家奇门转盘茅山法排盘系统
特点：
- 严格按节气交节时间定局（茅山法）
- 转盘法排布（九星八门顺时针转宫）
- 使用精确节气数据
- 支持交互式查询

版本: v1.0
作者: 天师 (tianhuo)
"""

from .qmdj_core import QiMenCalculator, QiMenPan, QiMenType
from .qmdj_api import qimen_paipan, qimen_zhanduan

__all__ = [
    'QiMenCalculator',
    'QiMenPan', 
    'QiMenType',
    'qimen_paipan',
    'qimen_zhanduan'
]

__version__ = '1.0.0'
