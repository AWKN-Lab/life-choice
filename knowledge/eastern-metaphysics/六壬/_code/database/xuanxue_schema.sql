CREATE TABLE yue_jiang (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    di_zhi TEXT NOT NULL UNIQUE,
    tai_yang_guo TEXT NOT NULL,
    start_jie_qi TEXT NOT NULL,
    end_jie_qi TEXT NOT NULL,
    zhong_qi TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    description TEXT
);
CREATE TABLE gui_ren_rule (
    id INTEGER PRIMARY KEY,
    is_daytime INTEGER NOT NULL,
    start_zhi TEXT NOT NULL,
    end_zhi TEXT NOT NULL,
    gui_ren_di_zhi TEXT NOT NULL,
    shun_ni TEXT NOT NULL,
    gui_ren_range TEXT,
    description TEXT
);
CREATE TABLE jiu_zong_men (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    alias TEXT,
    condition TEXT NOT NULL,
    condition_detail TEXT,
    method TEXT NOT NULL,
    method_verse TEXT,
    chuan_rule TEXT,
    example_ke TEXT,
    example_desc TEXT,
    description TEXT
);
CREATE TABLE tian_jiang (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    wu_xing TEXT NOT NULL,
    direction TEXT,
    attribute TEXT NOT NULL,
    ranking INTEGER,
    base_meaning TEXT NOT NULL,
    favorable TEXT,
    unfavorable TEXT,
    lin_gong_effect TEXT,
    description TEXT
);
CREATE TABLE di_zhi_shen (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    wu_xing TEXT,
    attribute TEXT,
    ranking INTEGER,
    meaning TEXT,
    description TEXT
);
CREATE TABLE gan_ji_gong (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gan TEXT NOT NULL,
    gong TEXT NOT NULL,
    description TEXT
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE liuren_qi_ke (
    id INTEGER PRIMARY KEY,
    step_no INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    rule TEXT NOT NULL,
    detail TEXT,
    common_mistakes TEXT,
    description TEXT
);
CREATE TABLE zhan_lei_shi_sheng (
    id INTEGER PRIMARY KEY,
    zhan_lei TEXT NOT NULL,
    core_sheng TEXT NOT NULL,
    event_type TEXT,
    granularity TEXT,
    question_type TEXT,
    common_kou_jue TEXT,
    judge_points TEXT,
    description TEXT
);
CREATE TABLE bazi_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_no TEXT NOT NULL UNIQUE,
    case_source TEXT,
    source_detail TEXT,
    name TEXT,
    gender TEXT NOT NULL,
    gender_source TEXT,
    birth_year INTEGER NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_day INTEGER NOT NULL,
    birth_hour INTEGER,
    birth_minute INTEGER,
    is_lunar INTEGER DEFAULT 1,
    is_leap_month INTEGER DEFAULT 0,
    timezone TEXT DEFAULT 'Asia/Shanghai',
    birth_location TEXT,
    longitude REAL,
    true_solar_time INTEGER DEFAULT 0,
    year_zhu TEXT NOT NULL,
    month_zhu TEXT NOT NULL,
    day_zhu TEXT NOT NULL,
    hour_zhu TEXT,
    year_gan TEXT,
    year_zhi TEXT,
    month_gan TEXT,
    month_zhi TEXT,
    day_gan TEXT,
    day_zhi TEXT,
    hour_gan TEXT,
    hour_zhi TEXT,
    year_zang_ben TEXT,
    year_zang_zhong TEXT,
    year_zang_yu TEXT,
    month_zang_ben TEXT,
    month_zang_zhong TEXT,
    month_zang_yu TEXT,
    day_zang_ben TEXT,
    day_zang_zhong TEXT,
    day_zang_yu TEXT,
    hour_zang_ben TEXT,
    hour_zang_zhong TEXT,
    hour_zang_yu TEXT,
    year_na_yin TEXT,
    month_na_yin TEXT,
    day_na_yin TEXT,
    hour_na_yin TEXT,
    na_yin_relation TEXT,
    year_shi_sheng TEXT,
    month_shi_sheng TEXT,
    hour_shi_sheng TEXT,
    ri_zhi_shi_sheng TEXT,
    year_chang_sheng TEXT,
    month_chang_sheng TEXT,
    day_chang_sheng TEXT,
    hour_chang_sheng TEXT,
    day_master TEXT NOT NULL,
    day_master_yy TEXT,
    day_master_wx TEXT,
    strength_score REAL,
    strength_level TEXT,
    strong_wx TEXT,
    weak_wx TEXT,
    sheng_ke_detail TEXT,
    pattern_type TEXT,
    pattern_name TEXT,
    pattern_level TEXT,
    pattern_condition TEXT,
    pattern_evaluate TEXT,
    yong_shen TEXT,
    yong_shen_reason TEXT,
    xi_shen TEXT,
    ji_shen TEXT,
    chou_shen TEXT,
    guan_shen TEXT,
    tiao_hou_needed TEXT,
    tiao_hou_god TEXT,
    tiao_hou_reason TEXT,
    bing_type TEXT,
    bing_detail TEXT,
    yao_type TEXT,
    yao_detail TEXT,
    cai_ku_zhi TEXT,
    bi_jie_ku_zhi TEXT,
    has_cai_ku INTEGER,
    kai_ku_status TEXT,
    tao_hua_zhi TEXT,
    tao_hua_type TEXT,
    chong_he_list TEXT,
    xing_list TEXT,
    hai_list TEXT,
    he_list TEXT,
    shen_sha_list TEXT,
    kong_wang TEXT,
    tui_yan TEXT,
    mai_xi TEXT,
    yun_start_age INTEGER,
    yun_direction TEXT,
    yun_start_year INTEGER,
    da_yun_detail TEXT,
    lifespan TEXT,
    wealth_level TEXT,
    official_rank TEXT,
    marriage_desc TEXT,
    children_desc TEXT,
    health_desc TEXT,
    career_desc TEXT,
    personality_desc TEXT,
    spouse_appear TEXT,
    spouse_character TEXT,
    marriage_age TEXT,
    summary TEXT,
    key_events TEXT,
    advice TEXT,
    recommended_zhen TEXT,
    bu_cai_ku_advice TEXT,
    tao_hua_advice TEXT,
    shi_yong_items TEXT,
    shi_yong_foods TEXT,
    feng_shui_advice TEXT,
    source TEXT,
    source_chapter TEXT,
    page_no TEXT,
    confidence INTEGER DEFAULT 3,
    verified INTEGER DEFAULT 0,
    verified_by TEXT,
    verified_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE bazi_dayun (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES bazi_cases(id),
    yun_no INTEGER NOT NULL,
    start_age INTEGER NOT NULL,
    end_age INTEGER NOT NULL,
    start_year INTEGER NOT NULL,
    end_year INTEGER,
    zhu TEXT NOT NULL,
    yun_gan TEXT,
    yun_zhi TEXT,
    yun_na_yin TEXT,
    tian_god TEXT,
    gan_relation TEXT,
    zhi_relation TEXT,
    yun_ti_hou TEXT,
    yun_pattern TEXT,
    yun_wealth TEXT,
    yun_career TEXT,
    yun_health TEXT,
    yun_marriage TEXT,
    summary TEXT,
    key_highlight TEXT,
    notes TEXT
);
CREATE TABLE bazi_liu_nian (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES bazi_cases(id),
    dayun_id INTEGER REFERENCES bazi_dayun(id),
    year INTEGER NOT NULL,
    age INTEGER NOT NULL,
    gan_zhi TEXT NOT NULL,
    tian_gan_wx TEXT,
    di_zhi_wx TEXT,
    wx_sheng_ke TEXT,
    yu_ming_ju TEXT,
    yu_dayun TEXT,
    liu_nian_shi TEXT,
    liu_nian_ying TEXT,
    ji_xiong TEXT,
    event_type TEXT,
    event_level TEXT,
    summary TEXT,
    key_event TEXT,
    suggestion TEXT,
    notes TEXT
);
CREATE TABLE bazi_life_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES bazi_cases(id),
    event_type TEXT NOT NULL,
    event_year INTEGER,
    event_age INTEGER,
    event_decade TEXT,
    event_title TEXT,
    event_desc TEXT NOT NULL,
    cause_analysis TEXT,
    result_analysis TEXT,
    event_level TEXT,
    verified INTEGER DEFAULT 0,
    verification TEXT,
    deviation TEXT,
    source TEXT,
    source_quote TEXT,
    notes TEXT
);
CREATE TABLE liuren_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_no TEXT NOT NULL UNIQUE,
    case_source TEXT,
    name TEXT,
    gender TEXT,
    consult_time TEXT NOT NULL,
    question TEXT NOT NULL,
    question_type TEXT,
    event_type_code TEXT,
    granularity TEXT,
    question_type_code TEXT,
    yue_jiang TEXT NOT NULL,
    zhan_shi TEXT NOT NULL,
    ri_gan TEXT NOT NULL,
    ri_zhi TEXT NOT NULL,
    tian_panel TEXT NOT NULL,
    di_panel TEXT NOT NULL,
    si_ke1 TEXT,
    si_ke1_gan TEXT,
    si_ke1_zhi TEXT,
    si_ke2 TEXT,
    si_ke2_gan TEXT,
    si_ke2_zhi TEXT,
    si_ke3 TEXT,
    si_ke3_gan TEXT,
    si_ke3_zhi TEXT,
    si_ke4 TEXT,
    si_ke4_gan TEXT,
    si_ke4_zhi TEXT,
    chuan_1 TEXT,
    chuan_1_gan TEXT,
    chuan_1_zhi TEXT,
    chuan_2 TEXT,
    chuan_2_gan TEXT,
    chuan_2_zhi TEXT,
    chuan_3 TEXT,
    chuan_3_gan TEXT,
    chuan_3_zhi TEXT,
    chuan_type TEXT,
    jiu_zong_name TEXT,
    jiu_zong_condition TEXT,
    jiu_zong_method TEXT,
    tian_jiang_1 TEXT,
    tian_jiang_2 TEXT,
    tian_jiang_3 TEXT,
    tian_jiang_4 TEXT,
    tian_jiang_5 TEXT,
    tian_jiang_6 TEXT,
    tian_jiang_7 TEXT,
    tian_jiang_8 TEXT,
    tian_jiang_9 TEXT,
    tian_jiang_10 TEXT,
    tian_jiang_11 TEXT,
    tian_jiang_12 TEXT,
    shen_sha_list TEXT,
    analysis TEXT,
    judgment TEXT,
    ji_xiong TEXT,
    lei_sheng_judge TEXT,
    core_judge_points TEXT,
    result TEXT,
    verified INTEGER DEFAULT 0,
    verify_date TEXT,
    accuracy TEXT,
    source TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tian_gan (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    yin_yang TEXT NOT NULL,
    wu_xing TEXT NOT NULL,
    position_order INTEGER NOT NULL,
    image_yi TEXT,
    yi_image_detail TEXT,
    chang_sheng TEXT,
    mu_yu TEXT,
    guan_dai TEXT,
    lin_guan TEXT,
    di_wang TEXT,
    shuai TEXT,
    bing TEXT,
    si TEXT,
    mu TEXT,
    jue TEXT,
    tai TEXT,
    yang TEXT,
    xing_zhou TEXT,
    tian_zhu_yi TEXT,
    description TEXT
);
CREATE TABLE di_zhi (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    yin_yang TEXT NOT NULL,
    wu_xing TEXT NOT NULL,
    position_order INTEGER NOT NULL,
    shu_xiang TEXT,
    fang_wei TEXT,
    zang_gan_ben TEXT,
    zang_gan_zhong TEXT,
    zang_gan_yu TEXT,
    he_zhi TEXT,
    chong_zhi TEXT,
    xing_zhi TEXT,
    hai_zhi TEXT,
    sheng_zhi TEXT,
    image_yi TEXT,
    yi_image_detail TEXT,
    yue_jiang TEXT,
    description TEXT
);
CREATE TABLE wu_xing (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    yin_yang TEXT NOT NULL,
    sheng_group TEXT,
    ke_group TEXT,
    direction TEXT,
    season TEXT,
    wu_xing_color TEXT,
    wu_xing_number TEXT,
    energy_items TEXT,
    energy_foods TEXT,
    energy_tea TEXT,
    description TEXT
);
CREATE TABLE na_yin (
    id INTEGER PRIMARY KEY,
    gan_zhi TEXT NOT NULL UNIQUE,
    na_yin_name TEXT NOT NULL,
    na_yin_wu_xing TEXT NOT NULL,
    na_yin_category TEXT NOT NULL,
    na_yin_sub TEXT,
    nature_jixiong TEXT,
    likes TEXT,
    dislikes TEXT,
    shen_sha_marks TEXT,
    description TEXT
);
CREATE TABLE shi_er_chang_sheng (
    id INTEGER PRIMARY KEY,
    ri_gan TEXT NOT NULL,
    di_zhi TEXT NOT NULL,
    wei_zhi TEXT NOT NULL,
    wei_zhi_order INTEGER NOT NULL,
    is_ji_shen TEXT,
    chang_sheng_image TEXT,
    description TEXT,
    UNIQUE(ri_gan, di_zhi)
);
CREATE TABLE kong_wang (
    id INTEGER PRIMARY KEY,
    xun TEXT NOT NULL,
    kong_wang_1 TEXT NOT NULL,
    kong_wang_2 TEXT NOT NULL,
    description TEXT
);
CREATE TABLE cai_ku (
    id INTEGER PRIMARY KEY,
    ri_gan TEXT NOT NULL,
    ri_gan_wu_xing TEXT NOT NULL,
    cai_ku_di_zhi TEXT NOT NULL,
    bi_jie_ku TEXT NOT NULL,
    guan_sha_ku TEXT,
    yin_xiao_ku TEXT,
    shi_shang_ku TEXT,
    description TEXT
);
CREATE TABLE wu_hu_dun (
    id INTEGER PRIMARY KEY,
    nian_gan TEXT NOT NULL,
    yue_gan_start TEXT NOT NULL,
    yue_gan_2 TEXT, yue_gan_3 TEXT, yue_gan_4 TEXT, yue_gan_5 TEXT,
    yue_gan_6 TEXT, yue_gan_7 TEXT, yue_gan_8 TEXT, yue_gan_9 TEXT,
    yue_gan_10 TEXT, yue_gan_11 TEXT, yue_gan_12 TEXT,
    kou_jue TEXT,
    description TEXT
);
CREATE TABLE wu_shu_dun (
    id INTEGER PRIMARY KEY,
    ri_gan TEXT NOT NULL,
    shi_gan_start TEXT NOT NULL,
    shi_gan_2 TEXT, shi_gan_3 TEXT, shi_gan_4 TEXT, shi_gan_5 TEXT,
    shi_gan_6 TEXT, shi_gan_7 TEXT, shi_gan_8 TEXT, shi_gan_9 TEXT,
    shi_gan_10 TEXT, shi_gan_11 TEXT, shi_gan_12 TEXT,
    kou_jue TEXT,
    description TEXT
);
CREATE TABLE db_version (
    id INTEGER PRIMARY KEY,
    version TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    changelog TEXT
);
CREATE TABLE enum_gender (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE enum_yin_yang (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE enum_wu_xing (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE enum_ji_xiong (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE enum_pattern_type (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE enum_strength_level (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE enum_verified (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE enum_question_type (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE shen_sha_category (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    category_desc TEXT,
    quan_li_weight TEXT,
    notes TEXT
);
CREATE TABLE shen_sha (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    wu_xing TEXT,
    ji_xiong TEXT NOT NULL,
    qi_ju_rule TEXT NOT NULL,
    qi_ju_gan TEXT,
    qi_ju_zhi TEXT,
    lookup_type TEXT NOT NULL,
    shi_yong_zhan TEXT,
    base_meaning TEXT,
    effect_ji TEXT,
    effect_xiong TEXT,
    effect_zhong TEXT,
    modern_desc TEXT,
    source TEXT,
    hua_jie_method TEXT,
    hua_jie_items TEXT,
    description TEXT
);
CREATE TABLE shen_sha_zhan_lei (
    id INTEGER PRIMARY KEY,
    shen_sha_name TEXT NOT NULL,
    zhan_lei TEXT NOT NULL,
    priority INTEGER,
    description TEXT
);
CREATE TABLE shi_shen_relation (
    id INTEGER PRIMARY KEY,
    gan_zhi_1 TEXT NOT NULL,
    gan_zhi_2 TEXT NOT NULL,
    wu_xing_1 TEXT NOT NULL,
    wu_xing_2 TEXT NOT NULL,
    yin_yang_1 TEXT NOT NULL,
    yin_yang_2 TEXT NOT NULL,
    is_same_wuxing INTEGER,
    is_sheng INTEGER,
    is_bei_sheng INTEGER,
    is_ke INTEGER,
    is_bei_ke INTEGER,
    shi_shen_name TEXT,
    shi_shen_type TEXT,
    is_tong_yin INTEGER,
    UNIQUE(gan_zhi_1, gan_zhi_2)
);
CREATE TABLE bazi_patterns (
    id INTEGER PRIMARY KEY,
    pattern_name TEXT NOT NULL UNIQUE,
    pattern_type TEXT NOT NULL,
    condition TEXT NOT NULL,
    yue_ling_req TEXT,
    gan_tou_req TEXT,
    chong_po_req TEXT,
    characteristics TEXT,
    evaluation TEXT,
    likes TEXT,
    dislikes TEXT,
    judgment TEXT,
    source TEXT,
    description TEXT
);
CREATE TABLE tiao_hou (
    id INTEGER PRIMARY KEY,
    gan TEXT NOT NULL,
    season TEXT NOT NULL,
    tiao_hou_needed TEXT NOT NULL,
    yong_shen TEXT NOT NULL,
    xi_shen TEXT,
    detail_reason TEXT,
    source TEXT,
    description TEXT
);
CREATE TABLE bing_yao_rules (
    id INTEGER PRIMARY KEY,
    bing_type TEXT NOT NULL,
    bing_desc TEXT,
    yao_type TEXT NOT NULL,
    yao_desc TEXT,
    typical_combo TEXT,
    case_example TEXT,
    judgment TEXT,
    description TEXT
);
CREATE TABLE tong_guan_rules (
    id INTEGER PRIMARY KEY,
    zhan_dou_1 TEXT NOT NULL,
    zhan_dou_2 TEXT NOT NULL,
    tong_guan_sheng TEXT NOT NULL,
    tong_guan_method TEXT,
    case_example TEXT,
    description TEXT
);
CREATE TABLE xing_chong_he_hai (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    zhi_1 TEXT NOT NULL,
    zhi_2 TEXT NOT NULL,
    effect TEXT,
    judgment TEXT,
    case_example TEXT,
    description TEXT
);
CREATE INDEX idx_tian_gan_name ON tian_gan(name);
CREATE INDEX idx_di_zhi_name ON di_zhi(name);
CREATE INDEX idx_wu_xing_name ON wu_xing(name);
CREATE INDEX idx_na_yin_gan_zhi ON na_yin(gan_zhi);
CREATE INDEX idx_na_yin_category ON na_yin(na_yin_category);
CREATE INDEX idx_na_yin_name ON na_yin(na_yin_name);
CREATE INDEX idx_chang_sheng_gan ON shi_er_chang_sheng(ri_gan);
CREATE INDEX idx_chang_sheng_zhi ON shi_er_chang_sheng(di_zhi);
CREATE INDEX idx_kong_wang_xun ON kong_wang(xun);
CREATE INDEX idx_cai_ku_gan ON cai_ku(ri_gan);
CREATE INDEX idx_wu_hu_dun_gan ON wu_hu_dun(nian_gan);
CREATE INDEX idx_wu_shu_dun_gan ON wu_shu_dun(ri_gan);
CREATE INDEX idx_shensha_name ON shen_sha(name);
CREATE INDEX idx_shensha_category ON shen_sha(category);
CREATE INDEX idx_shensha_lookup ON shen_sha(lookup_type);
CREATE INDEX idx_shensha_jixiong ON shen_sha(ji_xiong);
CREATE INDEX idx_shensha_zhanlei ON shen_sha_zhan_lei(shen_sha_name);
CREATE INDEX idx_shensha_zhanlei2 ON shen_sha_zhan_lei(zhan_lei);
CREATE INDEX idx_shishen_gan1 ON shi_shen_relation(gan_zhi_1);
CREATE INDEX idx_shishen_gan2 ON shi_shen_relation(gan_zhi_2);
CREATE INDEX idx_shishen_name ON shi_shen_relation(shi_shen_name);
CREATE INDEX idx_pattern_name ON bazi_patterns(pattern_name);
CREATE INDEX idx_pattern_type ON bazi_patterns(pattern_type);
CREATE INDEX idx_tiao_hou_gan ON tiao_hou(gan);
CREATE INDEX idx_tiao_hou_season ON tiao_hou(season);
CREATE INDEX idx_xchh_type ON xing_chong_he_hai(type);
CREATE INDEX idx_yuejiang_zhi ON yue_jiang(di_zhi);
CREATE INDEX idx_jiuzong_name ON jiu_zong_men(name);
CREATE INDEX idx_tianjiang_name ON tian_jiang(name);
CREATE INDEX idx_ganjigong_gan ON gan_ji_gong(gan);
CREATE INDEX idx_zhanlei_name ON zhan_lei_shi_sheng(zhan_lei);
CREATE INDEX idx_bazi_case_no ON bazi_cases(case_no);
CREATE INDEX idx_bazi_birth ON bazi_cases(birth_year, birth_month, birth_day);
CREATE INDEX idx_bazi_gan ON bazi_cases(day_gan);
CREATE INDEX idx_bazi_pattern ON bazi_cases(pattern_name);
CREATE INDEX idx_bazi_na_yin ON bazi_cases(day_na_yin);
CREATE INDEX idx_bazi_cai_ku ON bazi_cases(cai_ku_zhi);
CREATE INDEX idx_bazi_tao_hua ON bazi_cases(tao_hua_zhi);
CREATE INDEX idx_bazi_verified ON bazi_cases(verified);
CREATE INDEX idx_bazi_source ON bazi_cases(source);
CREATE INDEX idx_liuren_case_no ON liuren_cases(case_no);
CREATE INDEX idx_liuren_question ON liuren_cases(question_type);
CREATE INDEX idx_liuren_chuan ON liuren_cases(chuan_type);
CREATE INDEX idx_dayun_case ON bazi_dayun(case_id);
CREATE INDEX idx_liunian_case ON bazi_liu_nian(case_id);
CREATE INDEX idx_events_case ON bazi_life_events(case_id);
CREATE VIEW v_bazi_full_example AS
SELECT
    b.id,
    b.case_no,
    b.name,
    b.gender,
    b.birth_year,
    b.birth_month,
    b.birth_day,
    b.year_zhu,
    b.month_zhu,
    b.day_zhu,
    b.hour_zhu,
    b.day_master,
    b.pattern_name,
    b.pattern_type,
    b.strength_level,
    b.yong_shen,
    b.xi_shen,
    b.ji_shen,
    b.source,
    b.confidence,
    b.verified
FROM bazi_cases b
/* v_bazi_full_example(id,case_no,name,gender,birth_year,birth_month,birth_day,year_zhu,month_zhu,day_zhu,hour_zhu,day_master,pattern_name,pattern_type,strength_level,yong_shen,xi_shen,ji_shen,source,confidence,verified) */;
