#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
命例数据库恢复脚本
从 JSON 文件恢复损坏的数据库
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db'
BACKUP_DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli_backup_corrupt.db'
JSON_PATHS = [
    r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\scripts\extracted\sanming_pdf_cases.json',
]


def create_schema(cursor):
    """创建数据库表结构"""
    cursor.executescript('''
        DROP TABLE IF EXISTS basic_info;
        DROP TABLE IF EXISTS bazi_dayun;
        DROP TABLE IF EXISTS analysis;
        DROP TABLE IF EXISTS metadata;
        
        CREATE TABLE basic_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            gender TEXT,
            birth_time TEXT,
            birth_location TEXT,
            notes TEXT
        );
        
        CREATE TABLE bazi_dayun (
            id INTEGER PRIMARY KEY,
            year_pillar TEXT NOT NULL,
            month_pillar TEXT NOT NULL,
            day_pillar TEXT NOT NULL,
            hour_pillar TEXT NOT NULL,
            day_master TEXT NOT NULL,
            dayun_start_age INTEGER DEFAULT 1,
            dayun_data TEXT
        );
        
        CREATE TABLE analysis (
            id INTEGER PRIMARY KEY,
            pattern TEXT,
            strength TEXT,
            yong_shen TEXT,
            xi_shen TEXT,
            ji_shen TEXT,
            chou_shen TEXT,
            summary TEXT
        );
        
        CREATE TABLE metadata (
            id INTEGER PRIMARY KEY,
            source TEXT,
            category TEXT,
            confidence INTEGER DEFAULT 3,
            extracted_date TEXT,
            extractor TEXT,
            verified INTEGER DEFAULT 0,
            notes TEXT
        );
    ''')


def restore_from_json(cursor, json_path):
    """从 JSON 文件恢复数据"""
    if not os.path.exists(json_path):
        print(f"JSON 文件不存在: {json_path}")
        return 0
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if isinstance(data, list):
        cases = data
    elif isinstance(data, dict):
        cases = data.get('cases', [])
    else:
        print(f"未知数据格式: {type(data)}")
        return 0
    
    count = 0
    for item in cases:
        try:
            year_pillar = item.get('year_pillar', '')
            month_pillar = item.get('month_pillar', '')
            day_pillar = item.get('day_pillar', '')
            hour_pillar = item.get('hour_pillar', '')
            day_master = item.get('day_master', '')
            
            if not all([year_pillar, month_pillar, day_pillar, hour_pillar]):
                continue
            
            cursor.execute('''
                INSERT INTO basic_info (name, gender, birth_time, birth_location)
                VALUES (?, ?, ?, ?)
            ''', (
                f"{day_master}命例-{count+1}",
                '未知',
                f"{hour_pillar[1] if len(hour_pillar) > 1 else ''}时",
                ''
            ))
            
            case_id = cursor.lastrowid
            
            cursor.execute('''
                INSERT INTO bazi_dayun (id, year_pillar, month_pillar, day_pillar, hour_pillar, day_master)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                case_id,
                year_pillar,
                month_pillar,
                day_pillar,
                hour_pillar,
                day_master
            ))
            
            cursor.execute('''
                INSERT INTO analysis (id, pattern, summary) VALUES (?, ?, ?)
            ''', (
                case_id,
                item.get('pattern', '待分析'),
                item.get('original_text', '')
            ))
            
            cursor.execute('''
                INSERT INTO metadata (id, source, category, confidence, extracted_date, extractor)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                case_id,
                item.get('source', 'json_import'),
                '命例',
                3,
                datetime.now().strftime('%Y-%m-%d'),
                'restore_script'
            ))
            
            count += 1
        except Exception as e:
            print(f"插入失败: {e}")
    
    return count


def main():
    print("=" * 70)
    print("命例数据库恢复脚本")
    print("=" * 70)
    
    if os.path.exists(DB_PATH):
        print(f"\n备份损坏数据库...")
        backup_path = BACKUP_DB_PATH
        if os.path.exists(backup_path):
            os.remove(backup_path)
        os.rename(DB_PATH, backup_path)
        print(f"已备份到: {backup_path}")
    
    print(f"\n创建新数据库...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"创建表结构...")
    create_schema(cursor)
    
    total_restored = 0
    
    for json_path in JSON_PATHS:
        if os.path.exists(json_path):
            print(f"\n从 JSON 恢复: {json_path}")
            count = restore_from_json(cursor, json_path)
            print(f"  恢复 {count} 条记录")
            total_restored += count
    
    conn.commit()
    
    cursor.execute('SELECT COUNT(*) FROM basic_info')
    final_count = cursor.fetchone()[0]
    
    print("\n" + "=" * 70)
    print(f"恢复完成")
    print(f"  总恢复记录: {total_restored}")
    print(f"  数据库记录: {final_count}")
    print("=" * 70)
    
    conn.close()


if __name__ == "__main__":
    main()
