#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/root/xuanxue_tools')
sys.path.insert(0, '/root/xuanxue_tools/lunar_tools')

from datetime import datetime
from ganzhi_calculator import GanzhiCalculator

g = GanzhiCalculator()
date = datetime(2024, 1, 15, 10, 30)
pillars = g.get_four_pillars(date)
print("=== 八字四柱测试 ===")
print(f"年柱: {pillars['year']}")
print(f"月柱: {pillars['month']}")
print(f"日柱: {pillars['day']}")
print(f"时柱: {pillars['hour']}")
print("=== 测试通过 ===")
