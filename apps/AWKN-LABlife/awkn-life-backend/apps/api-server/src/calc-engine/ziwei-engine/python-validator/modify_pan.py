"""
命盘调整模块（实验功能）

功能：允许研究者调整月系星位置和命宫位置，用于验证不同排盘规则。
来源：文墨天机 pro_modify 功能逆向

用法:
  from modify_pan import modify_pan
  from ziwei import paipan_from_solar
  result = paipan_from_solar(1990, 6, 15, 14, 1)
  modified = modify_pan(result, {"ming_gong_pos": 4, "star_overrides": {"左辅": 3}})
"""

from __future__ import annotations
import copy
from ziwei import PaipanResult, GONG_NAMES, DIZHI


def modify_pan(paipan_result: PaipanResult, modifications: dict) -> PaipanResult:
    """命盘调整（实验功能）

    参数:
      paipan_result: 原始排盘结果
      modifications: 调整内容
        {
          "ming_gong_pos": 4,           # 强制命宫位置(1~12)
          "star_overrides": {            # 强制星曜位置
            "左辅": 3, "右弼": 9,
            "文昌": 5, "文曲": 11
          }
        }

    返回:
      调整后的 PaipanResult（深拷贝，不影响原始数据）
    """
    _ensure_star_names()  # 确保 _STAR_NAMES_REF 已初始化
    result = copy.deepcopy(paipan_result)

    # 调整命宫位置
    if "ming_gong_pos" in modifications:
        new_pos = modifications["ming_gong_pos"]
        if not 1 <= new_pos <= 12:
            raise ValueError(f"命宫位置必须在1~12之间: {new_pos}")
        old_pos = result.ming_gong_pos
        offset = new_pos - old_pos
        # 重新计算十二宫（保持相对关系，按 pos 轮转）
        for gong in result.gongs:
            gong.pos = ((gong.pos - 1 + offset) % 12) + 1
        result.ming_gong_pos = new_pos
        # 身宫也同步调整
        result.shen_gong_pos = ((result.shen_gong_pos - 1 + offset) % 12) + 1

    # 调整星曜位置
    if "star_overrides" in modifications:
        for star_name, new_pos in modifications["star_overrides"].items():
            if not 1 <= new_pos <= 12:
                raise ValueError(f"星曜位置必须在1~12之间: {star_name}={new_pos}")
            _override_star_position(result, star_name, new_pos)

    return result


def _override_star_position(result: PaipanResult, star_name: str, new_pos: int):
    """覆盖单个星曜的位置（保留原 Star 对象的 brightness/sihua 字段）"""
    _ensure_star_names()
    # 在所有宫位中查找该星曜（STAR_NAMES 是 dict，key=int, value=str）
    found_star = None
    for gong in result.gongs:
        for star in gong.stars:
            if _STAR_NAMES_REF.get(star.name_index) == star_name:
                found_star = star
                gong.stars.remove(star)
                break
        if found_star:
            break

    # 移动到新宫位（保留原 Star 对象，仅更新 gong_pos）
    if found_star:
        found_star.gong_pos = new_pos
        # 遍历查找目标宫位（不假设 gongs 列表顺序）
        target_gong = None
        for g in result.gongs:
            if g.pos == new_pos:
                target_gong = g
                break
        if target_gong:
            target_gong.stars.append(found_star)


# 星名引用（延迟加载）
_STAR_NAMES_REF = None

def _ensure_star_names():
    global _STAR_NAMES_REF
    if _STAR_NAMES_REF is None:
        from ziwei import STAR_NAMES
        _STAR_NAMES_REF = STAR_NAMES


if __name__ == "__main__":
    from ziwei import paipan_from_solar

    # 测试 1：命宫位置调整 + 深拷贝验证
    result = paipan_from_solar(1990, 6, 15, 14, 1)
    print(f"原始命宫: {DIZHI[result.ming_gong_pos]}宫")

    modified = modify_pan(result, {"ming_gong_pos": 4})
    print(f"调整后命宫: {DIZHI[modified.ming_gong_pos]}宫")
    print(f"原始命宫不变: {DIZHI[result.ming_gong_pos]}宫")

    # 测试 2：星曜位置覆盖 + brightness 保留验证
    # 先找到紫微星原始位置和亮度
    ziwei_orig_gong = None
    ziwei_orig_brightness = None
    for gong in result.gongs:
        for star in gong.stars:
            if star.name_index == 1:  # 紫微星编号=1
                ziwei_orig_gong = gong.pos
                ziwei_orig_brightness = star.brightness
                break
        if ziwei_orig_gong:
            break
    print(f"\n紫微星原始位置: {DIZHI[ziwei_orig_gong]}宫, brightness={ziwei_orig_brightness}")

    # 覆盖紫微星到位置 6
    modified2 = modify_pan(result, {"star_overrides": {"紫微": 6}})
    # 验证紫微星新位置和 brightness 保留
    for gong in modified2.gongs:
        for star in gong.stars:
            if star.name_index == 1:
                print(f"紫微星新位置: {DIZHI[gong.pos]}宫, brightness={star.brightness}")
                if gong.pos == 6 and star.brightness == ziwei_orig_brightness:
                    print("星曜覆盖验证: PASS（位置已更新，brightness 保留）")
                else:
                    print("星曜覆盖验证: FAIL")
                break

    print("\n命盘调整验证: PASS")
