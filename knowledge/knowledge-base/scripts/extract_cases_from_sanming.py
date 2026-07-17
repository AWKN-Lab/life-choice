#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从三命通会提取命例数据 - 改进版
"""

import re
import sqlite3
import json
from datetime import datetime

# 读取三命通会文件
file_path = r"C:\Users\10919\Desktop\AI\玄学data\三命通会 ([明]万明英 撰  陈明  王胜恩 注释) (Z-Library).md"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"文件总长度: {len(content)} 字符")

# 查找所有四柱组合
cases = []

# 模式1: 六甲年丁卯月乙未日戊寅时 (六X年格式)
pattern1 = r'六([甲乙丙丁戊己庚辛壬癸])年([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])时'
matches1 = list(re.finditer(pattern1, content))
print(f"模式1 (六X年) 匹配: {len(matches1)}")

for match in matches1:
    year_gan = match.group(1)
    year_zhi = ''  # 需要根据年干推算或留空
    cases.append({
        'year_pillar': f"{year_gan}?",  # 未知地支
        'month_pillar': match.group(2),
        'day_pillar': match.group(3),
        'hour_pillar': match.group(4),
        'day_master': match.group(3)[0],
        'month_branch': match.group(2)[1],
        'original_text': match.group(0),
        'position': match.start(),
        'context': content[max(0, match.start()-30):min(len(content), match.end()+50)],
        'source': '三命通会'
    })

# 模式2: 标准八字格式 甲子年丙寅月丁卯日戊申时
pattern2 = r'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])时'
matches2 = list(re.finditer(pattern2, content))
print(f"模式2 (标准格式) 匹配: {len(matches2)}")

for match in matches2:
    # 避免与模式1重复
    text = match.group(0)
    if not any(c['original_text'] == text for c in cases):
        cases.append({
            'year_pillar': match.group(1),
            'month_pillar': match.group(2),
            'day_pillar': match.group(3),
            'hour_pillar': match.group(4),
            'day_master': match.group(3)[0],
            'month_branch': match.group(2)[1],
            'original_text': text,
            'position': match.start(),
            'context': content[max(0, match.start()-30):min(len(content), match.end()+50)],
            'source': '三命通会'
        })

# 模式3: 查找"X年X月X日X时"格式（不带"柱"字）
pattern3 = r'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])[年]([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])[月]([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])[日]([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])[时]'
matches3 = list(re.finditer(pattern3, content))
print(f"模式3 (紧凑格式) 匹配: {len(matches3)}")

for match in matches3:
    text = match.group(0)
    if not any(c['original_text'] == text for c in cases):
        cases.append({
            'year_pillar': match.group(1),
            'month_pillar': match.group(2),
            'day_pillar': match.group(3),
            'hour_pillar': match.group(4),
            'day_master': match.group(3)[0],
            'month_branch': match.group(2)[1],
            'original_text': text,
            'position': match.start(),
            'context': content[max(0, match.start()-30):min(len(content), match.end()+50)],
            'source': '三命通会'
        })

print(f"\n总共找到 {len(cases)} 个命例")

# 显示前20个命例
print("\n前20个命例:")
for i, case in enumerate(cases[:20], 1):
    print(f"{i}. {case['year_pillar']} {case['month_pillar']} {case['day_pillar']} {case['hour_pillar']} (日干: {case['day_master']})")

# 统计日干分布
day_master_count = {}
for case in cases:
    dm = case['day_master']
    day_master_count[dm] = day_master_count.get(dm, 0) + 1

print("\n日干分布:")
for dm, count in sorted(day_master_count.items(), key=lambda x: -x[1]):
    print(f"  {dm}: {count}")

# 保存到JSON文件
output_file = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\extracted_cases_sanming.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(cases, f, ensure_ascii=False, indent=2)

print(f"\n命例已保存到: {output_file}")

# 尝试插入数据库
try:
    db_path = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    inserted = 0
    for case in cases:
        try:
            cursor.execute('''
                INSERT INTO basic_info 
                (year_pillar, month_pillar, day_pillar, hour_pillar, day_master, month_branch, source, original_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                case['year_pillar'],
                case['month_pillar'],
                case['day_pillar'],
                case['hour_pillar'],
                case['day_master'],
                case['month_branch'],
                case['source'],
                case['original_text']
            ))
            inserted += 1
        except sqlite3.IntegrityError:
            # 重复数据，跳过
            pass
    
    conn.commit()
    conn.close()
    print(f"成功插入 {inserted} 条命例到数据库")
    
except Exception as e:
    print(f"数据库插入失败: {e}")
