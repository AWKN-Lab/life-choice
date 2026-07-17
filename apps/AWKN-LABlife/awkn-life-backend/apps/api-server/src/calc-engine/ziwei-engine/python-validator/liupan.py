"""
紫微斗数六层流盘引擎

基于文墨天机 AS3 反编译算法逆向实现
层级：大限 → 小限 → 流年 → 流月 → 流日 → 流时

功能：
  1. 大限计算（顺行/逆行、起运年龄、大限四化）
  2. 小限计算（男顺女逆、小限宫名、小限四化）
  3. 流年计算（流年命宫、流年四化、流昌流曲）
  4. 流月计算（流月天干地支、流月四化）
  5. 流日计算（日干支、流日四化，依赖 sxtwl）
  6. 流时计算（时干推算、流时四化）
  7. 童限计算
  8. 统一入口 calc_liupan
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

from ziwei import (
    TIANGAN, DIZHI, WU_HU_DUN, SIHUA_TABLE, JU_NAMES,
    STAR_NAMES, GONG_NAMES, normalize_1_12, assign_tiangan,
    get_sihua, PaipanResult,
    calc_wuxing_ju, locate_ziwei, locate_tianfu,
)


# ============================================================
# 流盘专用常量
# ============================================================

# 小限起宫表（索引=命宫地支编号1~12）
_AX_XIAOXIAN_ARR = [0, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2]

# 流昌位置表（索引=天干编号1~10）
_AX_LC_ARR = [0, 3, 4, 6, 7, 6, 7, 9, 10, 12, 1]

# 流曲位置表（索引=天干编号1~10）
_AX_LIUQU_ARR = [0, 10, 9, 7, 6, 7, 6, 4, 3, 1, 12]

# 限流天马位置表（索引=地支编号1~12）
# 申子辰→寅(3), 亥卯未→巳(6), 寅午戌→申(9), 巳酉丑→亥(12)
_AX_LIUTIANMA_ARR = [0, 3, 12, 9, 6, 3, 12, 9, 6, 3, 12, 9, 6]

# 限流火星位置表（索引=地支编号1~12）
# 申子辰→寅(3), 亥卯未→卯(4), 寅午戌→丑(2), 巳酉丑→卯(4)
_AX_LIUHUOXING_ARR = [0, 3, 4, 2, 4, 3, 4, 2, 4, 3, 4, 2, 4]

# 限流铃星位置表（索引=地支编号1~12）
# 申子辰→戌(11), 亥卯未→未(8), 寅午戌→卯(4), 巳酉丑→酉(10)
_AX_LIULINGXING_ARR = [0, 11, 10, 4, 8, 11, 10, 4, 8, 11, 10, 4, 8]

# 限流红鸾位置表（索引=地支编号1~12，子→卯逆行：子卯丑寅寅丑卯子...）
# 红鸾：子→卯, 丑→寅, 寅→丑, 卯→子, 辰→亥, 巳→戌, 午→酉, 未→申, 申→未, 酉→午, 戌→巳, 亥→辰
_AX_LIUHONGLUAN_ARR = [0, 4, 3, 2, 1, 12, 11, 10, 9, 8, 7, 6, 5]

# 时干推算基础表（甲己→1, 乙庚→3, 丙辛→5, 丁壬→7, 戊癸→9）
_HOUR_TG_BASE = {1: 1, 6: 1, 2: 3, 7: 3, 3: 5, 8: 5, 4: 7, 9: 7, 5: 9, 10: 9}

# 斗君矩阵（13×13，行=命宫地支1~12，列=流年地支1~12）
_AX_ZNDJ_ARR = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    [0, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [0, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [0, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [0, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8],
    [0, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7],
    [0, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
    [0, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5],
    [0, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4],
    [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
    [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2],
    [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1],
]


# ============================================================
# 数据类
# ============================================================

@dataclass
class DaxianResult:
    """大限结果"""
    index: int = 0              # 第几大限（1=第一大限）
    ming_gong_pos: int = 0      # 大限命宫所在本命宫位(1~12)
    tiangan: int = 0            # 大限天干(1~10)
    dizhi: int = 0              # 大限地支(1~12)
    age_start: int = 0          # 起始年龄
    age_end: int = 0            # 结束年龄
    sihua: dict = field(default_factory=dict)   # 大限四化
    gong_names: list[int] = field(default_factory=list)  # 12宫的大限宫名编号


@dataclass
class XiaoxianResult:
    """小限结果"""
    ming_gong_pos: int = 0      # 小限命宫所在本命宫位(1~12)
    tiangan: int = 0            # 小限命宫天干(1~10)
    dizhi: int = 0              # 小限命宫地支(1~12)
    sihua: dict = field(default_factory=dict)   # 小限四化
    gong_names: list[int] = field(default_factory=list)  # 12宫的小限宫名编号


@dataclass
class LiunianResult:
    """流年结果"""
    year: int = 0               # 流年公历年份
    ming_gong_pos: int = 0      # 流年命宫所在本命宫位(1~12)
    tiangan: int = 0            # 流年天干(1~10)
    dizhi: int = 0              # 流年地支(1~12)
    sihua: dict = field(default_factory=dict)   # 流年四化
    gong_names: list[int] = field(default_factory=list)  # 12宫的流年宫名编号
    liuchang_pos: int = 0       # 流昌宫位(1~12)
    liuqu_pos: int = 0          # 流曲宫位(1~12)
    # 限流曜星（运曜和流曜）
    liutianma_pos: int = 0      # 限流天马宫位(1~12)
    liuhuoxing_pos: int = 0     # 限流火星宫位(1~12)
    liulingxing_pos: int = 0    # 限流铃星宫位(1~12)
    liuhongluan_pos: int = 0    # 限流红鸾宫位(1~12)
    liutianxi_pos: int = 0      # 限流天喜宫位(1~12)


@dataclass
class LiuyueResult:
    """流月结果"""
    month_index: int = 0        # 流月序号(1~12)
    ming_gong_pos: int = 0      # 流月命宫所在本命宫位(1~12)
    tiangan: int = 0            # 流月天干(1~10)
    dizhi: int = 0              # 流月地支(1~12)
    sihua: dict = field(default_factory=dict)   # 流月四化
    gong_names: list[int] = field(default_factory=list)  # 12宫的流月宫名编号


@dataclass
class LiuriResult:
    """流日结果"""
    year: int = 0               # 公历年
    month: int = 0              # 公历月
    day: int = 0                # 公历日
    ming_gong_pos: int = 0      # 流日命宫所在本命宫位(1~12)
    tiangan: int = 0            # 流日天干(1~10)
    dizhi: int = 0              # 流日地支(1~12)
    sihua: dict = field(default_factory=dict)   # 流日四化
    gong_names: list[int] = field(default_factory=list)  # 12宫的流日宫名编号


@dataclass
class LiushiResult:
    """流时结果"""
    hour_index: int = 0         # 时辰编号(1~12)
    ming_gong_pos: int = 0      # 流时命宫所在本命宫位(1~12)
    tiangan: int = 0            # 流时天干(1~10)
    dizhi: int = 0              # 流时地支(1~12)
    sihua: dict = field(default_factory=dict)   # 流时四化
    gong_names: list[int] = field(default_factory=list)  # 12宫的流时宫名编号


@dataclass
class TongxianResult:
    """童限结果"""
    start_age: int = 0          # 童限起运年龄
    ju_name: str = ""           # 五行局名


@dataclass
class LiupanResult:
    """六层流盘总结果"""
    daxian: DaxianResult = field(default_factory=DaxianResult)
    xiaoxian: XiaoxianResult = field(default_factory=XiaoxianResult)
    liunian: LiunianResult = field(default_factory=LiunianResult)
    liuyue: Optional[LiuyueResult] = None
    liuri: Optional[LiuriResult] = None
    liushi: Optional[LiushiResult] = None
    tongxian: Optional[TongxianResult] = None


# ============================================================
# 辅助函数
# ============================================================

def _normalize_1_10(n: int) -> int:
    """归一化到 1~10 范围"""
    while n <= 0:
        n += 10
    while n > 10:
        n -= 10
    return n


def _get_gong_name_index(pp: PaipanResult, pos: int) -> int:
    """获取指定宫位的本命宫名编号(1=命宫~12=父母宫)"""
    gong = pp.get_gong(pos)
    return gong.gong_name_index


def _calc_gong_names_from_ming(ming_pos: int) -> list[int]:
    """
    从命宫位置计算12宫的宫名编号列表。

    命宫=1, 逆时针排列：兄弟=2, 夫妻=3, ...
    逆时针 = 地支编号递减方向

    返回: 长度13的列表，索引1~12为各宫位(pos)的宫名编号
    """
    result = [0] * 13
    result[ming_pos] = 1  # 命宫
    for i in range(1, 12):
        pos = normalize_1_12(ming_pos - i)
        result[pos] = i + 1
    return result


def _calc_sihua_for_tiangan(tiangan: int) -> dict:
    """
    根据天干编号计算四化。

    返回: {"化禄": (星编号, 星名), "化权": ..., "化科": ..., "化忌": ...}
    """
    return get_sihua(tiangan)


# ============================================================
# 核心算法
# ============================================================

def calc_daxian(pp: PaipanResult, dx_index: int) -> DaxianResult:
    """
    大限计算

    算法：
      1. 判断年干阴阳：奇数→阳，偶数→阴
      2. 阳男阴女顺行，阴男阳女逆行
      3. 每限10年，起运年龄=五行局数
      4. 大限天干=大限命宫所在宫位的天干（五虎遁）
      5. 大限四化=大限天干驱动的四化

    参数:
      pp: 本命排盘结果
      dx_index: 大限序号(1=第一大限, 2=第二大限, ...)

    返回:
      DaxianResult
    """
    result = DaxianResult(index=dx_index)

    # 年干阴阳：奇数→阳(1)，偶数→阴(2)
    yang_yin = 2 if pp.year_gan % 2 == 0 else 1

    # 判断顺逆：阳男阴女顺行，阴男阳女逆行
    shun_xing = (yang_yin == 1 and pp.sex == 1) or (yang_yin == 2 and pp.sex == 2)

    # 获取本命各宫位的宫名编号
    name_BM = [0] * 13
    for g in pp.gongs:
        name_BM[g.pos] = g.gong_name_index

    # 计算大限宫名编号
    name_DX = [0] * 13
    for i in range(1, 13):
        if shun_xing:
            name_DX[i] = name_BM[i] + dx_index - 1
        else:
            name_DX[i] = name_BM[i] - dx_index + 1
        name_DX[i] = normalize_1_12(name_DX[i])

    # 大限命宫：name_DX[本命命宫位] == 1 的那个宫位
    # 即大限命宫 = 本命命宫顺/逆偏移 dx_index-1 个宫位
    if shun_xing:
        dx_ming_pos = normalize_1_12(pp.ming_gong_pos + dx_index - 1)
    else:
        dx_ming_pos = normalize_1_12(pp.ming_gong_pos - (dx_index - 1))

    result.ming_gong_pos = dx_ming_pos

    # 大限天干：大限命宫所在宫位的天干
    result.tiangan = pp.get_gong(dx_ming_pos).tiangan

    # 大限地支：大限命宫所在宫位的地支编号
    result.dizhi = dx_ming_pos

    # 起运年龄
    result.age_start = pp.wuxing_ju + (dx_index - 1) * 10
    result.age_end = result.age_start + 9

    # 大限四化
    result.sihua = _calc_sihua_for_tiangan(result.tiangan)

    # 宫名编号列表
    result.gong_names = name_DX

    return result


def calc_tongxian(pp: PaipanResult) -> TongxianResult:
    """
    童限计算

    童限起运年龄 = 五行局数
    即：水二局2岁起运, 木三局3岁起运, 金四局4岁起运, 土五局5岁起运, 火六局6岁起运

    参数:
      pp: 本命排盘结果

    返回:
      TongxianResult
    """
    result = TongxianResult()
    result.start_age = pp.wuxing_ju
    result.ju_name = JU_NAMES.get(pp.wuxing_ju, "")
    return result


def calc_xiaoxian(pp: PaipanResult, age: int) -> XiaoxianResult:
    """
    小限计算

    算法：
      1. 小限起宫 = _AX_XIAOXIAN_ARR[命宫地支编号]
      2. 男顺行，女逆行
      3. 判断当前年龄所在小限宫
      4. 重新计算小限宫名（以当前小限宫为基准）
      5. 小限四化=小限命宫天干驱动的四化

    参数:
      pp: 本命排盘结果
      age: 当前年龄（虚岁）

    返回:
      XiaoxianResult
    """
    result = XiaoxianResult()

    # 小限起宫
    xiaoxian_start = _AX_XIAOXIAN_ARR[pp.ming_gong_pos]

    # 第一步：计算每个宫位的小限宫名，找到当前年龄所在宫位
    current_xx_pos = 0
    for i in range(1, 13):
        if pp.sex == 1:  # 男顺行
            xx_name = 1 + i - xiaoxian_start
        else:  # 女逆行
            xx_name = 1 - i + xiaoxian_start
        if xx_name <= 0:
            xx_name += 12

        if (age - xx_name) % 12 == 0:
            current_xx_pos = i

    # 如果没找到（理论上不应发生），默认取命宫
    if current_xx_pos == 0:
        current_xx_pos = pp.ming_gong_pos

    result.ming_gong_pos = current_xx_pos

    # 第二步：以当前小限宫为基准，重新计算12宫的小限宫名
    name_XX = [0] * 13
    for i in range(1, 13):
        name_XX[i] = 1 - i + current_xx_pos
        if name_XX[i] <= 0:
            name_XX[i] += 12

    result.gong_names = name_XX

    # 小限命宫天干地支
    result.tiangan = pp.get_gong(current_xx_pos).tiangan
    result.dizhi = current_xx_pos

    # 小限四化
    result.sihua = _calc_sihua_for_tiangan(result.tiangan)

    return result


def calc_liunian(pp: PaipanResult, target_year: int) -> LiunianResult:
    """
    流年计算

    算法：
      1. 流年地支 = (targetYear - 4) % 12 + 1
      2. 流年命宫 = 流年地支对应的宫位
      3. 流年天干 = (targetYear - 4) % 10 + 1
      4. 流年四化 = 流年天干驱动的四化
      5. 流昌流曲按天干查表

    参数:
      pp: 本命排盘结果
      target_year: 目标公历年份

    返回:
      LiunianResult
    """
    result = LiunianResult(year=target_year)

    # 流年天干地支
    result.tiangan = (target_year - 4) % 10 + 1
    result.dizhi = (target_year - 4) % 12 + 1

    # 流年命宫 = 流年地支对应的宫位
    result.ming_gong_pos = result.dizhi

    # 流年宫名编号
    name_LN = [0] * 13
    for i in range(1, 13):
        name_LN[i] = result.dizhi - i + 1
        if name_LN[i] <= 0:
            name_LN[i] += 12
    result.gong_names = name_LN

    # 流年四化
    result.sihua = _calc_sihua_for_tiangan(result.tiangan)

    # 流昌流曲
    result.liuchang_pos = _AX_LC_ARR[result.tiangan]
    result.liuqu_pos = _AX_LIUQU_ARR[result.tiangan]

    # 限流曜星（运曜和流曜）
    result.liutianma_pos = _AX_LIUTIANMA_ARR[result.dizhi]
    result.liuhuoxing_pos = _AX_LIUHUOXING_ARR[result.dizhi]
    result.liulingxing_pos = _AX_LIULINGXING_ARR[result.dizhi]
    result.liuhongluan_pos = _AX_LIUHONGLUAN_ARR[result.dizhi]
    result.liutianxi_pos = (result.liuhongluan_pos + 5) % 12 + 1  # 天喜=红鸾对宫

    return result


def calc_liuyue(liunian_result: LiunianResult, month_index: int) -> LiuyueResult:
    """
    流月计算

    算法：
      1. 流月天干：正月天干 = WU_HU_DUN[流年天干]，后续递增
      2. 流月地支：1月=寅(3), 2月=卯(4), ... 即 monthDZ = (monthIndex + 2) % 12
      3. 流月命宫 = 流月地支对应的宫位
      4. 流月四化 = 流月天干驱动的四化

    参数:
      liunian_result: 流年计算结果
      month_index: 流月序号(1~12)

    返回:
      LiuyueResult
    """
    result = LiuyueResult(month_index=month_index)

    # 流月天干：正月天干 = WU_HU_DUN[流年天干]
    first_month_gan = WU_HU_DUN[liunian_result.tiangan]
    result.tiangan = _normalize_1_10(first_month_gan + month_index - 1)

    # 流月地支：1月=寅(3), 2月=卯(4), ...
    month_dz = (month_index + 2) % 12
    if month_dz == 0:
        month_dz = 12
    result.dizhi = month_dz

    # 流月命宫 = 流月地支对应的宫位
    result.ming_gong_pos = result.dizhi

    # 流月宫名编号
    name_LY = [0] * 13
    for i in range(1, 13):
        name_LY[i] = result.dizhi - i + 1
        if name_LY[i] <= 0:
            name_LY[i] += 12
    result.gong_names = name_LY

    # 流月四化
    result.sihua = _calc_sihua_for_tiangan(result.tiangan)

    return result


def calc_liuri(liuyue_result: LiuyueResult, year: int, month: int, day: int) -> LiuriResult:
    """
    流日计算

    算法：
      1. 调用 sxtwl 农历日历库获取日干支
      2. 流日命宫 = 日地支对应的宫位
      3. 流日四化 = 日天干驱动的四化

    参数:
      liuyue_result: 流月计算结果
      year: 公历年
      month: 公历月
      day: 公历日

    返回:
      LiuriResult

    依赖:
      sxtwl 库（pip install sxtwl）
    """
    try:
        import sxtwl
    except ImportError:
        raise ImportError(
            "流日计算需要 sxtwl 库，请安装: pip install sxtwl"
        )

    result = LiuriResult(year=year, month=month, day=day)

    # 获取日干支（sxtwl v2 API: getDayGZ().tg / .dz，从0开始）
    lunar_day = sxtwl.fromSolar(year, month, day)
    day_gz = lunar_day.getDayGZ()
    day_tg = day_gz.tg + 1   # sxtwl 从0开始，转为1~10
    day_dz = day_gz.dz + 1   # sxtwl 从0开始，转为1~12

    result.tiangan = day_tg
    result.dizhi = day_dz

    # 流日命宫 = 日地支对应的宫位
    result.ming_gong_pos = day_dz

    # 流日宫名编号
    name_LR = [0] * 13
    for i in range(1, 13):
        name_LR[i] = day_dz - i + 1
        if name_LR[i] <= 0:
            name_LR[i] += 12
    result.gong_names = name_LR

    # 流日四化
    result.sihua = _calc_sihua_for_tiangan(day_tg)

    return result


def calc_liushi(liuri_result: LiuriResult, hour_index: int) -> LiushiResult:
    """
    流时计算

    算法：
      1. 时干推算：甲己起甲子, 乙庚起丙子, 丙辛起戊子, 丁壬起庚子, 戊癸起壬子
      2. 流时命宫 = 时辰地支对应的宫位
      3. 流时四化 = 时天干驱动的四化

    参数:
      liuri_result: 流日计算结果
      hour_index: 时辰编号(1=子时~12=亥时)

    返回:
      LiushiResult
    """
    result = LiushiResult(hour_index=hour_index)

    # 时干推算
    day_tg = liuri_result.tiangan
    base = _HOUR_TG_BASE.get(day_tg, 1)
    result.tiangan = _normalize_1_10(base + hour_index - 1)

    # 流时地支 = 时辰编号
    result.dizhi = hour_index

    # 流时命宫 = 时辰地支对应的宫位
    result.ming_gong_pos = hour_index

    # 流时宫名编号
    name_LS = [0] * 13
    for i in range(1, 13):
        name_LS[i] = hour_index - i + 1
        if name_LS[i] <= 0:
            name_LS[i] += 12
    result.gong_names = name_LS

    # 流时四化
    result.sihua = _calc_sihua_for_tiangan(result.tiangan)

    return result


# ============================================================
# 天地人盘（中州派）与斗君计算
# ============================================================

def calc_tiandiren_pan(paipan_result, pan_type=1, ming_gong_offset=0):
    """
    计算天地人盘

    参数:
      paipan_result: PaipanResult 本命盘结果
      pan_type: 1=天盘(默认), 2=地盘, 3=人盘
      ming_gong_offset: 命宫偏移（人盘用时头+1/时尾-1）

    返回:
      dict 包含:
        pan_type: 盘面类型
        ming_gong_pos: 新命宫位置
        wuxing_ju: 新五行局数
        ziwei_pos: 新紫微位置
        tianfu_pos: 新天府位置
        gong_names: 十二宫名列表（从新命宫起逆时针，长度13，索引1~12）
    """
    pp = paipan_result

    # 天盘：直接返回本命盘数据
    if pan_type == 1:
        return {
            "pan_type": 1,
            "ming_gong_pos": pp.ming_gong_pos,
            "wuxing_ju": pp.wuxing_ju,
            "ziwei_pos": pp.ziwei_pos,
            "tianfu_pos": pp.tianfu_pos,
            "gong_names": _calc_gong_names_from_ming(pp.ming_gong_pos),
        }

    # 地盘：以身宫为新命宫
    if pan_type == 2:
        new_ming_pos = pp.shen_gong_pos
    # 人盘：以命宫+offset为新命宫
    elif pan_type == 3:
        new_ming_pos = normalize_1_12(pp.ming_gong_pos + ming_gong_offset)
    else:
        raise ValueError(f"无效的盘面类型: {pan_type}，应为1(天盘)/2(地盘)/3(人盘)")

    # 以新命宫重新计算五行局数
    new_wuxing_ju = calc_wuxing_ju(pp.year_gan, new_ming_pos)

    # 以新五行局数和原农历日重新定位紫微星
    new_ziwei_pos = locate_ziwei(pp.lunar_day, new_wuxing_ju)

    # 天府与紫微关于寅宫对称
    new_tianfu_pos = locate_tianfu(new_ziwei_pos)

    # 从新命宫起排列宫名
    gong_names = _calc_gong_names_from_ming(new_ming_pos)

    return {
        "pan_type": pan_type,
        "ming_gong_pos": new_ming_pos,
        "wuxing_ju": new_wuxing_ju,
        "ziwei_pos": new_ziwei_pos,
        "tianfu_pos": new_tianfu_pos,
        "gong_names": gong_names,
    }


def calc_doujun(ming_gong_pos, liunian_zhi):
    """
    计算斗君宫位

    参数:
      ming_gong_pos: 命宫地支位(1~12)
      liunian_zhi: 流年地支(1~12)

    返回:
      斗君宫位(1~12)
    """
    return _AX_ZNDJ_ARR[ming_gong_pos][liunian_zhi]


def calc_zinian_doujun(ming_gong_pos):
    """
    计算子年斗君（流年地支=1时的斗君位置）

    参数:
      ming_gong_pos: 命宫地支位(1~12)

    返回:
      子年斗君宫位(1~12)
    """
    return _AX_ZNDJ_ARR[ming_gong_pos][1]


# ============================================================
# 统一入口
# ============================================================

def calc_liupan(
    pp: PaipanResult,
    target_year: int,
    target_month: Optional[int] = None,
    target_day: Optional[int] = None,
    target_hour: Optional[int] = None,
) -> LiupanResult:
    """
    六层流盘统一入口

    参数:
      pp: 本命排盘结果（PaipanResult）
      target_year: 目标公历年份
      target_month: 目标公历月份（1~12，可选，提供则计算流月）
      target_day: 目标公历日（1~31，可选，提供则计算流日，依赖 sxtwl）
      target_hour: 目标时辰编号（1~12，可选，提供则计算流时）

    返回:
      LiupanResult 包含6层流盘数据

    说明:
      - 大限、小限、流年始终计算
      - 流月需要 target_month
      - 流日需要 target_month + target_day（依赖 sxtwl 库）
      - 流时需要 target_month + target_day + target_hour
    """
    result = LiupanResult()

    # 计算当前年龄（虚岁）
    # 虚岁 = 目标年份 - 出生年份 + 1
    birth_year = pp.solar_year if pp.solar_year > 0 else 0
    if birth_year > 0:
        age = target_year - birth_year + 1
    else:
        # 无公历出生年时，用年干支推算（近似）
        age = 30  # 默认值，无法精确计算

    # 童限
    result.tongxian = calc_tongxian(pp)

    # 大限序号：根据年龄推算
    # 第N大限: 起始年龄 = wuxing_ju + (N-1)*10
    # 当前年龄 >= 起始年龄 → 确定第几大限
    if age >= pp.wuxing_ju:
        dx_index = (age - pp.wuxing_ju) // 10 + 1
    else:
        dx_index = 1  # 童限，仍取第一大限

    result.daxian = calc_daxian(pp, dx_index)

    # 小限
    result.xiaoxian = calc_xiaoxian(pp, age)

    # 流年
    result.liunian = calc_liunian(pp, target_year)

    # 流月（可选）
    if target_month is not None:
        result.liuyue = calc_liuyue(result.liunian, target_month)

        # 流日（可选，需要 sxtwl）
        if target_day is not None:
            try:
                result.liuri = calc_liuri(result.liuyue, target_year, target_month, target_day)

                # 流时（可选）
                if target_hour is not None:
                    result.liushi = calc_liushi(result.liuri, target_hour)
            except ImportError:
                # sxtwl 不可用时跳过流日和流时
                pass

    return result


# ============================================================
# 输出辅助
# ============================================================

def liupan_summary(lr: LiupanResult) -> str:
    """
    流盘摘要输出

    参数:
      lr: LiupanResult

    返回:
      格式化的摘要字符串
    """
    lines = []
    lines.append("=" * 60)
    lines.append("紫微斗数六层流盘结果")
    lines.append("=" * 60)

    # 大限
    dx = lr.daxian
    lines.append(f"【大限】第{dx.index}大限")
    lines.append(f"  大限命宫: {DIZHI[dx.ming_gong_pos]}宫")
    lines.append(f"  大限天干: {TIANGAN[dx.tiangan]}")
    lines.append(f"  年龄范围: {dx.age_start}~{dx.age_end}岁")
    if dx.sihua:
        lines.append("  大限四化:")
        for hua_name, (sid, sname) in dx.sihua.items():
            lines.append(f"    {hua_name}: {sname}")

    # 小限
    xx = lr.xiaoxian
    lines.append(f"\n【小限】")
    lines.append(f"  小限命宫: {DIZHI[xx.ming_gong_pos]}宫")
    lines.append(f"  小限天干: {TIANGAN[xx.tiangan]}")
    if xx.sihua:
        lines.append("  小限四化:")
        for hua_name, (sid, sname) in xx.sihua.items():
            lines.append(f"    {hua_name}: {sname}")

    # 流年
    ln = lr.liunian
    lines.append(f"\n【流年】{ln.year}年 ({TIANGAN[ln.tiangan]}{DIZHI[ln.dizhi]}年)")
    lines.append(f"  流年命宫: {DIZHI[ln.ming_gong_pos]}宫")
    lines.append(f"  流昌: {DIZHI[ln.liuchang_pos]}宫  流曲: {DIZHI[ln.liuqu_pos]}宫")
    lines.append(f"  限流天马: {DIZHI[ln.liutianma_pos]}宫  限流火星: {DIZHI[ln.liuhuoxing_pos]}宫  限流铃星: {DIZHI[ln.liulingxing_pos]}宫")
    lines.append(f"  限流红鸾: {DIZHI[ln.liuhongluan_pos]}宫  限流天喜: {DIZHI[ln.liutianxi_pos]}宫")
    if ln.sihua:
        lines.append("  流年四化:")
        for hua_name, (sid, sname) in ln.sihua.items():
            lines.append(f"    {hua_name}: {sname}")

    # 流月
    if lr.liuyue:
        ly = lr.liuyue
        lines.append(f"\n【流月】第{ly.month_index}月 ({TIANGAN[ly.tiangan]}{DIZHI[ly.dizhi]}月)")
        lines.append(f"  流月命宫: {DIZHI[ly.ming_gong_pos]}宫")
        if ly.sihua:
            lines.append("  流月四化:")
            for hua_name, (sid, sname) in ly.sihua.items():
                lines.append(f"    {hua_name}: {sname}")

    # 流日
    if lr.liuri:
        lri = lr.liuri
        lines.append(f"\n【流日】{lri.year}-{lri.month:02d}-{lri.day:02d} ({TIANGAN[lri.tiangan]}{DIZHI[lri.dizhi]}日)")
        lines.append(f"  流日命宫: {DIZHI[lri.ming_gong_pos]}宫")
        if lri.sihua:
            lines.append("  流日四化:")
            for hua_name, (sid, sname) in lri.sihua.items():
                lines.append(f"    {hua_name}: {sname}")

    # 流时
    if lr.liushi:
        ls = lr.liushi
        lines.append(f"\n【流时】{DIZHI[ls.hour_index]}时 ({TIANGAN[ls.tiangan]}{DIZHI[ls.dizhi]}时)")
        lines.append(f"  流时命宫: {DIZHI[ls.ming_gong_pos]}宫")
        if ls.sihua:
            lines.append("  流时四化:")
            for hua_name, (sid, sname) in ls.sihua.items():
                lines.append(f"    {hua_name}: {sname}")

    # 童限
    if lr.tongxian:
        tx = lr.tongxian
        lines.append(f"\n【童限】起运年龄: {tx.start_age}岁 ({tx.ju_name})")

    lines.append("=" * 60)
    return "\n".join(lines)
