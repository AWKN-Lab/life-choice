"""
紫占排盘模块

功能：紫微斗数占卜排盘，支持4种起盘方式。
来源：文墨天机紫占功能逆向

用法:
  from zizhan import zizhan_now, zizhan_random, zizhan_number
  result = zizhan_now()       # 当前时刻男盘
  result = zizhan_now(sex=2)  # 当前时刻女盘
  result = zizhan_random()    # 随机起盘
  result = zizhan_number(386) # 报数起盘
"""

from __future__ import annotations
import random
from datetime import datetime
from ziwei import paipan_from_solar, PaipanConfig


def _hour_to_shichen(hour: int) -> int:
    """24小时制→时辰(1~12)
    23:00-01:00=子(1), 01:00-03:00=丑(2), ..., 21:00-23:00=亥(12)
    """
    if hour == 23 or hour == 0:
        return 1
    return (hour + 1) // 2 + 1


def zizhan_now(sex: int = 1, config: PaipanConfig = None) -> dict:
    """当前时刻紫占

    参数:
      sex: 1=男, 2=女
      config: 排盘配置（可选）

    返回:
      排盘结果（PaipanResult，附加 zizhan_mode/zizhan_time 属性）
    """
    now = datetime.now()
    shichen = _hour_to_shichen(now.hour)
    result = paipan_from_solar(now.year, now.month, now.day, shichen, sex, config)
    result.zizhan_mode = "now"
    result.zizhan_time = now.strftime("%Y-%m-%d %H:%M:%S")
    return result


def zizhan_random(sex: int = None, config: PaipanConfig = None) -> dict:
    """随机紫占

    参数:
      sex: 1=男, 2=女, None=随机
      config: 排盘配置（可选）

    返回:
      排盘结果（PaipanResult，附加 zizhan_mode/zizhan_time 属性）
    """
    if sex is None:
        sex = random.choice([1, 2])
    year = random.randint(1940, 2030)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    shichen = random.randint(1, 12)
    result = paipan_from_solar(year, month, day, shichen, sex, config)
    result.zizhan_mode = "random"
    result.zizhan_time = f"{year}-{month:02d}-{day:02d} 时辰{shichen}"
    return result


def zizhan_number(number: int, sex: int = 1, config: PaipanConfig = None) -> dict:
    """报数紫占：1-999 数字映射到时辰

    算法：
      1. 取当前日期
      2. 数字模12映射到时辰
      3. 用当前日期+映射时辰排盘

    参数:
      number: 报数（1~999）
      sex: 1=男, 2=女
      config: 排盘配置（可选）

    返回:
      排盘结果（PaipanResult，附加 zizhan_mode/zizhan_number/zizhan_time 属性）
    """
    if not 1 <= number <= 999:
        raise ValueError("报数范围 1-999")
    now = datetime.now()
    shichen = (number - 1) % 12 + 1
    result = paipan_from_solar(now.year, now.month, now.day, shichen, sex, config)
    result.zizhan_mode = "number"
    result.zizhan_number = number
    result.zizhan_time = now.strftime("%Y-%m-%d") + f" 时辰{shichen}"
    return result


if __name__ == "__main__":
    import json
    import argparse

    parser = argparse.ArgumentParser(description="紫占排盘")
    parser.add_argument("mode", choices=["now", "random", "number"], help="起盘模式")
    parser.add_argument("--number", type=int, help="报数（mode=number时必填）")
    parser.add_argument("--sex", type=int, choices=[1, 2], default=1, help="性别: 1=男 2=女")
    args = parser.parse_args()

    if args.mode == "now":
        result = zizhan_now(sex=args.sex)
    elif args.mode == "random":
        result = zizhan_random(sex=args.sex)
    elif args.mode == "number":
        if not args.number:
            print("错误: mode=number 时需要 --number 参数")
            exit(1)
        result = zizhan_number(args.number, sex=args.sex)

    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
