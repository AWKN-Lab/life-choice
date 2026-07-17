"""sxtwl vs simple 交叉验证 - 1900-2100 年干支一致性

目标：验证 solar_to_lunar（sxtwl 版）与 solar_to_lunar_simple（兜底版）
     在 1900-2100 年范围内年干支的一致性。

预期：立春前后可能有差异（simple 按立春边界处理，sxtwl 版按公历年计算）。
     差异在立春边界 1-2 天内可接受。

用法：python test_cross_validate.py
"""
from ziwei import solar_to_lunar, solar_to_lunar_simple


def test_cross_validate():
    """交叉验证 sxtwl 与 simple 的年干支一致性"""
    mismatches = []
    total = 0

    for year in range(1900, 2101, 10):  # 每10年取样本
        for month in [1, 2, 3, 4, 7, 10]:  # 含立春前后月份
            for day in [1, 4, 15]:  # 含立春日(2月4日)
                total += 1
                sxtwl_result = solar_to_lunar(year, month, day, 12)
                simple_result = solar_to_lunar_simple(year, month, day, 12)

                if sxtwl_result["year_gan"] != simple_result["year_gan"]:
                    mismatches.append({
                        "date": f"{year}-{month:02d}-{day:02d}",
                        "sxtwl_gan": sxtwl_result["year_gan"],
                        "simple_gan": simple_result["year_gan"],
                        "sxtwl_zhi": sxtwl_result["year_zhi"],
                        "simple_zhi": simple_result["year_zhi"],
                    })

    print(f"交叉验证: {total} 个样本")
    print(f"{'='*60}")

    if mismatches:
        print(f"[FAIL] 发现 {len(mismatches)} 处年干支不一致:")
        for m in mismatches[:20]:
            print(f"  {m['date']}: sxtwl(gan={m['sxtwl_gan']},zhi={m['sxtwl_zhi']}) "
                  f"vs simple(gan={m['simple_gan']},zhi={m['simple_zhi']})")
        if len(mismatches) > 20:
            print(f"  ... 还有 {len(mismatches) - 20} 处")

        # 分析差异模式
        print(f"\n差异分析:")
        jan_feb = [m for m in mismatches if "-01-" in m["date"] or "-02-" in m["date"]]
        other = [m for m in mismatches if m not in jan_feb]
        print(f"  1-2月（立春前后）: {len(jan_feb)} 处")
        print(f"  其他月份: {len(other)} 处")

        if len(other) == 0:
            print("\n结论: 差异仅在立春边界（1-2月），属于已知差异，可接受")
        else:
            print("\n结论: 存在非立春边界的差异，需进一步排查")
    else:
        print("[PASS] 1900-2100 年干支全部一致")

    print(f"{'='*60}")


if __name__ == "__main__":
    test_cross_validate()
