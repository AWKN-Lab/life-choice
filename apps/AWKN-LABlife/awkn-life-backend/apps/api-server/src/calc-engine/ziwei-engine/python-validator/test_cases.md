# 紫微斗数排盘引擎 — 测试用例汇总

> **更新日期**：2026-06-16
> **总用例数**：140+

---

## 按功能模块索引

| 模块 | 测试文件 | 用例数 | 覆盖范围 |
|------|---------|--------|---------|
| 核心排盘 | test_paipan.py | 8 | 命宫/身宫/安星/四化/亮度/完整排盘/JSON交叉验证 |
| 端到端 | test_e2e_5cases.py | 5 | 5 组完整排盘验证（含杂曜/占位符检查） |
| 流盘 | test_liupan.py | 50 | 大限/小限/流年/流月/流日/流时/童限/辅助函数 |
| 飞星盘 | test_feixing.py | 3 组 × 6 项 | 自化(理心/向心)/来因宫/宫干飞化/命宫四化/日干四化 |
| 配置变体 | test_config.py | 35 | PaipanConfig 10 大配置项 |
| 天地人盘+斗君 | test_p3d.py | 28 | 三盘/斗君/子年斗君/全矩阵 |
| P2 回归 | test_p2_regression.py | 9 | P2 功能回归 |
| 星名验证 | test_star_names.py | 6 | 星名映射正确性/占位符检查 |

---

## 1. 核心排盘（test_paipan.py）

| 函数 | 验证点 |
|------|--------|
| `test_unit_algorithms()` | 7 个 assert：命宫定位(3组)、身宫定位(1组)、五行局数(2组)、紫微定位(2组)、天府定位(2组)、十四主星安星(1组)、四化查表(1组) |
| `test_full_paipan()` | 完整排盘流程：命宫/身宫/五行局/紫微/天府范围校验、十四主星数量=14、四化数量=4 |
| `test_cross_validation()` | JSON 数据表交叉验证（与 extracted_js/data_tables 对比） |
| `test_case_1()` | 1990-01-15 14:00 男：命宫未/身宫酉/土五局/紫微辰/天府子/四化己干 |
| `test_case_2()` | 1985-06-20 08:00 女：命宫卯/身宫亥/土五局/紫微辰/天府子/四化乙干 |
| `test_case_3()` | 2000-12-01 22:00 男：命宫寅/身宫子/土五局/紫微未/天府酉/四化庚干 |
| `test_case_4()` | 1975-03-10 06:00 女：命宫子/身宫午/火六局/紫微申/天府申/四化乙干 |
| `test_case_5()` | 2003-09-15 12:00 男：命宫辰/身宫辰/土五局/紫微辰/天府子/四化癸干 |

---

## 2. 端到端验证（test_e2e_5cases.py）

| 用例 | 生辰 | 验证项 |
|------|------|--------|
| Case-1 标准男命 | 1990-06-15 14:00 男 | 命宫/身宫/五行局/紫微位置/杂曜数/占位符检查 |
| Case-2 88年生 | 1988-08-08 08:00 男 | 同上 |
| Case-3 千禧女 | 2000-01-01 00:00 女 | 同上 |
| Case-4 亥时男 | 1985-12-22 22:00 男 | 同上 |
| Case-5 95女 | 1995-05-20 16:00 女 | 同上 |

每组验证：`paipan_from_solar` → `to_ziwei_chart_input()` → 杂曜统计 + 占位符检查（星名不以"星"开头）

---

## 3. 流盘（test_liupan.py）

### 3.1 TestLiupanCase1（1990-06-15 14:00 男 → 2026年）

| 方法 | 验证点 |
|------|--------|
| `test_daxian_direction` | 庚年=阳，阳男顺行 |
| `test_daxian_index` | 大限序号=虚岁计算，年龄范围覆盖 |
| `test_daxian_ming_gong` | 顺行：大限命宫=本命命宫+偏移 |
| `test_daxian_sihua` | 大限天干驱动的四化与 SIHUA_TABLE 对应 |
| `test_liunian_ming_gong` | 流年命宫=流年地支宫位 |
| `test_liunian_tiangan` | 流年天干计算 |
| `test_liunian_sihua` | 流年四化与 SIHUA_TABLE 对应 |
| `test_liunian_liuchang_liuqu` | 流昌流曲位置 |
| `test_xiaoxian` | 小限宫位（男顺行） |
| `test_tongxian` | 童限起运年龄=五行局数 |
| `test_liuyue` | 流月天干推算（五虎遁） |
| `test_full_liupan` | 完整流盘：大限/小限/流年/流月/摘要输出 |

### 3.2 TestLiupanCase2（1988-08-08 08:00 女 → 2026年）

| 方法 | 验证点 |
|------|--------|
| `test_daxian_direction` | 戊年=阳，阳女逆行 |
| `test_daxian_ming_gong` | 逆行：大限命宫=本命命宫-偏移 |
| `test_liunian_ming_gong` | 流年命宫 |
| `test_xiaoxian` | 小限宫位（女逆行） |
| `test_liunian_liuchang_liuqu` | 流昌流曲 |

### 3.3 TestLiupanCase3（2000-01-01 00:00 男 → 2025年）

| 方法 | 验证点 |
|------|--------|
| `test_daxian_direction` | 庚年=阳，阳男顺行 |
| `test_daxian_ming_gong` | 大限命宫 |
| `test_liunian` | 2025年=乙巳年，天干/地支/命宫 |
| `test_xiaoxian` | 小限宫位范围 |
| `test_liuchang_liuqu` | 流昌流曲 |

### 3.4 TestLiupanCase4（1985-12-22 10:00 女 → 2030年）

| 方法 | 验证点 |
|------|--------|
| `test_daxian_direction` | 乙年=阴，阴女顺行 |
| `test_daxian_ming_gong` | 顺行：大限命宫 |
| `test_liunian` | 2030年=庚戌年 |
| `test_xiaoxian` | 小限宫位 |
| `test_liuchang_liuqu` | 流昌流曲 |

### 3.5 TestLiupanCase5（1995-05-20 16:00 男 → 2024年）

| 方法 | 验证点 |
|------|--------|
| `test_daxian_direction` | 乙年=阴，阴男逆行 |
| `test_daxian_ming_gong` | 逆行：大限命宫 |
| `test_liunian` | 2024年=甲辰年 |
| `test_liunian_sihua_2024` | 甲年四化：廉贞化禄/破军化权/武曲化科/太阳化忌 |
| `test_xiaoxian` | 小限宫位 |
| `test_liuchang_liuqu_2024` | 甲年流昌=寅(3), 流曲=酉(10) |

### 3.6 TestLiupanHelperFunctions（辅助函数）

| 方法 | 验证点 |
|------|--------|
| `test_gong_names_from_ming` | 宫名编号：命宫在子(1) |
| `test_gong_names_from_ming_yin` | 宫名编号：命宫在寅(3) |
| `test_liuyue_tiangan` | 流月天干：甲年正月=丙寅 |
| `test_liuyue_tiangan_gui_year` | 流月天干：癸年正月=甲寅 |
| `test_liushi_tiangan` | 流时天干：甲日子时→甲子时 |
| `test_liushi_tiangan_jia_chou` | 流时天干：甲日丑时→乙丑时 |
| `test_liushi_tiangan_yi_zi` | 流时天干：乙日子时→丙子时 |
| `test_xiaoxian_start_table` | 小限起宫表：子→戌(11), 寅→辰(5) |
| `test_liuchang_table` | 流昌表：甲→寅(3), 丙→巳(6), 癸→子(1) |
| `test_liuqu_table` | 流曲表：甲→酉(10), 丙→午(7), 癸→亥(12) |
| `test_daxian_age_range` | 大限年龄范围：第N大限起止年龄 |
| `test_tongxian_all_ju` | 童限起运：五行局2~6对应起运年龄 |

### 3.7 TestLiupanIntegration（集成测试）

| 方法 | 验证点 |
|------|--------|
| `test_calc_liupan_basic` | 基本流盘（大限/小限/流年），流月/日/时为None |
| `test_calc_liupan_with_month` | 含流月：month_index=6 |
| `test_calc_liupan_with_day` | 含流日（需 sxtwl 库） |
| `test_calc_liupan_with_hour` | 含流时（需 sxtwl 库） |
| `test_liupan_summary` | 摘要输出包含大限/小限/流年/流月/童限 |

---

## 4. 飞星盘（test_feixing.py）

3 组用例（1990男/1988女/2000男），每组验证 6 项：

| 验证项 | 函数 | 说明 |
|--------|------|------|
| 理心自化 | `calc_zihua_lixin` | 本宫天干使本宫星曜产生四化 |
| 向心自化 | `calc_zihua_xiangxin` | 对宫天干使本宫星曜产生四化 |
| 来因宫 | `calc_laiyin_gong` | 天干==年干的宫位 |
| 宫干飞化 | `calc_gonggan_feihua` | 源宫天干飞出的四化星落在目标宫位 |
| 命宫四化 | `calc_minggong_sihua` | 命宫天干驱动的四化 |
| 日干四化 | `calc_rigan_sihua` | 日天干驱动的四化（用年干近似验证） |

每组验证流程：排盘 → 6 项计算 → 交叉校验（天干匹配/四化表/星曜在宫/四化类型）

---

## 5. 配置变体（test_config.py）

### 5.1 TestBackwardCompat（向后兼容）

| 方法 | 验证点 |
|------|--------|
| `test_paipan_from_solar_no_config_equals_default` | 不传 config == 传 PaipanConfig() |
| `test_paipan_no_config_equals_default` | paipan() 不传 config == 传 PaipanConfig() |

### 5.2 TestTianmaConfig（安天马）

| 方法 | 验证点 |
|------|--------|
| `test_tianma_year_zhi` | 年支=7(午) → 天马在3(寅) |
| `test_tianma_month_zhi` | 月支=8(未) → 天马在11(戌) |
| `test_tianma_year_vs_month_diff` | 年支/月支安天马位置不同 |

### 5.3 TestTiankongConfig（安天空）

| 方法 | 验证点 |
|------|--------|
| `test_tiankong_standard` | standard 模式天空存在 |
| `test_tiankong_shun_jia` | shun_jia 模式天空存在 |
| `test_tiankong_standard_vs_shun_jia_diff` | 两种模式天空位置不同 |

### 5.4 TestKuiyueConfig（安魁钺）

| 方法 | 验证点 |
|------|--------|
| `test_kuiyue_method1~4` | 4 种魁钺安星方法均产出结果 |
| `test_kuiyue_geng_method1_vs_2` | 庚年 method1≠method2 魁位 |
| `test_kuiyue_xin_method1_vs_2` | 辛年 method1≠method2 魁位 |

### 5.5 TestMingzhuConfig（安命主）

| 方法 | 验证点 |
|------|--------|
| `test_mingzhu_quanshu` | 全书派：按命宫地支查表 |
| `test_mingzhu_zhongzhou` | 中州派：按年支查表 |
| `test_mingzhu_quanshu_vs_zhongzhou` | 命宫≠年支时两派命主星不同 |

### 5.6 TestChangshengConfig（长生十二神）

| 方法 | 验证点 |
|------|--------|
| `test_changsheng_yinyang/shuitu/huotu` | 3 种起法均被接受且排盘成功 |
| `test_changsheng_all_methods_valid` | 3 种方法均产出有效排盘（12宫/五行局>0） |

### 5.7 TestRunYueConfig（闰月处理）

| 方法 | 验证点 |
|------|--------|
| `test_run_yue_benyue` | 本月：lunar_month=5 |
| `test_run_yue_xiayue` | 下月：lunar_month=6 |
| `test_run_yue_yuezhong` | 月中：lunar_month=5（同 benyue） |
| `test_run_yue_benyue_vs_xiayue_diff` | benyue≠xiayue 排盘结果 |
| `test_run_yue_benyue_equals_yuezhong` | benyue==yuezhong 当前实现一致 |

### 5.8 TestZiShiConfig（子时处理）

| 方法 | 验证点 |
|------|--------|
| `test_zi_shi_dang_ri` | 当日：solar_day=15 |
| `test_zi_shi_ci_ri` | 次日：solar_day=16 |
| `test_zi_shi_dang_ri_vs_ci_ri_diff` | 当日≠次日排盘结果 |

### 5.9 TestCLIConfig（CLI --config 参数）

| 方法 | 验证点 |
|------|--------|
| `test_cli_with_config_file` | CLI 使用 --config 加载 JSON 并输出有效 JSON |
| `test_cli_config_affects_output` | 非默认 config 输出与默认输出不同 |

### 5.10 TestPaipanConfigSerialization（序列化）

| 方法 | 验证点 |
|------|--------|
| `test_asdict_default` | 默认配置可转字典，含 an_tianma/an_kuiyue/run_yue |
| `test_from_dict_default` | 字典可还原为 PaipanConfig |
| `test_roundtrip_custom` | 自定义配置序列化往返一致 |
| `test_asdict_all_fields_present` | asdict 包含全部 19 个配置字段 |

---

## 6. 天地人盘+斗君（test_p3d.py）

### 6.1 TestTianDiRenPan（天地人盘）

| 方法 | 验证点 |
|------|--------|
| `test_tian_pan_matches_original` | 天盘(1)命宫/五行局/紫微/天府=原命盘 |
| `test_tian_pan_gong_names` | 天盘宫名：命宫位=宫名1 |
| `test_tian_pan_default` | 不传 pan_type 默认为天盘 |
| `test_di_pan_ming_gong_is_shen_gong` | 地盘(2)命宫=身宫位置 |
| `test_di_pan_gong_names_from_shen_gong` | 地盘宫名从身宫起排 |
| `test_di_pan_wuxing_ju_may_differ` | 地盘五行局可能不同于天盘（多组验证） |
| `test_di_pan_ziwei_recalculated` | 地盘紫微/天府基于新五行局重算 |
| `test_ren_pan_offset_plus1` | 人盘(3,offset=+1)命宫=原命宫+1 |
| `test_ren_pan_offset_minus1` | 人盘(3,offset=-1)命宫=原命宫-1 |
| `test_ren_pan_offset_zero` | 人盘(3,offset=0)命宫=原命宫 |
| `test_ren_pan_gong_names` | 人盘宫名从偏移后命宫起排 |
| `test_ren_pan_wuxing_ju_recalculated` | 人盘五行局基于偏移后命宫重算 |
| `test_1990_male` | 1990男三盘面验证 |
| `test_1988_female` | 1988女三盘面验证 |
| `test_invalid_pan_type` | 无效 pan_type=4 抛 ValueError |
| `test_gong_names_length` | 宫名列表长度=13，索引0=0，1~12各有宫名 |
| `test_gong_names_cover_all` | 宫名1~12各出现一次 |

### 6.2 TestDoujun（斗君）

| 方法 | 验证点 |
|------|--------|
| `test_doujun_ming1_liunian1` | 命宫子(1)+流年子(1)→斗君子(1) |
| `test_doujun_ming1_liunian2` | 命宫子(1)+流年丑(2)→斗君丑(2) |
| `test_doujun_ming2_liunian1` | 命宫丑(2)+流年子(1)→斗君亥(12) |
| `test_doujun_ming3_liunian3` | 命宫寅(3)+流年寅(3)→斗君=1（对角线） |
| `test_zinian_doujun_ming1` | 子年斗君：命宫子→子(1) |
| `test_zinian_doujun_ming2` | 子年斗君：命宫丑→亥(12) |
| `test_zinian_doujun_ming12` | 子年斗君：命宫亥→丑(2) |
| `test_full_matrix_range` | 全矩阵12×12值均在1~12 |
| `test_full_matrix_diagonal` | 全矩阵对角线=1 |
| `test_doujun_consistency_with_zinian` | calc_doujun(ming,1)==calc_zinian_doujun(ming) |
| `test_doujun_with_paipan_result` | 结合排盘结果验证斗君 |

---

## 7. P2 回归（test_p2_regression.py）

| 编号 | 验证点 |
|------|--------|
| [1] | STAR_NAMES 1~81 完整（14主星+辅星+杂曜） |
| [2] | 中文名无占位符（不以"星"开头） |
| [3] | 排盘主流程：1990-06-15 14:00 男 → 火六局/命宫丑 |
| [4] | JSON 导出结构：12宫+四化+格局 |
| [5] | 公开 API 完整：paipan/an_xing_zayao/an_xing_shier_shen/get_brightness |
| [6] | 4 套亮度矩阵：quanshu/zhongzhou/xiandai1/xiandai2 |
| [7] | 四化查表：甲干化禄=廉贞(6) |
| [8] | 子时跨日：23:00→子时识别 |
| [9] | 杂曜覆盖：≥50 颗 |

---

## 8. 星名验证（test_star_names.py）

| 编号 | 验证点 |
|------|--------|
| [1] | 29~81 号星全部有名称 |
| [2] | STAR_NAMES_ZAYAO 总数 |
| [3] | STAR_NAMES 总数 |
| [4] | 排盘输出无占位符（"星N"格式） |
| [5] | 总星数/去重星数统计 |
| [6] | 33 个杂曜样本命中率（天福/天官/天刑/天厨/博士/青龙/白虎/劫煞/龙德/华盖/孤辰/寡宿/天哭/天虚/天喜/红鸾/咸池/破碎/截空/旬空/解神/阴煞/蜚廉/封诰/恩光/三台/八座/天才/天寿/天姚/天空/天月/天贵） |
