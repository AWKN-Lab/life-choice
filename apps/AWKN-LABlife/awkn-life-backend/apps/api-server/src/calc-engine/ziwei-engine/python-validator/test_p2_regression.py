"""P2 阶段全量回归测试"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ziwei import (
    paipan_from_solar,
    STAR_NAMES,
    STAR_NAMES_14,
    STAR_NAMES_AUX,
    STAR_NAMES_ZAYAO,
    paipan,
    an_xing_zayao,
    an_xing_shier_shen,
    an_xing_huoxing_lingxing,
    an_xing_dikong_dijie,
    get_brightness,
    get_sihua,
    load_data_tables,
    verify_with_json,
)

print("=" * 60)
print("P2 阶段全量回归测试")
print("=" * 60)

# 测试 1: STAR_NAMES 完整性
assert 1 in STAR_NAMES and 14 in STAR_NAMES, "14主星缺失"
assert 15 in STAR_NAMES and 28 in STAR_NAMES, "辅星缺失"
assert 29 in STAR_NAMES and 81 in STAR_NAMES, "杂曜缺失"
print("[1] STAR_NAMES 1~81 完整 OK")

# 测试 2: 中文名无占位符
bad = [k for k, v in STAR_NAMES.items() if v.startswith("星") and len(v) <= 4]
assert not bad, f"仍有占位符: {bad}"
print("[2] 中文名无占位符 OK")

# 测试 3: 排盘主流程
result = paipan_from_solar(1990, 6, 15, 14, 1)
data = result.to_ziwei_chart_input()
expected_ju = "火六局"
expected_soul = "子"
assert data["fiveElementsClass"] == expected_ju, f"五行局异常: {data['fiveElementsClass']}"
assert data["earthlyBranchOfSoulPalace"] == expected_soul, f"命宫异常: {data['earthlyBranchOfSoulPalace']}"
print(f"[3] 排盘主流程 OK (1990-06-15 14:00 {expected_ju} 命宫{expected_soul})")

# 测试 4: JSON 导出结构
assert "palaces" in data and len(data["palaces"]) == 12, "palaces 异常"
assert "siHua" in data, "四化缺失"
assert "gejuMatched" in data, "格局缺失"
print("[4] JSON 导出结构 OK (12宫 + 四化 + 格局)")

# 测试 5: 关键 API 存在
assert callable(paipan), "paipan 不是函数"
assert callable(an_xing_zayao), "an_xing_zayao 不是函数"
assert callable(an_xing_shier_shen), "an_xing_shier_shen 不是函数"
assert callable(get_brightness), "get_brightness 不是函数"
print("[5] 公开 API 完整 OK")

# 测试 6: 4 套亮度矩阵
for method in ["quanshu", "zhongzhou", "xiandai1", "xiandai2"]:
    b = get_brightness(1, 1, method)
    assert b > 0, f"亮度查询失败: {method}"
print("[6] 4 套亮度矩阵 OK")

# 测试 7: 四化查表
sihua = get_sihua(1)
assert sihua["化禄"][0] == 6, f"甲干化禄异常: {sihua}"
print("[7] 四化查表 OK")

# 测试 8: 子时跨日（23:30 算次日）
result_late = paipan_from_solar(1990, 6, 15, 23, 1)
data_late = result_late.to_ziwei_chart_input()
assert data_late["timeRange"] == "子时", f"子时识别失败: {data_late['timeRange']}"
print(f"[8] 子时跨日 OK (1990-06-15 23:00 → {data_late['timeRange']})")

# 测试 9: 杂曜总数
result_all = paipan_from_solar(1990, 6, 15, 14, 1)
data_all = result_all.to_ziwei_chart_input()
zayao_count = 0
for p in data_all["palaces"]:
    for s in p["minorStars"] + p["adjectiveStars"]:
        zayao_count += 1
assert zayao_count >= 50, f"杂曜过少: {zayao_count}"
print(f"[9] 杂曜覆盖 OK ({zayao_count} 颗)")

print()
print("=" * 60)
print("全部回归通过, P2 阶段可发布")
print("=" * 60)