"""
紫微斗数飞星盘引擎 — 端到端测试

3 组测试用例验证：
  1. 1990-06-15 14:00 男
  2. 1988-08-08 08:00 女
  3. 2000-01-01 00:00 男

验证要点：
  - 理心自化：宫位天干使本宫星曜产生四化
  - 向心自化：对宫天干使本宫星曜产生四化
  - 来因宫：天干==年干的宫位
  - 宫干飞化：源宫天干飞出的四化星落在目标宫位
  - 命宫四化：命宫天干驱动的四化
  - 日干四化：日天干驱动的四化
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ziwei import (
    paipan_from_solar,
    TIANGAN,
    DIZHI,
    GONG_NAMES,
    SIHUA_TABLE,
    SIHUA_NAMES,
    STAR_NAMES,
)
from feixing import (
    calc_zihua_lixin,
    calc_zihua_xiangxin,
    calc_laiyin_gong,
    calc_gonggan_feihua,
    calc_minggong_sihua,
    calc_rigan_sihua,
    ZihuaResult,
    FeihuaResult,
)


# ============================================================
# 测试用例定义
# ============================================================

CASES = [
    {"name": "1990-06-15 14:00 男", "y": 1990, "m": 6, "d": 15, "h": 14, "sex": 1},
    {"name": "1988-08-08 08:00 女", "y": 1988, "m": 8, "d": 8, "h": 8, "sex": 2},
    {"name": "2000-01-01 00:00 男", "y": 2000, "m": 1, "d": 1, "h": 0, "sex": 1},
]


# ============================================================
# 验证函数
# ============================================================

def verify_zihua_lixin(result, lixin_list):
    """验证理心自化：本宫天干使本宫星曜产生四化"""
    errors = []
    for item in lixin_list:
        # 验证宫位天干确实能四化该星
        gong = result.get_gong(item.gong_pos)
        if gong.tiangan != item.tiangan:
            errors.append(
                f"宫{item.gong_pos}({item.gong_name})天干不匹配: "
                f"期望{item.tiangan}({TIANGAN[item.tiangan]}), "
                f"实际{gong.tiangan}({TIANGAN[gong.tiangan]})"
            )
            continue

        # 验证该天干的四化表确实包含该星
        sihua_stars = SIHUA_TABLE[item.tiangan]
        if item.star_name_index not in sihua_stars:
            errors.append(
                f"宫{item.gong_pos}({item.gong_name})天干{TIANGAN[item.tiangan]}的四化表"
                f"不包含{item.star_name}({item.star_name_index})"
            )
            continue

        # 验证四化类型匹配
        expected_type = sihua_stars.index(item.star_name_index) + 1
        if item.sihua_type != expected_type:
            errors.append(
                f"宫{item.gong_pos}({item.gong_name}){item.star_name}四化类型不匹配: "
                f"期望{expected_type}({SIHUA_NAMES[expected_type]}), "
                f"实际{item.sihua_type}({item.sihua_name})"
            )

        # 验证该星确实在本宫
        star_in_gong = any(s.name_index == item.star_name_index for s in gong.stars)
        if not star_in_gong:
            errors.append(
                f"宫{item.gong_pos}({item.gong_name})中不存在{item.star_name}({item.star_name_index})"
            )

    return errors


def verify_zihua_xiangxin(result, xiangxin_list):
    """验证向心自化：对宫天干使本宫星曜产生四化"""
    errors = []
    for item in xiangxin_list:
        # 验证对宫天干
        dui_pos = (item.gong_pos + 6 - 1) % 12 + 1
        dui_gong = result.get_gong(dui_pos)
        if dui_gong.tiangan != item.tiangan:
            errors.append(
                f"宫{item.gong_pos}({item.gong_name})对宫天干不匹配: "
                f"期望{item.tiangan}({TIANGAN[item.tiangan]}), "
                f"实际{dui_gong.tiangan}({TIANGAN[dui_gong.tiangan]})"
            )
            continue

        # 验证对宫天干的四化表包含该星
        sihua_stars = SIHUA_TABLE[item.tiangan]
        if item.star_name_index not in sihua_stars:
            errors.append(
                f"宫{item.gong_pos}对宫天干{TIANGAN[item.tiangan]}的四化表"
                f"不包含{item.star_name}({item.star_name_index})"
            )
            continue

        # 验证四化类型
        expected_type = sihua_stars.index(item.star_name_index) + 1
        if item.sihua_type != expected_type:
            errors.append(
                f"宫{item.gong_pos}({item.gong_name})向心自化{item.star_name}类型不匹配: "
                f"期望{expected_type}({SIHUA_NAMES[expected_type]}), "
                f"实际{item.sihua_type}({item.sihua_name})"
            )

        # 验证该星确实在本宫
        gong = result.get_gong(item.gong_pos)
        star_in_gong = any(s.name_index == item.star_name_index for s in gong.stars)
        if not star_in_gong:
            errors.append(
                f"宫{item.gong_pos}({item.gong_name})中不存在{item.star_name}({item.star_name_index})"
            )

    return errors


def verify_laiyin_gong(result, laiyin_pos):
    """验证来因宫：天干==年干的宫位"""
    errors = []
    gong = result.get_gong(laiyin_pos)
    if gong.tiangan != result.year_gan:
        errors.append(
            f"来因宫{laiyin_pos}({gong.gong_name})天干{TIANGAN[gong.tiangan]}"
            f" != 年干{TIANGAN[result.year_gan]}"
        )
    return errors


def verify_gonggan_feihua(result, feihua_list):
    """验证宫干飞化：源宫天干飞出的四化星落在目标宫位"""
    errors = []
    for item in feihua_list:
        # 验证源宫天干
        source_gong = result.get_gong(item.source_gong_pos)
        if source_gong.tiangan != item.source_tiangan:
            errors.append(
                f"源宫{item.source_gong_pos}({item.source_gong_name})天干不匹配: "
                f"期望{item.source_tiangan}, 实际{source_gong.tiangan}"
            )
            continue

        # 验证四化表
        sihua_stars = SIHUA_TABLE[item.source_tiangan]
        if item.star_name_index not in sihua_stars:
            errors.append(
                f"源宫{item.source_gong_pos}天干{TIANGAN[item.source_tiangan]}的四化表"
                f"不包含{item.star_name}({item.star_name_index})"
            )
            continue

        # 验证四化类型
        expected_type = sihua_stars.index(item.star_name_index) + 1
        if item.sihua_type != expected_type:
            errors.append(
                f"源宫{item.source_gong_pos}飞化{item.star_name}类型不匹配: "
                f"期望{expected_type}, 实际{item.sihua_type}"
            )

        # 验证目标宫位确实有该星
        target_gong = result.get_gong(item.target_gong_pos)
        star_in_target = any(s.name_index == item.star_name_index for s in target_gong.stars)
        if not star_in_target:
            errors.append(
                f"目标宫{item.target_gong_pos}({item.target_gong_name})中"
                f"不存在{item.star_name}({item.star_name_index})"
            )

    return errors


def verify_minggong_sihua(result, mg_sihua):
    """验证命宫四化"""
    errors = []
    ming_gong = result.get_gong(result.ming_gong_pos)
    tiangan = ming_gong.tiangan
    sihua_stars = SIHUA_TABLE[tiangan]

    for hua_type in [1, 2, 3, 4]:
        if hua_type not in mg_sihua:
            errors.append(f"命宫四化缺少类型{hua_type}({SIHUA_NAMES[hua_type]})")
            continue
        star_id, star_name = mg_sihua[hua_type]
        if star_id != sihua_stars[hua_type - 1]:
            errors.append(
                f"命宫四化{SIHUA_NAMES[hua_type]}不匹配: "
                f"期望星{sihua_stars[hua_type-1]}, 实际{star_id}"
            )

    return errors


def verify_rigan_sihua(ri_gan, rg_sihua):
    """验证日干四化"""
    errors = []
    sihua_stars = SIHUA_TABLE[ri_gan]

    for hua_type in [1, 2, 3, 4]:
        if hua_type not in rg_sihua:
            errors.append(f"日干四化缺少类型{hua_type}({SIHUA_NAMES[hua_type]})")
            continue
        star_id, star_name = rg_sihua[hua_type]
        if star_id != sihua_stars[hua_type - 1]:
            errors.append(
                f"日干四化{SIHUA_NAMES[hua_type]}不匹配: "
                f"期望星{sihua_stars[hua_type-1]}, 实际{star_id}"
            )

    return errors


# ============================================================
# 主测试流程
# ============================================================

def run_tests():
    all_pass = True
    summary = []

    for case in CASES:
        print(f"\n{'='*70}")
        print(f"测试用例: {case['name']}")
        print(f"  公历: {case['y']}-{case['m']:02d}-{case['d']:02d} {case['h']:02d}:00 "
              f"{'男' if case['sex']==1 else '女'}")
        print(f"{'='*70}")

        try:
            result = paipan_from_solar(
                case["y"], case["m"], case["d"], case["h"], case["sex"]
            )
        except Exception as e:
            print(f"  [FAIL] 排盘失败: {e}")
            all_pass = False
            summary.append((case["name"], False, f"排盘失败: {e}"))
            continue

        print(f"  年干支: {TIANGAN[result.year_gan]}{DIZHI[result.year_zhi]}")
        print(f"  命宫: {result.ming_gong_pos}({DIZHI[result.ming_gong_pos]})")
        print(f"  五行局: {result.wuxing_ju}")

        case_pass = True

        # ---- 1. 理心自化 ----
        print(f"\n  【理心自化】")
        lixin = calc_zihua_lixin(result)
        lixin_errors = verify_zihua_lixin(result, lixin)
        if lixin_errors:
            for e in lixin_errors:
                print(f"    [FAIL] {e}")
            case_pass = False
        else:
            print(f"    [PASS] 共{len(lixin)}条理心自化")
            for item in lixin:
                print(f"      {item.gong_name}({TIANGAN[item.tiangan]}干) → "
                      f"{item.star_name}{item.sihua_name}")

        # ---- 2. 向心自化 ----
        print(f"\n  【向心自化】")
        xiangxin = calc_zihua_xiangxin(result)
        xiangxin_errors = verify_zihua_xiangxin(result, xiangxin)
        if xiangxin_errors:
            for e in xiangxin_errors:
                print(f"    [FAIL] {e}")
            case_pass = False
        else:
            print(f"    [PASS] 共{len(xiangxin)}条向心自化")
            for item in xiangxin:
                print(f"      {item.gong_name}(对宫{TIANGAN[item.tiangan]}干) → "
                      f"{item.star_name}{item.sihua_name}")

        # ---- 3. 来因宫 ----
        print(f"\n  【来因宫】")
        laiyin_pos = calc_laiyin_gong(result)
        laiyin_errors = verify_laiyin_gong(result, laiyin_pos)
        laiyin_gong = result.get_gong(laiyin_pos)
        if laiyin_errors:
            for e in laiyin_errors:
                print(f"    [FAIL] {e}")
            case_pass = False
        else:
            print(f"    [PASS] 来因宫={laiyin_pos}({laiyin_gong.gong_name}), "
                  f"天干={TIANGAN[laiyin_gong.tiangan]} == 年干={TIANGAN[result.year_gan]}")

        # ---- 4. 宫干飞化 ----
        print(f"\n  【宫干飞化】")
        feihua = calc_gonggan_feihua(result)
        feihua_errors = verify_gonggan_feihua(result, feihua)
        if feihua_errors:
            for e in feihua_errors:
                print(f"    [FAIL] {e}")
            case_pass = False
        else:
            print(f"    [PASS] 共{len(feihua)}条宫干飞化")
            # 按源宫分组显示
            by_source = {}
            for item in feihua:
                key = f"{item.source_gong_name}({TIANGAN[item.source_tiangan]})"
                by_source.setdefault(key, []).append(item)
            for key, items in by_source.items():
                descs = [f"{i.star_name}{i.sihua_name}→{i.target_gong_name}" for i in items]
                print(f"      {key}: {', '.join(descs)}")

        # ---- 5. 命宫四化 ----
        print(f"\n  【命宫四化】")
        mg_sihua = calc_minggong_sihua(result)
        mg_errors = verify_minggong_sihua(result, mg_sihua)
        if mg_errors:
            for e in mg_errors:
                print(f"    [FAIL] {e}")
            case_pass = False
        else:
            ming_gong = result.get_gong(result.ming_gong_pos)
            print(f"    [PASS] 命宫天干={TIANGAN[ming_gong.tiangan]}")
            for hua_type in [1, 2, 3, 4]:
                star_id, star_name = mg_sihua[hua_type]
                print(f"      {SIHUA_NAMES[hua_type]}: {star_name}({star_id})")

        # ---- 6. 日干四化 ----
        print(f"\n  【日干四化】")
        # 使用年干作为日干的近似（实际需万年历获取日干，此处验证函数逻辑）
        ri_gan = result.year_gan  # 简化：用年干代替日干验证函数逻辑
        rg_sihua = calc_rigan_sihua(ri_gan)
        rg_errors = verify_rigan_sihua(ri_gan, rg_sihua)
        if rg_errors:
            for e in rg_errors:
                print(f"    [FAIL] {e}")
            case_pass = False
        else:
            print(f"    [PASS] 日干={TIANGAN[ri_gan]}(用年干近似)")
            for hua_type in [1, 2, 3, 4]:
                star_id, star_name = rg_sihua[hua_type]
                print(f"      {SIHUA_NAMES[hua_type]}: {star_name}({star_id})")

        # ---- 汇总 ----
        if case_pass:
            print(f"\n  >>> 全部通过 ✓")
            summary.append((case["name"], True, "全部验证通过"))
        else:
            print(f"\n  >>> 存在失败 ✗")
            all_pass = False
            summary.append((case["name"], False, "存在验证失败"))

    # ---- 最终汇总 ----
    print(f"\n{'='*70}")
    print(f"测试汇总")
    print(f"{'='*70}")
    for name, passed, note in summary:
        status = "PASS ✓" if passed else "FAIL ✗"
        print(f"  [{status}] {name}: {note}")

    print(f"\n总计: {len(summary)} 组, "
          f"通过{sum(1 for _,p,_ in summary if p)}组, "
          f"失败{sum(1 for _,p,_ in summary if not p)}组")

    return all_pass


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
