"""
安星码系统

功能：5位数字编码，批量设置安星参数。
来源：文墨天机安星码系统逆向

编码规则：
  位1：流派/皮肤（0=三合, 1=飞星, 2=四化）
  位2：亮度体系（0=全书, 1=中州, 2=现代一, 3=现代二）
  位3：魁钺安法（1-4）
  位4：四化变体（编码庚/壬/癸等变体组合）
  位5：其他选项（闰月/子时/小限等组合）

用法:
  from anxingma import encode_anxingma, decode_anxingma
  from ziwei import PaipanConfig
  code = encode_anxingma(PaipanConfig())  # 编码
  config = decode_anxingma("00000")       # 解码

已知局限:
  - 位4（四化变体）：理论组合 60 种，实际仅编码 6 种（10%），未覆盖组合塌缩到默认值
  - 位5（其他选项）：理论组合 18 种，实际仅编码 6 种（33%），未覆盖组合塌缩到默认值
"""

from __future__ import annotations
from ziwei import PaipanConfig


# 位1：流派/皮肤
_SKIN_ENCODE = {"sanhe": 0, "feixing": 1, "sihua": 2}
_SKIN_DECODE = {0: "sanhe", 1: "feixing", 2: "sihua"}

# 位2：亮度体系
_BRIGHTNESS_ENCODE = {"quanshu": 0, "zhongzhou": 1, "xiandai1": 2, "xiandai2": 3}
_BRIGHTNESS_DECODE = {0: "quanshu", 1: "zhongzhou", 2: "xiandai1", 3: "xiandai2"}

# 位4：四化变体编码
# 庚干5种 + 壬干3种 + 癸干2种 + 辛干2种 = 12种，用0-9+A-C编码
_SIHUA_ENCODE = {
    # (sihua_geng, sihua_ren, sihua_gui, sihua_xin) → code
    ("ywyt", "lzfw1", "gpjyt1", "jyqc"): 0,  # 默认
    ("ywty", "lzfw1", "gpjyt1", "jyqc"): 1,
    ("ywft", "lzfw2", "gpjyt1", "jyqc"): 2,
    ("ywfx", "lzxw", "gpjyt2", "jyqc"): 3,
    ("ywtx", "lzfw1", "gpjyt2", "jywc"): 4,
    ("ywyt", "lzfw2", "gpjyt2", "jywc"): 5,
}
_SIHUA_DECODE = {v: k for k, v in _SIHUA_ENCODE.items()}

# 位5：其他选项编码
# bit0: run_yue(0=benyue, 1=xiayue, 2=yuezhong)
# bit1: zi_shi(0=dang_ri, 1=ci_ri)
# bit2: xiaoxian_method(0=yinyang, 1=xu_sui, 2=shi_sui)
_MISC_ENCODE = {
    # (run_yue, zi_shi, xiaoxian_method) → code
    ("yuezhong", "dang_ri", "yinyang"): 0,  # 默认
    ("benyue", "dang_ri", "yinyang"): 1,
    ("xiayue", "dang_ri", "yinyang"): 2,
    ("yuezhong", "ci_ri", "yinyang"): 3,
    ("yuezhong", "dang_ri", "xu_sui"): 4,
    ("yuezhong", "dang_ri", "shi_sui"): 5,
}
_MISC_DECODE = {v: k for k, v in _MISC_ENCODE.items()}


def encode_anxingma(config: PaipanConfig) -> str:
    """将 PaipanConfig 编码为 5 位安星码

    参数:
      config: 排盘配置

    返回:
      5 位数字字符串（如 "00000"）
    """
    # 位1：流派
    c1 = _SKIN_ENCODE.get(config.skin, 0)
    # 位2：亮度
    c2 = _BRIGHTNESS_ENCODE.get(config.brightness_method, 0)
    # 位3：魁钺
    c3 = config.an_kuiyue
    # 位4：四化变体
    sihua_key = (config.sihua_geng, config.sihua_ren, config.sihua_gui, config.sihua_xin)
    c4 = _SIHUA_ENCODE.get(sihua_key, 0)
    # 位5：其他
    misc_key = (config.run_yue, config.zi_shi, config.xiaoxian_method)
    c5 = _MISC_ENCODE.get(misc_key, 0)

    return f"{c1}{c2}{c3}{c4}{c5}"


def decode_anxingma(code: str) -> PaipanConfig:
    """将 5 位安星码解码为 PaipanConfig

    参数:
      code: 5 位数字字符串（如 "00000"）

    返回:
      PaipanConfig 排盘配置
    """
    if len(code) != 5:
        raise ValueError(f"安星码必须为5位: {code}")

    config = PaipanConfig()

    # 位1：流派
    config.skin = _SKIN_DECODE.get(int(code[0]), "sanhe")
    # 位2：亮度
    config.brightness_method = _BRIGHTNESS_DECODE.get(int(code[1]), "quanshu")
    # 位3：魁钺
    config.an_kuiyue = int(code[2]) if int(code[2]) in [1, 2, 3, 4] else 1
    # 位4：四化变体
    sihua_key = _SIHUA_DECODE.get(int(code[3]), ("ywyt", "lzfw1", "gpjyt1", "jyqc"))
    config.sihua_geng, config.sihua_ren, config.sihua_gui, config.sihua_xin = sihua_key
    # 位5：其他
    misc_key = _MISC_DECODE.get(int(code[4]), ("yuezhong", "dang_ri", "yinyang"))
    config.run_yue, config.zi_shi, config.xiaoxian_method = misc_key

    return config


if __name__ == "__main__":
    # 测试编码/解码
    config = PaipanConfig()
    code = encode_anxingma(config)
    print(f"默认配置安星码: {code}")

    decoded = decode_anxingma(code)
    print(f"解码后皮肤: {decoded.skin}")
    print(f"解码后亮度: {decoded.brightness_method}")
    print(f"解码后魁钺: {decoded.an_kuiyue}")

    # 验证一致性
    assert decoded.skin == config.skin
    assert decoded.brightness_method == config.brightness_method
    assert decoded.an_kuiyue == config.an_kuiyue
    print("编码→解码一致性验证: PASS")
