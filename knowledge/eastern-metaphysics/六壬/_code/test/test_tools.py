#!/usr/bin/env python3
import sys
sys.path.insert(0, '/root/xuanxue_tools')
sys.path.insert(0, '/root/xuanxue_tools/da_liu_ren')
sys.path.insert(0, '/root/xuanxue_tools/lunar_tools')

from dlr_core import DaLiuRenCore
from ganzhi_calculator import GanzhiCalculator
from datetime import datetime

print("=== Testing GanzhiCalculator ===")
gzc = GanzhiCalculator()
date = datetime(2024, 1, 15, 10, 30)
pillars = gzc.get_four_pillars(date)
print(f"Four Pillars: {pillars}")

print("\n=== Testing DaLiuRenCore ===")
dlr = DaLiuRenCore()
result = dlr.paipan(2024, 1, 15, 14)
print(f"DLR Result: {result}")

print("\n=== All tests passed! ===")
