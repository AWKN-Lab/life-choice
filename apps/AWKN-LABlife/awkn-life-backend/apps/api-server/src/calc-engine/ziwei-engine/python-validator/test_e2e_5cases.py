"""P2-3: 5 组测试用例端到端验证 Python 排盘引擎"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ziwei import (
    paipan_from_solar,
    STAR_NAMES,
    TIANGAN,
    DIZHI,
)

CASES = [
    {"name": "Case-1 标准男命", "y": 1990, "m": 6, "d": 15, "h": 14, "sex": 1},
    {"name": "Case-2 88年生", "y": 1988, "m": 8, "d": 8, "h": 10, "sex": 1},
    {"name": "Case-3 千禧女", "y": 2000, "m": 1, "d": 1, "h": 0, "sex": 2},
    {"name": "Case-4 亥时男", "y": 1985, "m": 12, "d": 22, "h": 22, "sex": 1},
    {"name": "Case-5 95女", "y": 1995, "m": 5, "d": 20, "h": 16, "sex": 2},
]

print("=" * 70)
print("P2-3: 5 组测试用例端到端验证")
print("=" * 70)

results_summary = []

for i, case in enumerate(CASES, 1):
    print(f"\n【{i}/5】{case['name']}: {case['y']}-{case['m']:02d}-{case['d']:02d} {case['h']:02d}:00 sex={case['sex']}")
    try:
        result = paipan_from_solar(case["y"], case["m"], case["d"], case["h"], case["sex"])
        data = result.to_ziwei_chart_input()

        # 关键指标
        soul = data["soul"]
        body = data["body"]
        ju = data["fiveElementsClass"]
        ziwei_gong = None
        for p in data["palaces"]:
            for s in p["majorStars"]:
                if s["name"] == "紫微":
                    ziwei_gong = p["earthlyBranch"]
                    break
            if ziwei_gong:
                break

        # 杂曜统计
        all_names = []
        for p in data["palaces"]:
            for s in p["majorStars"] + p["minorStars"] + p["adjectiveStars"]:
                all_names.append(s["name"])

        zayao = [n for n in all_names if n not in
                 ["紫微", "天机", "太阳", "武曲", "天同", "廉贞",
                  "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
                  "七杀", "破军", "文昌", "文曲", "左辅", "右弼",
                  "天魁", "天钺", "禄存", "天马", "擎羊", "陀罗",
                  "地空", "地劫", "火星", "铃星"]]
        placeholders = [n for n in all_names if n.startswith("星")]

        print(f"  命宫: {soul}")
        print(f"  身宫: {body}")
        print(f"  五行局: {ju}")
        print(f"  紫微在: {ziwei_gong}宫")
        print(f"  杂曜: {len(zayao)}颗 / 总星: {len(all_names)}颗")
        print(f"  杂曜样本: {zayao[:5]}...")
        print(f"  占位符: {placeholders if placeholders else '无 OK'}")

        # 验证占位符
        if placeholders:
            print(f"  [FAIL] 仍有占位符: {placeholders}")
            results_summary.append((case["name"], False, f"占位符: {placeholders}"))
        else:
            print(f"  [PASS] 所有星名正常")
            results_summary.append((case["name"], True, f"杂曜{len(zayao)}颗"))
    except Exception as e:
        print(f"  [ERROR] {e}")
        import traceback
        traceback.print_exc()
        results_summary.append((case["name"], False, str(e)))

# 汇总
print("\n" + "=" * 70)
print("【汇总】")
print("=" * 70)
passed = sum(1 for _, ok, _ in results_summary if ok)
print(f"通过: {passed}/{len(CASES)}")
for name, ok, msg in results_summary:
    icon = "PASS" if ok else "FAIL"
    print(f"  [{icon}] {name}: {msg}")

print("\n" + ("=" * 23 + " ALL PASS " + "=" * 23) if passed == len(CASES) else
      ("=" * 23 + f" {len(CASES) - passed} FAIL " + "=" * 23))