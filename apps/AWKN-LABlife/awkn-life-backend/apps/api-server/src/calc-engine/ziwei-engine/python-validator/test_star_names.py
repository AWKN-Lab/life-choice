"""验证 STAR_NAMES 扩展效果"""
from ziwei import STAR_NAMES, STAR_NAMES_ZAYAO, paipan_from_solar

# 1) 验证 29~81 全部有名称
missing = [k for k in range(29, 82) if k not in STAR_NAMES]
print(f"[1] 29~81 缺失星号: {missing if missing else '无 OK'}")

# 2) 字典统计
print(f"[2] STAR_NAMES_ZAYAO 总数: {len(STAR_NAMES_ZAYAO)}")
print(f"[3] STAR_NAMES 总数: {len(STAR_NAMES)}")

# 3) 排盘测试
result = paipan_from_solar(1990, 6, 15, 14, 1)
data = result.to_ziwei_chart_input()

# 4) 收集所有星名，检查占位符
all_names = []
for p in data["palaces"]:
    for s in p["majorStars"] + p["minorStars"] + p["adjectiveStars"]:
        all_names.append(s["name"])

placeholders = [n for n in all_names if n.startswith("星")]
print(f"[4] 占位符'星N': {placeholders if placeholders else '无 OK'}")
print(f"[5] 总星数: {len(all_names)} / 去重星数: {len(set(all_names))}")

# 5) 杂曜样本
sample_stars = [
    "天福", "天官", "天刑", "天厨", "博士", "青龙",
    "白虎", "劫煞", "龙德", "华盖", "孤辰", "寡宿",
    "天哭", "天虚", "天喜", "红鸾", "咸池", "破碎",
    "截空", "旬空", "解神", "阴煞", "蜚廉", "封诰",
    "恩光", "三台", "八座", "天才", "天寿", "天姚",
    "天空", "天月", "天贵",
]
found = [n for n in sample_stars if n in all_names]
print(f"[6] 杂曜样本命中: {len(found)}/{len(sample_stars)}")
print(f"    命中列表: {found}")