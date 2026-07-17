"""生成 5 组测试生辰的引擎结果，用于与权威排盘软件对比"""
import json
import sys
sys.path.insert(0, '.')

from ziwei import paipan_from_solar
from liupan import calc_daxian, calc_xiaoxian, calc_liunian

DIZHI = ["", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

TEST_CASES = [
    {"id": "T1", "year": 1990, "month": 6, "day": 15, "hour": 14, "sex": "male", "label": "阳男顺行"},
    {"id": "T2", "year": 1988, "month": 8, "day": 8, "hour": 8, "sex": "male", "label": "阳男标准"},
    {"id": "T3", "year": 1985, "month": 3, "day": 10, "hour": 6, "sex": "female", "label": "阴女逆行"},
    {"id": "T4", "year": 2000, "month": 1, "day": 1, "hour": 0, "sex": "male", "label": "阳男子时"},
    {"id": "T5", "year": 2003, "month": 9, "day": 15, "hour": 12, "sex": "male", "label": "阳男午时"},
]

results = []
for tc in TEST_CASES:
    pp = paipan_from_solar(tc["year"], tc["month"], tc["day"], tc["hour"], tc["sex"])

    # 大限（取第3大限，即 30-39 岁左右）
    dx = calc_daxian(pp, 3)

    # 流年（取 2024 年）
    ln = calc_liunian(pp, 2024)

    # 小限（取 35 岁）
    xx = calc_xiaoxian(pp, 35)

    r = {
        "id": tc["id"],
        "label": tc["label"],
        "input": {
            "solar_year": tc["year"],
            "solar_month": tc["month"],
            "solar_day": tc["day"],
            "hour": tc["hour"],
            "sex": tc["sex"],
        },
        "engine_result": {
            "ming_gong_pos": pp.ming_gong_pos,
            "ming_gong_zhi": DIZHI[pp.ming_gong_pos],
            "shen_gong_pos": pp.shen_gong_pos,
            "shen_gong_zhi": DIZHI[pp.shen_gong_pos],
            "wuxing_ju": pp.wuxing_ju,
            "ziwei_pos": pp.ziwei_pos,
            "tianfu_pos": pp.tianfu_pos,
            "daxian_3_ming_gong_pos": dx.ming_gong_pos,
            "daxian_3_zhi": DIZHI[dx.ming_gong_pos],
            "daxian_3_age_range": f"{dx.age_start}-{dx.age_end}",
            "daxian_3_tiangan": dx.tiangan,
            "daxian_3_dizhi": dx.dizhi,
            "liunian_2024_ming_gong": ln.ming_gong_pos,
            "liunian_2024_zhi": DIZHI[ln.ming_gong_pos],
            "liunian_2024_tiangan": ln.tiangan,
            "liunian_2024_dizhi": ln.dizhi,
            "xiaoxian_35_ming_gong": xx.ming_gong_pos,
            "xiaoxian_35_zhi": DIZHI[xx.ming_gong_pos],
        },
    }
    results.append(r)

    print(f"=== {tc['id']}: {tc['year']}-{tc['month']:02d}-{tc['day']:02d} {tc['hour']:02d}:00 {tc['sex']} ({tc['label']}) ===")
    print(f"  命宫: {pp.ming_gong_pos} ({DIZHI[pp.ming_gong_pos]})")
    print(f"  身宫: {pp.shen_gong_pos} ({DIZHI[pp.shen_gong_pos]})")
    print(f"  五行局: {pp.wuxing_ju}")
    print(f"  紫微: {pp.ziwei_pos}  天府: {pp.tianfu_pos}")
    print(f"  第3大限: 宫位={dx.ming_gong_pos}({DIZHI[dx.ming_gong_pos]}) 年龄={dx.age_start}-{dx.age_end}")
    print(f"  2024流年: 宫位={ln.ming_gong_pos}({DIZHI[ln.ming_gong_pos]})")
    print(f"  35岁小限: 宫位={xx.ming_gong_pos}({DIZHI[xx.ming_gong_pos]})")
    print()

# 保存 JSON
import os
os.makedirs("../verify/wenmotianji-compare", exist_ok=True)
with open("../verify/wenmotianji-compare/engine_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("引擎结果已保存到: verify/wenmotianji-compare/engine_results.json")
