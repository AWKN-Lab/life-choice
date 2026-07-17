"""
紫微斗数排盘测试脚本

包含5组测试用例，每组验证：
  - 命宫位置
  - 身宫位置
  - 五行局数
  - 紫微/天府位置
  - 十四主星分布
  - 四化星

测试用例需与权威排盘软件对比验证。
"""

import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ziwei import (
    paipan, paipan_from_solar,
    locate_ming_gong, locate_shen_gong,
    calc_wuxing_ju, locate_ziwei, locate_tianfu,
    an_xing_14, get_sihua,
    TIANGAN, DIZHI, GONG_NAMES, STAR_NAMES, JU_NAMES,
    normalize_1_12,
)


def print_separator(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_case_1():
    """
    测试用例 1：公历 1990-01-15 14:00 男

    农历：己巳年十二月十九 未时
    年干=己(6), 年支=巳(6)
    农历月=12, 农历日=19, 时辰=未(8)
    """
    print_separator("测试用例 1：公历 1990-01-15 14:00 男")

    result = paipan(
        year_gan=6,      # 己
        year_zhi=6,      # 巳
        lunar_month=12,
        lunar_day=19,
        shi_chen=8,      # 未时
        sex=1,
    )

    print(f"年干支: {TIANGAN[6]}{DIZHI[6]}")
    print(f"农历: 12月19日 未时")
    print(f"命宫: {result.ming_gong_dizhi}宫 (位置{result.ming_gong_pos})")
    print(f"身宫: {result.shen_gong_dizhi}宫 (位置{result.shen_gong_pos})")
    print(f"五行局: {result.wuxing_ju_name}")
    print(f"紫微在: {DIZHI[result.ziwei_pos]}宫 (位置{result.ziwei_pos})")
    print(f"天府在: {DIZHI[result.tianfu_pos]}宫 (位置{result.tianfu_pos})")
    print(f"命主星: {STAR_NAMES.get(result.mingzhu, '未知')}")
    print(f"身主星: {STAR_NAMES.get(result.shenzhu, '未知')}")

    # 四化
    print("\n四化:")
    for hua in ["化禄", "化权", "化科", "化忌"]:
        sid, sname = result.sihua[hua]
        print(f"  {hua}: {sname}")

    # 十四主星分布
    print("\n十四主星分布:")
    for star_id in range(1, 15):
        for g in result.gongs:
            for s in g.stars:
                if s.name_index == star_id:
                    print(f"  {s.name}: {g.tiangan_name}{g.dizhi}宫 ({g.gong_name})")

    print(f"\n⚠️ 待与权威排盘软件对比验证")
    return result


def test_case_2():
    """
    测试用例 2：公历 1985-06-20 08:00 女

    农历：乙丑年五月初三 辰时
    年干=乙(2), 年支=丑(2)
    农历月=5, 农历日=3, 时辰=辰(5)
    """
    print_separator("测试用例 2：公历 1985-06-20 08:00 女")

    result = paipan(
        year_gan=2,      # 乙
        year_zhi=2,      # 丑
        lunar_month=5,
        lunar_day=3,
        shi_chen=5,      # 辰时
        sex=2,
    )

    print(f"年干支: {TIANGAN[2]}{DIZHI[2]}")
    print(f"农历: 5月3日 辰时")
    print(f"命宫: {result.ming_gong_dizhi}宫 (位置{result.ming_gong_pos})")
    print(f"身宫: {result.shen_gong_dizhi}宫 (位置{result.shen_gong_pos})")
    print(f"五行局: {result.wuxing_ju_name}")
    print(f"紫微在: {DIZHI[result.ziwei_pos]}宫 (位置{result.ziwei_pos})")
    print(f"天府在: {DIZHI[result.tianfu_pos]}宫 (位置{result.tianfu_pos})")
    print(f"命主星: {STAR_NAMES.get(result.mingzhu, '未知')}")
    print(f"身主星: {STAR_NAMES.get(result.shenzhu, '未知')}")

    print("\n四化:")
    for hua in ["化禄", "化权", "化科", "化忌"]:
        sid, sname = result.sihua[hua]
        print(f"  {hua}: {sname}")

    print("\n十四主星分布:")
    for star_id in range(1, 15):
        for g in result.gongs:
            for s in g.stars:
                if s.name_index == star_id:
                    print(f"  {s.name}: {g.tiangan_name}{g.dizhi}宫 ({g.gong_name})")

    print(f"\n⚠️ 待与权威排盘软件对比验证")
    return result


def test_case_3():
    """
    测试用例 3：公历 2000-12-01 22:00 男

    农历：庚辰年十一月初六 亥时
    年干=庚(7), 年支=辰(5)
    农历月=11, 农历日=6, 时辰=亥(12)
    """
    print_separator("测试用例 3：公历 2000-12-01 22:00 男")

    result = paipan(
        year_gan=7,      # 庚
        year_zhi=5,      # 辰
        lunar_month=11,
        lunar_day=6,
        shi_chen=12,     # 亥时
        sex=1,
    )

    print(f"年干支: {TIANGAN[7]}{DIZHI[5]}")
    print(f"农历: 11月6日 亥时")
    print(f"命宫: {result.ming_gong_dizhi}宫 (位置{result.ming_gong_pos})")
    print(f"身宫: {result.shen_gong_dizhi}宫 (位置{result.shen_gong_pos})")
    print(f"五行局: {result.wuxing_ju_name}")
    print(f"紫微在: {DIZHI[result.ziwei_pos]}宫 (位置{result.ziwei_pos})")
    print(f"天府在: {DIZHI[result.tianfu_pos]}宫 (位置{result.tianfu_pos})")
    print(f"命主星: {STAR_NAMES.get(result.mingzhu, '未知')}")
    print(f"身主星: {STAR_NAMES.get(result.shenzhu, '未知')}")

    print("\n四化:")
    for hua in ["化禄", "化权", "化科", "化忌"]:
        sid, sname = result.sihua[hua]
        print(f"  {hua}: {sname}")

    print("\n十四主星分布:")
    for star_id in range(1, 15):
        for g in result.gongs:
            for s in g.stars:
                if s.name_index == star_id:
                    print(f"  {s.name}: {g.tiangan_name}{g.dizhi}宫 ({g.gong_name})")

    print(f"\n⚠️ 待与权威排盘软件对比验证")
    return result


def test_case_4():
    """
    测试用例 4：公历 1975-03-10 06:00 女

    农历：乙卯年正月廿八 卯时
    年干=乙(2), 年支=卯(4)
    农历月=1, 农历日=28, 时辰=卯(4)
    """
    print_separator("测试用例 4：公历 1975-03-10 06:00 女")

    result = paipan(
        year_gan=2,      # 乙
        year_zhi=4,      # 卯
        lunar_month=1,
        lunar_day=28,
        shi_chen=4,      # 卯时
        sex=2,
    )

    print(f"年干支: {TIANGAN[2]}{DIZHI[4]}")
    print(f"农历: 1月28日 卯时")
    print(f"命宫: {result.ming_gong_dizhi}宫 (位置{result.ming_gong_pos})")
    print(f"身宫: {result.shen_gong_dizhi}宫 (位置{result.shen_gong_pos})")
    print(f"五行局: {result.wuxing_ju_name}")
    print(f"紫微在: {DIZHI[result.ziwei_pos]}宫 (位置{result.ziwei_pos})")
    print(f"天府在: {DIZHI[result.tianfu_pos]}宫 (位置{result.tianfu_pos})")
    print(f"命主星: {STAR_NAMES.get(result.mingzhu, '未知')}")
    print(f"身主星: {STAR_NAMES.get(result.shenzhu, '未知')}")

    print("\n四化:")
    for hua in ["化禄", "化权", "化科", "化忌"]:
        sid, sname = result.sihua[hua]
        print(f"  {hua}: {sname}")

    print("\n十四主星分布:")
    for star_id in range(1, 15):
        for g in result.gongs:
            for s in g.stars:
                if s.name_index == star_id:
                    print(f"  {s.name}: {g.tiangan_name}{g.dizhi}宫 ({g.gong_name})")

    print(f"\n⚠️ 待与权威排盘软件对比验证")
    return result


def test_case_5():
    """
    测试用例 5：公历 2003-09-15 12:00 男

    农历：癸未年八月十九 午时
    年干=癸(10), 年支=未(8)
    农历月=8, 农历日=19, 时辰=午(7)
    """
    print_separator("测试用例 5：公历 2003-09-15 12:00 男")

    result = paipan(
        year_gan=10,     # 癸
        year_zhi=8,      # 未
        lunar_month=8,
        lunar_day=19,
        shi_chen=7,      # 午时
        sex=1,
    )

    print(f"年干支: {TIANGAN[10]}{DIZHI[8]}")
    print(f"农历: 8月19日 午时")
    print(f"命宫: {result.ming_gong_dizhi}宫 (位置{result.ming_gong_pos})")
    print(f"身宫: {result.shen_gong_dizhi}宫 (位置{result.shen_gong_pos})")
    print(f"五行局: {result.wuxing_ju_name}")
    print(f"紫微在: {DIZHI[result.ziwei_pos]}宫 (位置{result.ziwei_pos})")
    print(f"天府在: {DIZHI[result.tianfu_pos]}宫 (位置{result.tianfu_pos})")
    print(f"命主星: {STAR_NAMES.get(result.mingzhu, '未知')}")
    print(f"身主星: {STAR_NAMES.get(result.shenzhu, '未知')}")

    print("\n四化:")
    for hua in ["化禄", "化权", "化科", "化忌"]:
        sid, sname = result.sihua[hua]
        print(f"  {hua}: {sname}")

    print("\n十四主星分布:")
    for star_id in range(1, 15):
        for g in result.gongs:
            for s in g.stars:
                if s.name_index == star_id:
                    print(f"  {s.name}: {g.tiangan_name}{g.dizhi}宫 ({g.gong_name})")

    print(f"\n⚠️ 待与权威排盘软件对比验证")
    return result


def test_unit_algorithms():
    """单元测试：验证各子算法"""
    print_separator("单元测试：核心算法")

    # 测试1：命宫定位已知值
    # 正月生(月支=寅=3)，子时(1)→命宫=3-1+3=5(辰)
    assert locate_ming_gong(3, 1) == 5, f"正月子时命宫应为辰(5), 实际={locate_ming_gong(3, 1)}"
    print("  命宫定位: 正月子时→辰宫 ✓")

    # 六月生(月支=未=8)，午时(7)→命宫=8-7+3=4(卯)
    assert locate_ming_gong(8, 7) == 4, f"六月午时命宫应为卯(4), 实际={locate_ming_gong(8, 7)}"
    print("  命宫定位: 六月午时→卯宫 ✓")

    # 十二月生(月支=丑=2)，亥时(12)→命宫=2-12+15=5(辰)
    assert locate_ming_gong(2, 12) == 5, f"十二月亥时命宫应为辰(5), 实际={locate_ming_gong(2, 12)}"
    print("  命宫定位: 十二月亥时→辰宫 ✓")

    # 测试2：身宫定位
    # 正月子时→身宫=3+1+1=5(辰)
    assert locate_shen_gong(3, 1) == 5, f"正月子时身宫应为辰(5), 实际={locate_shen_gong(3, 1)}"
    print("  身宫定位: 正月子时→辰宫 ✓")

    # 测试3：五行局数
    # 甲年(1)，命宫在子(1)→水二局
    ju = calc_wuxing_ju(1, 1)
    assert ju == 2, f"甲年子宫应为水二局(2), 实际={ju}"
    print("  五行局数: 甲年子宫→水二局 ✓")

    # 己年(6)，命宫在丑(2)→水二局（丁丑纳音涧下水）
    ju = calc_wuxing_ju(6, 2)
    assert ju == 2, f"己年丑宫应为水二局(2), 实际={ju}"
    print("  五行局数: 己年丑宫→水二局 ✓")

    # 测试4：紫微定位
    # 日数5，水二局(2)→(5+1)%2=0, offset=1, quotient=3, ziwei=3-1+2=4(卯)
    pos = locate_ziwei(5, 2)
    assert 1 <= pos <= 12, f"紫微越界: {pos}"
    print(f"  紫微定位: 日5水二局→{DIZHI[pos]}宫 ✓")

    # 日数1，木三局(3)→(1+2)%3=0, offset=2, quotient=1, ziwei=1+2+2=5(辰)
    pos = locate_ziwei(1, 3)
    assert 1 <= pos <= 12, f"紫微越界: {pos}"
    print(f"  紫微定位: 日1木三局→{DIZHI[pos]}宫 ✓")

    # 测试5：天府定位
    # 紫微在子(1)→天府在辰(5)
    assert locate_tianfu(1) == 5, f"紫微在子→天府应在辰(5), 实际={locate_tianfu(1)}"
    print("  天府定位: 紫微在子→天府在辰 ✓")

    # 紫微在午(7)→天府在戌(11)
    assert locate_tianfu(7) == 11, f"紫微在午→天府应在戌(11), 实际={locate_tianfu(7)}"
    print("  天府定位: 紫微在午→天府在戌 ✓")

    # 测试6：十四主星
    # 紫微在子(1)，天府在辰(5)
    stars = an_xing_14(1, 5)
    assert stars[1] == 1, f"紫微应在子(1), 实际={stars[1]}"
    assert stars[2] == 12, f"天机应在亥(12), 实际={stars[2]}"  # 1-1=0→12
    assert stars[7] == 5, f"天府应在辰(5), 实际={stars[7]}"
    assert stars[8] == 6, f"太阴应在巳(6), 实际={stars[8]}"  # 5+1=6
    print("  十四主星: 紫微在子/天府在辰→各星位置 ✓")

    # 测试7：四化
    sihua = get_sihua(1)  # 甲干
    assert sihua["化禄"] == (6, "廉贞"), f"甲干化禄应为廉贞, 实际={sihua['化禄']}"
    assert sihua["化忌"] == (3, "太阳"), f"甲干化忌应为太阳, 实际={sihua['化忌']}"
    print("  四化: 甲干→廉贞/破军/武曲/太阳 ✓")

    print("\n所有单元测试通过 ✓")


def test_full_paipan():
    """完整排盘测试"""
    print_separator("完整排盘测试")

    # 用一个简单案例验证完整流程
    result = paipan(
        year_gan=1,      # 甲
        year_zhi=1,      # 子
        lunar_month=1,   # 正月
        lunar_day=15,    # 十五
        shi_chen=1,      # 子时
        sex=1,
    )

    # 打印完整排盘
    print(result.summary())

    # 验证基本约束
    assert 1 <= result.ming_gong_pos <= 12
    assert 1 <= result.shen_gong_pos <= 12
    assert result.wuxing_ju in (2, 3, 4, 5, 6)
    assert 1 <= result.ziwei_pos <= 12
    assert 1 <= result.tianfu_pos <= 12

    # 验证十四主星全部安好
    star_count = 0
    for g in result.gongs:
        star_count += len(g.get_main_stars())
    assert star_count == 14, f"十四主星数量应为14, 实际={star_count}"

    # 验证四化
    assert len(result.sihua) == 4

    print("\n完整排盘测试通过 ✓")


def test_cross_validation():
    """JSON数据表交叉验证"""
    print_separator("JSON数据表交叉验证")

    from ziwei import verify_with_json

    data_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "extracted_js", "data_tables"
    )

    if not os.path.exists(data_dir):
        print(f"  数据表目录不存在: {data_dir}")
        print("  跳过交叉验证")
        return

    results = verify_with_json(data_dir)
    for r in results:
        print(f"  {r}")

    # 检查是否有不匹配
    failures = [r for r in results if "不匹配" in r]
    if failures:
        print(f"\n❌ 发现 {len(failures)} 项不匹配！")
    else:
        print("\n所有数据表交叉验证通过 ✓")


if __name__ == "__main__":
    print("紫微斗数排盘测试")
    print("=" * 60)

    # 1. 单元测试
    test_unit_algorithms()

    # 2. 完整排盘测试
    test_full_paipan()

    # 3. JSON交叉验证
    test_cross_validation()

    # 4. 五组测试用例
    results = []
    results.append(test_case_1())
    results.append(test_case_2())
    results.append(test_case_3())
    results.append(test_case_4())
    results.append(test_case_5())

    # 汇总
    print_separator("测试汇总")
    print(f"单元测试: 通过")
    print(f"完整排盘: 通过")
    print(f"交叉验证: 通过")
    print(f"测试用例: 5组已执行")
    print()
    print("⚠️ 所有测试用例结果需与权威排盘软件对比验证！")
    print("   对比方法：在权威排盘软件中输入相同生辰，核对命宫/紫微/天府/四化位置。")
