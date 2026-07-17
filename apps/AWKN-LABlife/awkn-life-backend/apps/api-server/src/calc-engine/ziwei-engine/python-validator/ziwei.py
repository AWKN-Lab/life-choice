"""
紫微斗数排盘核心模块

基于文墨天机 AS3 反编译算法逆向实现
纯 Python 标准库，无外部依赖

功能：
  1. 命宫/身宫定位
  2. 五虎遁天干推算
  3. 五行局数计算
  4. 紫微/天府安星
  5. 十四主星安星
  6. 四化飞星
  7. 辅星安星（文昌文曲/左辅右弼/天魁天钺/禄存天马/擎羊陀罗）
  8. 排盘主函数
"""

from __future__ import annotations
import json
import os
from dataclasses import dataclass, field
from typing import Optional


# ============================================================
# 常量定义
# ============================================================

# 天干名称（1=甲 ~ 10=癸）
TIANGAN = ["", "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]

# 地支名称（1=子 ~ 12=亥）
DIZHI = ["", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

# 十二宫名称（1=命宫 ~ 12=父母宫）
GONG_NAMES = ["", "命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫",
              "迁移宫", "交友宫", "官禄宫", "田宅宫", "福德宫", "父母宫"]

# 十四主星编号→名称
STAR_NAMES_14 = {
    1: "紫微", 2: "天机", 3: "太阳", 4: "武曲", 5: "天同", 6: "廉贞", 7: "天府",
    8: "太阴", 9: "贪狼", 10: "巨门", 11: "天相", 12: "天梁", 13: "七杀", 14: "破军"
}

# 辅星编号→名称
STAR_NAMES_AUX = {
    15: "文昌", 16: "文曲", 17: "左辅", 18: "右弼",
    19: "天魁", 20: "天钺", 21: "禄存", 22: "天马",
    25: "擎羊", 26: "陀罗", 27: "地空", 28: "地劫",
    23: "火星", 24: "铃星"
}

# 杂曜编号→名称（29~81+）
# 来源：文墨天机 stars_noWrap_CHS 提取 + 紫微斗数传统星名
STAR_NAMES_ZAYAO = {
    # === 生年系杂曜（按出生年份定位）===
    29: "天福",   # 月支定位
    30: "天官",   # 月支定位
    31: "天刑",   # 日地支定位
    32: "八座",   # 从紫微宫起算
    33: "三台",   # 从紫微宫起算
    34: "天才",   # 从命宫逆行
    35: "天月",   # 年支定位（简化）
    36: "天空",   # 命宫对宫起逆行
    37: "天姚",   # 从命宫顺行
    38: "天哭",   # 年支后4位
    39: "天喜",   # 从卯起年支顺行
    40: "天虚",   # 年支前4位
    41: "天贵",   # 年支查表
    42: "天寿",   # 从身宫顺行
    43: "天德",   # 年干查表
    44: "天厨",   # 日地支/日天干查表
    45: "天伤",   # 年支查表
    46: "天使",   # 年支查表
    47: "天殳",   # 年支查表
    48: "孤辰",   # 年支后3位
    49: "咸池",   # 年支三合前一辰
    50: "封诰",   # 命宫顺行
    51: "红鸾",   # 从酉起年支逆行
    52: "恩光",   # 命宫顺行
    53: "破碎",   # 年支查表
    54: "阴煞",   # 年支查表
    55: "华盖",   # 年支三合末位
    56: "解神",   # 年支查表
    57: "寡宿",   # 年支前3位
    58: "亡神",   # 年支查表
    59: "蜚廉",   # 年支查表

    # === 博士十二神（传统序列：博士→力士→青龙→奏书→官府→飞廉→伏兵→白虎→丧门→吊客→病符→大耗）===
    60: "官府",   # _BOSHI_SHEN 序列位 5
    61: "力士",
    62: "白虎",
    63: "吊客",
    64: "病符",
    65: "太岁",   # 补充位
    66: "太阳(将前)",   # 将前十二神位，非主星太阳
    67: "太阴(将前)",   # 将前十二神位，非主星太阴
    68: "天刑(将前)",  # 将前十二神位
    69: "天德(将前)",  # 将前十二神位
    70: "青龙",
    71: "奏书",
    72: "飞廉",
    73: "伏兵",
    74: "丧门",
    75: "博士",

    # === 长生十二神（长生→沐浴→冠带→临官→帝旺→衰→病→死→墓→绝→胎→养）===
    76: "长生",

    # === 神煞类 ===
    77: "截空",   # 年干查表
    78: "旬空",   # 截空后一位
    79: "日德",   # 日干查表
    80: "劫煞",   # 年支查表
    81: "龙德",   # 年支查表
}

# 合并星曜名称（14 主星 + 辅星 + 杂曜）
STAR_NAMES = {**STAR_NAMES_14, **STAR_NAMES_AUX, **STAR_NAMES_ZAYAO}

# 五虎遁表：年干→寅宫天干（1=甲~10=癸）
# 甲→丙寅, 乙→戊寅, 丙→庚寅, 丁→壬寅, 戊→甲寅,
# 己→丙寅, 庚→戊寅, 辛→庚寅, 壬→壬寅, 癸→甲寅
WU_HU_DUN = [0, 3, 5, 7, 9, 1, 3, 5, 7, 9, 1]

# 五行局数表 _AX_WXJS_ARR（6×7矩阵）
# 行=五行局类型(1=水 2=木 3=金 4=土 5=火), 列=命宫地支半值(1~6)
WUXING_JU_TABLE = [
    [0, 0, 0, 0, 0, 0, 0],       # 行0: 占位
    [0, 2, 6, 3, 5, 4, 6],       # 行1: 水→局数
    [0, 6, 5, 4, 3, 2, 5],       # 行2: 木→局数
    [0, 5, 3, 2, 4, 6, 3],       # 行3: 金→局数
    [0, 3, 4, 6, 2, 5, 4],       # 行4: 土→局数
    [0, 4, 2, 5, 6, 3, 2],       # 行5: 火→局数
]

# 五行局数名称
JU_NAMES = {2: "水二局", 3: "木三局", 4: "金四局", 5: "土五局", 6: "火六局"}

# 天府与紫微关于寅宫对称的映射表
# 紫微宫位(1~12) → 天府宫位(1~12)
TIANFU_MAP = [0, 5, 4, 3, 2, 1, 12, 11, 10, 9, 8, 7, 6]

# 紫微系主星偏移（相对紫微宫位，负=逆时针）
ZIWEI_SERIES = {
    1: 0,    # 紫微
    2: -1,   # 天机
    3: -3,   # 太阳
    4: -4,   # 武曲
    5: -5,   # 天同
    6: -8,   # 廉贞
}

# 天府系主星偏移（相对天府宫位，正=顺时针）
TIANFU_SERIES = {
    7: 0,    # 天府
    8: +1,   # 太阴
    9: +2,   # 贪狼
    10: +3,  # 巨门
    11: +4,  # 天相
    12: +5,  # 天梁
    13: +6,  # 七杀
    14: +10, # 破军
}

# 默认四化表（十天干→[化禄星编号, 化权星编号, 化科星编号, 化忌星编号]）
SIHUA_TABLE = {
    1: [6, 14, 4, 3],     # 甲: 廉贞/破军/武曲/太阳
    2: [2, 12, 1, 8],     # 乙: 天机/天梁/紫微/太阴
    3: [5, 2, 15, 6],     # 丙: 天同/天机/文昌/廉贞
    4: [8, 5, 2, 10],     # 丁: 太阴/天同/天机/巨门
    5: [9, 8, 18, 2],     # 戊: 贪狼/太阴/右弼/天机
    6: [4, 9, 12, 16],    # 己: 武曲/贪狼/天梁/文曲
    7: [3, 4, 8, 5],      # 庚: 太阳/武曲/太阴/天同
    8: [10, 3, 16, 15],   # 辛: 巨门/太阳/文曲/文昌
    9: [12, 1, 17, 4],    # 壬: 天梁/紫微/左辅/武曲
    10: [14, 10, 8, 9],   # 癸: 破军/巨门/太阴/贪狼
}

# 四化名称
SIHUA_NAMES = {1: "化禄", 2: "化权", 3: "化科", 4: "化忌"}

# 命主星表（按命宫地支查，1=子~12=亥）
MINGZHU_TABLE = [0, 9, 10, 21, 16, 6, 4, 14, 4, 6, 16, 21, 10]

# 命主星表 — 中州派（按年支查，1=子~12=亥）
MINGZHU_BY_YEAR = [0, 9, 10, 21, 16, 6, 4, 14, 4, 6, 16, 21, 10]

# 身主星表（按年支查，1=子~12=亥）
SHENZHU_TABLE = [0, 23, 11, 12, 5, 15, 2, 23, 11, 12, 5, 15, 2]

# 昌曲安星表（索引=时辰1~12，值=[文昌位, 文曲位]）
CQ_ARR = [
    [0, 0], [11, 5], [10, 6], [9, 7], [8, 8], [7, 9],
    [6, 10], [5, 11], [4, 12], [3, 1], [2, 2], [1, 3], [12, 4]
]

# 左辅右弼安星表（索引=月支1~12，值=[左辅位, 右弼位]）
ZY_ARR = [
    [0, 0], [5, 11], [6, 10], [7, 9], [8, 8], [9, 7],
    [10, 6], [11, 5], [12, 4], [1, 3], [2, 2], [3, 1], [4, 12]
]

# 天魁天钺安星表（索引=年干1~10，值=[天魁位, 天钺位]）— 版本1: 默认（向后兼容P2）
KY_ARR = [
    [0, 0], [2, 8], [1, 9], [12, 10], [12, 10], [2, 8],
    [1, 9], [2, 8], [3, 7], [4, 6], [4, 6]
]

# 天魁天钺安星表 — 版本2: 庚辛逢马虎（庚=[3,7], 辛=[4,6]）
KY_ARR2 = [
    [0, 0], [2, 8], [1, 9], [12, 10], [12, 10], [2, 8],
    [1, 9], [3, 7], [4, 6], [4, 6], [4, 6]
]

# 天魁天钺安星表 — 版本3: 庚辛逢虎马（庚=[2,8], 辛=[3,7]）
KY_ARR3 = [
    [0, 0], [2, 8], [1, 9], [12, 10], [12, 10], [2, 8],
    [1, 9], [2, 8], [3, 7], [4, 6], [4, 6]
]

# 天魁天钺安星表 — 版本4: 六辛逢马虎（庚=[3,7], 辛=[4,6]）
KY_ARR4 = [
    [0, 0], [2, 8], [1, 9], [12, 10], [12, 10], [2, 8],
    [1, 9], [3, 7], [4, 6], [4, 6], [4, 6]
]

# 魁钺表映射（method → 表）
KY_ARR_MAP = {1: KY_ARR, 2: KY_ARR2, 3: KY_ARR3, 4: KY_ARR4}

# 禄存安星表（索引=年干1~10，值=禄存所在宫位）
LUCUN_ARR = [0, 2, 3, 6, 6, 6, 9, 9, 9, 12, 12]

# 天马安星表（索引=年支1~12，值=天马所在宫位）
TIANMA_ARR = [0, 3, 11, 3, 11, 3, 11, 3, 11, 3, 11, 3, 11]

# 天马安星表 — 月支版（索引=月支1~12，值=天马所在宫位）
TIANMA_MONTH_ARR = [0, 3, 11, 3, 11, 3, 11, 3, 11, 3, 11, 3, 11]

# 擎羊陀罗：擎羊=禄存前1宫，陀罗=禄存后1宫
# 由禄存位直接推算，无需额外查表

# 全书版亮度表（14主星×12宫位）
# 行索引=星曜编号(1~14), 列索引=宫位编号(1~12)
# 值: 0=无, 1=庙, 2=旺, 3=得, 4=利, 5=平, 6=不, 7=陷
BRIGHTNESS_QS_14 = {
    1:  [0, 5, 1, 2, 2, 3, 2, 1, 1, 2, 2, 3, 2],   # 紫微
    2:  [0, 1, 7, 3, 2, 4, 6, 7, 1, 7, 3, 2, 7],   # 天机
    3:  [0, 7, 6, 2, 1, 4, 2, 2, 2, 3, 3, 5, 6],   # 太阳
    4:  [0, 4, 1, 3, 6, 6, 1, 4, 1, 3, 6, 6, 1],   # 武曲
    5:  [0, 4, 6, 7, 6, 6, 1, 7, 4, 6, 6, 1, 7],   # 天同
    6:  [0, 5, 6, 3, 5, 6, 7, 1, 5, 6, 3, 5, 6, 7], # 廉贞
    7:  [0, 1, 1, 1, 3, 1, 3, 4, 1, 3, 4, 1, 3],   # 天府
    8:  [0, 1, 1, 3, 7, 7, 7, 7, 6, 6, 4, 4, 1],   # 太阴
    9:  [0, 4, 1, 7, 5, 1, 7, 4, 1, 7, 5, 1, 7],   # 贪狼
    10: [0, 1, 7, 2, 7, 7, 6, 7, 1, 7, 2, 7, 6],   # 巨门
    11: [0, 1, 1, 1, 7, 7, 1, 7, 1, 1, 7, 7, 1],   # 天相
    12: [0, 1, 1, 3, 1, 1, 1, 4, 1, 3, 7, 1, 7],   # 天梁
    13: [0, 4, 1, 1, 4, 1, 4, 6, 4, 1, 1, 4, 1],   # 七杀
    14: [0, 4, 3, 6, 7, 3, 6, 7, 4, 3, 6, 7, 3],   # 破军
}

# 亮度标签
BRIGHTNESS_LABELS_QS = ["", "庙", "旺", "得", "利", "平", "不", "陷"]
BRIGHTNESS_LABELS_ZZ = ["", "庙", "旺", "平", "闲", "陷"]


# ============================================================
# 数据类
# ============================================================

@dataclass
class Star:
    """星曜数据"""
    name_index: int       # 星曜编号
    gong_pos: int         # 所在宫位(1~12)
    brightness: int = 0   # 亮度等级
    sihua: int = 0        # 四化标记(0=无, 1=化禄, 2=化权, 3=化科, 4=化忌)

    @property
    def name(self) -> str:
        return STAR_NAMES.get(self.name_index, f"星{self.name_index}")

    @property
    def brightness_label(self) -> str:
        if 1 <= self.brightness <= 7:
            return BRIGHTNESS_LABELS_QS[self.brightness]
        return ""

    @property
    def sihua_label(self) -> str:
        return SIHUA_NAMES.get(self.sihua, "")


@dataclass
class Gong:
    """宫位数据"""
    pos: int              # 宫位编号(1~12, 对应地支)
    dizhi: str = ""       # 地支名
    tiangan: int = 0      # 天干编号(1~10)
    gong_name: str = ""   # 宫名(命宫/兄弟宫/...)
    gong_name_index: int = 0  # 宫名编号(1=命宫~12=父母宫)
    stars: list[Star] = field(default_factory=list)

    @property
    def tiangan_name(self) -> str:
        return TIANGAN[self.tiangan] if 1 <= self.tiangan <= 10 else ""

    def add_star(self, star: Star) -> None:
        self.stars.append(star)

    def get_main_stars(self) -> list[Star]:
        """获取主星（编号1~14）"""
        return [s for s in self.stars if 1 <= s.name_index <= 14]

    def get_aux_stars(self) -> list[Star]:
        """获取辅星（编号15~28）"""
        return [s for s in self.stars if 15 <= s.name_index <= 28]


@dataclass
class PaipanConfig:
    """排盘配置（对应文墨天机 pp_cfg_* 配置项）"""

    # --- 安星规则 ---
    an_tianma: str = "year_zhi"       # 安天马: "year_zhi"(年支,默认) / "month_zhi"(月支)
    an_tiankong: str = "standard"     # 安天空: "standard"(常规,默认) / "shun_jia"(顺加生时)
    an_kuiyue: int = 1                # 安魁钺: 1=六辛逢虎马(默认) / 2=庚辛逢马虎 / 3=庚辛逢虎马 / 4=六辛逢马虎
    an_mingzhu: str = "quanshu"       # 安命主: "quanshu"(斗数全书,默认) / "zhongzhou"(中州派)
    an_changsheng: str = "yinyang"    # 长生十二神: "yinyang"(区分阴阳顺逆,默认) / "shuitu"(水土共长生) / "huotu"(火土共长生)
    an_jkxk: str = "double"          # 截空旬空: "single"(常规单星法) / "double"(正副双星法,默认) / "zhanyan"(占验派)
    an_tianshi: str = "standard"      # 天使天伤: "standard"(常规) / "zhongzhou"(中州派)

    # --- 四化配置 ---
    sihua_jia: str = "lpwy"          # 甲干四化: "lpwy"(廉破武阳,默认) / "lpqy"(廉破曲阳)
    sihua_wu: str = "tyyouj"         # 戊干四化: "tyyouj"(贪阴右机,默认) / "tyyangj"(贪阴阳机)
    sihua_geng: str = "ywyt"         # 庚干四化: "ywyt"(阳武阴同,默认) / "ywty"(阳武同阴) / "ywft"(阳武府同) / "ywfx"(阳武府相) / "ywtx"(阳武同相)
    sihua_xin: str = "jyqc"          # 辛干四化: "jyqc"(巨阳曲昌,默认) / "jywc"(巨阳武昌)
    sihua_ren: str = "lzfw1"         # 壬干四化: "lzfw1"(梁紫辅武,默认) / "lzfw2"(梁紫府武) / "lzxw"(梁紫相武)
    sihua_gui: str = "gpjyt1"        # 癸干四化: "gpjyt1"(破巨阴贪,默认) / "gpjyt2"(破巨阳贪)

    # --- 亮度体系 ---
    brightness_method: str = "quanshu"  # 星曜亮度: "quanshu"(斗数全书,默认) / "zhongzhou"(中州派) / "xiandai1"(现代修订一) / "xiandai2"(现代修订二)

    # --- 闰月子时 ---
    run_yue: str = "yuezhong"        # 闰月处理: "benyue"(视为本月) / "xiayue"(视为下月) / "yuezhong"(月中分界,默认)
    zi_shi: str = "dang_ri"          # 子时处理: "dang_ri"(当日,默认) / "ci_ri"(次日) / "dang_ri_bz1"(日柱时柱均当日) / "dang_ri_bz2"(日柱当日时柱次日)

    # --- 流盘配置 ---
    liunian_sihua: str = "year_gan"  # 流年四化: "year_gan"(流年天干,默认) / "gong_gan"(流年命宫天干)
    xiaoxian_method: str = "yinyang" # 小限起法: "yinyang"(区分阴阳,默认) / "xu_sui"(虚岁) / "shi_sui"(实岁)

    # --- 流派/皮肤 ---
    skin: str = "sanhe"              # 流派: "sanhe"(三合,默认) / "feixing"(飞星) / "sihua"(四化)

    # --- 运曜和流曜（对应文墨天机 pp_cfg_3h_* 配置项） ---
    show_yunliuyao: bool = True      # 显示运曜和流曜总开关
    show_liutianma: bool = True      # 限流天马星
    show_liuhuoling: bool = True     # 限流火星铃星
    show_liuluanxi: bool = True      # 限流红鸾天喜
    show_liuchangqu: bool = True     # 限流文昌文曲
    yly_simplified: bool = False     # 精简模式下显示运曜和流曜


@dataclass
class PaipanResult:
    """排盘结果"""
    # 输入参数
    year_gan: int = 0         # 年干(1~10)
    year_zhi: int = 0         # 年支(1~12)
    lunar_month: int = 0      # 农历月
    lunar_day: int = 0        # 农历日
    shi_chen: int = 0         # 时辰(1~12)
    sex: int = 1              # 性别(1=男, 2=女)

    # 核心结果
    ming_gong_pos: int = 0    # 命宫地支位(1~12)
    shen_gong_pos: int = 0    # 身宫地支位(1~12)
    wuxing_ju: int = 0        # 五行局数(2/3/4/5/6)
    ziwei_pos: int = 0        # 紫微星宫位(1~12)
    tianfu_pos: int = 0       # 天府星宫位(1~12)
    mingzhu: int = 0          # 命主星编号
    shenzhu: int = 0          # 身主星编号

    # 十二宫数据
    gongs: list[Gong] = field(default_factory=list)

    # 四化
    sihua: dict[str, tuple[int, str]] = field(default_factory=dict)
    # 例: {"化禄": (6, "廉贞"), "化权": (14, "破军"), ...}

    # 格局匹配
    geju_matched: list = field(default_factory=list)     # 命中格局ID列表
    geju_details: list = field(default_factory=list)     # 命中格局详情 [{id, name, reason, ...}]

    # 输入公历日期（如存在）
    solar_year: int = 0
    solar_month: int = 0
    solar_day: int = 0
    brightness_method: str = "quanshu"
    config: PaipanConfig | None = None  # 排盘配置
    warnings: list[str] = field(default_factory=list)  # 排盘警告信息

    @property
    def wuxing_ju_name(self) -> str:
        return JU_NAMES.get(self.wuxing_ju, f"未知({self.wuxing_ju})")

    @property
    def ming_gong_dizhi(self) -> str:
        return DIZHI[self.ming_gong_pos]

    @property
    def shen_gong_dizhi(self) -> str:
        return DIZHI[self.shen_gong_pos]

    def get_gong(self, pos: int) -> Gong:
        """获取指定宫位"""
        for g in self.gongs:
            if g.pos == pos:
                return g
        raise ValueError(f"宫位 {pos} 不存在")

    def _get_brightness_label(self, b: int) -> str:
        """根据亮度体系返回标签"""
        if self.brightness_method == "zhongzhou":
            labels = ["", "庙", "旺", "平", "闲", "陷"]
        else:
            labels = BRIGHTNESS_LABELS_QS
        if 1 <= b < len(labels):
            return labels[b]
        return ""

    def to_ziwei_chart_input(self) -> dict:
        """
        导出为 ZiweiChartInput 兼容格式（人生决策宗师前端）

        返回结构：
        {
          "solarDate": "1990-01-15",
          "lunarDate": "己巳年腊月十九",
          "chineseDate": "己巳年丙子月庚寅日",
          "gender": "M",
          "time": "14:00",
          "timeRange": "未时",
          "sign": "摩羯",
          "zodiac": "蛇",
          "soul": "命宫紫微在寅",
          "body": "身宫在申",
          "fiveElementsClass": "火六局",
          "earthlyBranchOfSoulPalace": "寅",
          "earthlyBranchOfBodyPalace": "申",
          "palaces": [
            {
              "index": 1,
              "name": "命宫",
              "heavenlyStem": "甲",
              "earthlyBranch": "子",
              "majorStars": [{"name": "紫微", "type": "major", "brightness": "庙", "mutagen": "禄"}],
              "minorStars": [...],
              "adjectiveStars": [...]
            },
            ...
          ]
        }
        """
        import json as _json

        # 基础信息
        solar_str = (
            f"{self.solar_year:04d}-{self.solar_month:02d}-{self.solar_day:02d}"
            if self.solar_year > 0
            else ""
        )

        # 时辰 → 24h 中间时间（简化）
        shi_chen_map = {
            1: "23:00", 2: "01:00", 3: "03:00", 4: "05:00", 5: "07:00", 6: "09:00",
            7: "11:00", 8: "13:00", 9: "15:00", 10: "17:00", 11: "19:00", 12: "21:00",
        }
        shi_chen_label = {
            1: "子时", 2: "丑时", 3: "寅时", 4: "卯时", 5: "辰时", 6: "巳时",
            7: "午时", 8: "未时", 9: "申时", 10: "酉时", 11: "戌时", 12: "亥时",
        }
        time_str = shi_chen_map.get(self.shi_chen, "")
        time_range = shi_chen_label.get(self.shi_chen, "")

        # 星座（简化版，仅作占位）
        zodiac_sign = _calc_zodiac(self.solar_month, self.solar_day) if self.solar_month > 0 else ""

        # 生肖（年支）
        zodiac_animal = {
            1: "鼠", 2: "牛", 3: "虎", 4: "兔", 5: "龙", 6: "蛇",
            7: "马", 8: "羊", 9: "猴", 10: "鸡", 11: "狗", 12: "猪",
        }.get(self.year_zhi, "")

        # 命宫/身宫描述
        soul_label = f"命宫在{self.ming_gong_dizhi}"
        body_label = f"身宫在{self.shen_gong_dizhi}"

        # 农历日期（简化显示）
        lunar_str = f"{TIANGAN[self.year_gan]}{DIZHI[self.year_zhi]}年{self.lunar_month}月{self.lunar_day}日"

        # 中文日期
        chinese_date = f"{TIANGAN[self.year_gan]}{DIZHI[self.year_zhi]}年"

        # 构造十二宫
        palaces = []
        for g in self.gongs:
            major_stars = []
            minor_stars = []
            adj_stars = []

            for s in g.stars:
                if 1 <= s.name_index <= 14:
                    category = "major"
                elif 15 <= s.name_index <= 26:
                    category = "minor"
                else:
                    category = "adjective"

                star_obj = {
                    "name": STAR_NAMES.get(s.name_index, f"星{s.name_index}"),
                    "type": category,
                    "brightness": self._get_brightness_label(s.brightness),
                }
                if s.sihua > 0:
                    hua_map = {1: "禄", 2: "权", 3: "科", 4: "忌"}
                    star_obj["mutagen"] = hua_map.get(s.sihua, "")

                if category == "major":
                    major_stars.append(star_obj)
                elif category == "minor":
                    minor_stars.append(star_obj)
                else:
                    adj_stars.append(star_obj)

            palaces.append({
                "index": g.gong_name_index,
                "name": g.gong_name,
                "heavenlyStem": TIANGAN[g.tiangan] if 1 <= g.tiangan <= 10 else "",
                "earthlyBranch": g.dizhi,
                "majorStars": major_stars,
                "minorStars": minor_stars,
                "adjectiveStars": adj_stars,
            })

        # 按宫名编号排序
        palaces.sort(key=lambda p: p["index"])

        return {
            "solarDate": solar_str,
            "lunarDate": lunar_str,
            "chineseDate": chinese_date,
            "gender": "M" if self.sex == 1 else "F",
            "time": time_str,
            "timeRange": time_range,
            "sign": zodiac_sign,
            "zodiac": zodiac_animal,
            "soul": soul_label,
            "body": body_label,
            "fiveElementsClass": self.wuxing_ju_name,
            "earthlyBranchOfSoulPalace": self.ming_gong_dizhi,
            "earthlyBranchOfBodyPalace": self.shen_gong_dizhi,
            "palaces": palaces,
            "siHua": {
                k: {"starId": v[0], "starName": v[1]}
                for k, v in self.sihua.items()
            },
            "gejuMatched": self.geju_matched,
            "gejuDetails": self.geju_details,
        }

    def to_json(self, indent: int = 2) -> str:
        """输出 JSON 字符串"""
        import json as _json
        return _json.dumps(self.to_ziwei_chart_input(), ensure_ascii=False, indent=indent)

    def summary(self) -> str:
        """排盘摘要"""
        lines = []
        lines.append("=" * 60)
        lines.append("紫微斗数排盘结果")
        lines.append("=" * 60)
        lines.append(f"年干支: {TIANGAN[self.year_gan]}{DIZHI[self.year_zhi]}")
        lines.append(f"农历: {self.lunar_month}月{self.lunar_day}日 {DIZHI[self.shi_chen]}时")
        lines.append(f"性别: {'男' if self.sex == 1 else '女'}")
        lines.append(f"命宫: {self.ming_gong_dizhi}宫 ({GONG_NAMES[1]})")
        lines.append(f"身宫: {self.shen_gong_dizhi}宫")
        lines.append(f"五行局: {self.wuxing_ju_name}")
        lines.append(f"紫微在: {DIZHI[self.ziwei_pos]}宫")
        lines.append(f"天府在: {DIZHI[self.tianfu_pos]}宫")
        lines.append(f"命主星: {STAR_NAMES.get(self.mingzhu, '未知')}")
        lines.append(f"身主星: {STAR_NAMES.get(self.shenzhu, '未知')}")
        lines.append("")

        # 四化
        lines.append("【四化】")
        for hua_name in ["化禄", "化权", "化科", "化忌"]:
            star_id, star_name = self.sihua.get(hua_name, (0, ""))
            if star_name:
                lines.append(f"  {hua_name}: {star_name}")
        lines.append("")

        # 十二宫详情
        lines.append("【十二宫】")
        for g in self.gongs:
            main_stars = g.get_main_stars()
            aux_stars = g.get_aux_stars()
            star_strs = []
            for s in main_stars:
                hua = f"·{s.sihua_label}" if s.sihua_label else ""
                br = f"({s.brightness_label})" if s.brightness_label else ""
                star_strs.append(f"{s.name}{br}{hua}")
            for s in aux_stars:
                hua = f"·{s.sihua_label}" if s.sihua_label else ""
                star_strs.append(f"{s.name}{hua}")

            stars_text = " ".join(star_strs) if star_strs else "（无星）"
            lines.append(
                f"  {g.tiangan_name}{g.dizhi} {g.gong_name}: {stars_text}"
            )

        lines.append("=" * 60)
        return "\n".join(lines)


# ============================================================
# 核心算法
# ============================================================

def normalize_1_12(n: int) -> int:
    """归一化到 1~12 范围"""
    while n <= 0:
        n += 12
    while n > 12:
        n -= 12
    return n


def locate_ming_gong(month_zhi: int, shi_chen: int) -> int:
    """
    命宫定位

    算法：命宫 = 月支 - 时支 + 3（模12，1~12）
    对应 AS3 源码：第 3837~3879 行

    参数:
      month_zhi: 农历月地支编号 (1=子 ~ 12=亥)
      shi_chen: 出生时辰编号 (1=子时 ~ 12=亥时)

    返回:
      命宫地支编号 (1~12)
    """
    if month_zhi >= shi_chen:
        ming_gong = month_zhi - shi_chen + 3
    else:
        ming_gong = month_zhi - shi_chen + 15

    return normalize_1_12(ming_gong)


def locate_shen_gong(month_zhi: int, shi_chen: int) -> int:
    """
    身宫定位

    算法：身宫 = 月支 + 时支 + 1（模12，1~12）
    对应 AS3 源码：第 3881~3901 行

    参数:
      month_zhi: 农历月地支编号
      shi_chen: 出生时辰编号

    返回:
      身宫地支编号 (1~12)
    """
    shen_gong = month_zhi + shi_chen + 1

    if shen_gong > 24:
        shen_gong -= 24
    elif shen_gong > 12:
        shen_gong -= 12

    return normalize_1_12(shen_gong)


def assign_tiangan(year_gan: int) -> list[int]:
    """
    五虎遁：根据年干为十二宫分配天干

    规则：
      寅宫(3)天干 = WU_HU_DUN[年干]
      后续宫位天干依次+1（模10，1~10）

    对应 AS3 源码：第 3803~3835 行

    参数:
      year_gan: 年干编号 (1=甲 ~ 10=癸)

    返回:
      长度13的列表，索引1~12为各宫位天干编号
    """
    yin_gan = WU_HU_DUN[year_gan]  # 寅宫天干

    result = [0] * 13  # 索引0占位

    # 寅宫=3, 从寅宫开始顺时针分配天干
    for i in range(1, 13):
        # 计算宫位i对应的天干
        # 寅宫(3)的天干为 yin_gan
        # 卯宫(4)的天干为 yin_gan+1
        # ...辰(5)=yin_gan+2, ..., 丑(2)=yin_gan+11
        if i >= 3:
            gan = yin_gan + (i - 3)
        else:
            gan = yin_gan + (i + 9)  # i=1→+10, i=2→+11

        # 归一化到 1~10
        while gan > 10:
            gan -= 10
        while gan <= 0:
            gan += 10

        result[i] = gan

    return result


def calc_wuxing_ju(year_gan: int, ming_gong_dz: int) -> int:
    """
    五行局数计算

    算法：
      1. 年干取模5得五行局类型（1=水, 2=木, 3=金, 4=土, 5=火）
      2. 命宫地支取半（奇进偶退）得列索引
      3. 查五行局数表

    对应 AS3 源码：第 3903~3913 行

    参数:
      year_gan: 年干编号 (1=甲 ~ 10=癸)
      ming_gong_dz: 命宫地支编号 (1=子 ~ 12=亥)

    返回:
      五行局数 (2/3/4/5/6)
    """
    # 年干映射到五行局类型（1~5）
    ju_type = year_gan
    if ju_type > 5:
        ju_type -= 5

    # 命宫地支映射到列索引（奇进偶退）
    # 子(1)→1, 丑(2)→1, 寅(3)→2, 卯(4)→2, ..., 亥(12)→6
    if ming_gong_dz % 2 == 0:
        col = ming_gong_dz // 2
    else:
        col = (ming_gong_dz + 1) // 2

    # 查表
    ju_shu = WUXING_JU_TABLE[ju_type][col]
    return ju_shu


def locate_ziwei(day: int, wuxing_ju: int) -> int:
    """
    紫微星定位算法

    算法：
      从日数和局数推算紫微星所在宫位。
      核心公式：寻找满足 (day + offset) % ju == 0 的最小 offset (0~12)
      然后根据 offset 的奇偶性计算紫微宫位。

    对应 AS3 源码：第 3915~3958 行

    参数:
      day: 农历日数 (1~30)
      wuxing_ju: 五行局数 (2/3/4/5/6)

    返回:
      紫微星所在宫位 (1~12)
    """
    ziwei_gong = 0

    for offset in range(0, 13):
        remainder = (day + offset) % wuxing_ju
        if remainder == 0:
            quotient = (day + offset) // wuxing_ju
            if offset == 0:
                ziwei_gong = quotient + 2
            elif offset % 2 == 1:
                ziwei_gong = quotient - offset + 2
            else:
                ziwei_gong = quotient + offset + 2
            break

    return normalize_1_12(ziwei_gong)


def locate_tianfu(ziwei_gong: int) -> int:
    """
    天府星定位算法

    算法：天府与紫微关于寅宫对称
      映射表：[0,5,4,3,2,1,12,11,10,9,8,7,6]
      即 天府宫位 = 映射表[紫微宫位]

    对应 AS3 源码：第 3954~3955 行

    参数:
      ziwei_gong: 紫微宫位 (1~12)

    返回:
      天府宫位 (1~12)
    """
    return TIANFU_MAP[ziwei_gong]


def an_xing_14(ziwei_gong: int, tianfu_gong: int) -> dict[int, int]:
    """
    十四主星安星

    紫微系（从紫微宫逆时针排列）：
      紫微(0)/天机(-1)/太阳(-3)/武曲(-4)/天同(-5)/廉贞(-8)

    天府系（从天府宫顺时针排列）：
      天府(0)/太阴(+1)/贪狼(+2)/巨门(+3)/天相(+4)/天梁(+5)/七杀(+6)/破军(+10)

    对应 AS3 源码：第 3957~4081 行

    参数:
      ziwei_gong: 紫微宫位 (1~12)
      tianfu_gong: 天府宫位 (1~12)

    返回:
      字典 {星曜编号: 宫位编号}
    """
    result = {}

    # 紫微系
    for star_id, offset in ZIWEI_SERIES.items():
        pos = normalize_1_12(ziwei_gong + offset)
        result[star_id] = pos

    # 天府系
    for star_id, offset in TIANFU_SERIES.items():
        pos = normalize_1_12(tianfu_gong + offset)
        result[star_id] = pos

    return result


def get_sihua(year_gan: int, variant: str = "default") -> dict[str, tuple[int, str]]:
    """
    四化查表

    参数:
      year_gan: 天干编号 (1=甲 ~ 10=癸)
      variant: 四化变体名称（默认 "default"）

    返回:
      字典 {"化禄": (星编号, 星名), "化权": ..., "化科": ..., "化忌": ...}
    """
    raw = SIHUA_TABLE[year_gan]
    result = {}
    labels = ["化禄", "化权", "化科", "化忌"]
    for i, label in enumerate(labels):
        star_id = raw[i]
        star_name = STAR_NAMES.get(star_id, f"星{star_id}")
        result[label] = (star_id, star_name)
    return result


# ============================================================
# 亮度矩阵（4套体系）
# 说明：
#   - QS (全书)：紫微斗数全书体系，7 档（庙/旺/得/利/平/不/陷）
#   - ZZ (中州)：中州派体系，6 档（庙/旺/平/闲/陷）
#   - XD1 (现代1)：现代派简化版 1
#   - XD2 (现代2)：现代派简化版 2
# 数据结构：{star_id: [0, gong1_level, gong2_level, ..., gong12_level]}
# ============================================================

# 全书版(7档)：1=庙, 2=旺, 3=得, 4=利, 5=平, 6=不, 7=陷
BRIGHTNESS_QS = {
    1:  [0, 1, 1, 2, 2, 3, 4, 7, 7, 6, 5, 3, 2],   # 紫微
    2:  [0, 2, 1, 1, 2, 3, 4, 5, 6, 7, 7, 5, 3],   # 天机
    3:  [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3],   # 太阳
    4:  [0, 2, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4],   # 武曲
    5:  [0, 1, 2, 2, 3, 4, 5, 5, 6, 7, 7, 6, 5],   # 天同
    6:  [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3],   # 廉贞
    7:  [0, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2],   # 天府
    8:  [0, 1, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4],   # 太阴
    9:  [0, 2, 2, 3, 4, 5, 5, 6, 7, 7, 6, 5, 4],   # 贪狼
    10: [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3],   # 巨门
    11: [0, 2, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4],   # 天相
    12: [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3],   # 天梁
    13: [0, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2],   # 七杀
    14: [0, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1],   # 破军
}

# 中州版(5档)：1=庙, 2=旺, 3=平, 4=闲, 5=陷
BRIGHTNESS_ZZ = {
    1:  [0, 1, 1, 2, 2, 3, 4, 5, 5, 4, 3, 3, 2],
    2:  [0, 2, 1, 1, 2, 3, 4, 3, 4, 5, 5, 3, 3],
    3:  [0, 1, 2, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2],
    4:  [0, 2, 1, 2, 3, 4, 3, 4, 5, 5, 4, 3, 3],
    5:  [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3],
    6:  [0, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    7:  [0, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2, 1],
    8:  [0, 1, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2],
    9:  [0, 2, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    10: [0, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    11: [0, 2, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2],
    12: [0, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    13: [0, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2, 1],
    14: [0, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1],
}

# 现代派1(简化)
BRIGHTNESS_XD1 = {
    1:  [0, 1, 1, 2, 2, 3, 4, 5, 5, 4, 3, 3, 2],
    2:  [0, 2, 1, 1, 2, 3, 4, 3, 4, 5, 5, 3, 3],
    3:  [0, 1, 2, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2],
    4:  [0, 2, 1, 2, 3, 4, 3, 4, 5, 5, 4, 3, 3],
    5:  [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3],
    6:  [0, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    7:  [0, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2, 1],
    8:  [0, 1, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2],
    9:  [0, 2, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    10: [0, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    11: [0, 2, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2],
    12: [0, 1, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2],
    13: [0, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2, 1],
    14: [0, 3, 3, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1],
}

# 现代派2(保守)
BRIGHTNESS_XD2 = {
    1:  [0, 1, 1, 1, 2, 3, 4, 5, 5, 4, 3, 2, 2],
    2:  [0, 2, 1, 1, 2, 3, 3, 4, 4, 5, 5, 3, 3],
    3:  [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 4, 3, 2],
    4:  [0, 2, 1, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3],
    5:  [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3],
    6:  [0, 1, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3, 2],
    7:  [0, 2, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 1],
    8:  [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 4, 3, 2],
    9:  [0, 2, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3, 2],
    10: [0, 1, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3, 2],
    11: [0, 2, 1, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3],
    12: [0, 1, 2, 3, 3, 4, 4, 5, 5, 4, 3, 3, 2],
    13: [0, 2, 2, 3, 3, 4, 5, 5, 4, 3, 3, 2, 1],
    14: [0, 3, 3, 4, 4, 5, 5, 4, 3, 3, 2, 1, 1],
}

def get_brightness(star_id: int, gong_name_index: int, method: str = "quanshu") -> int:
    """
    查询星曜亮度（支持4套体系）

    参数:
      star_id: 星曜编号 (1~14)
      gong_name_index: 宫名编号 (1=命宫 ~ 12=父母宫)
      method: 亮度体系
        "quanshu" (默认)：紫微斗数全书体系（7档）
        "zhongzhou"：中州派体系（5档）
        "xiandai1"：现代派简化版1
        "xiandai2"：现代派保守版2

    返回:
      亮度等级值 (0=无, 1=庙, 2=旺, 3=得, 4=利, 5=平, 6=不, 7=陷 等)
    """
    matrix = BRIGHTNESS_QS
    if method == "zhongzhou":
        matrix = BRIGHTNESS_ZZ
    elif method == "xiandai1":
        matrix = BRIGHTNESS_XD1
    elif method == "xiandai2":
        matrix = BRIGHTNESS_XD2

    if star_id in matrix:
        row = matrix[star_id]
        if 1 <= gong_name_index <= 12:
            return row[gong_name_index]
    return 0


# ============================================================
# 辅星安星
# ============================================================

def an_xing_wenchang(shi_chen: int) -> tuple[int, int]:
    """
    文昌文曲安星

    参数:
      shi_chen: 时辰 (1~12)

    返回:
      (文昌宫位, 文曲宫位)
    """
    row = CQ_ARR[shi_chen]
    return row[0], row[1]


def an_xing_zuofu(month_zhi: int) -> tuple[int, int]:
    """
    左辅右弼安星

    参数:
      month_zhi: 月支 (1~12)

    返回:
      (左辅宫位, 右弼宫位)
    """
    row = ZY_ARR[month_zhi]
    return row[0], row[1]


def an_xing_kuiyue(year_gan: int, method: int = 1) -> tuple[int, int]:
    """
    天魁天钺安星

    参数:
      year_gan: 年干 (1~10)
      method: 魁钺安法 (1=六辛逢虎马, 2=庚辛逢马虎, 3=庚辛逢虎马, 4=六辛逢马虎)

    返回:
      (天魁宫位, 天钺宫位)
    """
    arr = KY_ARR_MAP.get(method, KY_ARR)
    row = arr[year_gan]
    return row[0], row[1]


def an_xing_lucun(year_gan: int) -> int:
    """
    禄存安星

    参数:
      year_gan: 年干 (1~10)

    返回:
      禄存宫位 (1~12)
    """
    return LUCUN_ARR[year_gan]


def an_xing_tianma(year_zhi: int, month_zhi: int = 0, method: str = "year_zhi") -> int:
    """
    天马安星

    参数:
      year_zhi: 年支 (1~12)
      month_zhi: 月支 (1~12，method="month_zhi"时使用)
      method: 安法 ("year_zhi"=按年支, "month_zhi"=按月支)

    返回:
      天马宫位 (1~12)
    """
    if method == "month_zhi" and month_zhi > 0:
        return TIANMA_MONTH_ARR[month_zhi]
    return TIANMA_ARR[year_zhi]


def an_xing_qingyang_tuoluo(lucun_pos: int) -> tuple[int, int]:
    """
    擎羊陀罗安星

    规则：擎羊=禄存前1宫（逆时针），陀罗=禄存后1宫（顺时针）

    参数:
      lucun_pos: 禄存宫位 (1~12)

    返回:
      (擎羊宫位, 陀罗宫位)
    """
    qingyang = normalize_1_12(lucun_pos - 1)
    tuoluo = normalize_1_12(lucun_pos + 1)
    return qingyang, tuoluo


# ============================================================
# 公历→农历转换（简化版，需外部万年历数据）
# ============================================================

def solar_to_lunar_simple(year: int, month: int, day: int, hour: int) -> dict:
    """
    公历转农历（简化版，sxtwl 不可用时的兜底）

    注意：此函数为占位实现，农历月日直接用公历月日近似（不准确）。
    年干支已按立春边界处理（2月4日前后）。
    实际排盘必须安装 sxtwl 以获得精确农历数据。

    参数:
      year: 公历年
      month: 公历月
      day: 公历日
      hour: 公历时（24小时制）

    返回:
      字典含: lunar_year, lunar_month, lunar_day, shi_chen, year_gan, year_zhi,
              leap_month_flag, solar_str, accuracy_warning
    """
    # 时辰转换：23-1=子时(1), 1-3=丑时(2), ..., 21-23=亥时(12)
    if hour == 23 or hour == 0:
        shi_chen = 1
    else:
        shi_chen = (hour + 1) // 2 + 1
        if shi_chen > 12:
            shi_chen = 1

    # 年干支（按立春边界：2月4日前后为界）
    # 立春前属于上一年干支
    if month < 2 or (month == 2 and day < 4):
        gan_idx = (year - 1 - 4) % 10 + 1  # 公元4年=甲子年
        zhi_idx = (year - 1 - 4) % 12 + 1
    else:
        gan_idx = (year - 4) % 10 + 1
        zhi_idx = (year - 4) % 12 + 1

    # 农历月日（占位：暂用公历月日近似，实际需 sxtwl）
    lunar_month = month
    lunar_day = day

    return {
        "lunar_year": year,
        "lunar_month": lunar_month,
        "lunar_day": lunar_day,
        "shi_chen": shi_chen,
        "year_gan": gan_idx,
        "year_zhi": zhi_idx,
        "leap_month_flag": False,
        "solar_str": f"{year:04d}-{month:02d}-{day:02d}",
        "accuracy_warning": "sxtwl 未安装，农历月日为占位值（公历月日近似），年干支按立春边界计算",
    }


def solar_to_lunar(year: int, month: int, day: int, hour: int = 12) -> dict:
    """
    公历转农历（精确版，使用 sxtwl 库）
    ...
    """
    # 先按简化版计算 hour -> shi_chen（用于子时换算）
    if hour == 23 or hour == 0:
        shi_chen = 1
        # 子时：23点后算农历次日
        adjust_day = 1 if hour >= 23 else 0
    else:
        shi_chen = (hour + 1) // 2 + 1
        if shi_chen > 12:
            shi_chen = 1
        adjust_day = 0

    try:
        import sxtwl
        from datetime import datetime, timedelta

        # 子时跨日处理
        src_day = datetime(year, month, day) + timedelta(days=adjust_day)
        lunar = sxtwl.fromSolar(src_day.year, src_day.month, src_day.day)

        # 农历基本信息
        lunar_month_num = lunar.getLunarMonth()
        lunar_day_num = lunar.getLunarDay()
        is_leap = lunar.isLunarLeap() if hasattr(lunar, "isLunarLeap") else False

        # 年干支：用 sxtwl 的 getYearGZ()（已按立春边界处理）
        # sxtwl 的 tg/dz 从0开始，转为1~10/1~12
        gz = lunar.getYearGZ()
        gan_idx = gz.tg + 1
        zhi_idx = gz.dz + 1

        return {
            "lunar_year": src_day.year,
            "lunar_month": lunar_month_num,
            "lunar_day": lunar_day_num,
            "shi_chen": shi_chen,
            "year_gan": gan_idx,
            "year_zhi": zhi_idx,
            "leap_month_flag": is_leap,
            "solar_str": f"{year:04d}-{month:02d}-{day:02d}",
        }
    except Exception:
        # sxtwl 不可用时退回简化版
        simple = solar_to_lunar_simple(year, month, day, hour)
        simple["leap_month_flag"] = False
        simple["solar_str"] = f"{year:04d}-{month:02d}-{day:02d}"
        return simple


def _calc_zodiac(month: int, day: int) -> str:
    """公历月日 → 西方星座（简化版）"""
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return ""
    # 星座起止日期（月,日）
    signs = [
        ("摩羯", 1, 19), ("水瓶", 2, 18), ("双鱼", 3, 20),
        ("白羊", 4, 19), ("金牛", 5, 20), ("双子", 6, 20),
        ("巨蟹", 7, 22), ("狮子", 8, 22), ("处女", 9, 22),
        ("天秤", 10, 22), ("天蝎", 11, 21), ("射手", 12, 21), ("摩羯", 12, 31),
    ]
    for i, (name, m, d) in enumerate(signs):
        if (month, day) <= (m, d):
            if i == 0:
                return "摩羯"
            return signs[i - 1][0]
    return "摩羯"


# ============================================================
# 排盘主函数
# ============================================================

def paipan(
    year_gan: int,
    year_zhi: int,
    lunar_month: int,
    lunar_day: int,
    shi_chen: int,
    sex: int = 1,
    brightness_method: str = "quanshu",
    config: PaipanConfig | None = None,
) -> PaipanResult:
    """
    紫微斗数排盘主函数

    参数:
      year_gan: 年干 (1=甲 ~ 10=癸)
      year_zhi: 年支 (1=子 ~ 12=亥)
      lunar_month: 农历月 (1~12)
      lunar_day: 农历日 (1~30)
      shi_chen: 时辰 (1=子时 ~ 12=亥时)
      sex: 性别 (1=男, 2=女)
      brightness_method: 亮度体系 ("quanshu"/"zhongzhou")
      config: 排盘配置（None 时使用默认配置）

    返回:
      PaipanResult 排盘结果
    """
    if config is None:
        config = PaipanConfig()

    # 闰月处理（lunar_month < 0 表示闰月）
    if lunar_month < 0:
        if config.run_yue == "xiayue":
            lunar_month = abs(lunar_month) + 1
        else:
            # benyue 和 yuezhong 默认都取本月
            lunar_month = abs(lunar_month)

    # 亮度体系：config.brightness_method 优先，但保留 brightness_method 参数向后兼容
    if brightness_method != "quanshu" and config.brightness_method == "quanshu":
        # 调用者显式传了 brightness_method，以调用者为准
        effective_brightness = brightness_method
    else:
        effective_brightness = config.brightness_method

    result = PaipanResult(
        year_gan=year_gan,
        year_zhi=year_zhi,
        lunar_month=lunar_month,
        lunar_day=lunar_day,
        shi_chen=shi_chen,
        sex=sex,
        brightness_method=effective_brightness,
        config=config,
    )

    # Step 1: 命宫/身宫定位
    # 农历月对应地支：正月=寅(3), 二月=卯(4), ..., 十二月=丑(2)
    # 即 month_zhi = (lunar_month + 1) % 12，若为0则取12
    month_zhi = (lunar_month + 1) % 12
    if month_zhi == 0:
        month_zhi = 12

    result.ming_gong_pos = locate_ming_gong(month_zhi, shi_chen)
    result.shen_gong_pos = locate_shen_gong(month_zhi, shi_chen)

    # Step 2: 五虎遁天干
    tiangan_arr = assign_tiangan(year_gan)

    # Step 3: 五行局数
    result.wuxing_ju = calc_wuxing_ju(year_gan, result.ming_gong_pos)

    # Step 4: 紫微/天府定位
    result.ziwei_pos = locate_ziwei(lunar_day, result.wuxing_ju)
    result.tianfu_pos = locate_tianfu(result.ziwei_pos)

    # Step 5: 命主星/身主星（配置化）
    if config.an_mingzhu == "zhongzhou":
        result.mingzhu = MINGZHU_BY_YEAR[year_zhi]
    else:
        result.mingzhu = MINGZHU_TABLE[result.ming_gong_pos]
    result.shenzhu = SHENZHU_TABLE[year_zhi]

    # Step 6: 十四主星安星
    star_positions = an_xing_14(result.ziwei_pos, result.tianfu_pos)

    # Step 7: 四化
    result.sihua = get_sihua(year_gan)

    # Step 8: 构建十二宫数据
    # 宫名分配：命宫位=1(命宫), 然后逆时针递增
    # 逆时针 = 地支编号递减方向
    gong_name_map = {}  # pos → gong_name_index
    gong_name_map[result.ming_gong_pos] = 1  # 命宫

    # 命宫之后（顺时针，地支编号递增方向）：兄弟(2), 夫妻(3), ...
    # 注意：紫微斗数中宫名按逆时针排列
    # 命宫逆时针第1宫=兄弟宫，第2宫=夫妻宫，...
    # 逆时针 = 地支编号递减方向
    for i in range(1, 12):
        pos = normalize_1_12(result.ming_gong_pos - i)
        gong_name_map[pos] = i + 1

    # 创建宫位
    for pos in range(1, 13):
        gong = Gong(
            pos=pos,
            dizhi=DIZHI[pos],
            tiangan=tiangan_arr[pos],
            gong_name_index=gong_name_map[pos],
            gong_name=GONG_NAMES[gong_name_map[pos]],
        )
        result.gongs.append(gong)

    # Step 9: 安十四主星到宫位
    for star_id, gong_pos in star_positions.items():
        gong = result.get_gong(gong_pos)
        brightness = get_brightness(star_id, gong.gong_name_index, effective_brightness)

        # 检查四化
        sihua_mark = 0
        for hua_idx, (hua_name, (sid, _)) in enumerate(
            [(k, v) for k, v in result.sihua.items()], start=1
        ):
            if sid == star_id:
                sihua_mark = hua_idx
                break

        star = Star(
            name_index=star_id,
            gong_pos=gong_pos,
            brightness=brightness,
            sihua=sihua_mark,
        )
        gong.add_star(star)

    # Step 10: 安辅星
    # 文昌文曲
    wenchang_pos, wenqu_pos = an_xing_wenchang(shi_chen)
    for star_id, pos in [(15, wenchang_pos), (16, wenqu_pos)]:
        gong = result.get_gong(pos)
        brightness = get_brightness(star_id, gong.gong_name_index)
        star = Star(name_index=star_id, gong_pos=pos, brightness=brightness)
        gong.add_star(star)

    # 左辅右弼
    zuofu_pos, youbi_pos = an_xing_zuofu(month_zhi)
    for star_id, pos in [(17, zuofu_pos), (18, youbi_pos)]:
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # 天魁天钺（配置化）
    kui_pos, yue_pos = an_xing_kuiyue(year_gan, method=config.an_kuiyue)
    for star_id, pos in [(19, kui_pos), (20, yue_pos)]:
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # 禄存天马（配置化）
    lucun_pos = an_xing_lucun(year_gan)
    tianma_pos = an_xing_tianma(year_zhi, month_zhi=month_zhi, method=config.an_tianma)
    for star_id, pos in [(21, lucun_pos), (22, tianma_pos)]:
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # 擎羊陀罗
    qingyang_pos, tuoluo_pos = an_xing_qingyang_tuoluo(lucun_pos)
    for star_id, pos in [(25, qingyang_pos), (26, tuoluo_pos)]:
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # Step 11: 安火星铃星
    huoxing_pos, lingxing_pos = an_xing_huoxing_lingxing(year_zhi, shi_chen)
    for star_id, pos in [(23, huoxing_pos), (24, lingxing_pos)]:
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # Step 12: 安地空地劫
    dikong_pos, dijie_pos = an_xing_dikong_dijie(year_gan, shi_chen, year_zhi)
    for star_id, pos in [(27, dikong_pos), (28, dijie_pos)]:
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # Step 13: 安杂曜（天官/天福/天刑/天厨 等，配置化）
    zayao_positions = an_xing_zayao(
        year_gan, year_zhi, result.ming_gong_pos, month_zhi,
        shi_chen, tiangan_arr, lunar_day, result.wuxing_ju,
        result.shen_gong_pos,
        tiankong_method=config.an_tiankong,
        jkxk_method=config.an_jkxk,
    )
    for star_id, pos in zayao_positions.items():
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # Step 14: 安十二神（博士/长生/岁前/将前，配置化）
    shier_shen_positions = an_xing_shier_shen(
        result.wuxing_ju, year_gan, sex, result.ming_gong_pos,
        result.shen_gong_pos, year_zhi,
        changsheng_method=config.an_changsheng,
    )
    for star_id, pos in shier_shen_positions.items():
        gong = result.get_gong(pos)
        star = Star(name_index=star_id, gong_pos=pos)
        gong.add_star(star)

    # Step 15: 格局判定（调用 GejuEngine，若可用）
    try:
        # 构造 GejuEngine 需要的 chart 格式
        chart_for_geju = {
            "sex": sex,
            "tg": year_gan,
            "dz_int": year_zhi,
            "ming_gong": result.ming_gong_pos,
            "shen_gong": result.shen_gong_pos,
            "stars": {},
            "fu_stars": {},
            "sihua": {},
        }
        for g in result.gongs:
            for s in g.stars:
                star_name = STAR_NAMES.get(s.name_index, "")
                if 1 <= s.name_index <= 14:
                    chart_for_geju["stars"][star_name] = g.pos
                elif 15 <= s.name_index <= 28:
                    chart_for_geju["fu_stars"][star_name] = g.pos
        for hua_name, (_, star_name) in result.sihua.items():
            chart_for_geju["sihua"][hua_name] = star_name

        # 延迟导入，避免循环依赖
        from geju_engine import GejuEngine
        engine = GejuEngine()
        geju_res = engine.match(chart_for_geju)
        if isinstance(geju_res, dict):
            # 收集命中
            matched = geju_res.get("matched", [])
            details = geju_res.get("details", [])
            if isinstance(matched, list):
                result.geju_matched = matched
            if isinstance(details, list):
                result.geju_details = details
    except Exception as _ge:
        # 格局判定失败不阻断排盘
        pass

    return result


def paipan_from_solar(
    year: int, month: int, day: int, hour: int,
    sex: int = 1,
    lunar_month: int | None = None,
    lunar_day: int | None = None,
    year_gan: int | None = None,
    year_zhi: int | None = None,
    config: PaipanConfig | None = None,
) -> PaipanResult:
    """
    从公历排盘（便捷入口）

    参数:
      year: 公历年
      month: 公历月
      day: 公历日
      hour: 公历时（24小时制）
      sex: 性别 (1=男, 2=女)
      lunar_month: 农历月（可选，若提供则覆盖自动计算）
      lunar_day: 农历日（可选，若提供则覆盖自动计算）
      year_gan: 年干（可选，若提供则覆盖自动计算）
      year_zhi: 年支（可选，若提供则覆盖自动计算）
      config: 排盘配置（None 时使用默认配置）

    返回:
      PaipanResult 排盘结果
    """
    # 子时处理（配置化）
    if config and config.zi_shi == "ci_ri" and hour == 23:
        import datetime as _dt
        dt = _dt.date(year, month, day) + _dt.timedelta(days=1)
        year, month, day = dt.year, dt.month, dt.day

    solar = solar_to_lunar(year, month, day, hour)

    # 允许手动覆盖
    lm = lunar_month if lunar_month is not None else solar["lunar_month"]
    ld = lunar_day if lunar_day is not None else solar["lunar_day"]
    yg = year_gan if year_gan is not None else solar["year_gan"]
    yz = year_zhi if year_zhi is not None else solar["year_zhi"]

    result = paipan(
        year_gan=yg,
        year_zhi=yz,
        lunar_month=lm,
        lunar_day=ld,
        shi_chen=solar["shi_chen"],
        sex=sex,
        config=config,
    )

    # 保存公历日期（便于 JSON 导出）
    result.solar_year = year
    result.solar_month = month
    result.solar_day = day

    # 排盘警告检查
    result.warnings = _check_warnings(year, month, day, hour, solar, config)

    return result


def _is_dst_period(year: int, month: int, day: int) -> bool:
    """中国夏令时：1986-1991年，每年5月第1个周日~9月第2个周日"""
    if year not in range(1986, 1992):
        return False
    # 简化：5月1日~9月30日
    return month in [5, 6, 7, 8, 9]


def _check_warnings(year: int, month: int, day: int, hour: int,
                    lunar_info: dict, config: PaipanConfig | None = None) -> list[str]:
    """排盘警告检查

    检查项：
      1. 闰月警告
      2. 子时警告
      3. 夏令时警告
      4. 时辰分界警告
    """
    warnings = []

    # 闰月警告
    if lunar_info.get("leap_month_flag", False):
        run_yue_desc = {"benyue": "视为本月", "xiayue": "视为下月", "yuezhong": "月中分界"}
        desc = run_yue_desc.get(config.run_yue if config else "yuezhong", "月中分界")
        warnings.append(f"本月为闰月，排盘按{desc}处理")

    # 子时警告
    if hour == 23 or hour == 0:
        warnings.append("子时排盘需注意：当日子时(23:00-00:00)还是次日子时(00:00-01:00)？")

    # 夏令时警告
    if _is_dst_period(year, month, day):
        warnings.append("该日期处于夏令时期间，钟表时间已+1小时，真太阳时需校正")

    # 时辰分界警告（出生时间在时辰交界±15分钟）
    boundary_hours = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]
    for bh in boundary_hours:
        if abs(hour - bh) == 0 and (hour * 60) % 60 <= 15:
            warnings.append("出生时间接近时辰分界点，建议确认具体分钟")
            break

    return warnings


# ============================================================
# 从 JSON 数据表加载（可选，用于交叉验证）
# ============================================================

def load_data_tables(data_dir: str) -> dict:
    """
    从 extracted_js/data_tables/ 加载 JSON 数据表

    参数:
      data_dir: 数据表目录路径

    返回:
      合并后的数据字典
    """
    tables = {}
    json_files = [
        "anxing_data.json",
        "auxiliary_tables.json",
        "brightness_levels.json",
        "changsheng_12gods.json",
        "gong_names.json",
        "sihua_table.json",
        "star_names.json",
        "wuxing_basic.json",
    ]

    for fname in json_files:
        fpath = os.path.join(data_dir, fname)
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                key = fname.replace(".json", "")
                tables[key] = json.load(f)

    return tables


def verify_with_json(data_dir: str) -> list[str]:
    """
    用 JSON 数据表交叉验证内置常量

    参数:
      data_dir: 数据表目录路径

    返回:
      验证结果列表
    """
    results = []
    tables = load_data_tables(data_dir)

    # 验证五行局数表
    if "anxing_data" in tables:
        json_table = tables["anxing_data"]["wuxing_juju"]["table"]
        for row_idx in range(6):
            for col_idx in range(7):
                if WUXING_JU_TABLE[row_idx][col_idx] != json_table[row_idx][col_idx]:
                    results.append(
                        f"五行局数表不匹配: 行{row_idx}列{col_idx}, "
                        f"内置={WUXING_JU_TABLE[row_idx][col_idx]}, "
                        f"JSON={json_table[row_idx][col_idx]}"
                    )
        if not any("五行局数表" in r for r in results):
            results.append("五行局数表: 验证通过 ✓")

    # 验证命主星表
    if "anxing_data" in tables:
        json_mingzhu = tables["anxing_data"]["mingzhu"]["table"]
        for i in range(13):
            if MINGZHU_TABLE[i] != json_mingzhu[i]:
                results.append(
                    f"命主星表不匹配: 索引{i}, 内置={MINGZHU_TABLE[i]}, JSON={json_mingzhu[i]}"
                )
        if not any("命主星表" in r for r in results):
            results.append("命主星表: 验证通过 ✓")

    # 验证身主星表
    if "anxing_data" in tables:
        json_shenzhu = tables["anxing_data"]["shenzhu"]["table"]
        for i in range(13):
            if SHENZHU_TABLE[i] != json_shenzhu[i]:
                results.append(
                    f"身主星表不匹配: 索引{i}, 内置={SHENZHU_TABLE[i]}, JSON={json_shenzhu[i]}"
                )
        if not any("身主星表" in r for r in results):
            results.append("身主星表: 验证通过 ✓")

    # 验证四化表
    if "sihua_table" in tables:
        json_sihua = tables["sihua_table"]["table"]
        for gan_name, raw in json_sihua.items():
            gan_idx = {"甲": 1, "乙": 2, "丙": 3, "丁": 4, "戊": 5,
                       "己": 6, "庚": 7, "辛": 8, "壬": 9, "癸": 10}.get(gan_name, 0)
            if gan_idx > 0:
                json_raw = raw["_raw"]
                builtin_raw = SIHUA_TABLE[gan_idx]
                if json_raw != builtin_raw:
                    results.append(
                        f"四化表不匹配: {gan_name}干, 内置={builtin_raw}, JSON={json_raw}"
                    )
        if not any("四化表" in r for r in results):
            results.append("四化表(默认版): 验证通过 ✓")

    # 验证辅助表
    if "auxiliary_tables" in tables:
        aux = tables["auxiliary_tables"]

        # 昌曲表
        json_cq = aux["cq_arr"]["table"]
        for i in range(13):
            if CQ_ARR[i] != json_cq[i]:
                results.append(f"昌曲表不匹配: 索引{i}")
        if not any("昌曲表" in r for r in results):
            results.append("昌曲表: 验证通过 ✓")

        # 左辅右弼表
        json_zy = aux["zy_arr"]["table"]
        for i in range(13):
            if ZY_ARR[i] != json_zy[i]:
                results.append(f"左辅右弼表不匹配: 索引{i}")
        if not any("左辅右弼表" in r for r in results):
            results.append("左辅右弼表: 验证通过 ✓")

        # 天魁天钺表（版本1）
        json_ky = aux["ky_arr"]["variants"]["版本1"]
        for i in range(11):
            if KY_ARR[i] != json_ky[i]:
                results.append(f"天魁天钺表不匹配: 索引{i}")
        if not any("天魁天钺表" in r for r in results):
            results.append("天魁天钺表: 验证通过 ✓")

        # 五虎遁表
        json_whd = aux["whd_arr"]["table"]
        for i in range(11):
            if WU_HU_DUN[i] != json_whd[i]:
                results.append(f"五虎遁表不匹配: 索引{i}")
        if not any("五虎遁表" in r for r in results):
            results.append("五虎遁表: 验证通过 ✓")

    if not results:
        results.append("无数据表可验证")

    return results


# ============================================================
# 扩展安星：火星/铃星/地空/地劫
# ============================================================

# 火星数据表（_AX_HL_ARR，13行×13列，行1~12为年支，列1~12为时辰）
_HL_ARR = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 6, 2, 11, 6, 2, 11, 6, 2, 11, 6, 2, 11],   # 年支1(子)
    [0, 11, 7, 3, 7, 11, 7, 3, 7, 11, 7, 3, 7],     # 年支2(丑)
    [0, 3, 11, 8, 11, 3, 8, 11, 3, 8, 11, 3, 8],    # 年支3(寅)
    [0, 8, 4, 12, 4, 8, 4, 12, 4, 8, 4, 12, 4],     # 年支4(卯)
    [0, 4, 12, 5, 9, 12, 5, 9, 5, 9, 12, 5, 9],     # 年支5(辰)
    [0, 12, 5, 9, 5, 12, 9, 5, 12, 9, 5, 12, 9],    # 年支6(巳)
    [0, 5, 9, 1, 6, 9, 1, 6, 1, 6, 9, 1, 6],        # 年支7(午)
    [0, 9, 1, 6, 1, 9, 6, 1, 9, 6, 1, 9, 6],        # 年支8(未)
    [0, 1, 6, 10, 2, 6, 10, 2, 6, 10, 2, 6, 10],    # 年支9(申)
    [0, 6, 10, 2, 6, 10, 2, 6, 10, 2, 6, 10, 2],    # 年支10(酉)
    [0, 10, 2, 6, 2, 10, 2, 6, 10, 2, 6, 10, 2],    # 年支11(戌)
    [0, 2, 7, 3, 11, 7, 3, 11, 7, 3, 11, 7, 3],     # 年支12(亥)
]

# 铃星数据表（_AX_HG_ARR，13行×13列）
_HG_ARR = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 5, 2, 11, 8, 11, 5, 11, 8, 5, 2, 11, 8],
    [0, 11, 8, 5, 2, 8, 5, 11, 8, 5, 2, 11, 8],
    [0, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11],
    [0, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5],
    [0, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2],
    [0, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11],
    [0, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8],
    [0, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5],
    [0, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2],
    [0, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11],
    [0, 5, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8],
    [0, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8, 5],
]

# 地空数据表（_AX_KY_ARR2，11行×13列，行1~10为年干）
_KY_ARR2 = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 10, 12, 2, 4, 6, 8, 10, 12, 2, 4, 6, 8],    # 年干1(甲)
    [0, 9, 11, 1, 3, 5, 7, 9, 11, 1, 3, 5, 7],      # 年干2(乙)
    [0, 8, 10, 12, 2, 4, 6, 8, 10, 12, 2, 4, 6],    # 年干3(丙)
    [0, 7, 9, 11, 1, 3, 5, 7, 9, 11, 1, 3, 5],      # 年干4(丁)
    [0, 6, 8, 10, 12, 2, 4, 6, 8, 10, 12, 2, 4],    # 年干5(戊)
    [0, 5, 7, 9, 11, 1, 3, 5, 7, 9, 11, 1, 3],      # 年干6(己)
    [0, 4, 6, 8, 10, 12, 2, 4, 6, 8, 10, 12, 2],    # 年干7(庚)
    [0, 3, 5, 7, 9, 11, 1, 3, 5, 7, 9, 11, 1],      # 年干8(辛)
    [0, 2, 4, 6, 8, 10, 12, 2, 4, 6, 8, 10, 12],    # 年干9(壬)
    [0, 1, 3, 5, 7, 9, 11, 1, 3, 5, 7, 9, 11],      # 年干10(癸)
]

# 地劫数据表（_AX_JK_ARR3，13行×13列）
_JK_ARR3 = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 9, 11, 1, 3, 5, 7, 9, 11, 1, 3, 5, 7],
    [0, 10, 12, 2, 4, 6, 8, 10, 12, 2, 4, 6, 8],
    [0, 11, 1, 3, 5, 7, 9, 11, 1, 3, 5, 7, 9],
    [0, 12, 2, 4, 6, 8, 10, 12, 2, 4, 6, 8, 10],
    [0, 1, 3, 5, 7, 9, 11, 1, 3, 5, 7, 9, 11],
    [0, 2, 4, 6, 8, 10, 12, 2, 4, 6, 8, 10, 12],
    [0, 3, 5, 7, 9, 11, 1, 3, 5, 7, 9, 11, 1],
    [0, 4, 6, 8, 10, 12, 2, 4, 6, 8, 10, 12, 2],
    [0, 5, 7, 9, 11, 1, 3, 5, 7, 9, 11, 1, 3],
    [0, 6, 8, 10, 12, 2, 4, 6, 8, 10, 12, 2, 4],
    [0, 7, 9, 11, 1, 3, 5, 7, 9, 11, 1, 3, 5],
    [0, 8, 10, 12, 2, 4, 6, 8, 10, 12, 2, 4, 6],
]


def an_xing_huoxing_lingxing(year_zhi: int, shi_chen: int) -> tuple[int, int]:
    """
    安火星铃星

    参数:
      year_zhi: 年支 (1=子~12=亥)
      shi_chen: 时辰 (1=子~12=亥)

    返回:
      (火星宫位, 铃星宫位)
    """
    row = min(max(year_zhi, 1), 12)
    col = min(max(shi_chen, 1), 12)
    return _HL_ARR[row][col], _HG_ARR[row][col]


def an_xing_dikong_dijie(year_gan: int, shi_chen: int, year_zhi: int) -> tuple[int, int]:
    """
    安地空地劫

    参数:
      year_gan: 年干 (1=甲~10=癸)
      shi_chen: 时辰 (1=子~12=亥)
      year_zhi: 年支 (1=子~12=亥，保留用于扩展)

    返回:
      (地空宫位, 地劫宫位)
    """
    gan_row = min(max(year_gan, 1), 10)
    zhi_row = min(max(year_zhi, 1), 12)
    col = min(max(shi_chen, 1), 12)
    return _KY_ARR2[gan_row][col], _JK_ARR3[zhi_row][col]


# ============================================================
# 杂曜安星（天官/天福/天刑/天厨/三台/八座/天寿 等）
# ============================================================

# 天福天官表（行1=天福, 行2=天官; 列1~12=月份地支）
_FL_ARR = [
    [0] * 13,
    [0, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9],   # 天福
    [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],    # 天官
]

# 天刑天厨表（行1=天刑, 行2=天厨; 列1~12=日地支/日天干）
_TC_ARR = [
    [0] * 13,
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],    # 天刑（简化）
    [0, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6],    # 天厨（简化）
]

# 三台八座（从寅起顺数）
_SANTAI_BAZUO_OFFSET = {
    "santai": 2,   # 三台偏移
    "bazuo": 5,    # 八座偏移
}

# 天才/天寿（天才=命宫起逆行，天寿=身宫起顺行）
# 孤辰寡宿：根据年支判断
def get_guchen_guasu(year_zhi: int) -> tuple[int, int]:
    """孤辰寡宿位置：阳年支后一位为孤辰，前一位为寡宿；阴年反之"""
    # 简化：孤辰=年支+3, 寡宿=年支-3
    guchen = normalize_1_12(year_zhi + 3)
    guasu = normalize_1_12(year_zhi - 3)
    return guchen, guasu


def an_xing_zayao(
    year_gan: int,
    year_zhi: int,
    ming_gong_pos: int,
    month_zhi: int,
    shi_chen: int,
    tiangan_arr: list[int],
    lunar_day: int,
    wuxing_ju: int,
    shen_gong_pos: int,
    tiankong_method: str = "standard",
    jkxk_method: str = "double",
) -> dict[int, int]:
    """
    安杂曜

    返回: {星号: 宫位}
    包含：天福(29)/天官(30)/天刑(31)/八座(32)/三台(33)/天才(34)/
          天月(35)/天空(36)/天姚(37)/天哭(38)/天喜(39)/天虚(40)/
          天贵(41)/天寿(42)/天厨(44)/孤辰(48)/寡宿(57)/华盖(55)/
          咸池(49)/红鸾(51)/破碎(53)/截空(77)/旬空(78)/劫煞(80)/
          龙德(81)/解神(56)/阴煞(54)/封诰(50)/恩光(52)/飞廉(72)/
          蜚廉(59)/奏书(71)/青龙(70)
    """
    positions: dict[int, int] = {}

    # 天福/天官（月支查表）
    mz = min(max(month_zhi, 1), 12)
    positions[29] = _FL_ARR[1][mz]   # 天福
    positions[30] = _FL_ARR[2][mz]   # 天官

    # 天刑天厨（按日地支/日天干）
    ld = min(max(lunar_day, 1), 30)
    day_dizhi = ((ld - 1) % 12) + 1
    positions[31] = _TC_ARR[1][day_dizhi]   # 天刑
    positions[44] = _TC_ARR[2][day_dizhi]   # 天厨

    # 三台/八座：从紫微宫顺数（紫微宫已在 wuxing_ju 计算中得到）
    # 简化：三台八座从紫微所在宫的后几宫
    ziwei_pos = locate_ziwei(lunar_day, wuxing_ju)
    positions[32] = normalize_1_12(ziwei_pos + 2)   # 八座
    positions[33] = normalize_1_12(ziwei_pos + 5)   # 三台

    # 天才：从命宫逆行 1 宫
    positions[34] = normalize_1_12(ming_gong_pos - 1)

    # 天寿：从身宫顺行 1 宫
    positions[42] = normalize_1_12(shen_gong_pos + 1)

    # 天空：命宫对宫起逆行 1 宫（配置化）
    ming_dui = normalize_1_12(ming_gong_pos + 6)
    if tiankong_method == "shun_jia":
        positions[36] = normalize_1_12(ming_dui + shi_chen - 1)
    else:
        positions[36] = normalize_1_12(ming_dui - 1)

    # 天姚：命宫起顺数 3 宫
    positions[37] = normalize_1_12(ming_gong_pos + 3)

    # 天哭/天虚：按年支
    positions[38] = normalize_1_12(year_zhi + 4)   # 天哭（简化）
    positions[40] = normalize_1_12(year_zhi - 4)   # 天虚（简化）

    # 天喜/红鸾（简化：从卯酉起数）
    positions[39] = normalize_1_12(4 + (year_zhi - 1))  # 天喜从卯起
    positions[51] = normalize_1_12(10 - (year_zhi - 1)) # 红鸾从酉起

    # 孤辰/寡宿
    guchen, guasu = get_guchen_guasu(year_zhi)
    positions[48] = guchen
    positions[57] = guasu

    # 华盖：年支三合末位
    huagai_map = {1: 3, 2: 12, 3: 3, 4: 12, 5: 3, 6: 12, 7: 9, 8: 6, 9: 9, 10: 6, 11: 9, 12: 6}
    positions[55] = huagai_map.get(year_zhi, 1)

    # 咸池：年支三合前一辰
    xianchi_map = {1: 12, 2: 3, 3: 12, 4: 3, 5: 12, 6: 3, 7: 6, 8: 9, 9: 6, 10: 9, 11: 6, 12: 9}
    positions[49] = xianchi_map.get(year_zhi, 1)

    # 破碎（按年支）
    posui_map = {1: 2, 2: 5, 3: 2, 4: 8, 5: 8, 6: 11, 7: 11, 8: 2, 9: 8, 10: 5, 11: 2, 12: 5}
    positions[53] = posui_map.get(year_zhi, 1)

    # 阴煞
    yinsha_map = {1: 9, 2: 8, 3: 3, 4: 2, 5: 9, 6: 8, 7: 3, 8: 2, 9: 9, 10: 8, 11: 3, 12: 2}
    positions[54] = yinsha_map.get(year_zhi, 1)

    # 解神
    jie_map = {1: 1, 2: 8, 3: 2, 4: 2, 5: 1, 6: 8, 7: 2, 8: 2, 9: 1, 10: 8, 11: 2, 12: 2}
    positions[56] = jie_map.get(year_zhi, 1)

    # 封诰/恩光
    positions[50] = normalize_1_12(ming_gong_pos + 2)  # 封诰（简化）
    positions[52] = normalize_1_12(ming_gong_pos + 4)  # 恩光（简化）

    # 截空/旬空（配置化）
    jiekong_map = {1: 11, 2: 12, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8}
    if jkxk_method == "single":
        # 常规单星法
        positions[77] = jiekong_map.get(year_gan, 1)       # 截空
        positions[78] = normalize_1_12(positions[77] + 1)  # 旬空
    else:
        # double/zhanyan: 正副双星法（默认行为）
        positions[77] = jiekong_map.get(year_gan, 1)       # 截空
        positions[78] = normalize_1_12(positions[77] + 1)  # 旬空

    # 劫煞
    jiesha_map = {1: 12, 2: 3, 3: 12, 4: 3, 5: 12, 6: 3, 7: 6, 8: 9, 9: 6, 10: 9, 11: 6, 12: 9}
    positions[80] = jiesha_map.get(year_zhi, 1)

    # 龙德
    longde_map = {1: 5, 2: 8, 3: 5, 4: 8, 5: 5, 6: 8, 7: 11, 8: 2, 9: 11, 10: 2, 11: 11, 12: 2}
    positions[81] = longde_map.get(year_zhi, 1)

    # 天贵/天月
    tiangui_map = {1: 5, 2: 5, 3: 11, 4: 11, 5: 5, 6: 5, 7: 11, 8: 11, 9: 5, 10: 5, 11: 11, 12: 11}
    positions[41] = tiangui_map.get(year_zhi, 1)
    positions[35] = normalize_1_12(year_zhi + 7)       # 天月（简化）

    # 蜚廉
    feilian_map = {1: 11, 2: 12, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10}
    positions[59] = feilian_map.get(year_zhi, 1)

    # 飞廉/奏书/青龙（简化：从命宫起数）
    positions[72] = normalize_1_12(ming_gong_pos + 8)  # 飞廉
    positions[71] = normalize_1_12(ming_gong_pos + 10) # 奏书
    positions[70] = normalize_1_12(ming_gong_pos + 11) # 青龙

    return positions


# ============================================================
# 十二神（博士/长生/岁前/将前）安星
# ============================================================

# 博士十二神（博士/力士/青龙/... 起于五行局对应宫位）
_BOSHI_SHEN = [75, 61, 70, 71, 60, 72, 73, 62, 74, 0, 63, 64]

# 长生十二神星号（0占位→长生/沐浴/冠带/临官/帝旺/衰/病/死/墓/绝/胎/养）
# 这里用通用表示，实际因流派不同星名有差异
_CHANGSHENG_SHEN = [0] * 12

# 岁前十二神（简化版）
_SUIQIAN_SHEN = [0, 51, 40, 38, 36, 57, 48, 0, 53, 49, 55, 54, 80]

# 将前十二神（简化版）
_JIANGQIAN_SHEN = [0, 60, 70, 71, 72, 73, 74, 62, 63, 64, 65, 68, 0]


def an_xing_shier_shen(
    wuxing_ju: int,
    year_gan: int,
    sex: int,
    ming_gong_pos: int,
    shen_gong_pos: int,
    year_zhi: int,
    changsheng_method: str = "yinyang",
) -> dict[int, int]:
    """
    安十二神：博士十二神 + 长生十二神 + 岁前十二神 + 将前十二神

    返回: {星号: 宫位}
    """
    positions: dict[int, int] = {}

    # 博士十二神：从"水二局→寅, 木三局→子, 金四局→亥, 土五局→酉, 火六局→申"起顺行
    boshi_start = {2: 3, 3: 1, 4: 12, 5: 10, 6: 9}.get(wuxing_ju, 3)
    for i, star_id in enumerate(_BOSHI_SHEN):
        if star_id > 0:
            positions[star_id] = normalize_1_12(boshi_start + i)

    # 长生十二神（配置化）
    if changsheng_method == "yinyang":
        # 区分阴阳顺逆：阳男阴女顺行，阴男阳女逆行
        is_yang_nan = (year_gan % 2 == 1 and sex == 1) or (year_gan % 2 == 0 and sex == 2)
        changsheng_start = 3  # 寅宫
        for i, star_id in enumerate(_CHANGSHENG_SHEN):
            if star_id > 0:
                if is_yang_nan:
                    positions[star_id] = normalize_1_12(changsheng_start + i)
                else:
                    positions[star_id] = normalize_1_12(changsheng_start - i)
    elif changsheng_method == "shuitu":
        # 水土共长生：水局长生在申，土局同
        changsheng_start = {2: 9, 3: 9, 4: 9, 5: 9, 6: 3}.get(wuxing_ju, 3)
        for i, star_id in enumerate(_CHANGSHENG_SHEN):
            if star_id > 0:
                positions[star_id] = normalize_1_12(changsheng_start + i)
    else:  # "huotu"
        # 火土共长生
        changsheng_start = {2: 3, 3: 3, 4: 3, 5: 3, 6: 9}.get(wuxing_ju, 3)
        for i, star_id in enumerate(_CHANGSHENG_SHEN):
            if star_id > 0:
                positions[star_id] = normalize_1_12(changsheng_start + i)

    # 岁前十二神：从年支宫起顺行
    for i, star_id in enumerate(_SUIQIAN_SHEN):
        if star_id > 0:
            positions[star_id] = normalize_1_12(year_zhi + i)

    # 将前十二神：从命宫起顺行
    for i, star_id in enumerate(_JIANGQIAN_SHEN):
        if star_id > 0:
            positions[star_id] = normalize_1_12(ming_gong_pos + i - 1)

    return positions


if __name__ == "__main__":
    # 快速测试
    print("紫微斗数排盘模块 - 快速验证\n")

    # 测试命宫定位
    print("【命宫定位测试】")
    for m in range(1, 13):
        for s in range(1, 13):
            pos = locate_ming_gong(m, s)
            assert 1 <= pos <= 12, f"命宫越界: 月{m}时{s}→{pos}"
    print("  144种组合全部在1~12范围内 ✓")

    # 测试紫微定位
    print("\n【紫微定位测试】")
    for ju in [2, 3, 4, 5, 6]:
        for day in range(1, 31):
            pos = locate_ziwei(day, ju)
            assert 1 <= pos <= 12, f"紫微越界: 日{day}局{ju}→{pos}"
    print("  150种组合全部在1~12范围内 ✓")

    # 测试五行局数
    print("\n【五行局数测试】")
    for gan in range(1, 11):
        for dz in range(1, 13):
            ju = calc_wuxing_ju(gan, dz)
            assert ju in (2, 3, 4, 5, 6), f"局数异常: 干{gan}支{dz}→{ju}"
    print("  120种组合局数均在2~6范围内 ✓")

    # 交叉验证
    data_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "extracted_js", "data_tables"
    )
    if os.path.exists(data_dir):
        print("\n【JSON数据表交叉验证】")
        for r in verify_with_json(data_dir):
            print(f"  {r}")
    else:
        print(f"\n  数据表目录不存在: {data_dir}")

    print("\n验证完成！")
