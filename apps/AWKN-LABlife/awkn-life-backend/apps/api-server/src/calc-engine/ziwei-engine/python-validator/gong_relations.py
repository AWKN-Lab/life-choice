"""紫微斗数宫位关系引擎（逆向自文墨天机 v2.0.15）

提供函数:
  sanfang(gong)   - 三方宫
  sizheng(gong)   - 四正宫
  duigong(gong)   - 对宫
  anhe_gong(gong) - 暗合宫
  jiagong(gong)   - 夹宫
  huizhao(gong)   - 会照宫
  gong_to_dizhi(gong_num) - 宫位→地支
  dizhi_to_gong(dz)       - 地支→宫位
"""

GONG_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母']

DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

LIUHE = {'子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午'}

SANHE = {'申子辰': ['申', '子', '辰'], '亥卯未': ['亥', '卯', '未'], '寅午戌': ['寅', '午', '戌'], '巳酉丑': ['巳', '酉', '丑']}

def gong_to_dizhi(gong_num: int) -> str:
    """宫位序号(1-12) → 地支"""
    gong_dz = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]
    return gong_dz[(gong_num - 1) % 12]

def dizhi_to_gong(dz: str) -> int:
    """地支 → 宫位序号(1-12)"""
    mapping = {"寅": 1, "卯": 2, "辰": 3, "巳": 4, "午": 5, "未": 6,
               "申": 7, "酉": 8, "戌": 9, "亥": 10, "子": 11, "丑": 12}
    return mapping.get(dz, 0)

def sanfang(gong_num: int) -> list:
    """三方宫（本宫的三合局另两宫）"""
    dz = gong_to_dizhi(gong_num)
    for members in SANHE.values():
        if dz in members:
            return sorted([dizhi_to_gong(d) for d in members if d != dz])
    return []

def sizheng(gong_num: int) -> list:
    """四正宫（本宫+对宫+三方宫）"""
    return sorted(set([gong_num, duigong(gong_num)] + sanfang(gong_num)))

def duigong(gong_num: int) -> int:
    """对宫（地支六冲）"""
    chong = {"子": "午", "午": "子", "丑": "未", "未": "丑",
             "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
             "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳"}
    dz = gong_to_dizhi(gong_num)
    return dizhi_to_gong(chong[dz])

def anhe_gong(gong_num: int) -> int:
    """暗合宫（地支六合）"""
    dz = gong_to_dizhi(gong_num)
    return dizhi_to_gong(LIUHE[dz])

def jiagong(gong_num: int) -> list:
    """夹宫（前后邻宫）"""
    return [((gong_num - 2) % 12) + 1, (gong_num % 12) + 1]

def huizhao(gong_num: int) -> list:
    """会照宫位（三方+对宫）"""
    return sorted(set([gong_num, duigong(gong_num)] + sanfang(gong_num)))

# 自测
if __name__ == "__main__":
    for i in range(1, 13):
        dz = gong_to_dizhi(i)
        print(f"宫{i:2d}({dz}): 对宫={duigong(i)}, 三方={sanfang(i)}, 暗合={anhe_gong(i)}")
