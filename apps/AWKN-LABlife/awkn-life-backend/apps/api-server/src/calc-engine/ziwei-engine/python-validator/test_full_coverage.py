"""
紫微排盘引擎 — 全量遍历测试
覆盖 60 甲子年 × 12 时辰 = 720 组合
"""
import sys
sys.path.insert(0, '.')

from ziwei import paipan_from_solar

# 60 甲子年（1984=甲子年 ~ 2043=癸亥年）
JIAZI_YEARS = list(range(1984, 2044))

# 12 个时辰（每2小时一个，子时=0, 丑时=2, ..., 亥时=22）
HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]

# 天干地支名称（用于报告）
TIANGAN = ["", "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
DIZHI = ["", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

def get_gan_zhi(year):
    """从公历年份获取年干年支"""
    gan = ((year - 1984) % 10) + 1
    zhi = ((year - 1984) % 12) + 1
    return gan, zhi

def main():
    print("=" * 60)
    print("  紫微排盘引擎 — 全量遍历测试")
    print("  覆盖: 60 甲子年 × 12 时辰 = 720 组合")
    print("=" * 60)

    passed = 0
    failed = 0
    errors = []

    for year in JIAZI_YEARS:
        gan, zhi = get_gan_zhi(year)
        ganzhi = f"{TIANGAN[gan]}{DIZHI[zhi]}"

        for hour in HOURS:
            try:
                pp = paipan_from_solar(year, 6, 15, hour, 1)
                passed += 1
            except Exception as e:
                failed += 1
                errors.append({
                    "year": year,
                    "ganzhi": ganzhi,
                    "gan": gan,
                    "zhi": zhi,
                    "hour": hour,
                    "error": str(e),
                })

    print()
    print(f"  通过: {passed}/{passed + failed}")
    if failed > 0:
        print(f"  失败: {failed}")
        print()
        print("  失败详情（前 20 条）:")
        for i, err in enumerate(errors[:20]):
            print(f"    [{i+1}] {err['year']}年({err['ganzhi']}) 时辰{err['hour']}时: {err['error']}")
        if len(errors) > 20:
            print(f"    ... 共 {len(errors)} 条失败")
    else:
        print("  ✅ 全部通过！")

    print()
    print("=" * 60)

    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
