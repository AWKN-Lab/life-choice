PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
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
INSERT INTO yue_jiang VALUES(1,'神后','子','玄枵','大雪','小寒','冬至','12月7日左右','1月5日左右','冬至后月将在子');
INSERT INTO yue_jiang VALUES(2,'大吉','丑','星纪','小寒','立春','大寒','1月5日左右','2月4日左右','大寒后月将在丑');
INSERT INTO yue_jiang VALUES(3,'功曹','寅','析木','立春','惊蛰','雨水','2月4日左右','3月6日左右','雨水后月将在寅');
INSERT INTO yue_jiang VALUES(4,'太冲','卯','大火','惊蛰','清明','春分','3月6日左右','4月5日左右','春分后月将在卯');
INSERT INTO yue_jiang VALUES(5,'天罡','辰','寿星','清明','立夏','谷雨','4月5日左右','5月6日左右','谷雨后月将在辰');
INSERT INTO yue_jiang VALUES(6,'太乙','巳','鹑首','立夏','芒种','小满','5月6日左右','6月6日左右','小满后月将在巳');
INSERT INTO yue_jiang VALUES(7,'胜光','午','鹑火','芒种','小暑','夏至','6月6日左右','7月7日左右','夏至后月将在午');
INSERT INTO yue_jiang VALUES(8,'小吉','未','鹑尾','小暑','立秋','大暑','7月7日左右','8月7日左右','大暑后月将在未');
INSERT INTO yue_jiang VALUES(9,'传送','申','寿星2','立秋','白露','处暑','8月7日左右','9月8日左右','处暑后月将在申');
INSERT INTO yue_jiang VALUES(10,'从魁','酉','大火2','白露','寒露','秋分','9月8日左右','10月8日左右','秋分后月将在酉');
INSERT INTO yue_jiang VALUES(11,'河魁','戌','析木2','寒露','立冬','霜降','10月8日左右','11月7日左右','霜降后月将在戌');
INSERT INTO yue_jiang VALUES(12,'登明','亥','玄枵2','立冬','大雪','小雪','11月7日左右','12月7日左右','小雪后月将在亥');
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
INSERT INTO gui_ren_rule VALUES(1,1,'丑','未','牛','顺行','亥至辰顺行','丑至未时用昼贵人，贵人起牛');
INSERT INTO gui_ren_rule VALUES(2,0,'申','子','鼠','逆行','巳至戌逆行','申至子时用夜贵人，贵人起鼠');
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
INSERT INTO jiu_zong_men VALUES(1,'贼克法','重审、元首','四课中有上下克贼','下克上为贼克，上克下为克贼。贼克重于克贼','以下贼上为初传，取课中下克上者','贼克之法何难寻，下克上兮贼克深',NULL,NULL,NULL,'九宗门之首，最常用起传法');
INSERT INTO jiu_zong_men VALUES(2,'比用法','知一','四课中有两课以上下克上，且所克者相同','有两课下克上，克同课异','取与日干同类者为初传','比用之法须详审，阴阳同类是比用',NULL,NULL,NULL,'多课同克时取比用');
INSERT INTO jiu_zong_men VALUES(3,'涉害法','涉害、察微','四课中无下克上，或下克上但涉害深者','取涉害最深者为初传','以地盘深者为初传','涉害之法最精微，先看孟仲季何归',NULL,NULL,NULL,'涉害深者先发');
INSERT INTO jiu_zong_men VALUES(4,'遥克法','蒿矢、弹射','四课中无上下克，但有遥克','取日干与四课上神遥克者为初传','日干遥克课上神为蒿矢，课上神遥克日干为弹射','遥克之法看克神，日克课兮蒿矢神',NULL,NULL,NULL,'无近克则取遥克');
INSERT INTO jiu_zong_men VALUES(5,'昴星法','虎视、冬蛇掩目','四课中无克，日干为阳且为孟','阳日取酉上神为初传，阴日取午上神为初传','阳日昴星从酉起，阴日从午起','昴星之法看日干，阳日酉上阴日午',NULL,NULL,NULL,'无克时取昴星');
INSERT INTO jiu_zong_men VALUES(6,'别责法','别责','四课中三课相同，或日干寄宫无克','取日干寄宫上神为初传','别责无克取干寄','别责之法无正克，日辰不备别责得',NULL,NULL,NULL,'课不备时用别责');
INSERT INTO jiu_zong_men VALUES(7,'八专法','八专','四课中两课相同，日干为阴阳相同','取日干上神为初传','八专之日取干上','八专之法看同类，日辰同阴阳',NULL,NULL,NULL,'八专之日课相同');
INSERT INTO jiu_zong_men VALUES(8,'伏吟法','伏吟','月将与占时相同','四课各居本位，取日上神为初传','伏吟之日各归本位','伏吟之法各归位，日辰自临本位上',NULL,NULL,NULL,'天地盘相同为伏吟');
INSERT INTO jiu_zong_men VALUES(9,'反吟法','反吟','月将与占时相冲','天地盘相冲，取驿马上神为初传','反吟之日各冲位','反吟之法各冲位，日辰互换冲处寻',NULL,NULL,NULL,'天地盘相冲为反吟');
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
INSERT INTO tian_jiang VALUES(1,'贵人','土','中','吉神',1,'主尊贵、权威、贵人相助','逢之则贵','受克则失贵','临各宫有不同含义','十二天将之首');
INSERT INTO tian_jiang VALUES(2,'腾蛇','火','南偏东','凶神',2,'主惊恐、怪异、虚诈','逢之则惊','临日干则心神不宁','主虚惊怪异','火性炎上，主惊恐');
INSERT INTO tian_jiang VALUES(3,'朱雀','火','南','凶神',3,'主口舌、是非、文书','逢之则争','临日干则口舌是非','主文书口舌','火性燥烈，主口舌');
INSERT INTO tian_jiang VALUES(4,'六合','木','东','吉神',4,'主和合、婚姻、合作','逢之则合','受克则不和','主婚姻和合','木性柔和，主和合');
INSERT INTO tian_jiang VALUES(5,'勾陈','土','中','凶神',5,'主争斗、迟滞、田土','逢之则滞','临日干则拖延','主争斗迟滞','土性沉滞，主迟延');
INSERT INTO tian_jiang VALUES(6,'青龙','木','东','吉神',6,'主喜庆、财禄、婚姻','逢之则喜','受克则不吉','主喜庆财禄','木性生发，主喜庆');
INSERT INTO tian_jiang VALUES(7,'天空','土','中','凶神',7,'主虚诈、欺骗、空亡','逢之则虚','临日干则虚诈','主虚诈不实','土性虚浮，主空亡');
INSERT INTO tian_jiang VALUES(8,'白虎','金','西','凶神',8,'主血光、刑伤、道路','逢之则凶','乘鬼克身尤重','主血光刑伤','金性肃杀，主血光');
INSERT INTO tian_jiang VALUES(9,'太常','土','南偏西','吉神',9,'主衣食、宴乐、印信','逢之则吉','受克则不吉','主衣食宴乐','土性厚重，主衣食');
INSERT INTO tian_jiang VALUES(10,'玄武','水','北','凶神',10,'主盗贼、暗昧、欺诈','逢之则盗','临日干则暗昧','主盗贼暗昧','水性暗流，主盗贼');
INSERT INTO tian_jiang VALUES(11,'太阴','金','西','吉神',11,'主阴私、贵人、暗中相助','逢之则暗助','受克则不吉','主暗中贵人','金性阴柔，主暗助');
INSERT INTO tian_jiang VALUES(12,'天后','水','北','吉神',12,'主后妃、阴柔、贵人','逢之则贵','受克则不吉','主阴贵相助','水性柔顺，主后妃');
CREATE TABLE di_zhi_shen (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    wu_xing TEXT,
    attribute TEXT,
    ranking INTEGER,
    meaning TEXT,
    description TEXT
);
INSERT INTO di_zhi_shen VALUES(1,'子','水','吉',1,'子为墨池，主聪明','子水主智');
INSERT INTO di_zhi_shen VALUES(2,'丑','土','吉',2,'丑为柳岸，主储藏','丑土主信');
INSERT INTO di_zhi_shen VALUES(3,'寅','木','吉',3,'寅为广谷，主生机','寅木主仁');
INSERT INTO di_zhi_shen VALUES(4,'卯','木','吉',4,'卯为琼林，主繁华','卯木主仁');
INSERT INTO di_zhi_shen VALUES(5,'辰','土','平',5,'辰为草泽，主变化','辰土主信');
INSERT INTO di_zhi_shen VALUES(6,'巳','火','平',6,'巳为大驿，主文明','巳火主礼');
INSERT INTO di_zhi_shen VALUES(7,'午','火','平',7,'午为烽堠，主光明','午火主礼');
INSERT INTO di_zhi_shen VALUES(8,'未','土','平',8,'未为花园，主滋养','未土主信');
INSERT INTO di_zhi_shen VALUES(9,'申','金','平',9,'申为名都，主通达','申金主义');
INSERT INTO di_zhi_shen VALUES(10,'酉','金','平',10,'酉为寺钟，主精致','酉金主义');
INSERT INTO di_zhi_shen VALUES(11,'戌','土','凶',11,'戌为烧原，主收藏','戌土主信');
INSERT INTO di_zhi_shen VALUES(12,'亥','水','凶',12,'亥为悬河，主深邃','亥水主智');
CREATE TABLE gan_ji_gong (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gan TEXT NOT NULL,
    gong TEXT NOT NULL,
    description TEXT
);
INSERT INTO gan_ji_gong VALUES(1,'甲','寅','甲寄寅宫');
INSERT INTO gan_ji_gong VALUES(2,'乙','卯','乙寄卯宫');
INSERT INTO gan_ji_gong VALUES(3,'丙','巳','丙寄巳宫');
INSERT INTO gan_ji_gong VALUES(4,'丁','午','丁寄午宫');
INSERT INTO gan_ji_gong VALUES(5,'戊','寅','戊寄寅宫');
INSERT INTO gan_ji_gong VALUES(6,'己','卯','己寄卯宫');
INSERT INTO gan_ji_gong VALUES(7,'庚','申','庚寄申宫');
INSERT INTO gan_ji_gong VALUES(8,'辛','酉','辛寄酉宫');
INSERT INTO gan_ji_gong VALUES(9,'壬','亥','壬寄亥宫');
INSERT INTO gan_ji_gong VALUES(10,'癸','子','癸寄子宫');
CREATE TABLE liuren_qi_ke (
    id INTEGER PRIMARY KEY,
    step_no INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    rule TEXT NOT NULL,
    detail TEXT,
    common_mistakes TEXT,
    description TEXT
);
INSERT INTO liuren_qi_ke VALUES(1,1,'确定月将','以中气为界更换月将','中气过后更换为下一月将，非节气','常见错误：以节气换将而非中气','月将是六壬起课的第一步');
INSERT INTO liuren_qi_ke VALUES(2,2,'确定占时','以问事当下真太阳时为准','北京时间+经度校正=真太阳时','常见错误：未校正经度','占时决定天地盘');
INSERT INTO liuren_qi_ke VALUES(3,3,'安天盘','将月将加于占时之上，顺时针排列','月将加占时，十二支顺排','常见错误：排列方向错误','天盘随月将转动');
INSERT INTO liuren_qi_ke VALUES(4,4,'起四课','日干上神为第一课，依次取上神之上神','一课二课从日干起，三课四课从日支起','常见错误：上神取法错误','四课是判断的基础');
INSERT INTO liuren_qi_ke VALUES(5,5,'发三传','根据九宗门规则发三传','先看有无贼克，再看比用涉害等','常见错误：九宗门选错','三传决定事情发展');
INSERT INTO liuren_qi_ke VALUES(6,6,'配天将','根据贵人起例确定贵人位置，顺逆排列十二天将','昼贵夜贵不同，顺逆不同','常见错误：昼夜贵人混用','天将辅助判断吉凶');
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
INSERT INTO zhan_lei_shi_sheng VALUES(1,'天时','青龙、腾蛇、天空','天时','1','T','青龙主晴，腾蛇主雷电，天空主晴朗','看天盘上神与天将配合','占天时以青龙腾蛇为主');
INSERT INTO zhan_lei_shi_sheng VALUES(2,'婚姻','六合、天后、青龙','婚姻','1','M','六合主成，天后主妇，青龙主喜','看三传与日干关系','占婚姻以六合天后为主');
INSERT INTO zhan_lei_shi_sheng VALUES(3,'疾病','白虎、死气、死神','疾病','2','H','白虎主血光，死气死神主危','看日干与白虎关系','占疾病以白虎为主');
INSERT INTO zhan_lei_shi_sheng VALUES(4,'出行','驿马、天马、六合','出行','1','T','驿马主动，天马主速','看三传中有无驿马','占出行以驿马天马为主');
INSERT INTO zhan_lei_shi_sheng VALUES(5,'仕宦','贵人、青龙、太常','事业','2','J','贵人主贵，青龙主喜，太常主印','看贵人是否临身','占仕宦以贵人为首');
INSERT INTO zhan_lei_shi_sheng VALUES(6,'求财','青龙、太常、六合','财运','1','F','青龙主财，太常主利','看财爻与日干关系','占求财以青龙为主');
INSERT INTO zhan_lei_shi_sheng VALUES(7,'田宅','勾陈、太常','田宅','2','O','勾陈主田土，太常主宅','看日支与勾陈关系','占田宅以勾陈为主');
INSERT INTO zhan_lei_shi_sheng VALUES(8,'公讼','勾陈、朱雀、白虎','官非','2','R','勾陈主争，朱雀主讼，白虎主刑','看日干与勾陈朱雀关系','占公讼以勾陈朱雀为主');
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
INSERT INTO tian_gan VALUES(1,'甲','阳','木',1,'大树、栋梁','参天大树，正直向上','亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌','刚','甲木为雷，为参星',NULL);
INSERT INTO tian_gan VALUES(2,'乙','阴','木',2,'花草、藤蔓','花草藤蔓，柔韧灵活','午','巳','辰','卯','寅','丑','子','亥','戌','酉','申','未','柔','乙木为风，为箕星',NULL);
INSERT INTO tian_gan VALUES(3,'丙','阳','火',3,'太阳、光明','太阳之火，光明正大','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','刚','丙火为日，为翼星',NULL);
INSERT INTO tian_gan VALUES(4,'丁','阴','火',4,'灯烛、星光','灯烛之火，温婉内敛','酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌','柔','丁火为星，为轸星',NULL);
INSERT INTO tian_gan VALUES(5,'戊','阳','土',5,'高山、大地','高山厚土，稳固厚重','寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑','刚','戊土为霞，为奎星',NULL);
INSERT INTO tian_gan VALUES(6,'己','阴','土',6,'田园、沃土','田园之土，包容滋养','酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌','柔','己土为云，为胃星',NULL);
INSERT INTO tian_gan VALUES(7,'庚','阳','金',7,'刀剑、斧钺','刀剑之金，刚毅果断','巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰','刚','庚金为月，为毕星',NULL);
INSERT INTO tian_gan VALUES(8,'辛','阴','金',8,'珠宝、首饰','珠宝之金，精致贵气','子','亥','戌','酉','申','未','午','巳','辰','卯','寅','丑','柔','辛金为霜，为觜星',NULL);
INSERT INTO tian_gan VALUES(9,'壬','阳','水',9,'大海、江河','江河之水，浩荡奔流','申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未','刚','壬水为秋露，为室星',NULL);
INSERT INTO tian_gan VALUES(10,'癸','阴','水',10,'雨露、泉水','雨露之水，润物无声','卯','寅','丑','子','亥','戌','酉','申','未','午','巳','辰','柔','癸水为春霖，为壁星',NULL);
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
INSERT INTO di_zhi VALUES(1,'子','阳','水',1,'鼠','北','癸',NULL,NULL,'丑','午','卯','未','丑','溪流、井泉','小溪流水，井泉之水','神后','子为墨池，为水');
INSERT INTO di_zhi VALUES(2,'丑','阴','土',2,'牛','北偏东','己','辛','癸','子','未','戌','午','子','坟地、田园','田园沃土，冬季储藏','大吉','丑为柳岸，为土');
INSERT INTO di_zhi VALUES(3,'寅','阳','木',3,'虎','东','甲','丙','戊','亥','申','巳','申','戌','树林、山林','山林大树，生机勃勃','功曹','寅为广谷，为木');
INSERT INTO di_zhi VALUES(4,'卯','阴','木',4,'兔','东','乙',NULL,NULL,'戌','酉','子','辰','亥','花草、竹林','花草竹林，春意盎然','太冲','卯为琼林，为木');
INSERT INTO di_zhi VALUES(5,'辰','阳','土',5,'龙','东偏南','戊','乙','癸','酉','戌','辰','酉','子','水库、草泽','草泽湿地，龙之所在','天罡','辰为草泽，为土');
INSERT INTO di_zhi VALUES(6,'巳','阴','火',6,'蛇','南','丙','庚','戊','申','亥','寅','申','丑','炉灶、火光','炉冶之火，温暖明亮','太乙','巳为大驿，为火');
INSERT INTO di_zhi VALUES(7,'午','阳','火',7,'马','南','丁','己',NULL,'未','子','午','丑','寅','太阳、烽火','正午阳光，炽热明亮','胜光','午为烽堠，为火');
INSERT INTO di_zhi VALUES(8,'未','阴','土',8,'羊','南偏西','己','丁','乙','午','丑','戌','子','卯','花园、茶房','花园草地，温润滋养','小吉','未为花园，为土');
INSERT INTO di_zhi VALUES(9,'申','阳','金',9,'猴','西','庚','壬','戊','巳','寅','巳','亥','辰','道路、城池','通衢大道，金之城池','传送','申为名都，为金');
INSERT INTO di_zhi VALUES(10,'酉','阴','金',10,'鸡','西','辛',NULL,NULL,'辰','卯','酉','戌','巳','钟鼎、首饰','钟鼎之金，精致贵气','从魁','酉为寺钟，为金');
INSERT INTO di_zhi VALUES(11,'戌','阳','土',11,'狗','西偏北','戊','辛','丁','卯','辰','戌','未','午','山岗、火炉','山岗之地，火炉之土','河魁','戌为烧原，为土');
INSERT INTO di_zhi VALUES(12,'亥','阴','水',12,'猪','北','壬','甲',NULL,'寅','巳','申','卯','未','大海、湖泊','大海之水，深邃广阔','登明','亥为悬河，为水');
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
INSERT INTO wu_xing VALUES(1,'木','阳','木→火→土→金→水→木','木→土→水→火→金→木','东','春','青、绿','3、8','["绿幽灵","翡翠","绿发晶"]','["绿色蔬菜","酸味食物","水果"]','["绿茶","乌龙茶"]','木主仁，主生长');
INSERT INTO wu_xing VALUES(2,'火','阳','火→土→金→水→木→火','火→金→木→土→水→火','南','夏','红、紫','2、7','["红玛瑙","红宝石","石榴石"]','["红色食物","苦味食物"]','["红茶","玫瑰花茶"]','火主礼，主炎热');
INSERT INTO wu_xing VALUES(3,'土','阴','土→金→水→木→火→土','土→水→火→金→木→土','中','长夏','黄、棕','5、0','["黄水晶","琥珀","虎眼石"]','["黄色食物","甘味食物","谷物"]','["普洱茶","大麦茶"]','土主信，主承载');
INSERT INTO wu_xing VALUES(4,'金','阴','金→水→木→火→土→金','金→木→土→水→火→金','西','秋','白、银','4、9','["白水晶","银饰","钛晶"]','["白色食物","辛味食物"]','["白茶","菊花茶"]','金主义，主收敛');
INSERT INTO wu_xing VALUES(5,'水','阳','水→木→火→土→金→水','水→火→金→土→木→水','北','冬','黑、蓝','1、6','["黑曜石","海蓝宝","黑碧玺"]','["黑色食物","咸味食物","豆类"]','["黑茶","菊花普洱"]','水主智，主润下');
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
INSERT INTO na_yin VALUES(1,'甲子','海中金','金','金系','海中金','宝物','火','木、水','进神',NULL);
INSERT INTO na_yin VALUES(2,'乙丑','海中金','金','金系','海中金','宝物','火','木、水',NULL,NULL);
INSERT INTO na_yin VALUES(3,'丙寅','炉中火','火','火系','炉中火','旺火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(4,'丁卯','炉中火','火','火系','炉中火','旺火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(5,'戊辰','大林木','木','木系','大林木','成材之木','水','金','华盖',NULL);
INSERT INTO na_yin VALUES(6,'己巳','大林木','木','木系','大林木','成材之木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(7,'庚午','路旁土','土','土系','路旁土','散土','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(8,'辛未','路旁土','土','土系','路旁土','散土','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(9,'壬申','剑锋金','金','金系','剑锋金','利器','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(10,'癸酉','剑锋金','金','金系','剑锋金','利器','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(11,'甲戌','山头火','火','火系','山头火','野火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(12,'乙亥','山头火','火','火系','山头火','野火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(13,'丙子','涧下水','水','水系','涧下水','清泉','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(14,'丁丑','涧下水','水','水系','涧下水','清泉','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(15,'戊寅','城头土','土','土系','城头土','城墙','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(16,'己卯','城头土','土','土系','城头土','城墙','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(17,'庚辰','白蜡金','金','金系','白蜡金','首饰','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(18,'辛巳','白蜡金','金','金系','白蜡金','首饰','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(19,'壬午','杨柳木','木','木系','杨柳木','柔木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(20,'癸未','杨柳木','木','木系','杨柳木','柔木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(21,'甲申','泉中水','水','水系','泉中水','泉水','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(22,'乙酉','泉中水','水','水系','泉中水','泉水','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(23,'丙戌','屋上土','土','土系','屋上土','屋瓦','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(24,'丁亥','屋上土','土','土系','屋上土','屋瓦','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(25,'戊子','霹雳火','火','火系','霹雳火','雷火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(26,'己丑','霹雳火','火','火系','霹雳火','雷火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(27,'庚寅','松柏木','木','木系','松柏木','坚木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(28,'辛卯','松柏木','木','木系','松柏木','坚木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(29,'壬辰','长流水','水','水系','长流水','江河','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(30,'癸巳','长流水','水','水系','长流水','江河','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(31,'甲午','沙中金','金','金系','沙中金','淘金','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(32,'乙未','沙中金','金','金系','沙中金','淘金','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(33,'丙申','山下火','火','火系','山下火','山火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(34,'丁酉','山下火','火','火系','山下火','山火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(35,'戊戌','平地木','木','木系','平地木','平原木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(36,'己亥','平地木','木','木系','平地木','平原木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(37,'庚子','壁上土','土','土系','壁上土','墙壁','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(38,'辛丑','壁上土','土','土系','壁上土','墙壁','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(39,'壬寅','金箔金','金','金系','金箔金','薄金','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(40,'癸卯','金箔金','金','金系','金箔金','薄金','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(41,'甲辰','覆灯火','火','火系','覆灯火','灯盏','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(42,'乙巳','覆灯火','火','火系','覆灯火','灯盏','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(43,'丙午','天河水','水','水系','天河水','天河','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(44,'丁未','天河水','水','水系','天河水','天河','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(45,'戊申','大驿土','土','土系','大驿土','驿道','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(46,'己酉','大驿土','土','土系','大驿土','驿道','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(47,'庚戌','钗钏金','金','金系','钗钏金','首饰','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(48,'辛亥','钗钏金','金','金系','钗钏金','首饰','水','火',NULL,NULL);
INSERT INTO na_yin VALUES(49,'壬子','桑柘木','木','木系','桑柘木','桑木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(50,'癸丑','桑柘木','木','木系','桑柘木','桑木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(51,'甲寅','大溪水','水','水系','大溪水','溪流','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(52,'乙卯','大溪水','水','水系','大溪水','溪流','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(53,'丙辰','沙中土','土','土系','沙中土','沙土','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(54,'丁巳','沙中土','土','土系','沙中土','沙土','火','木',NULL,NULL);
INSERT INTO na_yin VALUES(55,'戊午','天上火','火','火系','天上火','天火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(56,'己未','天上火','火','火系','天上火','天火','木','水',NULL,NULL);
INSERT INTO na_yin VALUES(57,'庚申','石榴木','木','木系','石榴木','果木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(58,'辛酉','石榴木','木','木系','石榴木','果木','水','金',NULL,NULL);
INSERT INTO na_yin VALUES(59,'壬戌','大海水','水','水系','大海水','大海','金','土',NULL,NULL);
INSERT INTO na_yin VALUES(60,'癸亥','大海水','水','水系','大海水','大海','金','土',NULL,NULL);
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
INSERT INTO shi_er_chang_sheng VALUES(1,'甲','亥','长生',1,'吉','如人出生','甲木长生在亥');
INSERT INTO shi_er_chang_sheng VALUES(2,'甲','子','沐浴',2,'平','如人沐浴','甲木沐浴在子');
INSERT INTO shi_er_chang_sheng VALUES(3,'甲','丑','冠带',3,'吉','如人冠带','甲木冠带在丑');
INSERT INTO shi_er_chang_sheng VALUES(4,'甲','寅','临官',4,'吉','如人临官','甲木临官在寅');
INSERT INTO shi_er_chang_sheng VALUES(5,'甲','卯','帝旺',5,'吉','如人帝旺','甲木帝旺在卯');
INSERT INTO shi_er_chang_sheng VALUES(6,'甲','辰','衰',6,'平','如人衰老','甲木衰在辰');
INSERT INTO shi_er_chang_sheng VALUES(7,'甲','巳','病',7,'凶','如人患病','甲木病在巳');
INSERT INTO shi_er_chang_sheng VALUES(8,'甲','午','死',8,'凶','如人死亡','甲木死在午');
INSERT INTO shi_er_chang_sheng VALUES(9,'甲','未','墓',9,'凶','如人入墓','甲木墓在未');
INSERT INTO shi_er_chang_sheng VALUES(10,'甲','申','绝',10,'凶','如人气绝','甲木绝在申');
INSERT INTO shi_er_chang_sheng VALUES(11,'甲','酉','胎',11,'吉','如人受胎','甲木胎在酉');
INSERT INTO shi_er_chang_sheng VALUES(12,'甲','戌','养',12,'平','如人养育','甲木养在戌');
INSERT INTO shi_er_chang_sheng VALUES(13,'乙','午','长生',1,'吉','如人出生','乙木长生在午');
INSERT INTO shi_er_chang_sheng VALUES(14,'乙','巳','沐浴',2,'平','如人沐浴','乙木沐浴在巳');
INSERT INTO shi_er_chang_sheng VALUES(15,'乙','辰','冠带',3,'吉','如人冠带','乙木冠带在辰');
INSERT INTO shi_er_chang_sheng VALUES(16,'乙','卯','临官',4,'吉','如人临官','乙木临官在卯');
INSERT INTO shi_er_chang_sheng VALUES(17,'乙','寅','帝旺',5,'吉','如人帝旺','乙木帝旺在寅');
INSERT INTO shi_er_chang_sheng VALUES(18,'乙','丑','衰',6,'平','如人衰老','乙木衰在丑');
INSERT INTO shi_er_chang_sheng VALUES(19,'乙','子','病',7,'凶','如人患病','乙木病在子');
INSERT INTO shi_er_chang_sheng VALUES(20,'乙','亥','死',8,'凶','如人死亡','乙木死在亥');
INSERT INTO shi_er_chang_sheng VALUES(21,'乙','戌','墓',9,'凶','如人入墓','乙木墓在戌');
INSERT INTO shi_er_chang_sheng VALUES(22,'乙','酉','绝',10,'凶','如人气绝','乙木绝在酉');
INSERT INTO shi_er_chang_sheng VALUES(23,'乙','申','胎',11,'吉','如人受胎','乙木胎在申');
INSERT INTO shi_er_chang_sheng VALUES(24,'乙','未','养',12,'平','如人养育','乙木养在未');
INSERT INTO shi_er_chang_sheng VALUES(25,'丙','寅','长生',1,'吉','如人出生','丙火长生在寅');
INSERT INTO shi_er_chang_sheng VALUES(26,'丙','卯','沐浴',2,'平','如人沐浴','丙火沐浴在卯');
INSERT INTO shi_er_chang_sheng VALUES(27,'丙','辰','冠带',3,'吉','如人冠带','丙火冠带在辰');
INSERT INTO shi_er_chang_sheng VALUES(28,'丙','巳','临官',4,'吉','如人临官','丙火临官在巳');
INSERT INTO shi_er_chang_sheng VALUES(29,'丙','午','帝旺',5,'吉','如人帝旺','丙火帝旺在午');
INSERT INTO shi_er_chang_sheng VALUES(30,'丙','未','衰',6,'平','如人衰老','丙火衰在未');
INSERT INTO shi_er_chang_sheng VALUES(31,'丙','申','病',7,'凶','如人患病','丙火病在申');
INSERT INTO shi_er_chang_sheng VALUES(32,'丙','酉','死',8,'凶','如人死亡','丙火死在酉');
INSERT INTO shi_er_chang_sheng VALUES(33,'丙','戌','墓',9,'凶','如人入墓','丙火墓在戌');
INSERT INTO shi_er_chang_sheng VALUES(34,'丙','亥','绝',10,'凶','如人气绝','丙火绝在亥');
INSERT INTO shi_er_chang_sheng VALUES(35,'丙','子','胎',11,'吉','如人受胎','丙火胎在子');
INSERT INTO shi_er_chang_sheng VALUES(36,'丙','丑','养',12,'平','如人养育','丙火养在丑');
INSERT INTO shi_er_chang_sheng VALUES(37,'丁','酉','长生',1,'吉','如人出生','丁火长生在酉');
INSERT INTO shi_er_chang_sheng VALUES(38,'丁','申','沐浴',2,'平','如人沐浴','丁火沐浴在申');
INSERT INTO shi_er_chang_sheng VALUES(39,'丁','未','冠带',3,'吉','如人冠带','丁火冠带在未');
INSERT INTO shi_er_chang_sheng VALUES(40,'丁','午','临官',4,'吉','如人临官','丁火临官在午');
INSERT INTO shi_er_chang_sheng VALUES(41,'丁','巳','帝旺',5,'吉','如人帝旺','丁火帝旺在巳');
INSERT INTO shi_er_chang_sheng VALUES(42,'丁','辰','衰',6,'平','如人衰老','丁火衰在辰');
INSERT INTO shi_er_chang_sheng VALUES(43,'丁','卯','病',7,'凶','如人患病','丁火病在卯');
INSERT INTO shi_er_chang_sheng VALUES(44,'丁','寅','死',8,'凶','如人死亡','丁火死在寅');
INSERT INTO shi_er_chang_sheng VALUES(45,'丁','丑','墓',9,'凶','如人入墓','丁火墓在丑');
INSERT INTO shi_er_chang_sheng VALUES(46,'丁','子','绝',10,'凶','如人气绝','丁火绝在子');
INSERT INTO shi_er_chang_sheng VALUES(47,'丁','亥','胎',11,'吉','如人受胎','丁火胎在亥');
INSERT INTO shi_er_chang_sheng VALUES(48,'丁','戌','养',12,'平','如人养育','丁火养在戌');
INSERT INTO shi_er_chang_sheng VALUES(49,'戊','寅','长生',1,'吉','如人出生','戊土长生在寅');
INSERT INTO shi_er_chang_sheng VALUES(50,'戊','卯','沐浴',2,'平','如人沐浴','戊土沐浴在卯');
INSERT INTO shi_er_chang_sheng VALUES(51,'戊','辰','冠带',3,'吉','如人冠带','戊土冠带在辰');
INSERT INTO shi_er_chang_sheng VALUES(52,'戊','巳','临官',4,'吉','如人临官','戊土临官在巳');
INSERT INTO shi_er_chang_sheng VALUES(53,'戊','午','帝旺',5,'吉','如人帝旺','戊土帝旺在午');
INSERT INTO shi_er_chang_sheng VALUES(54,'戊','未','衰',6,'平','如人衰老','戊土衰在未');
INSERT INTO shi_er_chang_sheng VALUES(55,'戊','申','病',7,'凶','如人患病','戊土病在申');
INSERT INTO shi_er_chang_sheng VALUES(56,'戊','酉','死',8,'凶','如人死亡','戊土死在酉');
INSERT INTO shi_er_chang_sheng VALUES(57,'戊','戌','墓',9,'凶','如人入墓','戊土墓在戌');
INSERT INTO shi_er_chang_sheng VALUES(58,'戊','亥','绝',10,'凶','如人气绝','戊土绝在亥');
INSERT INTO shi_er_chang_sheng VALUES(59,'戊','子','胎',11,'吉','如人受胎','戊土胎在子');
INSERT INTO shi_er_chang_sheng VALUES(60,'戊','丑','养',12,'平','如人养育','戊土养在丑');
INSERT INTO shi_er_chang_sheng VALUES(61,'己','酉','长生',1,'吉','如人出生','己土长生在酉');
INSERT INTO shi_er_chang_sheng VALUES(62,'己','申','沐浴',2,'平','如人沐浴','己土沐浴在申');
INSERT INTO shi_er_chang_sheng VALUES(63,'己','未','冠带',3,'吉','如人冠带','己土冠带在未');
INSERT INTO shi_er_chang_sheng VALUES(64,'己','午','临官',4,'吉','如人临官','己土临官在午');
INSERT INTO shi_er_chang_sheng VALUES(65,'己','巳','帝旺',5,'吉','如人帝旺','己土帝旺在巳');
INSERT INTO shi_er_chang_sheng VALUES(66,'己','辰','衰',6,'平','如人衰老','己土衰在辰');
INSERT INTO shi_er_chang_sheng VALUES(67,'己','卯','病',7,'凶','如人患病','己土病在卯');
INSERT INTO shi_er_chang_sheng VALUES(68,'己','寅','死',8,'凶','如人死亡','己土死在寅');
INSERT INTO shi_er_chang_sheng VALUES(69,'己','丑','墓',9,'凶','如人入墓','己土墓在丑');
INSERT INTO shi_er_chang_sheng VALUES(70,'己','子','绝',10,'凶','如人气绝','己土绝在子');
INSERT INTO shi_er_chang_sheng VALUES(71,'己','亥','胎',11,'吉','如人受胎','己土胎在亥');
INSERT INTO shi_er_chang_sheng VALUES(72,'己','戌','养',12,'平','如人养育','己土养在戌');
INSERT INTO shi_er_chang_sheng VALUES(73,'庚','巳','长生',1,'吉','如人出生','庚金长生在巳');
INSERT INTO shi_er_chang_sheng VALUES(74,'庚','午','沐浴',2,'平','如人沐浴','庚金沐浴在午');
INSERT INTO shi_er_chang_sheng VALUES(75,'庚','未','冠带',3,'吉','如人冠带','庚金冠带在未');
INSERT INTO shi_er_chang_sheng VALUES(76,'庚','申','临官',4,'吉','如人临官','庚金临官在申');
INSERT INTO shi_er_chang_sheng VALUES(77,'庚','酉','帝旺',5,'吉','如人帝旺','庚金帝旺在酉');
INSERT INTO shi_er_chang_sheng VALUES(78,'庚','戌','衰',6,'平','如人衰老','庚金衰在戌');
INSERT INTO shi_er_chang_sheng VALUES(79,'庚','亥','病',7,'凶','如人患病','庚金病在亥');
INSERT INTO shi_er_chang_sheng VALUES(80,'庚','子','死',8,'凶','如人死亡','庚金死在子');
INSERT INTO shi_er_chang_sheng VALUES(81,'庚','丑','墓',9,'凶','如人入墓','庚金墓在丑');
INSERT INTO shi_er_chang_sheng VALUES(82,'庚','寅','绝',10,'凶','如人气绝','庚金绝在寅');
INSERT INTO shi_er_chang_sheng VALUES(83,'庚','卯','胎',11,'吉','如人受胎','庚金胎在卯');
INSERT INTO shi_er_chang_sheng VALUES(84,'庚','辰','养',12,'平','如人养育','庚金养在辰');
INSERT INTO shi_er_chang_sheng VALUES(85,'辛','子','长生',1,'吉','如人出生','辛金长生在子');
INSERT INTO shi_er_chang_sheng VALUES(86,'辛','亥','沐浴',2,'平','如人沐浴','辛金沐浴在亥');
INSERT INTO shi_er_chang_sheng VALUES(87,'辛','戌','冠带',3,'吉','如人冠带','辛金冠带在戌');
INSERT INTO shi_er_chang_sheng VALUES(88,'辛','酉','临官',4,'吉','如人临官','辛金临官在酉');
INSERT INTO shi_er_chang_sheng VALUES(89,'辛','申','帝旺',5,'吉','如人帝旺','辛金帝旺在申');
INSERT INTO shi_er_chang_sheng VALUES(90,'辛','未','衰',6,'平','如人衰老','辛金衰在未');
INSERT INTO shi_er_chang_sheng VALUES(91,'辛','午','病',7,'凶','如人患病','辛金病在午');
INSERT INTO shi_er_chang_sheng VALUES(92,'辛','巳','死',8,'凶','如人死亡','辛金死在巳');
INSERT INTO shi_er_chang_sheng VALUES(93,'辛','辰','墓',9,'凶','如人入墓','辛金墓在辰');
INSERT INTO shi_er_chang_sheng VALUES(94,'辛','卯','绝',10,'凶','如人气绝','辛金绝在卯');
INSERT INTO shi_er_chang_sheng VALUES(95,'辛','寅','胎',11,'吉','如人受胎','辛金胎在寅');
INSERT INTO shi_er_chang_sheng VALUES(96,'辛','丑','养',12,'平','如人养育','辛金养在丑');
INSERT INTO shi_er_chang_sheng VALUES(97,'壬','申','长生',1,'吉','如人出生','壬水长生在申');
INSERT INTO shi_er_chang_sheng VALUES(98,'壬','酉','沐浴',2,'平','如人沐浴','壬水沐浴在酉');
INSERT INTO shi_er_chang_sheng VALUES(99,'壬','戌','冠带',3,'吉','如人冠带','壬水冠带在戌');
INSERT INTO shi_er_chang_sheng VALUES(100,'壬','亥','临官',4,'吉','如人临官','壬水临官在亥');
INSERT INTO shi_er_chang_sheng VALUES(101,'壬','子','帝旺',5,'吉','如人帝旺','壬水帝旺在子');
INSERT INTO shi_er_chang_sheng VALUES(102,'壬','丑','衰',6,'平','如人衰老','壬水衰在丑');
INSERT INTO shi_er_chang_sheng VALUES(103,'壬','寅','病',7,'凶','如人患病','壬水病在寅');
INSERT INTO shi_er_chang_sheng VALUES(104,'壬','卯','死',8,'凶','如人死亡','壬水死在卯');
INSERT INTO shi_er_chang_sheng VALUES(105,'壬','辰','墓',9,'凶','如人入墓','壬水墓在辰');
INSERT INTO shi_er_chang_sheng VALUES(106,'壬','巳','绝',10,'凶','如人气绝','壬水绝在巳');
INSERT INTO shi_er_chang_sheng VALUES(107,'壬','午','胎',11,'吉','如人受胎','壬水胎在午');
INSERT INTO shi_er_chang_sheng VALUES(108,'壬','未','养',12,'平','如人养育','壬水养在未');
INSERT INTO shi_er_chang_sheng VALUES(109,'癸','卯','长生',1,'吉','如人出生','癸水长生在卯');
INSERT INTO shi_er_chang_sheng VALUES(110,'癸','寅','沐浴',2,'平','如人沐浴','癸水沐浴在寅');
INSERT INTO shi_er_chang_sheng VALUES(111,'癸','丑','冠带',3,'吉','如人冠带','癸水冠带在丑');
INSERT INTO shi_er_chang_sheng VALUES(112,'癸','子','临官',4,'吉','如人临官','癸水临官在子');
INSERT INTO shi_er_chang_sheng VALUES(113,'癸','亥','帝旺',5,'吉','如人帝旺','癸水帝旺在亥');
INSERT INTO shi_er_chang_sheng VALUES(114,'癸','戌','衰',6,'平','如人衰老','癸水衰在戌');
INSERT INTO shi_er_chang_sheng VALUES(115,'癸','酉','病',7,'凶','如人患病','癸水病在酉');
INSERT INTO shi_er_chang_sheng VALUES(116,'癸','申','死',8,'凶','如人死亡','癸水死在申');
INSERT INTO shi_er_chang_sheng VALUES(117,'癸','未','墓',9,'凶','如人入墓','癸水墓在未');
INSERT INTO shi_er_chang_sheng VALUES(118,'癸','午','绝',10,'凶','如人气绝','癸水绝在午');
INSERT INTO shi_er_chang_sheng VALUES(119,'癸','巳','胎',11,'吉','如人受胎','癸水胎在巳');
INSERT INTO shi_er_chang_sheng VALUES(120,'癸','辰','养',12,'平','如人养育','癸水养在辰');
CREATE TABLE kong_wang (
    id INTEGER PRIMARY KEY,
    xun TEXT NOT NULL,
    kong_wang_1 TEXT NOT NULL,
    kong_wang_2 TEXT NOT NULL,
    description TEXT
);
INSERT INTO kong_wang VALUES(1,'甲子旬','戌','亥','甲子日至癸日，空亡在戌亥');
INSERT INTO kong_wang VALUES(2,'甲戌旬','申','酉','甲戌日至癸日，空亡在申酉');
INSERT INTO kong_wang VALUES(3,'甲申旬','午','未','甲申日至癸日，空亡在午未');
INSERT INTO kong_wang VALUES(4,'甲午旬','辰','巳','甲午日至癸日，空亡在辰巳');
INSERT INTO kong_wang VALUES(5,'甲辰旬','寅','卯','甲辰日至癸日，空亡在寅卯');
INSERT INTO kong_wang VALUES(6,'甲寅旬','子','丑','甲寅日至癸日，空亡在子丑');
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
INSERT INTO cai_ku VALUES(1,'甲','木','未','戌','丑','辰','戌','甲木以未为财库');
INSERT INTO cai_ku VALUES(2,'乙','木','戌','未','丑','辰','戌','乙木以戌为财库');
INSERT INTO cai_ku VALUES(3,'丙','火','戌','丑','未','辰','戌','丙火以戌为财库');
INSERT INTO cai_ku VALUES(4,'丁','火','丑','戌','未','辰','戌','丁火以丑为财库');
INSERT INTO cai_ku VALUES(5,'戊','土','辰','戌','未','丑','辰','戊土以辰为财库');
INSERT INTO cai_ku VALUES(6,'己','土','戌','辰','未','丑','辰','己土以戌为财库');
INSERT INTO cai_ku VALUES(7,'庚','金','丑','未','戌','辰','丑','庚金以丑为财库');
INSERT INTO cai_ku VALUES(8,'辛','金','辰','未','戌','丑','丑','辛金以辰为财库');
INSERT INTO cai_ku VALUES(9,'壬','水','辰','戌','未','丑','辰','壬水以辰为财库');
INSERT INTO cai_ku VALUES(10,'癸','水','丑','戌','未','丑','辰','癸水以丑为财库');
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
INSERT INTO wu_hu_dun VALUES(1,'甲','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','甲己之年丙作首','甲己年起丙寅月');
INSERT INTO wu_hu_dun VALUES(2,'乙','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','乙庚之岁戊为头','乙庚年起戊寅月');
INSERT INTO wu_hu_dun VALUES(3,'丙','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','丙辛必定寻庚起','丙辛年起庚寅月');
INSERT INTO wu_hu_dun VALUES(4,'丁','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','丁壬壬位顺行流','丁壬年起壬寅月');
INSERT INTO wu_hu_dun VALUES(5,'戊','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','戊癸何方发，甲寅之上好追求','戊癸年起甲寅月');
INSERT INTO wu_hu_dun VALUES(6,'己','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','甲己之年丙作首','己年起丙寅月');
INSERT INTO wu_hu_dun VALUES(7,'庚','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','乙庚之岁戊为头','庚年起戊寅月');
INSERT INTO wu_hu_dun VALUES(8,'辛','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','丙辛必定寻庚起','辛年起庚寅月');
INSERT INTO wu_hu_dun VALUES(9,'壬','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','丁壬壬位顺行流','壬年起壬寅月');
INSERT INTO wu_hu_dun VALUES(10,'癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','戊癸何方发，甲寅之上好追求','癸年起甲寅月');
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
INSERT INTO wu_shu_dun VALUES(1,'甲','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','甲己还加甲','甲日起甲子时');
INSERT INTO wu_shu_dun VALUES(2,'乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','乙庚丙作初','乙日起丙子时');
INSERT INTO wu_shu_dun VALUES(3,'丙','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','丙辛从戊起','丙日起戊子时');
INSERT INTO wu_shu_dun VALUES(4,'丁','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','丁壬庚子居','丁日起庚子时');
INSERT INTO wu_shu_dun VALUES(5,'戊','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','戊癸壬子是真途','戊日起壬子时');
INSERT INTO wu_shu_dun VALUES(6,'己','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','甲己还加甲','己日起甲子时');
INSERT INTO wu_shu_dun VALUES(7,'庚','丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','乙庚丙作初','庚日起丙子时');
INSERT INTO wu_shu_dun VALUES(8,'辛','戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','丙辛从戊起','辛日起戊子时');
INSERT INTO wu_shu_dun VALUES(9,'壬','庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','丁壬庚子居','壬日起庚子时');
INSERT INTO wu_shu_dun VALUES(10,'癸','壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸','戊癸壬子是真途','癸日起壬子时');
CREATE TABLE db_version (
    id INTEGER PRIMARY KEY,
    version TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    changelog TEXT
);
INSERT INTO db_version VALUES(1,'1.0.0','2026-04-25 05:06:01','初始版本：八字+六壬知识库');
CREATE TABLE enum_gender (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_gender VALUES(1,'男');
INSERT INTO enum_gender VALUES(2,'女');
CREATE TABLE enum_yin_yang (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_yin_yang VALUES(1,'阳');
INSERT INTO enum_yin_yang VALUES(2,'阴');
CREATE TABLE enum_wu_xing (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_wu_xing VALUES(1,'木');
INSERT INTO enum_wu_xing VALUES(2,'火');
INSERT INTO enum_wu_xing VALUES(3,'土');
INSERT INTO enum_wu_xing VALUES(4,'金');
INSERT INTO enum_wu_xing VALUES(5,'水');
CREATE TABLE enum_ji_xiong (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_ji_xiong VALUES(1,'大吉');
INSERT INTO enum_ji_xiong VALUES(2,'吉');
INSERT INTO enum_ji_xiong VALUES(3,'平');
INSERT INTO enum_ji_xiong VALUES(4,'凶');
INSERT INTO enum_ji_xiong VALUES(5,'大凶');
CREATE TABLE enum_pattern_type (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_pattern_type VALUES(1,'正格');
INSERT INTO enum_pattern_type VALUES(2,'从格');
INSERT INTO enum_pattern_type VALUES(3,'化格');
INSERT INTO enum_pattern_type VALUES(4,'专旺格');
INSERT INTO enum_pattern_type VALUES(5,'杂格');
CREATE TABLE enum_strength_level (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_strength_level VALUES(1,'极强');
INSERT INTO enum_strength_level VALUES(2,'强');
INSERT INTO enum_strength_level VALUES(3,'中和偏强');
INSERT INTO enum_strength_level VALUES(4,'中和');
INSERT INTO enum_strength_level VALUES(5,'中和偏弱');
INSERT INTO enum_strength_level VALUES(6,'弱');
INSERT INTO enum_strength_level VALUES(7,'极弱');
CREATE TABLE enum_verified (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_verified VALUES(0,'未验证');
INSERT INTO enum_verified VALUES(1,'已验证');
CREATE TABLE enum_question_type (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO enum_question_type VALUES(1,'疾病');
INSERT INTO enum_question_type VALUES(2,'官非');
INSERT INTO enum_question_type VALUES(3,'婚姻');
INSERT INTO enum_question_type VALUES(4,'出行');
INSERT INTO enum_question_type VALUES(5,'财运');
INSERT INTO enum_question_type VALUES(6,'事业');
INSERT INTO enum_question_type VALUES(7,'学业');
INSERT INTO enum_question_type VALUES(8,'健康');
INSERT INTO enum_question_type VALUES(9,'其他');
CREATE TABLE shen_sha_category (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    category_desc TEXT,
    quan_li_weight TEXT,
    notes TEXT
);
INSERT INTO shen_sha_category VALUES(1,'岁煞','以年支查，力量最大','岁煞>月煞>旬煞>干煞>支煞','太岁、岁破、病符等');
INSERT INTO shen_sha_category VALUES(2,'月煞','以月令查，力量次之','月煞<岁煞','月建、月破、天德等');
INSERT INTO shen_sha_category VALUES(3,'旬煞','以日柱所在旬查','旬煞<月煞','旬空、旬丁、旬癸');
INSERT INTO shen_sha_category VALUES(4,'干煞','以日干查','干煞<旬煞','日德、日鬼、日墓等');
INSERT INTO shen_sha_category VALUES(5,'支煞','以日支查','支煞<干煞','支墓、支刑、支破等');
INSERT INTO shen_sha_category VALUES(6,'特殊煞','兼看','视情况而定','华盖、天网、飞魂等');
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
INSERT INTO shen_sha VALUES(1,'太岁','岁煞',NULL,'吉','年支所在',NULL,'以年支查四柱地支','以年支查','国事、大计、官职','主一年吉凶，得之则尊，犯之则凶','临身入传则事关重大','犯太岁则诸事不顺',NULL,NULL,'《渊海子平》',NULL,NULL,'太岁当头座，无喜恐有祸');
INSERT INTO shen_sha VALUES(2,'岁破','岁煞',NULL,'凶','岁后六位',NULL,'以年支查','出行、婚姻、合作','主破败、耗失',NULL,'不宜远行、签约',NULL,NULL,'《三命通会》',NULL,NULL,NULL,'岁破之年多损耗');
INSERT INTO shen_sha VALUES(3,'病符','岁煞',NULL,'凶','旧太岁位',NULL,'以年支查','疾病、旧事','主旧病复发',NULL,'陈年旧事纠缠',NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'病符临命旧病发');
INSERT INTO shen_sha VALUES(4,'丧门','岁煞',NULL,'凶','岁前二辰',NULL,'以年支查','丧事、吊唁','主丧服、哀事',NULL,'临宅则家有丧',NULL,NULL,'《三命通会》',NULL,NULL,NULL,'丧门入命防丧服');
INSERT INTO shen_sha VALUES(5,'吊客','岁煞',NULL,'凶','岁后二辰',NULL,'以年支查','丧事、疾病','主吊问、灾病',NULL,'与丧门并见则凶',NULL,NULL,'《三命通会》',NULL,NULL,NULL,'吊客临门多灾病');
INSERT INTO shen_sha VALUES(6,'白虎','岁煞','金','凶','岁后四神',NULL,'以年支查','血光、刑伤','主凶丧、血光之灾',NULL,'乘鬼克身尤重',NULL,NULL,'《渊海子平》','化解白虎：佩戴金属饰品、白色物品','白虎符、金属饰品',NULL,'白虎凶神主血光');
INSERT INTO shen_sha VALUES(7,'五墓','岁煞',NULL,'凶','金丑、木未、火戌、水土辰',NULL,'以年支查','死亡、疾病','主死丧、墓库',NULL,'临日干则身危',NULL,NULL,'《三命通会》',NULL,NULL,NULL,'五墓临命防死丧');
INSERT INTO shen_sha VALUES(8,'三丘','岁煞',NULL,'凶','库墓冲位',NULL,'以年支查','葬事、迁移','主坟茔、搬迁不安',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'三丘入命迁居不安');
INSERT INTO shen_sha VALUES(9,'月德','月煞',NULL,'吉','正五九月丙，二六十月甲，三七十一月壬，四八十二月庚',NULL,'以月令查','诸事','解百凶，增吉庆','贵人相助',NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'月德临命百事吉');
INSERT INTO shen_sha VALUES(10,'天德','月煞',NULL,'吉','正丁二坤宫，三壬四辛同，五乾六甲上，七癸八寅逢，九丙十居乙，子巽丑庚中',NULL,'以月令查','诸事','上天福德，百事皆吉',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'天德合月德百事亨通');
INSERT INTO shen_sha VALUES(11,'月建','月煞',NULL,'吉','每月所建之支',NULL,'以月令查','月内大事','主一月休祥','临事有威权',NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'月建临命有权威');
INSERT INTO shen_sha VALUES(12,'月破','月煞',NULL,'凶','与月建相冲',NULL,'以月令查','合作、出行','主破坏、不和',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'月破入命多破败');
INSERT INTO shen_sha VALUES(13,'生气','月煞',NULL,'吉','正月子，二月丑，顺行十二辰',NULL,'以月令查','生育、新事','主生机、孕育','新事业成就',NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'生气入命主新生');
INSERT INTO shen_sha VALUES(14,'死气','月煞',NULL,'凶','正月午，二月未，逆行十二辰',NULL,'以月令查','疾病、废事','主死丧、事败',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'死气入命防事败');
INSERT INTO shen_sha VALUES(15,'死神','月煞',NULL,'凶','正月巳，二月午，顺行十二辰',NULL,'以月令查','疾病、终结','主病危、事终',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'死神入命防病危');
INSERT INTO shen_sha VALUES(16,'破碎','月煞',NULL,'凶','巳酉丑日巳，亥卯未日亥，申子辰日申，寅午戌日寅',NULL,'以月令查','财货、婚姻','主破财、分离',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'破碎入命防破财');
INSERT INTO shen_sha VALUES(17,'驿马','月煞',NULL,'动','寅午戌日申，巳酉丑日亥，申子辰日寅，亥卯未日巳',NULL,'以日支查','出行、变动','主远行、升迁','信息至',NULL,'主动荡、变化',NULL,'《渊海子平》',NULL,NULL,NULL,'驿马入命主奔波');
INSERT INTO shen_sha VALUES(18,'劫煞','月煞',NULL,'凶','寅午戌日亥，巳酉丑日寅，申子辰日巳，亥卯未日申',NULL,'以日支查','防盗、灾祸','主劫夺、突然灾祸',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'劫煞入命防意外');
INSERT INTO shen_sha VALUES(19,'灾煞','月煞',NULL,'凶','寅午戌日子，巳酉丑日卯，申子辰日午，亥卯未日酉',NULL,'以日支查','病灾、官非','主血光、横祸',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'灾煞入命防灾祸');
INSERT INTO shen_sha VALUES(20,'天贼','月煞',NULL,'凶','寅午戌日酉，巳酉丑日子，申子辰日卯，亥卯未日午',NULL,'以日支查','失物、被盗','主盗贼、丢失',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'天贼入命防失物');
INSERT INTO shen_sha VALUES(21,'天喜','月煞',NULL,'吉','春戌夏丑秋辰冬未',NULL,'以月令查','婚姻、喜事','主喜庆、生育、升迁',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'天喜入命主喜庆');
INSERT INTO shen_sha VALUES(22,'天医','月煞',NULL,'吉','正月戌，二月亥，顺行十二辰',NULL,'以月令查','疾病','主病愈、良医',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'天医入命病可愈');
INSERT INTO shen_sha VALUES(23,'天马','月煞',NULL,'动','正月午，顺行六阳辰',NULL,'以月令查','出行、升迁','主速动、诏命',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'天马入命主动荡');
INSERT INTO shen_sha VALUES(24,'成神','月煞',NULL,'吉','正月巳，顺行四孟',NULL,'以月令查','谋事、签约','主成功、成就',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'成神入命谋事成');
INSERT INTO shen_sha VALUES(25,'旬空','旬煞',NULL,'凶','甲子旬空戌亥，甲戌旬空申酉，甲申旬空午未，甲午旬空辰巳，甲辰旬空寅卯，甲寅旬空子丑',NULL,'以日柱查','诸事','主虚、不实、等待、空忙',NULL,'空亡主虚，凡事不实',NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'旬空入命多虚耗');
INSERT INTO shen_sha VALUES(26,'旬丁','旬煞',NULL,'动','甲子旬丁卯，甲戌旬丁丑，甲申旬丁亥，甲午旬丁酉，甲辰旬丁未，甲寅旬丁巳',NULL,'以日柱查','信息、变动','主动静、信息至',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'旬丁入命主动静');
INSERT INTO shen_sha VALUES(27,'旬癸','旬煞',NULL,'隐','同旬癸支',NULL,'以日柱查','阴谋、隐秘','主暗昧、隐藏之事',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'旬癸入命多隐秘');
INSERT INTO shen_sha VALUES(28,'日德','干煞',NULL,'吉','甲己德寅，乙庚德申，丙辛德巳，丁壬德亥，戊癸德巳','甲己德寅，乙庚德申，丙辛德巳，丁壬德亥，戊癸德巳','以日干查','诸事','主有德、得助',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'日德入命主有德');
INSERT INTO shen_sha VALUES(29,'日鬼','干煞',NULL,'凶','克日干之五行',NULL,'以日干查','官非、病灾','主官鬼、灾祸',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'日鬼入命防灾祸');
INSERT INTO shen_sha VALUES(30,'日墓','干煞',NULL,'凶','日干之墓',NULL,'以日干查','昏晦、终止','主闭塞、昏迷',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'日墓入命主闭塞');
INSERT INTO shen_sha VALUES(31,'日刑','干煞',NULL,'凶','寅刑巳，巳刑申，申刑寅；子刑卯，卯刑子；丑未戌相刑',NULL,'以日干查','官非、不和','主刑伤、口舌',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'日刑入命防口舌');
INSERT INTO shen_sha VALUES(32,'日冲','干煞',NULL,'凶','与日支相冲',NULL,'以日支查','变动、分离','主冲动、离散',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'日冲入命主变动');
INSERT INTO shen_sha VALUES(33,'支墓','支煞',NULL,'凶','支之墓',NULL,'以日支查','家宅、终止','主宅事昏昧、事终',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'支墓入命宅不安');
INSERT INTO shen_sha VALUES(34,'支刑','支煞',NULL,'凶','同干刑',NULL,'以日支查','家庭、内部','主家庭不和',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'支刑入命家不和');
INSERT INTO shen_sha VALUES(35,'支破','支煞',NULL,'凶','支之破',NULL,'以日支查','家宅、合作','主破败',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'支破入命多破败');
INSERT INTO shen_sha VALUES(36,'支害','支煞',NULL,'凶','子未害，丑午害，寅巳害，卯辰害，申亥害，酉戌害',NULL,'以日支查','人际关系','主暗害、不和',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'支害入命人缘差');
INSERT INTO shen_sha VALUES(37,'支冲','支煞',NULL,'凶','与日支相冲',NULL,'以日支查','迁移、变动','主宅动、分离',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'支冲入命主迁移');
INSERT INTO shen_sha VALUES(38,'血支','支煞',NULL,'凶','正月丑，二月寅，顺行十二辰',NULL,'以月令查','产厄、血光','主血光、损伤',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'血支入命防血光');
INSERT INTO shen_sha VALUES(39,'血忌','支煞',NULL,'凶','正月丑，二月未，三月寅，四月申，五月卯，六月酉，七月辰，八月戌，九月巳，十月亥，十一月午，十二月子',NULL,'以月令查','针灸、血光','忌针灸、主血灾',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'血忌入命忌针灸');
INSERT INTO shen_sha VALUES(40,'天狗','支煞',NULL,'凶','正月辰，顺行十二辰',NULL,'以月令查','生育、怪异','主怪胎、产厄',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'天狗入命防产厄');
INSERT INTO shen_sha VALUES(41,'天牛','支煞',NULL,'凶','正月丑，顺行十二辰',NULL,'以月令查','牲畜、田宅','主牛马病、田宅损',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'天牛入命田宅损');
INSERT INTO shen_sha VALUES(42,'飞魂','特殊煞',NULL,'凶','正月亥，顺行十二辰',NULL,'以月令查','怪异、惊梦','主鬼祟、梦魇',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'飞魂入命多怪梦');
INSERT INTO shen_sha VALUES(43,'伏殃','特殊煞',NULL,'凶','正卯二午三酉四子，周而复始',NULL,'以月令查','怪异、病灾','主殃祸、潜伏之灾',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'伏殃入命防潜伏灾');
INSERT INTO shen_sha VALUES(44,'死别','特殊煞',NULL,'凶','春申夏亥秋寅冬巳',NULL,'以月令查','分离、死亡','主死别、远行不归',NULL,NULL,NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'死别入命防分离');
INSERT INTO shen_sha VALUES(45,'飞祸','特殊煞',NULL,'凶','春申夏寅秋巳冬亥',NULL,'以月令查','意外、横祸','主飞来横祸',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'飞祸入命防意外');
INSERT INTO shen_sha VALUES(46,'华盖','特殊煞',NULL,'晦','寅午戌见戌，巳酉丑见丑，申子辰见辰，亥卯未见未',NULL,'以年支查','僧道、艺术','主孤高、僧道、艺术天赋',NULL,'华盖主孤高清雅',NULL,NULL,'《渊海子平》',NULL,NULL,NULL,'华盖入命主清高');
INSERT INTO shen_sha VALUES(47,'天网','特殊煞',NULL,'凶','春寅夏午秋戌冬子',NULL,'以月令查','囚系、牢狱','主囚禁、网罗',NULL,NULL,NULL,NULL,'《三命通会》',NULL,NULL,NULL,'天网入命防牢狱');
INSERT INTO shen_sha VALUES(48,'天乙贵人','干煞',NULL,'吉','甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎','甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎','以日干查四柱地支','诸事','主贵气、得贵人相助','逢贵人则吉',NULL,'天乙贵人是命中最吉之神',NULL,'《渊海子平》',NULL,NULL,NULL,'天乙贵人命中最吉');
INSERT INTO shen_sha VALUES(49,'太极贵人','干煞',NULL,'吉','甲乙子午，丙丁卯酉，戊己辰戌，庚辛丑未，壬癸寅申','甲乙子午，丙丁卯酉，戊己辰戌，庚辛丑未，壬癸寅申','以日干查四柱地支','诸事','主聪明、好学',NULL,NULL,'太极贵人主聪慧好学',NULL,'《三命通会》',NULL,NULL,NULL,'太极贵人主聪慧');
INSERT INTO shen_sha VALUES(50,'文昌贵人','干煞',NULL,'吉','甲巳、乙午、丙申、丁酉、戊申、己酉、庚亥、辛子、壬寅、癸卯','甲巳、乙午、丙申、丁酉、戊申、己酉、庚亥、辛子、壬寅、癸卯','以日干查四柱地支','学业、考试','主聪明好学、利考试','文昌入命利文途',NULL,'文昌贵人主文运',NULL,'《渊海子平》',NULL,NULL,NULL,'文昌入命利考试');
INSERT INTO shen_sha VALUES(51,'羊刃','干煞',NULL,'凶','甲卯、乙辰、丙午、丁未、戊午、己未、庚酉、辛戌、壬子、癸丑','甲卯、乙辰、丙午、丁未、戊午、己未、庚酉、辛戌、壬子、癸丑','以日干查四柱地支','血光、刑伤','主刚烈、血光','羊刃主刚烈过甚',NULL,'羊刃为劫财之极',NULL,'《渊海子平》',NULL,NULL,NULL,'羊刃入命性刚烈');
INSERT INTO shen_sha VALUES(52,'桃花','干煞',NULL,'平','寅午戌见卯，巳酉丑见午，申子辰见酉，亥卯未见子',NULL,'以年支或日支查','婚姻、感情','主人缘好、异性缘','桃花过旺则多情',NULL,'桃花主异性缘',NULL,'《渊海子平》',NULL,NULL,NULL,'桃花入命异性缘好');
INSERT INTO shen_sha VALUES(53,'将星','干煞',NULL,'吉','寅午戌见午，巳酉丑见酉，申子辰见子，亥卯未见卯',NULL,'以年支查','权力、领导','主掌权、领导力',NULL,NULL,'将星主权威',NULL,'《三命通会》',NULL,NULL,NULL,'将星入命有权柄');
INSERT INTO shen_sha VALUES(54,'魁罡','干煞',NULL,'平','日柱为壬辰、庚戌、庚辰、戊戌',NULL,'以日柱查','性格','主聪明果断、性格刚强','过刚则孤',NULL,'魁罡主聪明刚毅',NULL,'《渊海子平》',NULL,NULL,NULL,'魁罡入命性刚强');
INSERT INTO shen_sha VALUES(55,'金神','干煞',NULL,'凶','日柱为乙丑、己巳、癸酉三日',NULL,'以日柱查','性格','主性格刚烈',NULL,NULL,'金神主刚烈',NULL,'《三命通会》',NULL,NULL,NULL,'金神入命性刚烈');
INSERT INTO shen_sha VALUES(56,'十恶大败','干煞',NULL,'凶','甲辰、乙巳、丙申、丁亥、戊戌、己丑、庚辰、辛巳、壬申、癸亥',NULL,'以日柱查','破败','主破败耗财',NULL,NULL,'十恶大败主破败',NULL,'《渊海子平》',NULL,NULL,NULL,'十恶大败主耗财');
INSERT INTO shen_sha VALUES(57,'孤辰寡宿','干煞',NULL,'凶','亥子丑人见寅为孤，见戌为寡；寅卯辰人见巳为孤，见丑为寡；巳午未人见申为孤，见辰为寡；申酉戌人见亥为孤，见未为寡',NULL,'以年支查','婚姻、孤独','主孤独、婚姻不顺',NULL,NULL,'孤辰寡宿主孤独',NULL,'《三命通会》',NULL,NULL,NULL,'孤辰寡宿主孤独');
CREATE TABLE shen_sha_zhan_lei (
    id INTEGER PRIMARY KEY,
    shen_sha_name TEXT NOT NULL,
    zhan_lei TEXT NOT NULL,
    priority INTEGER,
    description TEXT
);
INSERT INTO shen_sha_zhan_lei VALUES(1,'太岁','国事',1,'太岁当头，事关国家大事');
INSERT INTO shen_sha_zhan_lei VALUES(2,'太岁','官职',1,'太岁主官职升降');
INSERT INTO shen_sha_zhan_lei VALUES(3,'太岁','诸事',2,'太岁影响一年诸事吉凶');
INSERT INTO shen_sha_zhan_lei VALUES(4,'岁破','出行',1,'岁破之年不宜远行');
INSERT INTO shen_sha_zhan_lei VALUES(5,'岁破','婚姻',1,'岁破之年不宜嫁娶');
INSERT INTO shen_sha_zhan_lei VALUES(6,'岁破','合作',1,'岁破之年不宜签约合作');
INSERT INTO shen_sha_zhan_lei VALUES(7,'病符','疾病',1,'病符主旧病复发');
INSERT INTO shen_sha_zhan_lei VALUES(8,'病符','旧事',1,'病符主陈年旧事纠缠');
INSERT INTO shen_sha_zhan_lei VALUES(9,'丧门','丧事',1,'丧门主丧服哀事');
INSERT INTO shen_sha_zhan_lei VALUES(10,'吊客','丧事',1,'吊客主吊问灾病');
INSERT INTO shen_sha_zhan_lei VALUES(11,'吊客','疾病',2,'吊客临命多灾病');
INSERT INTO shen_sha_zhan_lei VALUES(12,'白虎','血光',1,'白虎主血光之灾');
INSERT INTO shen_sha_zhan_lei VALUES(13,'白虎','刑伤',1,'白虎主凶丧刑伤');
INSERT INTO shen_sha_zhan_lei VALUES(14,'天乙贵人','诸事',1,'天乙贵人是命中最吉之神');
INSERT INTO shen_sha_zhan_lei VALUES(15,'天乙贵人','官职',1,'天乙贵人利仕途');
INSERT INTO shen_sha_zhan_lei VALUES(16,'桃花','婚姻',1,'桃花主异性缘婚姻');
INSERT INTO shen_sha_zhan_lei VALUES(17,'桃花','感情',1,'桃花主人际感情');
INSERT INTO shen_sha_zhan_lei VALUES(18,'驿马','出行',1,'驿马主远行奔波');
INSERT INTO shen_sha_zhan_lei VALUES(19,'驿马','变动',2,'驿马主动荡变化');
INSERT INTO shen_sha_zhan_lei VALUES(20,'驿马','官职',2,'驿马主升迁调动');
INSERT INTO shen_sha_zhan_lei VALUES(21,'天喜','婚姻',1,'天喜主喜庆嫁娶');
INSERT INTO shen_sha_zhan_lei VALUES(22,'天喜','生育',2,'天喜主生育之喜');
INSERT INTO shen_sha_zhan_lei VALUES(23,'天医','疾病',1,'天医主病愈良医');
INSERT INTO shen_sha_zhan_lei VALUES(24,'华盖','僧道',1,'华盖主僧道艺术');
INSERT INTO shen_sha_zhan_lei VALUES(25,'华盖','艺术',1,'华盖主艺术天赋');
INSERT INTO shen_sha_zhan_lei VALUES(26,'文昌贵人','学业',1,'文昌贵人利考试学业');
INSERT INTO shen_sha_zhan_lei VALUES(27,'文昌贵人','考试',1,'文昌贵人利文途');
INSERT INTO shen_sha_zhan_lei VALUES(28,'将星','权力',1,'将星主掌权领导');
INSERT INTO shen_sha_zhan_lei VALUES(29,'将星','官职',1,'将星利仕途权柄');
INSERT INTO shen_sha_zhan_lei VALUES(30,'羊刃','血光',1,'羊刃主血光刑伤');
INSERT INTO shen_sha_zhan_lei VALUES(31,'旬空','诸事',1,'旬空主虚不实');
INSERT INTO shen_sha_zhan_lei VALUES(32,'月德','诸事',1,'月德解百凶增吉庆');
INSERT INTO shen_sha_zhan_lei VALUES(33,'天德','诸事',1,'天德百事皆吉');
INSERT INTO shen_sha_zhan_lei VALUES(34,'破碎','财货',1,'破碎主破财分离');
INSERT INTO shen_sha_zhan_lei VALUES(35,'劫煞','灾祸',1,'劫煞主劫夺灾祸');
INSERT INTO shen_sha_zhan_lei VALUES(36,'天网','牢狱',1,'天网主囚禁牢狱');
INSERT INTO shen_sha_zhan_lei VALUES(37,'孤辰寡宿','婚姻',1,'孤辰寡宿主婚姻不顺');
INSERT INTO shen_sha_zhan_lei VALUES(38,'孤辰寡宿','孤独',1,'孤辰寡宿主孤独');
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
INSERT INTO shi_shen_relation VALUES(1,'甲','甲','木','木','阳','阳',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(2,'甲','乙','木','木','阳','阴',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(3,'甲','丙','木','火','阳','阳',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(4,'甲','丁','木','火','阳','阴',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(5,'甲','戊','木','土','阳','阳',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(6,'甲','己','木','土','阳','阴',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(7,'甲','庚','木','金','阳','阳',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(8,'甲','辛','木','金','阳','阴',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(9,'甲','壬','木','水','阳','阳',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(10,'甲','癸','木','水','阳','阴',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(11,'乙','甲','木','木','阴','阳',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(12,'乙','乙','木','木','阴','阴',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(13,'乙','丙','木','火','阴','阳',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(14,'乙','丁','木','火','阴','阴',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(15,'乙','戊','木','土','阴','阳',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(16,'乙','己','木','土','阴','阴',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(17,'乙','庚','木','金','阴','阳',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(18,'乙','辛','木','金','阴','阴',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(19,'乙','壬','木','水','阴','阳',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(20,'乙','癸','木','水','阴','阴',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(21,'丙','甲','火','木','阳','阳',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(22,'丙','乙','火','木','阳','阴',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(23,'丙','丙','火','火','阳','阳',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(24,'丙','丁','火','火','阳','阴',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(25,'丙','戊','火','土','阳','阳',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(26,'丙','己','火','土','阳','阴',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(27,'丙','庚','火','金','阳','阳',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(28,'丙','辛','火','金','阳','阴',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(29,'丙','壬','火','水','阳','阳',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(30,'丙','癸','火','水','阳','阴',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(31,'丁','甲','火','木','阴','阳',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(32,'丁','乙','火','木','阴','阴',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(33,'丁','丙','火','火','阴','阳',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(34,'丁','丁','火','火','阴','阴',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(35,'丁','戊','火','土','阴','阳',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(36,'丁','己','火','土','阴','阴',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(37,'丁','庚','火','金','阴','阳',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(38,'丁','辛','火','金','阴','阴',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(39,'丁','壬','火','水','阴','阳',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(40,'丁','癸','火','水','阴','阴',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(41,'戊','甲','土','木','阳','阳',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(42,'戊','乙','土','木','阳','阴',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(43,'戊','丙','土','火','阳','阳',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(44,'戊','丁','土','火','阳','阴',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(45,'戊','戊','土','土','阳','阳',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(46,'戊','己','土','土','阳','阴',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(47,'戊','庚','土','金','阳','阳',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(48,'戊','辛','土','金','阳','阴',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(49,'戊','壬','土','水','阳','阳',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(50,'戊','癸','土','水','阳','阴',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(51,'己','甲','土','木','阴','阳',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(52,'己','乙','土','木','阴','阴',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(53,'己','丙','土','火','阴','阳',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(54,'己','丁','土','火','阴','阴',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(55,'己','戊','土','土','阴','阳',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(56,'己','己','土','土','阴','阴',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(57,'己','庚','土','金','阴','阳',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(58,'己','辛','土','金','阴','阴',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(59,'己','壬','土','水','阴','阳',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(60,'己','癸','土','水','阴','阴',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(61,'庚','甲','金','木','阳','阳',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(62,'庚','乙','金','木','阳','阴',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(63,'庚','丙','金','火','阳','阳',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(64,'庚','丁','金','火','阳','阴',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(65,'庚','戊','金','土','阳','阳',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(66,'庚','己','金','土','阳','阴',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(67,'庚','庚','金','金','阳','阳',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(68,'庚','辛','金','金','阳','阴',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(69,'庚','壬','金','水','阳','阳',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(70,'庚','癸','金','水','阳','阴',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(71,'辛','甲','金','木','阴','阳',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(72,'辛','乙','金','木','阴','阴',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(73,'辛','丙','金','火','阴','阳',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(74,'辛','丁','金','火','阴','阴',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(75,'辛','戊','金','土','阴','阳',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(76,'辛','己','金','土','阴','阴',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(77,'辛','庚','金','金','阴','阳',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(78,'辛','辛','金','金','阴','阴',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(79,'辛','壬','金','水','阴','阳',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(80,'辛','癸','金','水','阴','阴',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(81,'壬','甲','水','木','阳','阳',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(82,'壬','乙','水','木','阳','阴',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(83,'壬','丙','水','火','阳','阳',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(84,'壬','丁','水','火','阳','阴',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(85,'壬','戊','水','土','阳','阳',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(86,'壬','己','水','土','阳','阴',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(87,'壬','庚','水','金','阳','阳',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(88,'壬','辛','水','金','阳','阴',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(89,'壬','壬','水','水','阳','阳',1,0,0,0,0,'比肩','比劫',1);
INSERT INTO shi_shen_relation VALUES(90,'壬','癸','水','水','阳','阴',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(91,'癸','甲','水','木','阴','阳',0,1,0,0,0,'伤官','食伤',0);
INSERT INTO shi_shen_relation VALUES(92,'癸','乙','水','木','阴','阴',0,1,0,0,0,'食神','食伤',1);
INSERT INTO shi_shen_relation VALUES(93,'癸','丙','水','火','阴','阳',0,0,0,1,0,'正财','财星',0);
INSERT INTO shi_shen_relation VALUES(94,'癸','丁','水','火','阴','阴',0,0,0,1,0,'偏财','财星',1);
INSERT INTO shi_shen_relation VALUES(95,'癸','戊','水','土','阴','阳',0,0,0,0,1,'正官','官杀',0);
INSERT INTO shi_shen_relation VALUES(96,'癸','己','水','土','阴','阴',0,0,0,0,1,'七杀','官杀',1);
INSERT INTO shi_shen_relation VALUES(97,'癸','庚','水','金','阴','阳',0,0,1,0,0,'正印','印绶',0);
INSERT INTO shi_shen_relation VALUES(98,'癸','辛','水','金','阴','阴',0,0,1,0,0,'偏印','印绶',1);
INSERT INTO shi_shen_relation VALUES(99,'癸','壬','水','水','阴','阳',1,0,0,0,0,'劫财','比劫',0);
INSERT INTO shi_shen_relation VALUES(100,'癸','癸','水','水','阴','阴',1,0,0,0,0,'比肩','比劫',1);
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
INSERT INTO bazi_patterns VALUES(1,'正官格','正格','月令正官透干或本气正官','月令本气为正官','正官透干为佳','忌冲破正官','为人端正、循规蹈矩、有责任感','正官为贵气之星，主仕途顺利','喜印绶、食神','忌伤官、七杀','正官纯正为贵','《子平真诠》','正官格以月令正官为用，为人正直有贵气');
INSERT INTO bazi_patterns VALUES(2,'七杀格','正格','月令七杀透干或本气七杀','月令本气为七杀','七杀透干为佳','忌无制之杀','为人刚毅、有魄力、有威权','七杀为权柄之星，主武职显贵','喜食神制杀、印绶化杀','忌财星生杀','有制为贵，无制为祸','《子平真诠》','七杀格以月令七杀为用，刚毅果决有权柄');
INSERT INTO bazi_patterns VALUES(3,'正财格','正格','月令正财透干或本气正财','月令本气为正财','正财透干为佳','忌劫财冲破','为人勤俭、务实、善于理财','正财为养命之源，主财运亨通','喜官星、食神','忌劫财、比肩','正财有根为富','《子平真诠》','正财格以月令正财为用，勤俭致富');
INSERT INTO bazi_patterns VALUES(4,'偏财格','正格','月令偏财透干或本气偏财','月令本气为偏财','偏财透干为佳','忌比劫争夺','为人慷慨、豪爽、善于交际','偏财为大财之源，主意外之财','喜身旺、官星','忌比劫重重','偏财身旺为富','《子平真诠》','偏财格以月令偏财为用，慷慨豪爽有财运');
INSERT INTO bazi_patterns VALUES(5,'食神格','正格','月令食神透干或本气食神','月令本气为食神','食神透干为佳','忌枭神夺食','为人温和、有福气、多才艺','食神为福寿之星，主衣食无忧','喜财星、印绶','忌枭神、偏印','食神为福星','《子平真诠》','食神格以月令食神为用，温和有福多才艺');
INSERT INTO bazi_patterns VALUES(6,'伤官格','正格','月令伤官透干或本气伤官','月令本气为伤官','伤官透干为佳','忌见正官','为人聪明、有才华、但傲慢','伤官为才华之星，主聪明多能','喜财星、印绶','忌正官','伤官佩印为贵','《子平真诠》','伤官格以月令伤官为用，聪明有才华');
INSERT INTO bazi_patterns VALUES(7,'正印格','正格','月令正印透干或本气正印','月令本气为正印','正印透干为佳','忌财星破印','为人仁慈、好学、有涵养','正印为学术之星，主学业有成','喜官星生印','忌财星破印','正印为学术贵星','《子平真诠》','正印格以月令正印为用，仁慈好学有涵养');
INSERT INTO bazi_patterns VALUES(8,'偏印格','正格','月令偏印透干或本气偏印','月令本气为偏印','偏印透干为佳','忌夺食','为人精明、多谋、但多疑','偏印为偏学之星，主偏门学术','喜身旺','忌夺食神','偏印为枭神需制','《子平真诠》','偏印格以月令偏印为用，精明多谋');
INSERT INTO bazi_patterns VALUES(9,'从官格','变格','日主极弱，官杀极旺，无根无印','官杀当令','日主无根','无冲破从势','为人善于依附权贵','从官者贵','喜官杀、财星','忌比劫、印绶','从官格主贵','《子平真诠》','日主无根从官杀之势');
INSERT INTO bazi_patterns VALUES(10,'从财格','变格','日主极弱，财星极旺，无根无助','财星当令','日主无根','无冲破从势','为人善于经商理财','从财者富','喜财星、食伤','忌比劫','从财格主富','《子平真诠》','日主无根从财星之势');
INSERT INTO bazi_patterns VALUES(11,'从儿格','变格','日主极弱，食伤极旺，无根无助','食伤当令','日主无根','无冲破从势','为人聪明多才','从儿格主才艺','喜财星','忌印绶','从儿格主才艺','《子平真诠》','日主无根从食伤之势');
INSERT INTO bazi_patterns VALUES(12,'从杀格','变格','日主极弱，七杀极旺，无根无印','七杀当令','日主无根','无冲破从势','为人刚毅有魄力','从杀格主威权','喜财星生杀','忌印绶','从杀格主威权','《子平真诠》','日主无根从七杀之势');
INSERT INTO bazi_patterns VALUES(13,'化气格','变格','天干五合化气成功','合化条件满足','日主参与合化','无冲破合化','为人有特殊气质','化气格主特殊命格','视化气五行而定','忌冲破合化','化气成功为贵','《子平真诠》','天干五合化气成功之格');
INSERT INTO bazi_patterns VALUES(14,'建禄格','变格','月令为日干之禄位','月令为日干禄位','日干确定','无冲破禄位','为人自立自强','建禄格主自立','喜财官','忌冲破','建禄格主自立','《三命通会》','月令为日干之禄位');
INSERT INTO bazi_patterns VALUES(15,'月刃格','变格','月令为日干之羊刃','月令为日干羊刃','日干确定','无冲破羊刃','为人刚烈果断','月刃格主刚强','喜官杀制刃','忌冲破','月刃格主刚强','《三命通会》','月令为日干之羊刃');
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
INSERT INTO tiao_hou VALUES(1,'甲','春','丙癸','丙火、癸水','庚金','甲木生春，初春尚寒，需丙火照暖、癸水润泽','《穷通宝鉴》','甲木春月调候取丙癸');
INSERT INTO tiao_hou VALUES(2,'甲','夏','癸','癸水','丙火','甲木夏月火旺木渴，急需癸水润泽','《穷通宝鉴》','甲木夏月调候取癸水');
INSERT INTO tiao_hou VALUES(3,'甲','秋','丁','丁火','丙火','甲木秋月金旺木凋，需丁火制金暖木','《穷通宝鉴》','甲木秋月调候取丁火');
INSERT INTO tiao_hou VALUES(4,'甲','冬','丁庚','丁火、庚金','丙火','甲木冬月水旺木寒，需丁火暖局、庚金劈甲引丁','《穷通宝鉴》','甲木冬月调候取丁庚');
INSERT INTO tiao_hou VALUES(5,'乙','春','丙','丙火','癸水','乙木春月虽生，需丙火照暖方荣','《穷通宝鉴》','乙木春月调候取丙火');
INSERT INTO tiao_hou VALUES(6,'乙','夏','癸','癸水','丙火','乙木夏月火旺，需癸水滋润','《穷通宝鉴》','乙木夏月调候取癸水');
INSERT INTO tiao_hou VALUES(7,'乙','秋','丙癸','丙火、癸水','丁火','乙木秋月金旺，需丙癸并用','《穷通宝鉴》','乙木秋月调候取丙癸');
INSERT INTO tiao_hou VALUES(8,'乙','冬','丙','丙火','丁火','乙木冬月水寒木冻，急需丙火解冻','《穷通宝鉴》','乙木冬月调候取丙火');
INSERT INTO tiao_hou VALUES(9,'丙','春','壬','壬水','庚金','丙火春月需壬水为用','《穷通宝鉴》','丙火春月调候取壬水');
INSERT INTO tiao_hou VALUES(10,'丙','夏','壬庚','壬水、庚金','戊土','丙火夏月火旺，需壬水既济、庚金发水之源','《穷通宝鉴》','丙火夏月调候取壬庚');
INSERT INTO tiao_hou VALUES(11,'丙','秋','壬','壬水','甲木','丙火秋月需壬水为用','《穷通宝鉴》','丙火秋月调候取壬水');
INSERT INTO tiao_hou VALUES(12,'丙','冬','壬甲','壬水、甲木','戊土','丙火冬月水旺火弱，需壬甲并用','《穷通宝鉴》','丙火冬月调候取壬甲');
INSERT INTO tiao_hou VALUES(13,'丁','春','甲庚','甲木、庚金','壬水','丁火春月需甲木引生、庚金劈甲','《穷通宝鉴》','丁火春月调候取甲庚');
INSERT INTO tiao_hou VALUES(14,'丁','夏','甲壬','甲木、壬水','庚金','丁火夏月需甲壬并用','《穷通宝鉴》','丁火夏月调候取甲壬');
INSERT INTO tiao_hou VALUES(15,'丁','秋','甲庚','甲木、庚金','壬水','丁火秋月需甲庚并用','《穷通宝鉴》','丁火秋月调候取甲庚');
INSERT INTO tiao_hou VALUES(16,'丁','冬','甲','甲木','庚金','丁火冬月寒极，急需甲木生火','《穷通宝鉴》','丁火冬月调候取甲木');
INSERT INTO tiao_hou VALUES(17,'戊','春','丙甲','丙火、甲木','癸水','戊土春月虚寒，需丙火暖局、甲木疏土','《穷通宝鉴》','戊土春月调候取丙甲');
INSERT INTO tiao_hou VALUES(18,'戊','夏','壬','壬水','甲木','戊土夏月燥热，需壬水润泽','《穷通宝鉴》','戊土夏月调候取壬水');
INSERT INTO tiao_hou VALUES(19,'戊','秋','丙癸','丙火、癸水','甲木','戊土秋月需丙癸并用','《穷通宝鉴》','戊土秋月调候取丙癸');
INSERT INTO tiao_hou VALUES(20,'戊','冬','丙甲','丙火、甲木','壬水','戊土冬月寒冻，需丙火暖局、甲木疏土','《穷通宝鉴》','戊土冬月调候取丙甲');
INSERT INTO tiao_hou VALUES(21,'己','春','丙癸','丙火、癸水','甲木','己土春月虚寒湿困，需丙火暖局、癸水滋润','《穷通宝鉴》','己土春月调候取丙癸');
INSERT INTO tiao_hou VALUES(22,'己','夏','壬癸','壬水、癸水','丙火','己土夏月燥热，急需壬癸水润泽','《穷通宝鉴》','己土夏月调候取壬癸');
INSERT INTO tiao_hou VALUES(23,'己','秋','丙癸','丙火、癸水','甲木','己土秋月需丙癸并用','《穷通宝鉴》','己土秋月调候取丙癸');
INSERT INTO tiao_hou VALUES(24,'己','冬','丙甲','丙火、甲木','癸水','己土冬月寒冻，需丙火暖局、甲木疏土','《穷通宝鉴》','己土冬月调候取丙甲');
INSERT INTO tiao_hou VALUES(25,'庚','春','丁甲','丁火、甲木','壬水','庚金春月寒冻，需丁火暖炼、甲木相合','《穷通宝鉴》','庚金春月调候取丁甲');
INSERT INTO tiao_hou VALUES(26,'庚','夏','壬癸','壬水、癸水','丁火','庚金夏月火旺金熔，急需壬癸水淘洗','《穷通宝鉴》','庚金夏月调候取壬癸');
INSERT INTO tiao_hou VALUES(27,'庚','秋','丁甲','丁火、甲木','壬水','庚金秋月得令，需丁甲锻炼','《穷通宝鉴》','庚金秋月调候取丁甲');
INSERT INTO tiao_hou VALUES(28,'庚','冬','丁甲','丁火、甲木','壬水','庚金冬月水寒金冷，需丁火暖局、甲木相合','《穷通宝鉴》','庚金冬月调候取丁甲');
INSERT INTO tiao_hou VALUES(29,'辛','春','壬','壬水','庚金','辛金春月虚柔，需壬水淘洗','《穷通宝鉴》','辛金春月调候取壬水');
INSERT INTO tiao_hou VALUES(30,'辛','夏','壬癸','壬水、癸水','己土','辛金夏月火旺，急需壬癸水淘洗','《穷通宝鉴》','辛金夏月调候取壬癸');
INSERT INTO tiao_hou VALUES(31,'辛','秋','壬','壬水','丁火','辛金秋月得令，需壬水淘洗','《穷通宝鉴》','辛金秋月调候取壬水');
INSERT INTO tiao_hou VALUES(32,'辛','冬','壬丙','壬水、丙火','丁火','辛金冬月水寒金冷，需壬水淘洗、丙火暖局','《穷通宝鉴》','辛金冬月调候取壬丙');
INSERT INTO tiao_hou VALUES(33,'壬','春','庚丙','庚金、丙火','戊土','壬水春月泛滥，需庚金为源、丙火暖局','《穷通宝鉴》','壬水春月调候取庚丙');
INSERT INTO tiao_hou VALUES(34,'壬','夏','庚癸','庚金、癸水','戊土','壬水夏月涸竭，需庚金发源、癸水相助','《穷通宝鉴》','壬水夏月调候取庚癸');
INSERT INTO tiao_hou VALUES(35,'壬','秋','甲庚','甲木、庚金','丙火','壬水秋月旺相，需甲木泄秀、庚金为源','《穷通宝鉴》','壬水秋月调候取甲庚');
INSERT INTO tiao_hou VALUES(36,'壬','冬','丙甲','丙火、甲木','戊土','壬水冬月冰冻，急需丙火解冻、甲木泄秀','《穷通宝鉴》','壬水冬月调候取丙甲');
INSERT INTO tiao_hou VALUES(37,'癸','春','辛丙','辛金、丙火','庚金','癸水春月需辛金为源、丙火暖局','《穷通宝鉴》','癸水春月调候取辛丙');
INSERT INTO tiao_hou VALUES(38,'癸','夏','庚辛','庚金、辛金','壬水','癸水夏月涸竭，需庚辛金发源','《穷通宝鉴》','癸水夏月调候取庚辛');
INSERT INTO tiao_hou VALUES(39,'癸','秋','辛丙','辛金、丙火','丁火','癸水秋月需辛金为源、丙火暖局','《穷通宝鉴》','癸水秋月调候取辛丙');
INSERT INTO tiao_hou VALUES(40,'癸','冬','丙辛','丙火、辛金','丁火','癸水冬月冰冻，急需丙火解冻、辛金为源','《穷通宝鉴》','癸水冬月调候取丙辛');
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
INSERT INTO bing_yao_rules VALUES(1,'身弱','日主衰弱无根无助','印绶','以印绶生扶日主','身弱用印','日主甲木弱，取水为印生扶','身弱有印为有药','日主衰弱时以印绶为第一用神');
INSERT INTO bing_yao_rules VALUES(2,'身旺','日主过旺无泄无耗','食伤','以食伤泄秀或财星耗身','身旺用食伤','日主甲木旺，取火为食伤泄秀','身旺有泄为有药','日主过旺时以食伤泄秀为第一用神');
INSERT INTO bing_yao_rules VALUES(3,'官杀混杂','正官七杀并见','食神','以食神制杀留官','官杀混杂用食神','甲日见辛酉正官、庚申七杀，取丙火食神制杀','食神制杀为上','官杀混杂时以食神制杀为上策');
INSERT INTO bing_yao_rules VALUES(4,'伤官见官','伤官与正官同见','印绶','以印绶制伤官护正官','伤官佩印','甲日见丁火伤官、辛金正官，取壬水正印制伤','伤官佩印为贵','伤官见官时以印绶化伤为上策');
INSERT INTO bing_yao_rules VALUES(5,'枭神夺食','偏印克制食神','财星','以财星制枭神护食神','财星制枭','甲日见壬水偏印、丙火食神，取戊土财星制枭','财星制枭为上','枭神夺食时以财星制枭为上策');
INSERT INTO bing_yao_rules VALUES(6,'财多身弱','财星过旺日主衰弱','比劫','以比劫帮身担财','比劫帮身','甲日见戊己土财星重重，取乙木比肩帮身','比劫帮身可担财','财多身弱时以比劫帮身为上策');
INSERT INTO bing_yao_rules VALUES(7,'印绶太旺','印绶过旺日主反困','财星','以财星破印','财星破印','甲日见壬癸水印绶重重，取戊土财星破印','财星破印为上','印绶太旺时以财星破印为上策');
INSERT INTO bing_yao_rules VALUES(8,'食伤太旺','食伤过旺泄身太过','印绶','以印绶制食伤','印制食伤','甲日见丙丁火食伤重重，取壬水印绶制之','印制食伤为上','食伤太旺时以印绶制之');
INSERT INTO bing_yao_rules VALUES(9,'羊刃逢冲','羊刃被冲破','七杀','以七杀制羊刃','杀刃相制','甲日见卯木羊刃被酉金冲破，取庚金七杀制刃','杀刃相制为贵','羊刃逢冲时以七杀制刃为上策');
INSERT INTO bing_yao_rules VALUES(10,'五行偏枯','命局五行严重失衡','通关','以通关五行调和','通关调和','木火太旺无金水，取湿土通关','通关调和为上','五行偏枯时以通关五行为上策');
INSERT INTO bing_yao_rules VALUES(11,'寒暖失调','命局过寒或过暖','调候','以调候用神调节温度','调候用神','冬生水旺无火，取丙火调候','调候得宜为上','寒暖失调时以调候用神为急');
INSERT INTO bing_yao_rules VALUES(12,'湿燥失衡','命局过湿或过燥','调候','以调候用神调节湿燥','调候用神','夏生火旺土燥，取癸水润泽','调候得宜为上','湿燥失衡时以调候用神为急');
CREATE TABLE tong_guan_rules (
    id INTEGER PRIMARY KEY,
    zhan_dou_1 TEXT NOT NULL,
    zhan_dou_2 TEXT NOT NULL,
    tong_guan_sheng TEXT NOT NULL,
    tong_guan_method TEXT,
    case_example TEXT,
    description TEXT
);
INSERT INTO tong_guan_rules VALUES(1,'金','木','水','金生水、水生木，水为通关','命局金木相战，取水为通关','金木相战取水通关，化解金克木之冲突');
INSERT INTO tong_guan_rules VALUES(2,'木','土','火','木生火、火生土，火为通关','命局木土相战，取火为通关','木土相战取火通关，化解木克土之冲突');
INSERT INTO tong_guan_rules VALUES(3,'水','火','木','水生木、木生火，木为通关','命局水火相战，取木为通关','水火相战取木通关，化解水克火之冲突');
INSERT INTO tong_guan_rules VALUES(4,'火','金','土','火生土、土生金，土为通关','命局火金相战，取土为通关','火金相战取土通关，化解火克金之冲突');
INSERT INTO tong_guan_rules VALUES(5,'土','水','金','土生金、金生水，金为通关','命局土水相战，取金为通关','土水相战取金通关，化解土克水之冲突');
INSERT INTO tong_guan_rules VALUES(6,'木','金','水','金生水、水生木，水为通关','命局金克木，取水通关化敌为友','金木相战以水通关，金生水生木');
INSERT INTO tong_guan_rules VALUES(7,'水','土','金','土生金、金生水，金为通关','命局土克水，取金通关化敌为友','土水相战以金通关，土生金生水');
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
INSERT INTO xing_chong_he_hai VALUES(1,'冲','子','午','子午相冲，水火相战，主变动、分离、不安','子午冲主道路、离散、心神不宁','子午冲在年柱主祖业变动，在日柱主婚姻不稳','子午相冲为水火之冲');
INSERT INTO xing_chong_he_hai VALUES(2,'冲','丑','未','丑未相冲，土土相冲，主破败、争执','丑未冲主田宅、财帛之争','丑未冲在月柱主兄弟不和，在日柱主夫妻争执','丑未相冲为土气相冲');
INSERT INTO xing_chong_he_hai VALUES(3,'冲','寅','申','寅申相冲，金木相战，主道路、出行、伤灾','寅申冲主出行、道路、伤灾','寅申冲在年柱主远行，在日柱主奔波','寅申相冲为金木之冲');
INSERT INTO xing_chong_he_hai VALUES(4,'冲','卯','酉','卯酉相冲，金木相战，主门户、婚姻、伤灾','卯酉冲主门户、婚姻、色情','卯酉冲在日柱主婚姻破裂','卯酉相冲为金木之冲');
INSERT INTO xing_chong_he_hai VALUES(5,'冲','辰','戌','辰戌相冲，土土相冲，主田宅、争斗','辰戌冲主田宅、坟茔之争','辰戌冲在年柱主祖业变迁','辰戌相冲为土气相冲');
INSERT INTO xing_chong_he_hai VALUES(6,'冲','巳','亥','巳亥相冲，水火相战，主变动、出行','巳亥冲主出行、变动、口舌','巳亥冲在日柱主夫妻分离','巳亥相冲为水火之冲');
INSERT INTO xing_chong_he_hai VALUES(7,'合','子','丑','子丑合土，主和合、亲密','子丑合主和睦、合作','子丑合在日柱主夫妻恩爱','子丑合化为土');
INSERT INTO xing_chong_he_hai VALUES(8,'合','寅','亥','寅亥合木，主和合、亲密','寅亥合主和睦、合作','寅亥合在日柱主夫妻恩爱','寅亥合化为木');
INSERT INTO xing_chong_he_hai VALUES(9,'合','卯','戌','卯戌合火，主和合、亲密','卯戌合主和睦、合作','卯戌合在日柱主夫妻恩爱','卯戌合化为火');
INSERT INTO xing_chong_he_hai VALUES(10,'合','辰','酉','辰酉合金，主和合、亲密','辰酉合主和睦、合作','辰酉合在日柱主夫妻恩爱','辰酉合化为金');
INSERT INTO xing_chong_he_hai VALUES(11,'合','巳','申','巳申合水，主和合、亲密','巳申合主和睦、合作','巳申合在日柱主夫妻恩爱','巳申合化为水');
INSERT INTO xing_chong_he_hai VALUES(12,'合','午','未','午未合土/火，主和合、亲密','午未合主和睦、合作','午未合在日柱主夫妻恩爱','午未合化土或火');
INSERT INTO xing_chong_he_hai VALUES(13,'刑','寅','巳','寅巳申三刑，无恩之刑','寅巳相刑主恩将仇报、官非','寅巳相刑在日柱主夫妻反目','寅巳申为无恩之刑');
INSERT INTO xing_chong_he_hai VALUES(14,'刑','巳','申','寅巳申三刑，无恩之刑','巳申相刑主恩将仇报、官非','巳申相刑在日柱主夫妻反目','寅巳申为无恩之刑');
INSERT INTO xing_chong_he_hai VALUES(15,'刑','申','寅','寅巳申三刑，无恩之刑','申寅相刑主恩将仇报、官非','申寅相刑在日柱主夫妻反目','寅巳申为无恩之刑');
INSERT INTO xing_chong_he_hai VALUES(16,'刑','丑','戌','丑戌未三刑，恃势之刑','丑戌相刑主仗势欺人、争斗','丑戌相刑在月柱主兄弟不和','丑戌未为恃势之刑');
INSERT INTO xing_chong_he_hai VALUES(17,'刑','戌','未','丑戌未三刑，恃势之刑','戌未相刑主仗势欺人、争斗','戌未相刑在月柱主兄弟不和','丑戌未为恃势之刑');
INSERT INTO xing_chong_he_hai VALUES(18,'刑','未','丑','丑戌未三刑，恃势之刑','未丑相刑主仗势欺人、争斗','未丑相刑在月柱主兄弟不和','丑戌未为恃势之刑');
INSERT INTO xing_chong_he_hai VALUES(19,'刑','子','卯','子卯相刑，无礼之刑','子卯相刑主无礼、淫乱','子卯相刑在日柱主婚姻不睦','子卯为无礼之刑');
INSERT INTO xing_chong_he_hai VALUES(20,'刑','卯','子','子卯相刑，无礼之刑','卯子相刑主无礼、淫乱','卯子相刑在日柱主婚姻不睦','子卯为无礼之刑');
INSERT INTO xing_chong_he_hai VALUES(21,'害','子','未','子未相害，主暗害、不和','子未相害主人际不和、暗损','子未相害在日柱主夫妻不睦','子未相害为六害之一');
INSERT INTO xing_chong_he_hai VALUES(22,'害','丑','午','丑午相害，主暗害、不和','丑午相害主人际不和、暗损','丑午相害在日柱主夫妻不睦','丑午相害为六害之一');
INSERT INTO xing_chong_he_hai VALUES(23,'害','寅','巳','寅巳相害，主暗害、不和','寅巳相害主人际不和、暗损','寅巳相害在日柱主夫妻不睦','寅巳相害为六害之一');
INSERT INTO xing_chong_he_hai VALUES(24,'害','卯','辰','卯辰相害，主暗害、不和','卯辰相害主人际不和、暗损','卯辰相害在日柱主夫妻不睦','卯辰相害为六害之一');
INSERT INTO xing_chong_he_hai VALUES(25,'害','申','亥','申亥相害，主暗害、不和','申亥相害主人际不和、暗损','申亥相害在日柱主夫妻不睦','申亥相害为六害之一');
INSERT INTO xing_chong_he_hai VALUES(26,'害','酉','戌','酉戌相害，主暗害、不和','酉戌相害主人际不和、暗损','酉戌相害在日柱主夫妻不睦','酉戌相害为六害之一');
INSERT INTO xing_chong_he_hai VALUES(27,'合','申','子','申子辰三合水局','申子辰合水局主智、流动','申子辰合水局在命局主聪明灵活','申子辰三合水局');
INSERT INTO xing_chong_he_hai VALUES(28,'合','子','辰','申子辰三合水局','申子辰合水局主智、流动','申子辰合水局在命局主聪明灵活','申子辰三合水局');
INSERT INTO xing_chong_he_hai VALUES(29,'合','辰','申','申子辰三合水局','申子辰合水局主智、流动','申子辰合水局在命局主聪明灵活','申子辰三合水局');
INSERT INTO xing_chong_he_hai VALUES(30,'合','寅','午','寅午戌三合火局','寅午戌合火局主礼、热情','寅午戌合火局在命局主热情开朗','寅午戌三合火局');
INSERT INTO xing_chong_he_hai VALUES(31,'合','午','戌','寅午戌三合火局','寅午戌合火局主礼、热情','寅午戌合火局在命局主热情开朗','寅午戌三合火局');
INSERT INTO xing_chong_he_hai VALUES(32,'合','戌','寅','寅午戌三合火局','寅午戌合火局主礼、热情','寅午戌合火局在命局主热情开朗','寅午戌三合火局');
INSERT INTO xing_chong_he_hai VALUES(33,'合','巳','酉','巳酉丑三合金局','巳酉丑合金属主义、果断','巳酉丑合金属在命局主果断刚毅','巳酉丑三合金局');
INSERT INTO xing_chong_he_hai VALUES(34,'合','酉','丑','巳酉丑三合金局','巳酉丑合金属主义、果断','巳酉丑合金属在命局主果断刚毅','巳酉丑三合金局');
INSERT INTO xing_chong_he_hai VALUES(35,'合','丑','巳','巳酉丑三合金局','巳酉丑合金属主义、果断','巳酉丑合金属在命局主果断刚毅','巳酉丑三合金局');
INSERT INTO xing_chong_he_hai VALUES(36,'合','亥','卯','亥卯未三合木局','亥卯未合木局主仁、生长','亥卯未合木局在命局主仁慈向上','亥卯未三合木局');
INSERT INTO xing_chong_he_hai VALUES(37,'合','卯','未','亥卯未三合木局','亥卯未合木局主仁、生长','亥卯未合木局在命局主仁慈向上','亥卯未三合木局');
INSERT INTO xing_chong_he_hai VALUES(38,'合','未','亥','亥卯未三合木局','亥卯未合木局主仁、生长','亥卯未合木局在命局主仁慈向上','亥卯未三合木局');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('gan_ji_gong',10);
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
FROM bazi_cases b;
COMMIT;
