# 紫微斗数排盘 Python 验证器

基于紫微斗数传统算法逆向实现的 Python 排盘验证模块。纯 Python 实现，无编译步骤。

## 文件结构

```
python-validator/
├── ziwei.py          # 核心排盘引擎（1697 行）
├── liupan.py         # 6 层流盘引擎（630 行）
├── feixing.py        # 飞星盘引擎（237 行）
├── geju_engine.py    # 格局判定引擎（533 行，83 格局）
├── gong_relations.py # 宫位关系工具（56 行）
├── paipan_cli.py     # CLI 命令行工具（386 行）
├── test_paipan.py         # 核心排盘测试（344 行）
├── test_e2e_5cases.py     # 5 组端到端测试（81 行）
├── test_liupan.py         # 流盘测试（470 行）
├── test_feixing.py        # 飞星盘测试（331 行）
├── test_config.py         # 配置变体测试（408 行）
├── test_p3d.py            # 天地人盘+斗君测试（229 行）
├── test_p2_regression.py  # P2 回归测试（78 行）
├── test_star_names.py     # 星名验证测试（31 行）
├── test_cases.md          # 测试用例文档
└── README.md              # 本文件
```

## 功能状态表

| 功能 | 状态 | 说明 |
|------|------|------|
| 命宫/身宫定位 | ✅ | 月支-时支+3 / 月支+时支+1 |
| 五虎遁天干 | ✅ | 年干→寅宫天干→十二宫天干 |
| 五行局数 | ✅ | 查纳音局数表 |
| 紫微/天府安星 | ✅ | 日数+局数→紫微位，对称映射→天府位 |
| 十四主星安星 | ✅ | 紫微系6星+天府系8星 |
| 辅星安星 | ✅ | 文昌文曲/左辅右弼/天魁天钺/禄存天马/擎羊陀罗/火星铃星/地空地劫 |
| 杂曜安星 | ✅ | 约40+颗（天刑/天姚/解神/天巫/天月/天伤/天使等） |
| 十二长生 | ✅ | 五行局+阴阳+性别，3种配置模式 |
| 四化飞星 | ✅ | 十天干四化表（默认版+6种天干变体） |
| 星曜亮度 | ✅ | 全书版14主星亮度 + 4种亮度体系 |
| 格局判定 | ✅ | 83 格局（32 吉格 + 11 凶格 + 40 原有格局） |
| 6 层流盘 | ✅ | 大限/小限/流年/流月/流日/流时 + 童限 |
| 飞星盘 | ✅ | 理心自化/向心自化/来因宫/宫干飞化/命宫四化/日干四化 |
| 配置变体 | ✅ | PaipanConfig 30+ 配置项（安星/四化/亮度/闰月/子时/流盘/流派） |
| 天地人盘 | ✅ | 中州派三盘（天盘/地盘/人盘） |
| 斗君计算 | ✅ | 斗君宫位 + 子年斗君 |
| 公历→农历转换 | ✅ | sxtwl 库（可选依赖） |
| 立春校正 | ✅ | 年干年支自动调整 |
| JSON 数据表交叉验证 | ✅ | 8 张核心表全部验证通过 |

## 快速开始

```python
from ziwei import paipan_from_solar, PaipanConfig

# 基本排盘（公历输入）
result = paipan_from_solar(1990, 6, 15, 14, 'male')
print(result.summary())

# 使用配置变体
config = PaipanConfig(an_kuiyue=2, an_tianma="month_zhi")
result = paipan_from_solar(1990, 6, 15, 14, 'male', config=config)

# 流盘计算
from liupan import calc_liupan
lr = calc_liupan(result, target_year=2024, target_month=6, target_day=15, target_hour=14)
print(liupan_summary(lr))

# 飞星盘计算
from feixing import calc_zihua_lixin, calc_gonggan_feihua
zihua = calc_zihua_lixin(result)
feihua = calc_gonggan_feihua(result)

# 格局判定
from geju_engine import GejuEngine
engine = GejuEngine()
match_result = engine.match(result)

# 天地人盘
from liupan import calc_tiandiren_pan
di_pan = calc_tiandiren_pan(result, pan_type=2)  # 地盘

# 斗君
from liupan import calc_doujun
doujun_pos = calc_doujun(result.ming_gong_pos, liunian_zhi=1)
```

## CLI 用法

```bash
# 基本排盘
python paipan_cli.py --solar 1990 6 15 14 --sex male

# 流盘
python paipan_cli.py --solar 1990 6 15 14 --sex male --liupan-year 2024

# 飞星盘
python paipan_cli.py --solar 1990 6 15 14 --sex male --feixing

# 配置变体
python paipan_cli.py --solar 1990 6 15 14 --sex male --config my_config.json

# 天地人盘
python paipan_cli.py --solar 1990 6 15 14 --sex male --pan-type 2

# 斗君
python paipan_cli.py --solar 1990 6 15 14 --sex male --doujun 1
```

## 运行测试

```bash
# 运行全部测试
python test_paipan.py       # 核心排盘
python test_e2e_5cases.py   # 5 组端到端
python test_liupan.py       # 流盘（50 用例）
python test_feixing.py      # 飞星盘
python test_config.py       # 配置变体（35 用例）
python test_p3d.py          # 天地人盘+斗君（28 用例）
python test_p2_regression.py # P2 回归
python test_star_names.py   # 星名验证
```

## 依赖

- Python 3.10+（核心功能纯标准库）
- sxtwl 2.0.7（可选，公历→农历转换；未安装时流日/流时测试跳过）
  - 覆盖范围：支持公元前1616~公元2404年（4020年），与权威排盘软件专业版完全对齐
  - 边界测试：13/13 PASS（见 test_sxtwl_range.py）
  - 未安装时降级到 solar_to_lunar_simple（农历月日为占位值，年干支按立春边界计算）

## 已知限制

1. **真太阳时/夏令时**：未实现，当前使用标准时区（P3-E 待做）
2. **I18N**：仅中文输出，无多语言支持（P3-E 待做）
3. **流盘对比验证**：算法逻辑自洽，但尚未与权威排盘软件 手动对比确认
4. **星曜亮度变体**：4 种亮度体系已定义，但 xiandai1/xiandai2 的具体亮度值待补充
5. **节气功能未暴露**：sxtwl 库支持节气计算（getJieQi() 系列 API），但 python-validator 未暴露。立春校正当前用近似日期（2月4日），月柱/大运起运时间未使用精确节气。未来需要时可调用 sxtwl 节气 API
6. **R6 安星码编码覆盖不全**：位4（四化变体）仅编码 6/60 种组合（10%），位5（其他选项）仅编码 6/18 种组合（33%）。未覆盖组合塌缩到默认值（见 anxingma.py docstring）

## 算法来源

| 算法 | AS3 源码 | 逆向文档 |
|------|---------|---------|
| 命宫/身宫定位 | GlobalConsts.as | 安星算法.md §3 |
| 五虎遁天干 | GlobalConsts.as | 安星算法.md 附录A |
| 五行局数 | GlobalConsts.as | 安星算法.md §4.1 |
| 紫微/天府定位 | GlobalConsts.as | 安星算法.md §4.2-4.3 |
| 十四主星 | GlobalConsts.as | 安星算法.md §4.4 |
| 四化飞星 | GlobalConsts.as | 四化飞星.md §2 |
| 辅星安星 | GlobalConsts.as | 安星算法.md §6.1 |
| 流盘排法 | GlobalConsts.as | 流盘排法.md |
| 飞星盘 | GlobalConsts.as | 四化飞星.md §3 |
| 配置变体 | GlobalConsts.as | 配置项参考.md |

## 版本历史

| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 | 核心排盘（命宫/安星/四化/辅星） | ✅ 完成 |
| P1 | 数据表验证 + 亮度 + 煞星 | ✅ 完成 |
| P2 | 格局引擎 40 格局 + CLI | ✅ 完成 |
| P3-A | 6 层流盘体系 | ✅ 完成 |
| P3-B | 格局补完 83 + 飞星盘 | ✅ 完成 |
| P3-C | PaipanConfig 配置变体 | ✅ 完成 |
| P3-D | 天地人盘 + 斗君 | ✅ 完成 |
| P3-E | 真太阳时/夏令时/I18N | ⏸️ 待做 |
