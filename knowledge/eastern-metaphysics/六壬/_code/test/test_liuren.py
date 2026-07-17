#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '/root/xuanxue_tools')
sys.path.insert(0, '/root/xuanxue_tools/da_liu_ren')

from dlr_basic import DaLiuRenBasic

dlr = DaLiuRenBasic()
result = dlr.paipan(2024, 1, 15, 14)
print("=== 大六壬测试 ===")
print(result)
print("=== 测试通过 ===")
