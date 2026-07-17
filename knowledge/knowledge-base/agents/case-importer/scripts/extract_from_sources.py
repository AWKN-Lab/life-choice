#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
命例批量录入脚本 - 从各类典籍中提取命例
"""

import sqlite3
import json
import os
import re
from datetime import datetime

DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db'
DATA_DIR = r'C:\Users\10919\Desktop\AI\玄学data'

def extract_cases_from_text(text, source_name):
    """从文本中提取命例"""
    cases = []
    
    # 模式1: 六X年XX月XX日XX时
    pattern1 = r'六([甲乙丙丁戊己庚辛壬癸])年([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])时'
    for match in re.finditer(pattern1, text):
        cases.append({
            'year_pillar': match.group(1) + '?',  # 年支未知
            'month_pillar': match.group(2),
            'day_pillar': match.group(3),
            'hour_pillar': match.group(4),
            'day_master': match.group(3)[0],
            'month_branch': match.group(2)[1],
            'source': source_name,
            'original_text': match.group(0)
        })
    
    # 模式2: 标准八字格式
    pattern2 = r'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])时'
    for match in re.finditer(pattern2, text):
        text_match = match.group(0)
        # 避免重复
        if not any(c['original_text'] == text_match for c in cases):
            cases.append({
                'year_pillar': match.group(1),
                'month_pillar': match.group(2),
                'day_pillar': match.group(3),
                'hour_pillar': match.group(4),
                'day_master': match.group(3)[0],
                'month_branch': match.group(2)[1],
                'source': source_name,
                'original_text': text_match
            })
    
    return cases

def insert_cases_to_db(cases):
    """将命例插入数据库"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    inserted = 0
    skipped = 0
    
    for case in cases:
        try:
            # 检查是否已存在
            cursor.execute('''
                SELECT id FROM basic_info 
                WHERE name = ? AND birth_time = ?
            ''', (f"{case['day_master']}命例", case['hour_pillar'][1] + '时'))
            
            if cursor.fetchone():
                skipped += 1
                continue
            
            # 插入新记录
            cursor.execute('''
                INSERT INTO basic_info 
                (name, gender, birth_date, birth_time, birth_location, lunar_date)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                f"{case['day_master']}命例-{case['source']}",
                '男',  # 默认
                None,
                case['hour_pillar'][1] + '时',
                f"四柱:{case['year_pillar']},{case['month_pillar']},{case['day_pillar']},{case['hour_pillar']}",
                f"日干:{case['day_master']},月令:{case['month_branch']}"
            ))
            inserted += 1
            
        except Exception as e:
            print(f"插入失败: {e}")
            skipped += 1
    
    conn.commit()
    conn.close()
    
    return inserted, skipped

def process_source_file(filename):
    """处理单个源文件"""
    file_path = os.path.join(DATA_DIR, filename)
    
    if not os.path.exists(file_path):
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        cases = extract_cases_from_text(text, filename)
        return {
            'filename': filename,
            'total_cases': len(cases),
            'cases': cases
        }
    except Exception as e:
        return {
            'filename': filename,
            'error': str(e)
        }

def main():
    print("=" * 60)
    print("命例批量录入 - 从玄学data目录提取")
    print("=" * 60)
    
    # 要处理的文件列表
    source_files = [
        '三命通会 ([明]万明英 撰  陈明  王胜恩 注释) (Z-Library).md',
        '八字基础数据知识库.md',
    ]
    
    all_cases = []
    
    print("\n1. 扫描源文件...")
    for filename in source_files:
        print(f"\n  处理: {filename}")
        result = process_source_file(filename)
        if result:
            if 'error' in result:
                print(f"    错误: {result['error']}")
            else:
                print(f"    找到 {result['total_cases']} 个命例")
                all_cases.extend(result['cases'])
    
    print(f"\n2. 总共找到 {len(all_cases)} 个命例")
    
    if all_cases:
        print("\n3. 插入数据库...")
        inserted, skipped = insert_cases_to_db(all_cases)
        print(f"    成功插入: {inserted}")
        print(f"    跳过(重复): {skipped}")
    
    # 保存提取结果到JSON
    output_file = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\extracted_cases.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_cases, f, ensure_ascii=False, indent=2)
    print(f"\n4. 结果已保存到: {output_file}")
    
    print("\n" + "=" * 60)
    print("处理完成!")
    print("=" * 60)

if __name__ == '__main__':
    main()
