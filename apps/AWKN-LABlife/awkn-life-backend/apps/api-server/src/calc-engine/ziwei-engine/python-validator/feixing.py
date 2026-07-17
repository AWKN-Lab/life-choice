"""
紫微斗数飞星盘引擎

基于排盘结果(PaipanResult)计算飞星相关数据：
  1. 理心自化 — 本宫天干使本宫星曜产生四化
  2. 向心自化 — 对宫天干使本宫星曜产生四化
  3. 来因宫   — 天干==年干的宫位
  4. 宫干飞化 — 每个宫位天干飞出四化到目标宫位
  5. 命宫四化 — 命宫天干驱动的四化赋值
  6. 日干四化 — 日天干驱动的四化赋值
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

from ziwei import (
    PaipanResult,
    Gong,
    Star,
    TIANGAN,
    DIZHI,
    GONG_NAMES,
    SIHUA_TABLE,
    SIHUA_NAMES,
    STAR_NAMES,
    normalize_1_12,
)


# ============================================================
# 输出数据结构
# ============================================================

@dataclass
class ZihuaResult:
    """自化结果（理心自化 / 向心自化）"""
    gong_pos: int          # 宫位编号(1~12)
    gong_name: str         # 宫名
    tiangan: int           # 宫位天干编号(1~10)
    star_name_index: int   # 星曜编号
    star_name: str         # 星曜名
    sihua_type: int        # 四化类型(1=化禄, 2=化权, 3=化科, 4=化忌)
    sihua_name: str        # 四化名称
    zihua_type: str        # 自化类型("理心自化" / "向心自化")


@dataclass
class FeihuaResult:
    """宫干飞化结果"""
    source_gong_pos: int   # 源宫位置(1~12)
    source_gong_name: str  # 源宫名
    source_tiangan: int    # 源宫天干编号(1~10)
    star_name_index: int   # 飞化星编号
    star_name: str         # 飞化星名
    sihua_type: int        # 四化类型(1=化禄, 2=化权, 3=化科, 4=化忌)
    sihua_name: str        # 四化名称
    target_gong_pos: int   # 目标宫位置(1~12)
    target_gong_name: str  # 目标宫名


# ============================================================
# 内部辅助函数
# ============================================================

def _find_star_gong(result: PaipanResult, star_name_index: int) -> Optional[Gong]:
    """查找指定星曜所在的宫位，返回 Gong 或 None"""
    for gong in result.gongs:
        for star in gong.stars:
            if star.name_index == star_name_index:
                return gong
    return None


def _check_gong_sihua(gong: Gong, tiangan: int) -> list[tuple[int, int, str]]:
    """
    检查宫位中的星曜是否被指定天干四化命中。

    返回: [(star_name_index, sihua_type, sihua_name), ...]
    """
    if tiangan < 1 or tiangan > 10:
        return []

    sihua_stars = SIHUA_TABLE[tiangan]  # [化禄星, 化权星, 化科星, 化忌星]
    hits = []

    for star in gong.stars:
        for hua_type_idx, hua_star_id in enumerate(sihua_stars, start=1):
            if star.name_index == hua_star_id:
                hits.append((star.name_index, hua_type_idx, SIHUA_NAMES[hua_type_idx]))

    return hits


def _dui_gong_pos(pos: int) -> int:
    """计算对宫位置：对宫 = 当前宫 + 6（模12，1~12）"""
    return (pos + 6 - 1) % 12 + 1


# ============================================================
# 核心算法
# ============================================================

def calc_zihua_lixin(result: PaipanResult) -> list[ZihuaResult]:
    """
    理心自化：本宫天干使本宫星曜产生的四化。

    算法：
      1. 遍历12个宫位
      2. 对每个宫位，获取宫位天干 (gong.tiangan)
      3. 查四化表: sihua = SIHUA_TABLE[gong.tiangan]
      4. 检查本宫是否有四化表中的星曜
      5. 如果有，标记为"理心自化"

    参数:
      result: PaipanResult 排盘结果

    返回:
      理心自化结果列表
    """
    output: list[ZihuaResult] = []

    for gong in result.gongs:
        hits = _check_gong_sihua(gong, gong.tiangan)
        for star_name_index, sihua_type, sihua_name in hits:
            output.append(ZihuaResult(
                gong_pos=gong.pos,
                gong_name=gong.gong_name,
                tiangan=gong.tiangan,
                star_name_index=star_name_index,
                star_name=STAR_NAMES.get(star_name_index, f"星{star_name_index}"),
                sihua_type=sihua_type,
                sihua_name=sihua_name,
                zihua_type="理心自化",
            ))

    return output


def calc_zihua_xiangxin(result: PaipanResult) -> list[ZihuaResult]:
    """
    向心自化：对宫天干使本宫星曜产生的四化。

    算法：
      1. 遍历12个宫位
      2. 对每个宫位，获取对宫天干
      3. 查四化表: sihua = SIHUA_TABLE[对宫天干]
      4. 检查本宫是否有四化表中的星曜
      5. 如果有，标记为"向心自化"

    参数:
      result: PaipanResult 排盘结果

    返回:
      向心自化结果列表
    """
    output: list[ZihuaResult] = []

    for gong in result.gongs:
        dui_pos = _dui_gong_pos(gong.pos)
        dui_gong = result.get_gong(dui_pos)
        dui_tiangan = dui_gong.tiangan

        hits = _check_gong_sihua(gong, dui_tiangan)
        for star_name_index, sihua_type, sihua_name in hits:
            output.append(ZihuaResult(
                gong_pos=gong.pos,
                gong_name=gong.gong_name,
                tiangan=dui_tiangan,
                star_name_index=star_name_index,
                star_name=STAR_NAMES.get(star_name_index, f"星{star_name_index}"),
                sihua_type=sihua_type,
                sihua_name=sihua_name,
                zihua_type="向心自化",
            ))

    return output


def calc_laiyin_gong(result: PaipanResult) -> int:
    """
    来因宫：天干==年干的宫位。

    来因宫的定义是"生年天干所在的宫位"，
    即十二宫中，哪个宫的天干与出生年天干相同，该宫即为来因宫。

    参数:
      result: PaipanResult 排盘结果

    返回:
      来因宫位置(1~12)
    """
    year_gan = result.year_gan

    for gong in result.gongs:
        if gong.tiangan == year_gan:
            return gong.pos

    # 理论上不应到达此处（五虎遁保证每个天干至少出现一次）
    raise ValueError(f"未找到天干={TIANGAN[year_gan]}的宫位，排盘数据异常")


def calc_gonggan_feihua(result: PaipanResult) -> list[FeihuaResult]:
    """
    宫干飞化：每个宫位的天干飞出四化到其他宫位。

    算法：
      1. 遍历12个宫位(源宫)
      2. 对每个源宫，获取天干
      3. 查四化表: sihua = SIHUA_TABLE[源宫天干]
      4. 遍历四化中的4颗星(化禄/化权/化科/化忌)
      5. 找到该星所在的目标宫位
      6. 记录飞化关系

    参数:
      result: PaipanResult 排盘结果

    返回:
      宫干飞化结果列表
    """
    output: list[FeihuaResult] = []

    for source_gong in result.gongs:
        tiangan = source_gong.tiangan
        if tiangan < 1 or tiangan > 10:
            continue

        sihua_stars = SIHUA_TABLE[tiangan]

        for hua_type_idx, hua_star_id in enumerate(sihua_stars, start=1):
            target_gong = _find_star_gong(result, hua_star_id)
            if target_gong is None:
                continue

            output.append(FeihuaResult(
                source_gong_pos=source_gong.pos,
                source_gong_name=source_gong.gong_name,
                source_tiangan=tiangan,
                star_name_index=hua_star_id,
                star_name=STAR_NAMES.get(hua_star_id, f"星{hua_star_id}"),
                sihua_type=hua_type_idx,
                sihua_name=SIHUA_NAMES[hua_type_idx],
                target_gong_pos=target_gong.pos,
                target_gong_name=target_gong.gong_name,
            ))

    return output


def calc_minggong_sihua(result: PaipanResult) -> dict[int, tuple[int, str]]:
    """
    命宫四化：命宫天干驱动的四化赋值 (h4_MG)。

    算法：
      1. 获取命宫天干: minggong_tiangan = gongs[ming_gong_pos-1].tiangan
         注意：gongs 按 pos 排列，需用 get_gong 获取
      2. 查四化表: SIHUA_TABLE[minggong_tiangan]
      3. 返回四化结果

    参数:
      result: PaipanResult 排盘结果

    返回:
      字典 {1: (star_index, star_name), 2: ..., 3: ..., 4: ...}
      键: 1=化禄, 2=化权, 3=化科, 4=化忌
    """
    ming_gong = result.get_gong(result.ming_gong_pos)
    tiangan = ming_gong.tiangan

    sihua_stars = SIHUA_TABLE[tiangan]
    output: dict[int, tuple[int, str]] = {}

    for hua_type_idx, hua_star_id in enumerate(sihua_stars, start=1):
        star_name = STAR_NAMES.get(hua_star_id, f"星{hua_star_id}")
        output[hua_type_idx] = (hua_star_id, star_name)

    return output


def calc_rigan_sihua(ri_gan: int) -> dict[int, tuple[int, str]]:
    """
    日干四化：日天干驱动的四化赋值 (h4_RG)。

    算法：
      1. 查四化表: SIHUA_TABLE[ri_gan]
      2. 返回四化结果

    参数:
      ri_gan: 日天干编号(1=甲 ~ 10=癸)

    返回:
      字典 {1: (star_index, star_name), 2: ..., 3: ..., 4: ...}
      键: 1=化禄, 2=化权, 3=化科, 4=化忌
    """
    if ri_gan < 1 or ri_gan > 10:
        raise ValueError(f"日天干编号无效: {ri_gan}，应为1~10")

    sihua_stars = SIHUA_TABLE[ri_gan]
    output: dict[int, tuple[int, str]] = {}

    for hua_type_idx, hua_star_id in enumerate(sihua_stars, start=1):
        star_name = STAR_NAMES.get(hua_star_id, f"星{hua_star_id}")
        output[hua_type_idx] = (hua_star_id, star_name)

    return output
