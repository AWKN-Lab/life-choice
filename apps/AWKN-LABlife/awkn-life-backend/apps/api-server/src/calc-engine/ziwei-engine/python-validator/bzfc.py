"""
四柱反查模块

功能：给定部分四柱干支信息，反查匹配的公历日期。
来源：文墨天机 bzfc() 函数逆向

用法:
  from bzfc import bzfc
  results = bzfc(year_gan="庚", year_zhi="午", month_gz="壬午", day_gz="甲寅", hour_zhi="寅")
"""

from __future__ import annotations
from datetime import datetime, timedelta

# 天干地支
TIANGAN = ["", "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
DIZHI = ["", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

# 60甲子表
SEXAGENARY = []
for i in range(60):
    tg = (i % 10) + 1
    dz = (i % 12) + 1
    SEXAGENARY.append((tg, dz, f"{TIANGAN[tg]}{DIZHI[dz]}"))


def _gan_from_name(name: str) -> int:
    """天干名→编号(1~10)"""
    for i in range(1, 11):
        if TIANGAN[i] == name:
            return i
    raise ValueError(f"未知天干: {name}")


def _zhi_from_name(name: str) -> int:
    """地支名→编号(1~12)"""
    for i in range(1, 13):
        if DIZHI[i] == name:
            return i
    raise ValueError(f"未知地支: {name}")


def _gz_from_name(gz: str) -> tuple[int, int]:
    """干支名→(天干编号, 地支编号)"""
    for tg, dz, name in SEXAGENARY:
        if name == gz:
            return tg, dz
    raise ValueError(f"未知干支: {gz}")


def _calc_year_pillar(year: int) -> tuple[int, int]:
    """计算年柱（以立春为分界，简化为2月4日）"""
    # 简化：直接按公历年计算
    tg = (year - 4) % 10 + 1
    dz = (year - 4) % 12 + 1
    return tg, dz


def _calc_month_pillar(year: int, month: int, day: int) -> tuple[int, int]:
    """计算月柱（以节气为分界，简化处理）"""
    # 简化：用公历月近似节气月
    # 寅月=2月(立春~惊蛰), 卯月=3月, ... 丑月=1月
    month_zhi_map = {2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 1, 1: 2}
    dz = month_zhi_map.get(month, 1)

    # 月干：五虎遁
    year_tg = (year - 4) % 10 + 1
    # 甲己年→丙寅月起, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
    yin_tg_map = {1: 3, 6: 3, 2: 5, 7: 5, 3: 7, 8: 7, 4: 9, 9: 9, 5: 1, 10: 1}
    yin_tg = yin_tg_map[year_tg]
    # 寅月天干=yin_tg, 卯月=yin_tg+1, ...
    month_offset = (dz - 3) % 12
    tg = ((yin_tg - 1 + month_offset) % 10) + 1
    return tg, dz


def _calc_day_pillar(year: int, month: int, day: int) -> tuple[int, int]:
    """计算日柱（基于已知基准日推算）"""
    # 基准：1900年1月1日 = 甲戌日 (tg=1, dz=11)
    base_date = datetime(1900, 1, 1)
    base_idx = 10  # 甲戌在60甲子中的索引(0-based): (1-1)%10=0, (11-1)%12=10 → 10
    target_date = datetime(year, month, day)
    days_diff = (target_date - base_date).days
    idx = (base_idx + days_diff) % 60
    tg, dz, _ = SEXAGENARY[idx]
    return tg, dz


def _calc_hour_pillar(day_tg: int, hour: int) -> tuple[int, int]:
    """计算时柱"""
    # 时辰：23:00-01:00=子(1), 01:00-03:00=丑(2), ...
    shichen = (hour + 1) // 2 + 1
    if shichen > 12:
        shichen -= 12
    # 五鼠遁：甲己日→甲子时起, 乙庚→丙子, 丙辛→戊子, 丁壬→庚子, 戊癸→壬子
    zi_tg_map = {1: 1, 6: 1, 2: 3, 7: 3, 3: 5, 8: 5, 4: 7, 9: 7, 5: 9, 10: 9}
    zi_tg = zi_tg_map[day_tg]
    hour_offset = shichen - 1
    tg = ((zi_tg - 1 + hour_offset) % 10) + 1
    return tg, shichen


def bzfc(
    year_gan: str = None,
    year_zhi: str = None,
    month_gz: str = None,
    day_gz: str = None,
    hour_zhi: str = None,
    start_year: int = 1900,
    end_year: int = 2100,
    max_results: int = 100,
) -> list[dict]:
    """四柱反查：给定部分四柱信息，反查匹配的公历日期

    参数:
      year_gan: 年干名（如"庚"），可选
      year_zhi: 年支名（如"午"），可选
      month_gz: 月柱干支（如"壬午"），可选
      day_gz: 日柱干支（如"甲寅"），可选
      hour_zhi: 时支名（如"寅"），可选
      start_year: 搜索起始年
      end_year: 搜索结束年
      max_results: 最大返回结果数

    返回:
      匹配的日期列表 [{"year":..., "month":..., "day":..., "hour":..., "pillars":{...}}]
    """
    # 解析输入条件
    target_year_tg = _gan_from_name(year_gan) if year_gan else None
    target_year_dz = _zhi_from_name(year_zhi) if year_zhi else None
    target_month_tg, target_month_dz = _gz_from_name(month_gz) if month_gz else (None, None)
    target_day_tg, target_day_dz = _gz_from_name(day_gz) if day_gz else (None, None)
    target_hour_dz = _zhi_from_name(hour_zhi) if hour_zhi else None

    results = []

    for year in range(start_year, end_year + 1):
        # 年柱匹配检查
        y_tg, y_dz = _calc_year_pillar(year)
        if target_year_tg and y_tg != target_year_tg:
            continue
        if target_year_dz and y_dz != target_year_dz:
            continue

        for month in range(1, 13):
            for day in range(1, 32):
                try:
                    # 验证日期有效性
                    datetime(year, month, day)
                except ValueError:
                    continue

                # 月柱匹配检查
                if month_gz:
                    m_tg, m_dz = _calc_month_pillar(year, month, day)
                    if m_tg != target_month_tg or m_dz != target_month_dz:
                        continue

                # 日柱匹配检查
                if day_gz:
                    d_tg, d_dz = _calc_day_pillar(year, month, day)
                    if d_tg != target_day_tg or d_dz != target_day_dz:
                        continue

                # 时柱匹配检查（如果有时支条件，检查所有12个时辰）
                if target_hour_dz:
                    # 找到匹配的时辰
                    for h in range(24):
                        shichen = (h + 1) // 2 + 1
                        if shichen > 12:
                            shichen -= 12
                        if shichen == target_hour_dz:
                            d_tg, _ = _calc_day_pillar(year, month, day)
                            htg, hdz = _calc_hour_pillar(d_tg, h)
                            results.append({
                                "year": year, "month": month, "day": day, "hour": h,
                                "pillars": {
                                    "year": f"{TIANGAN[y_tg]}{DIZHI[y_dz]}",
                                    "month": f"{TIANGAN[m_tg]}{DIZHI[m_dz]}" if month_gz else f"{TIANGAN[_calc_month_pillar(year,month,day)[0]]}{DIZHI[_calc_month_pillar(year,month,day)[1]]}",
                                    "day": f"{TIANGAN[d_tg]}{DIZHI[d_dz]}" if day_gz else f"{TIANGAN[_calc_day_pillar(year,month,day)[0]]}{DIZHI[_calc_day_pillar(year,month,day)[1]]}",
                                    "hour": f"{TIANGAN[htg]}{DIZHI[hdz]}",
                                }
                            })
                            if len(results) >= max_results:
                                return results
                else:
                    # 无时辰条件，返回日期
                    d_tg, d_dz = _calc_day_pillar(year, month, day)
                    m_tg2, m_dz2 = _calc_month_pillar(year, month, day)
                    results.append({
                        "year": year, "month": month, "day": day, "hour": None,
                        "pillars": {
                            "year": f"{TIANGAN[y_tg]}{DIZHI[y_dz]}",
                            "month": f"{TIANGAN[m_tg2]}{DIZHI[m_dz2]}",
                            "day": f"{TIANGAN[d_tg]}{DIZHI[d_dz]}",
                            "hour": None,
                        }
                    })
                    if len(results) >= max_results:
                        return results

    return results


if __name__ == "__main__":
    import json
    import argparse

    parser = argparse.ArgumentParser(description="四柱反查")
    parser.add_argument("--year-gan", type=str, help="年干（如 庚）")
    parser.add_argument("--year-zhi", type=str, help="年支（如 午）")
    parser.add_argument("--month-gz", type=str, help="月柱干支（如 壬午）")
    parser.add_argument("--day-gz", type=str, help="日柱干支（如 甲寅）")
    parser.add_argument("--hour-zhi", type=str, help="时支（如 寅）")
    parser.add_argument("--start-year", type=int, default=1980, help="起始年")
    parser.add_argument("--end-year", type=int, default=2030, help="结束年")
    parser.add_argument("--max-results", type=int, default=20, help="最大结果数")
    args = parser.parse_args()

    results = bzfc(
        year_gan=args.year_gan,
        year_zhi=args.year_zhi,
        month_gz=args.month_gz,
        day_gz=args.day_gz,
        hour_zhi=args.hour_zhi,
        start_year=args.start_year,
        end_year=args.end_year,
        max_results=args.max_results,
    )

    print(json.dumps(results, ensure_ascii=False, indent=2))
    print(f"\n共找到 {len(results)} 个匹配日期")
