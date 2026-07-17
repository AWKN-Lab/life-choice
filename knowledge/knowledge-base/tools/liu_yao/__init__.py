"""
六爻预测技能包

基于《增删卜易》《卜筮正宗》的完整六爻占卜系统
支持铜钱起卦、数字起卦、时间起卦

版本: v1.0
作者: 天师 (tianhuo)
"""

from .ly_core import LiuYaoCalculator, LiuYaoGua
from .ly_api import liuyao_qigua, liuyao_zhuanggua, liuyao_duangua

__all__ = [
    'LiuYaoCalculator',
    'LiuYaoGua',
    'liuyao_qigua',
    'liuyao_zhuanggua',
    'liuyao_duangua'
]

__version__ = '1.0.0'
