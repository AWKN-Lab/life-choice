#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
静默提取脚本 - 直接写入文件，避免控制台编码问题
"""

import os
import re
import json
import sqlite3
from pathlib import Path
from datetime import datetime

DATA_DIR = r"C:\Users\10919\Desktop\AI\玄学data"
DB_PATH = r"c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db"

def extract_from_sanming():
    """从三命通会提取命例"""
    file_path = os.path.join(DATA_DIR, '三命通会 ([明]万明英 撰  陈明  王胜恩 注释) (Z-Library).md')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    cases = []
    
    # 查找六X年格式（使用原始字节匹配）
    # 六甲年丁卯月乙未日戊寅时
    gan_chars = '甲乙丙丁戊己庚辛壬癸'
    zhi_chars = '子丑寅卯辰巳午未申酉戌亥'
    
    # 构建正则
    pattern = f'六([{gan_chars}])年([{gan_chars}][{zhi_chars}])月([{gan_chars}][{zhi_chars}])日([{gan_chars}][{zhi_chars}])时'
    
    for match in re.finditer(pattern, content):
        cases.append({
            'year_pillar': match.group(1) + '?',
            'month_pillar': match.group(2),
            'day_pillar': match.group(3),
            'hour_pillar': match.group(4),
            'day_master': match.group(3)[0],
            'month_branch': match.group(2)[1],
            'source': '三命通会',
            'pattern': 'liunian'
        })
    
    return cases

def import_cases(cases):
    """导入到数据库"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    imported = 0
    for case in cases:
        try:
            cursor.execute('''
                INSERT INTO basic_info 
                (name, gender, birth_date, birth_time, birth_location, lunar_date)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                f"{case['day_master']}命例-三命通会",
                '男',
                None,
                case['hour_pillar'][1] + '时',
                f"四柱:{case['year_pillar']},{case['month_pillar']},{case['day_pillar']},{case['hour_pillar']}",
                f"日干:{case['day_master']},月令:{case['month_branch']}"
            ))
            imported += 1
        except:
            pass
    
    conn.commit()
    conn.close()
    return imported

def main():
    # 提取
    cases = extract_from_sanming()
    
    # 保存到JSON
    output = {
        'timestamp': datetime.now().isoformat(),
        'total': len(cases),
        'cases': cases
    }
    
    with open('extracted_result.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    # 导入数据库
    imported = import_cases(cases)
    
    # 写入结果文件
    with open('extraction_summary.txt', 'w', encoding='utf-8') as f:
        f.write(f"提取完成\n")
        f.write(f"找到命例: {len(cases)}\n")
        f.write(f"导入数据库: {imported}\n")
        f.write(f"\n日干分布:\n")
        
        dm_count = {}
        for case in cases:
            dm = case['day_master']
            dm_count[dm] = dm_count.get(dm, 0) + 1
        
        for dm, count in sorted(dm_count.items(), key=lambda x: -x[1]):
            f.write(f"  {dm}: {count}\n")

if __name__ == '__main__':
    main()
