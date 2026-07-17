#!/usr/bin/env python3
"""
紫微斗数排盘 CLI 接口

用法:
  python paipan_cli.py 1990 6 15 14 1
  python paipan_cli.py 1990 6 15 14 1 --zhongzhou
  python paipan_cli.py --json '{"year":1990,"month":6,"day":15,"hour":14,"sex":1}'

参数:
  year   - 公历年
  month  - 公历月
  day    - 公历日
  hour   - 公历时（24小时制）
  sex    - 性别 1=男 2=女
  --zhongzhou  使用中州派亮度体系（默认全书）
  --pretty     格式化输出
"""

import json
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ziwei import paipan_from_solar, PaipanConfig, STAR_NAMES, DIZHI, TIANGAN, GONG_NAMES, BRIGHTNESS_LABELS_QS, JU_NAMES
from liupan import calc_liupan, LiupanResult, calc_tiandiren_pan, calc_doujun, calc_zinian_doujun
from feixing import calc_zihua_lixin, calc_zihua_xiangxin, calc_laiyin_gong, calc_gonggan_feihua
from bzfc import bzfc
from zizhan import zizhan_now, zizhan_random, zizhan_number
from anxingma import encode_anxingma, decode_anxingma
from modify_pan import modify_pan


def build_cli_output(result, method="quanshu", pretty=False) -> dict:
    """把 PaipanResult 转成 CLI 输出格式"""
    # 时辰 → 24h 中间时间
    shi_chen_map = {
        1: "23:00", 2: "01:00", 3: "03:00", 4: "05:00", 5: "07:00", 6: "09:00",
        7: "11:00", 8: "13:00", 9: "15:00", 10: "17:00", 11: "19:00", 12: "21:00",
    }
    shi_chen_label = {
        1: "子时", 2: "丑时", 3: "寅时", 4: "卯时", 5: "辰时", 6: "巳时",
        7: "午时", 8: "未时", 9: "申时", 10: "酉时", 11: "戌时", 12: "亥时",
    }

    # 星座
    def calc_zodiac(m, d):
        if not (1 <= m <= 12 and 1 <= d <= 31):
            return ""
        signs = [
            ("摩羯", 1, 19), ("水瓶", 2, 18), ("双鱼", 3, 20),
            ("白羊", 4, 19), ("金牛", 5, 20), ("双子", 6, 20),
            ("巨蟹", 7, 22), ("狮子", 8, 22), ("处女", 9, 22),
            ("天秤", 10, 22), ("天蝎", 11, 21), ("射手", 12, 21), ("摩羯", 12, 31),
        ]
        for i, (name, m2, d2) in enumerate(signs):
            if (m, d) <= (m2, d2):
                if i == 0:
                    return "摩羯"
                return signs[i - 1][0]
        return "摩羯"

    # 生肖
    zodiac_map = {
        1: "鼠", 2: "牛", 3: "虎", 4: "兔", 5: "龙", 6: "蛇",
        7: "马", 8: "羊", 9: "猴", 10: "鸡", 11: "狗", 12: "猪",
    }

    # 亮度标签
    if method == "zhongzhou":
        b_labels = ["", "庙", "旺", "平", "闲", "陷"]
    else:
        b_labels = BRIGHTNESS_LABELS_QS

    def b_label(b):
        if 1 <= b < len(b_labels):
            return b_labels[b]
        return ""

    palaces = []
    for g in result.gongs:
        major_stars = []
        minor_stars = []
        adj_stars = []
        for s in g.stars:
            if 1 <= s.name_index <= 14:
                cat = "major"
                arr = major_stars
            elif 15 <= s.name_index <= 26:
                cat = "minor"
                arr = minor_stars
            else:
                cat = "adjective"
                arr = adj_stars

            star_obj = {
                "name": STAR_NAMES.get(s.name_index, f"星{s.name_index}"),
                "type": cat,
                "brightness": b_label(s.brightness),
            }
            if s.sihua > 0:
                hua_map = {1: "禄", 2: "权", 3: "科", 4: "忌"}
                star_obj["mutagen"] = hua_map.get(s.sihua, "")
            arr.append(star_obj)

        palaces.append({
            "index": g.gong_name_index,
            "name": g.gong_name,
            "isBodyPalace": g.gong_name_index == 3,  # 简化: 夫妻宫为身宫（实际按sex区分）
            "heavenlyStem": TIANGAN[g.tiangan] if 1 <= g.tiangan <= 10 else "",
            "earthlyBranch": g.dizhi,
            "majorStars": major_stars,
            "minorStars": minor_stars,
            "adjectiveStars": adj_stars,
        })

    palaces.sort(key=lambda p: p["index"])

    return {
        "solarDate": f"{result.solar_year:04d}-{result.solar_month:02d}-{result.solar_day:02d}" if result.solar_year > 0 else "",
        "lunarDate": f"{TIANGAN[result.year_gan]}{DIZHI[result.year_zhi]}年{result.lunar_month}月{result.lunar_day}日",
        "chineseDate": f"{TIANGAN[result.year_gan]}{DIZHI[result.year_zhi]}年",
        "gender": "male" if result.sex == 1 else "female",
        "time": shi_chen_map.get(result.shi_chen, ""),
        "timeRange": shi_chen_label.get(result.shi_chen, ""),
        "sign": calc_zodiac(result.solar_month, result.solar_day) if result.solar_month > 0 else "",
        "zodiac": zodiac_map.get(result.year_zhi, ""),
        "soul": f"命宫{result.ming_gong_dizhi}",
        "body": f"身宫{result.shen_gong_dizhi}",
        "fiveElementsClass": result.wuxing_ju_name,
        "earthlyBranchOfSoulPalace": result.ming_gong_dizhi,
        "earthlyBranchOfBodyPalace": result.shen_gong_dizhi,
        "palaces": palaces,
    }


def _serialize_sihua(sihua: dict) -> dict:
    """序列化四化字典: {"化禄": (star_id, star_name), ...} → {"化禄": [star_id, star_name], ...}"""
    out = {}
    for k, v in sihua.items():
        if isinstance(v, tuple) and len(v) == 2:
            out[k] = [v[0], v[1]]
        else:
            out[k] = v
    return out


def build_liupan_output(lr: LiupanResult) -> dict:
    """把 LiupanResult 转成 JSON 可序列化的字典"""
    def _safe_tiangan(idx):
        return TIANGAN[idx] if 1 <= idx <= 10 else ""

    def _safe_dizhi(idx):
        return DIZHI[idx] if 1 <= idx <= 12 else ""

    def _safe_gong(idx):
        return GONG_NAMES[idx] if 1 <= idx <= 12 else ""

    def _daxian(d):
        return {
            "index": d.index,
            "ming_gong_pos": d.ming_gong_pos,
            "tiangan": d.tiangan,
            "tiangan_name": _safe_tiangan(d.tiangan),
            "dizhi": d.dizhi,
            "dizhi_name": _safe_dizhi(d.dizhi),
            "age_start": d.age_start,
            "age_end": d.age_end,
            "sihua": _serialize_sihua(d.sihua),
            "gong_names": d.gong_names,
        }

    def _xiaoxian(x):
        return {
            "ming_gong_pos": x.ming_gong_pos,
            "tiangan": x.tiangan,
            "tiangan_name": _safe_tiangan(x.tiangan),
            "dizhi": x.dizhi,
            "dizhi_name": _safe_dizhi(x.dizhi),
            "sihua": _serialize_sihua(x.sihua),
            "gong_names": x.gong_names,
        }

    def _liunian(n):
        out = {
            "year": n.year,
            "ming_gong_pos": n.ming_gong_pos,
            "tiangan": n.tiangan,
            "tiangan_name": _safe_tiangan(n.tiangan),
            "dizhi": n.dizhi,
            "dizhi_name": _safe_dizhi(n.dizhi),
            "sihua": _serialize_sihua(n.sihua),
            "gong_names": n.gong_names,
            "liuchang_pos": n.liuchang_pos,
            "liuqu_pos": n.liuqu_pos,
        }
        return out

    def _liuyue(y):
        return {
            "month_index": y.month_index,
            "ming_gong_pos": y.ming_gong_pos,
            "tiangan": y.tiangan,
            "tiangan_name": _safe_tiangan(y.tiangan),
            "dizhi": y.dizhi,
            "dizhi_name": _safe_dizhi(y.dizhi),
            "sihua": _serialize_sihua(y.sihua),
            "gong_names": y.gong_names,
        }

    def _liuri(r):
        return {
            "year": r.year,
            "month": r.month,
            "day": r.day,
            "ming_gong_pos": r.ming_gong_pos,
            "tiangan": r.tiangan,
            "tiangan_name": _safe_tiangan(r.tiangan),
            "dizhi": r.dizhi,
            "dizhi_name": _safe_dizhi(r.dizhi),
            "sihua": _serialize_sihua(r.sihua),
            "gong_names": r.gong_names,
        }

    def _liushi(s):
        return {
            "hour_index": s.hour_index,
            "ming_gong_pos": s.ming_gong_pos,
            "tiangan": s.tiangan,
            "tiangan_name": _safe_tiangan(s.tiangan),
            "dizhi": s.dizhi,
            "dizhi_name": _safe_dizhi(s.dizhi),
            "sihua": _serialize_sihua(s.sihua),
            "gong_names": s.gong_names,
        }

    out = {
        "daxian": _daxian(lr.daxian),
        "xiaoxian": _xiaoxian(lr.xiaoxian),
        "liunian": _liunian(lr.liunian),
    }
    if lr.liuyue is not None:
        out["liuyue"] = _liuyue(lr.liuyue)
    if lr.liuri is not None:
        out["liuri"] = _liuri(lr.liuri)
    if lr.liushi is not None:
        out["liushi"] = _liushi(lr.liushi)
    return out


def build_feixing_output(result) -> dict:
    """把飞星计算结果转成 JSON 可序列化的字典"""
    # 理心自化
    zihua_lixin = []
    for z in calc_zihua_lixin(result):
        zihua_lixin.append({
            "gong_pos": z.gong_pos,
            "gong_name": z.gong_name,
            "tiangan": z.tiangan,
            "star_name_index": z.star_name_index,
            "star_name": z.star_name,
            "sihua_type": z.sihua_type,
            "sihua_name": z.sihua_name,
            "zihua_type": z.zihua_type,
        })

    # 向心自化
    zihua_xiangxin = []
    for z in calc_zihua_xiangxin(result):
        zihua_xiangxin.append({
            "gong_pos": z.gong_pos,
            "gong_name": z.gong_name,
            "tiangan": z.tiangan,
            "star_name_index": z.star_name_index,
            "star_name": z.star_name,
            "sihua_type": z.sihua_type,
            "sihua_name": z.sihua_name,
            "zihua_type": z.zihua_type,
        })

    # 来因宫
    laiyin_pos = calc_laiyin_gong(result)
    laiyin_name = GONG_NAMES[laiyin_pos] if 1 <= laiyin_pos <= 12 else ""

    # 宫干飞化
    gonggan_feihua = []
    for f in calc_gonggan_feihua(result):
        gonggan_feihua.append({
            "source_gong_pos": f.source_gong_pos,
            "source_gong_name": f.source_gong_name,
            "source_tiangan": f.source_tiangan,
            "star_name_index": f.star_name_index,
            "star_name": f.star_name,
            "sihua_type": f.sihua_type,
            "sihua_name": f.sihua_name,
            "target_gong_pos": f.target_gong_pos,
            "target_gong_name": f.target_gong_name,
        })

    return {
        "zihua_lixin": zihua_lixin,
        "zihua_xiangxin": zihua_xiangxin,
        "laiyin_gong": laiyin_pos,
        "laiyin_gong_name": laiyin_name,
        "gonggan_feihua": gonggan_feihua,
    }


def main():
    parser = argparse.ArgumentParser(description="紫微斗数排盘 CLI")
    parser.add_argument("year", type=int, nargs="?")
    parser.add_argument("month", type=int, nargs="?")
    parser.add_argument("day", type=int, nargs="?")
    parser.add_argument("hour", type=int, nargs="?")
    parser.add_argument("sex", type=int, nargs="?")
    parser.add_argument("--json", type=str, help='JSON 格式输入: {"year":1990,"month":6,"day":15,"hour":14,"sex":1}')
    parser.add_argument("--zhongzhou", action="store_true", help="使用中州派亮度体系")
    parser.add_argument("--xiandai1", action="store_true", help="使用现代派亮度体系1")
    parser.add_argument("--xiandai2", action="store_true", help="使用现代派亮度体系2")
    parser.add_argument("--pretty", action="store_true", help="格式化输出")
    parser.add_argument("--liupan-year", type=int, metavar="YEAR", help="流年年份（如 2026），启用流盘计算")
    parser.add_argument("--liupan-month", type=int, metavar="MONTH", help="流月月份（1~12，可选，需配合 --liupan-year）")
    parser.add_argument("--liupan-day", type=int, metavar="DAY", help="流日日期（1~31，可选，需配合 --liupan-month）")
    parser.add_argument("--liupan-hour", type=int, metavar="HOUR", help="流时时辰（1~12，可选，需配合 --liupan-day）")
    parser.add_argument("--feixing", action="store_true", help="启用飞星盘输出")
    parser.add_argument("--config", type=str, help="排盘配置 JSON 文件路径")
    parser.add_argument("--pan-type", type=int, choices=[1, 2, 3], default=1,
                        help="盘面类型: 1=天盘(默认), 2=地盘, 3=人盘")
    parser.add_argument("--ming-offset", type=int, default=0,
                        help="人盘命宫偏移: 时头+1, 时尾-1")
    parser.add_argument("--doujun", type=int, default=None,
                        help="计算斗君: 传入流年地支(1~12)")

    # === R3/R4/R6/R7 新功能参数 ===
    # R3 四柱反查
    parser.add_argument("--bzfc", action="store_true", help="启用四柱反查模式")
    parser.add_argument("--bzfc-year-gan", type=str, default=None, help="年干(如'庚')")
    parser.add_argument("--bzfc-year-zhi", type=str, default=None, help="年支(如'午')")
    parser.add_argument("--bzfc-month-gz", type=str, default=None, help="月柱干支(如'壬午')")
    parser.add_argument("--bzfc-day-gz", type=str, default=None, help="日柱干支(如'甲寅')")
    parser.add_argument("--bzfc-hour-zhi", type=str, default=None, help="时支(如'寅')")
    parser.add_argument("--bzfc-start-year", type=int, default=1900, help="搜索起始年(默认1900)")
    parser.add_argument("--bzfc-end-year", type=int, default=2100, help="搜索结束年(默认2100)")

    # R4 紫占排盘
    parser.add_argument("--zizhan", type=str, default=None, choices=["now", "random", "number"],
                        help="紫占模式: now=当前时刻, random=随机, number=报数(需配合--zizhan-number)")
    parser.add_argument("--zizhan-number", type=int, default=None, help="报数紫占的数字(1~999)")
    parser.add_argument("--zizhan-sex", type=int, default=1, choices=[1, 2], help="紫占性别(1=男 2=女, 默认1)")

    # R6 安星码
    parser.add_argument("--anxingma", type=str, default=None,
                        help="安星码: 传入5位数字解码为PaipanConfig, 或传入PaipanConfig JSON编码为安星码")

    # R7 命盘调整
    parser.add_argument("--modify", type=str, default=None,
                        help='命盘调整JSON: 如 \'{"ming_gong_pos": 4}\' 或 \'{"star_overrides": {"紫微": 6}}\'')

    args = parser.parse_args()

    # === R3 四柱反查模式 ===
    if args.bzfc:
        try:
            results = bzfc(
                year_gan=args.bzfc_year_gan,
                year_zhi=args.bzfc_year_zhi,
                month_gz=args.bzfc_month_gz,
                day_gz=args.bzfc_day_gz,
                hour_zhi=args.bzfc_hour_zhi,
                start_year=args.bzfc_start_year,
                end_year=args.bzfc_end_year,
            )
            print(json.dumps({"mode": "bzfc", "count": len(results), "results": results},
                             ensure_ascii=False, indent=2 if args.pretty else None))
        except Exception as e:
            print(json.dumps({"error": f"四柱反查失败: {e}"}, ensure_ascii=False))
            sys.exit(1)
        return

    # === R4 紫占排盘模式 ===
    if args.zizhan:
        try:
            if args.zizhan == "now":
                result = zizhan_now(sex=args.zizhan_sex)
            elif args.zizhan == "random":
                result = zizhan_random(sex=args.zizhan_sex)
            elif args.zizhan == "number":
                if args.zizhan_number is None:
                    print(json.dumps({"error": "报数紫占需配合 --zizhan-number"}, ensure_ascii=False))
                    sys.exit(1)
                result = zizhan_number(args.zizhan_number, sex=args.zizhan_sex)
            output = build_cli_output(result, "quanshu")
            output["zizhan_mode"] = getattr(result, "zizhan_mode", args.zizhan)
            if hasattr(result, "zizhan_number"):
                output["zizhan_number"] = result.zizhan_number
            print(json.dumps(output, ensure_ascii=False, indent=2 if args.pretty else None))
        except Exception as e:
            print(json.dumps({"error": f"紫占排盘失败: {e}"}, ensure_ascii=False))
            sys.exit(1)
        return

    # === R6 安星码模式 ===
    if args.anxingma:
        try:
            code = args.anxingma
            if code.isdigit() and len(code) == 5:
                # 5位数字 → 解码为 PaipanConfig
                config = decode_anxingma(code)
                print(json.dumps({"mode": "decode", "code": code,
                                  "config": {"skin": config.skin, "brightness_method": config.brightness_method,
                                             "an_kuiyue": config.an_kuiyue}},
                                 ensure_ascii=False, indent=2 if args.pretty else None))
            else:
                # JSON → 编码为安星码
                cfg_dict = json.loads(code)
                config = PaipanConfig(**cfg_dict)
                encoded = encode_anxingma(config)
                print(json.dumps({"mode": "encode", "code": encoded},
                                 ensure_ascii=False, indent=2 if args.pretty else None))
        except Exception as e:
            print(json.dumps({"error": f"安星码操作失败: {e}"}, ensure_ascii=False))
            sys.exit(1)
        return

    # 解析输入
    if args.json:
        try:
            inp = json.loads(args.json)
            year = inp.get("year")
            month = inp.get("month")
            day = inp.get("day")
            hour = inp.get("hour", 12)
            sex = inp.get("sex", 1)
        except Exception as e:
            print(json.dumps({"error": f"JSON解析失败: {e}"}))
            sys.exit(1)
    elif args.year and args.month and args.day and args.hour is not None and args.sex is not None:
        year, month, day, hour, sex = args.year, args.month, args.day, args.hour, args.sex
    else:
        parser.print_help()
        sys.exit(1)

    # 亮度体系
    method = "quanshu"
    if args.zhongzhou:
        method = "zhongzhou"
    elif args.xiandai1:
        method = "xiandai1"
    elif args.xiandai2:
        method = "xiandai2"

    # 排盘
    try:
        # 解析配置
        pp_config = None
        if args.config:
            with open(args.config, 'r', encoding='utf-8') as f:
                cfg_dict = json.load(f)
            pp_config = PaipanConfig(**cfg_dict)
            # 如果 config 中指定了亮度体系，覆盖命令行参数
            if pp_config.brightness_method != "quanshu":
                method = pp_config.brightness_method

        result = paipan_from_solar(year, month, day, hour, sex, config=pp_config)
        # 如果命令行指定了亮度体系且与 config 不同，以命令行为准
        if method != result.brightness_method:
            result.brightness_method = method

        # R7 命盘调整（在构建输出前应用）
        if args.modify:
            try:
                modifications = json.loads(args.modify)
                result = modify_pan(result, modifications)
            except Exception as e:
                print(json.dumps({"error": f"命盘调整失败: {e}"}, ensure_ascii=False))
                sys.exit(1)

        output = build_cli_output(result, method)

        # 流盘
        if args.liupan_year is not None:
            lr = calc_liupan(
                result,
                target_year=args.liupan_year,
                target_month=args.liupan_month,
                target_day=args.liupan_day,
                target_hour=args.liupan_hour,
            )
            output["liupan"] = build_liupan_output(lr)

        # 飞星盘
        if args.feixing:
            output["feixing"] = build_feixing_output(result)

        # 天地人盘
        if args.pan_type != 1 or args.ming_offset != 0:
            pan_result = calc_tiandiren_pan(result, pan_type=args.pan_type, ming_gong_offset=args.ming_offset)
            pan_type_names = {1: "天盘", 2: "地盘", 3: "人盘"}
            output["tiandiren_pan"] = {
                "pan_type": pan_result["pan_type"],
                "pan_type_name": pan_type_names.get(pan_result["pan_type"], "未知"),
                "ming_gong_pos": pan_result["ming_gong_pos"],
                "ming_gong_dizhi": DIZHI[pan_result["ming_gong_pos"]],
                "wuxing_ju": pan_result["wuxing_ju"],
                "wuxing_ju_name": JU_NAMES.get(pan_result["wuxing_ju"], ""),
                "ziwei_pos": pan_result["ziwei_pos"],
                "ziwei_dizhi": DIZHI[pan_result["ziwei_pos"]],
                "tianfu_pos": pan_result["tianfu_pos"],
                "tianfu_dizhi": DIZHI[pan_result["tianfu_pos"]],
                "gong_names": pan_result["gong_names"],
            }

        # 斗君
        if args.doujun is not None:
            doujun_pos = calc_doujun(result.ming_gong_pos, args.doujun)
            zinian_doujun_pos = calc_zinian_doujun(result.ming_gong_pos)
            output["doujun"] = {
                "ming_gong_pos": result.ming_gong_pos,
                "ming_gong_dizhi": DIZHI[result.ming_gong_pos],
                "liunian_zhi": args.doujun,
                "liunian_dizhi": DIZHI[args.doujun],
                "doujun_pos": doujun_pos,
                "doujun_dizhi": DIZHI[doujun_pos],
                "zinian_doujun_pos": zinian_doujun_pos,
                "zinian_doujun_dizhi": DIZHI[zinian_doujun_pos],
            }

        indent = 2 if args.pretty else None
        print(json.dumps(output, ensure_ascii=False, indent=indent))
    except Exception as e:
        print(json.dumps({"error": f"排盘失败: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
