#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/root/xuanxue_tools')
sys.path.insert(0, '/root/xuanxue_tools/lunar_tools')
sys.path.insert(0, '/root/xuanxue_tools/liu_yao')
sys.path.insert(0, '/root/xuanxue_tools/zi_wei')
sys.path.insert(0, '/root/xuanxue_tools/qi_men_dunjia')

from datetime import datetime

# 测试各模块导入
print("=== 模块导入测试 ===")

try:
    from ganzhi_calculator import GanzhiCalculator
    print("[OK] ganzhi_calculator")
except Exception as e:
    print(f"[FAIL] ganzhi_calculator: {e}")

try:
    from lunar_converter import LunarConverter
    print("[OK] lunar_converter")
except Exception as e:
    print(f"[FAIL] lunar_converter: {e}")

try:
    from shichen_calculator import ShiChenCalculator
    print("[OK] shichen_calculator")
except Exception as e:
    print(f"[FAIL] shichen_calculator: {e}")

try:
    from ly_basic import LiuYaoBasic
    print("[OK] liu_yao")
except Exception as e:
    print(f"[FAIL] liu_yao: {e}")

try:
    from zw_core import ZiWeiCore
    print("[OK] zi_wei")
except Exception as e:
    print(f"[FAIL] zi_wei: {e}")

try:
    from qmdj_api import QiMenDunJia
    print("[OK] qi_men_dunjia")
except Exception as e:
    print(f"[FAIL] qi_men_dunjia: {e}")

print("=== 导入完成 ===")
