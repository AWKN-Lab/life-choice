"""sxtwl 边界范围测试 - 验证 4020 年覆盖

目标：验证 sxtwl 在专业版范围（公元前1616~公元2404）内的可用性。
用法：python test_sxtwl_range.py
"""
import sys

try:
    import sxtwl
    print(f"sxtwl 版本: {getattr(sxtwl, '__version__', 'unknown')}")
except ImportError:
    print("[ERROR] sxtwl 未安装，请运行: pip install sxtwl")
    sys.exit(1)


# 边界测试日期（覆盖专业版范围）
BOUNDARY_DATES = [
    (-1616, 1, 1, "最远过去（公元前1616）"),
    (0, 1, 1, "公元元年"),
    (100, 6, 15, "东汉"),
    (500, 6, 15, "南北朝"),
    (1000, 6, 15, "北宋"),
    (1500, 6, 15, "明朝"),
    (1616, 1, 1, "起点"),
    (1900, 1, 31, "sxtwl 常见下限"),
    (1924, 1, 1, "基础版起点"),
    (2044, 12, 31, "基础版终点"),
    (2100, 12, 31, "sxtwl 常见上限"),
    (2200, 6, 15, "远未来"),
    (2404, 12, 31, "上限"),
]


def test_boundary():
    """边界测试：逐个验证边界日期的农历转换"""
    pass_count = 0
    fail_count = 0
    fail_dates = []

    for year, month, day, desc in BOUNDARY_DATES:
        try:
            lunar = sxtwl.fromSolar(year, month, day)
            gz = lunar.getYearGZ()
            print(f"[PASS] {desc} ({year}-{month:02d}-{day:02d}): "
                  f"农历 {lunar.getLunarMonth()}-{lunar.getLunarDay()}, "
                  f"年干支 tg={gz.tg} dz={gz.dz}")
            pass_count += 1
        except Exception as e:
            print(f"[FAIL] {desc} ({year}-{month:02d}-{day:02d}): {type(e).__name__}: {e}")
            fail_count += 1
            fail_dates.append((year, month, day, desc))

    print(f"\n{'='*60}")
    print(f"总计: {pass_count} PASS / {fail_count} FAIL")
    if fail_dates:
        print(f"失败日期:")
        for y, m, d, desc in fail_dates:
            print(f"  - {desc}: {y}-{m:02d}-{d:02d}")
    print(f"{'='*60}")

    # 输出实际支持范围结论
    if pass_count == len(BOUNDARY_DATES):
        print("结论: sxtwl 支持完整 4020 年范围（公元前1616~公元2404）")
    elif pass_count > 0:
        print(f"结论: sxtwl 部分支持，{pass_count}/{len(BOUNDARY_DATES)} 边界通过")
    else:
        print("结论: sxtwl 不支持边界范围")


if __name__ == "__main__":
    test_boundary()
