#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
五行知识库创建脚本
从五行精纪、五行大义提取五行知识数据
"""

import sqlite3
from datetime import datetime

DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\wuxing.db'

def create_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 六十甲子纳音
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS nayin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jiazi TEXT NOT NULL UNIQUE,
            nayin TEXT NOT NULL,
            element TEXT,
            description TEXT,
            meaning TEXT
        )
    ''')
    
    nayin_data = [
        ('甲子', '海中金', '金', '甲子从革之金，其气散', '沉潜灵中之德，四时皆吉'),
        ('乙丑', '海中金', '金', '乙丑自库之金，火不能克', '退藏之金，未有不显荣者'),
        ('丙寅', '炉中火', '火', '丙寅赫牺之火', '无水制之，则为燔灼炎烈之患'),
        ('丁卯', '炉中火', '火', '丁卯伏明之火', '气弱宜木生之，遇水则凶'),
        ('戊辰', '大林木', '木', '戊辰两土下木', '众金不能克，得土生之为佳'),
        ('己巳', '大林木', '木', '己巳为近火之木', '金自此生，于我无伤'),
        ('庚午', '路旁土', '土', '庚午始生之土', '木不能克，惟忌水多'),
        ('辛未', '路旁土', '土', '辛未始生之土', '木不能克，惟忌水多'),
        ('壬申', '剑锋金', '金', '壬申临官之金', '利见水土，秋冬掌生杀之权'),
        ('癸酉', '剑锋金', '金', '癸酉坚成之金', '火死于酉，见火何伤'),
        ('甲戌', '山头火', '火', '甲戌自库之火', '不嫌众水，惟忌壬戌'),
        ('乙亥', '山头火', '火', '乙亥伏明之火', '其气湮欎而不发'),
        ('丙子', '涧下水', '水', '丙子流衍之水', '不忌众土，惟嫌庚子'),
        ('丁丑', '涧下水', '水', '丁丑福聚之水', '最爱金生'),
        ('戊寅', '城头土', '土', '戊寅受伤之土', '最为无力，要生旺火'),
        ('己卯', '城头土', '土', '己卯自死之土', '贵得火以致其福'),
        ('庚辰', '白腊金', '金', '庚辰气聚之金', '不用火制，其器自成'),
        ('辛巳', '白腊金', '金', '辛巳自生之金', '精神具足，体气完备'),
        ('壬午', '杨柳木', '木', '壬午杨柳木', '柔弱之木'),
        ('癸未', '杨柳木', '木', '癸未杨柳木', '柔弱之木'),
        ('甲申', '泉中水', '水', '甲申泉中水', '寒泉之水'),
        ('乙酉', '泉中水', '水', '乙酉泉中水', '寒泉之水'),
        ('丙戌', '屋上土', '土', '丙戌屋上土', '成器之土'),
        ('丁亥', '屋上土', '土', '丁亥屋上土', '成器之土'),
        ('戊子', '霹雳火', '火', '戊子霹雳火', '神龙之火'),
        ('己丑', '霹雳火', '火', '己丑霹雳火', '神龙之火'),
        ('庚寅', '松柏木', '木', '庚寅松柏木', '坚毅之木'),
        ('辛卯', '松柏木', '木', '辛卯松柏木', '坚毅之木'),
        ('壬辰', '长流水', '水', '壬辰长流水', '源源不断'),
        ('癸巳', '长流水', '水', '癸巳长流水', '源源不断'),
        ('甲午', '砂中金', '金', '甲午砂中金', '矿中之金'),
        ('乙未', '砂中金', '金', '乙未砂中金', '矿中之金'),
        ('丙申', '山下火', '火', '丙申山下火', '夕阳之火'),
        ('丁酉', '山下火', '火', '丁酉山下火', '夕阳之火'),
        ('戊戌', '平地木', '木', '戊戌平地木', '平地之木'),
        ('己亥', '平地木', '木', '己亥平地木', '平地之木'),
        ('庚子', '壁上土', '土', '庚子壁上土', '依附之土'),
        ('辛丑', '壁上土', '土', '辛丑壁上土', '依附之土'),
        ('壬寅', '金箔金', '金', '壬寅金箔金', '薄金'),
        ('癸卯', '金箔金', '金', '癸卯金箔金', '薄金'),
        ('甲辰', '覆灯火', '火', '甲辰覆灯火', '灯盏之火'),
        ('乙巳', '覆灯火', '火', '乙巳覆灯火', '灯盏之火'),
        ('丙午', '天河水', '水', '丙午天河水', '天上之水'),
        ('丁未', '天河水', '水', '丁未天河水', '天上之水'),
        ('戊申', '大驿土', '土', '戊申大驿土', '通达之土'),
        ('己酉', '大驿土', '土', '己酉大驿土', '通达之土'),
        ('庚戌', '钗钏金', '金', '庚戌钗钏金', '首饰之金'),
        ('辛亥', '钗钏金', '金', '辛亥钗钏金', '首饰之金'),
        ('壬子', '桑拓木', '木', '壬子桑拓木', '柔韧之木'),
        ('癸丑', '桑拓木', '木', '癸丑桑拓木', '柔韧之木'),
        ('甲寅', '大溪水', '水', '甲寅大溪水', '奔流之水'),
        ('乙卯', '大溪水', '水', '乙卯大溪水', '奔流之水'),
        ('丙辰', '沙中土', '土', '丙辰沙中土', '松散之土'),
        ('丁巳', '沙中土', '土', '丁巳沙中土', '松散之土'),
        ('戊午', '天上火', '火', '戊午天上火', '太阳之火'),
        ('己未', '天上火', '火', '己未天上火', '太阳之火'),
        ('庚申', '石榴木', '木', '庚申石榴木', '花果之木'),
        ('辛酉', '石榴木', '木', '辛酉石榴木', '花果之木'),
        ('壬戌', '大海水', '水', '壬戌大海水', '浩瀚之水'),
        ('癸亥', '大海水', '水', '癸亥大海水', '浩瀚之水'),
    ]
    
    for data in nayin_data:
        cursor.execute('INSERT OR REPLACE INTO nayin (jiazi, nayin, element, description, meaning) VALUES (?, ?, ?, ?, ?)', data)
    
    # 五行生克
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wuxing_relation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            element TEXT NOT NULL,
            generates TEXT,
            generated_by TEXT,
            controls TEXT,
            controlled_by TEXT
        )
    ''')
    
    wuxing_relation_data = [
        ('木', '火', '水', '土', '金'),
        ('火', '土', '木', '金', '水'),
        ('土', '金', '火', '水', '木'),
        ('金', '水', '土', '木', '火'),
        ('水', '木', '金', '火', '土'),
    ]
    
    for data in wuxing_relation_data:
        cursor.execute('INSERT OR REPLACE INTO wuxing_relation (element, generates, generated_by, controls, controlled_by) VALUES (?, ?, ?, ?, ?)', data)
    
    # 五行属性
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wuxing_attribute (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            element TEXT NOT NULL,
            season TEXT,
            direction TEXT,
            color TEXT,
            organ TEXT,
            emotion TEXT,
            taste TEXT
        )
    ''')
    
    wuxing_attribute_data = [
        ('木', '春', '东', '青/绿', '肝', '怒', '酸'),
        ('火', '夏', '南', '红', '心', '喜', '苦'),
        ('土', '季夏', '中', '黄', '脾', '思', '甘'),
        ('金', '秋', '西', '白', '肺', '悲', '辛'),
        ('水', '冬', '北', '黑/蓝', '肾', '恐', '咸'),
    ]
    
    for data in wuxing_attribute_data:
        cursor.execute('INSERT OR REPLACE INTO wuxing_attribute (element, season, direction, color, organ, emotion, taste) VALUES (?, ?, ?, ?, ?, ?, ?)', data)
    
    # 十天干
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tiangan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            element TEXT,
            yinyang TEXT,
            season TEXT,
            position INTEGER
        )
    ''')
    
    tiangan_data = [
        ('甲', '木', '阳', '春', 1),
        ('乙', '木', '阴', '春', 2),
        ('丙', '火', '阳', '夏', 3),
        ('丁', '火', '阴', '夏', 4),
        ('戊', '土', '阳', '季夏', 5),
        ('己', '土', '阴', '季夏', 6),
        ('庚', '金', '阳', '秋', 7),
        ('辛', '金', '阴', '秋', 8),
        ('壬', '水', '阳', '冬', 9),
        ('癸', '水', '阴', '冬', 10),
    ]
    
    for data in tiangan_data:
        cursor.execute('INSERT OR REPLACE INTO tiangan (name, element, yinyang, season, position) VALUES (?, ?, ?, ?, ?)', data)
    
    # 十二地支
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS dizhi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            element TEXT,
            yinyang TEXT,
            season TEXT,
            position INTEGER,
            animal TEXT
        )
    ''')
    
    dizhi_data = [
        ('子', '水', '阳', '冬', 1, '鼠'),
        ('丑', '土', '阴', '冬', 2, '牛'),
        ('寅', '木', '阳', '春', 3, '虎'),
        ('卯', '木', '阴', '春', 4, '兔'),
        ('辰', '土', '阳', '春', 5, '龙'),
        ('巳', '火', '阴', '夏', 6, '蛇'),
        ('午', '火', '阳', '夏', 7, '马'),
        ('未', '土', '阴', '夏', 8, '羊'),
        ('申', '金', '阳', '秋', 9, '猴'),
        ('酉', '金', '阴', '秋', 10, '鸡'),
        ('戌', '土', '阳', '秋', 11, '狗'),
        ('亥', '水', '阴', '冬', 12, '猪'),
    ]
    
    for data in dizhi_data:
        cursor.execute('INSERT OR REPLACE INTO dizhi (name, element, yinyang, season, position, animal) VALUES (?, ?, ?, ?, ?, ?)', data)
    
    conn.commit()
    
    # 统计
    cursor.execute('SELECT COUNT(*) FROM nayin')
    nayin_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM wuxing_relation')
    relation_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM wuxing_attribute')
    attr_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM tiangan')
    tiangan_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM dizhi')
    dizhi_count = cursor.fetchone()[0]
    
    conn.close()
    
    print("=" * 60)
    print("五行知识库创建完成")
    print("=" * 60)
    print(f"数据库路径: {DB_PATH}")
    print(f"六十甲子纳音: {nayin_count} 条")
    print(f"五行生克关系: {relation_count} 条")
    print(f"五行属性: {attr_count} 条")
    print(f"十天干: {tiangan_count} 条")
    print(f"十二地支: {dizhi_count} 条")
    print("=" * 60)

if __name__ == '__main__':
    create_database()
