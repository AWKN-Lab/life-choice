#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量命例提取脚本 - 从OCR文本中系统提取命例
"""

import sqlite3
import json
import os
import re
from datetime import datetime

DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db'
OCR_DIR = r'C:\Users\10919\Desktop\AI\玄学data\ocr_output'

# 命例识别模式（支持OCR空格格式）
PATTERNS = [
    # 乾造/坤造格式（最标准）- 支持有空格和无空格
    (r'[乾坤]造[：:]\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*年\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*月\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*日\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*时', 'standard'),
    
    # 命造格式
    (r'命造[：:]\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s+([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s+([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s+([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])', 'mingzao'),
    
    # 纯八字格式（年月日时）
    (r'([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*年\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*月\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*日\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*时', 'simple'),
    
    # 四柱连续格式（无年月日时字样）- 如 "庚 寅 , 戊 寅 , 甲 子 , 丙 寅"
    (r'([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*[,，]\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*[,，]\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])\s*[,，]\s*([甲乙丙丁戊己庚辛壬癸])\s*?([子丑寅卯辰巳午未申酉戌亥])', 'continuous'),
]

# 格局识别模式
PATTERN_RECOGNITION = [
    r'入([正偏七劫伤食财官印]+格)',
    r'为([正偏七劫伤食财官印]+格)',
    r'属([正偏七劫伤食财官印]+格)',
    r'([正偏七劫伤食财官印]+格).*?(?:论|说|解)',
    r'格局[：:]\s*([正偏七劫伤食财官印]+格)',
]

# 用神识别模式
YONGSHEN_PATTERNS = [
    r'用[神忌]?[：:]\s*([金水木火土]+)',
    r'喜[用]?[：:]\s*([金水木火土]+)',
    r'取([金水木火土]+)为[用喜]',
]

def extract_cases_from_text(text, source_name):
    """从文本中提取命例"""
    cases = []
    seen_bazi = set()
    
    for pattern, ptype in PATTERNS:
        for match in re.finditer(pattern, text):
            # 根据模式类型提取四柱
            if ptype == 'standard' or ptype == 'simple':
                year = match.group(1) + match.group(2)
                month = match.group(3) + match.group(4)
                day = match.group(5) + match.group(6)
                hour = match.group(7) + match.group(8)
            elif ptype == 'mingzao':
                year = match.group(1) + match.group(2)
                month = match.group(3) + match.group(4)
                day = match.group(5) + match.group(6)
                hour = match.group(7) + match.group(8)
            elif ptype == 'continuous':
                year = match.group(1) + match.group(2)
                month = match.group(3) + match.group(4)
                day = match.group(5) + match.group(6)
                hour = match.group(7) + match.group(8)
            else:
                continue
            
            # 去重
            bazi_key = f"{year}{month}{day}{hour}"
            if bazi_key in seen_bazi:
                continue
            seen_bazi.add(bazi_key)
            
            # 提取上下文（前后200字符）
            start = max(0, match.start() - 200)
            end = min(len(text), match.end() + 200)
            context = text[start:end]
            
            # 识别性别
            gender = '男' if '乾造' in context[:50] or '乾造' in match.string[max(0,match.start()-50):match.start()] else '女' if '坤造' in context[:50] else '男'
            
            # 识别格局
            pattern_name = None
            for p in PATTERN_RECOGNITION:
                pmatch = re.search(p, context)
                if pmatch:
                    pattern_name = pmatch.group(1)
                    break
            
            # 识别用神
            yongshen = None
            for p in YONGSHEN_PATTERNS:
                ymatch = re.search(p, context)
                if ymatch:
                    yongshen = ymatch.group(1)
                    break
            
            cases.append({
                'year_pillar': year,
                'month_pillar': month,
                'day_pillar': day,
                'hour_pillar': hour,
                'day_master': day[0],
                'gender': gender,
                'pattern': pattern_name,
                'yongshen': yongshen,
                'source': source_name,
                'original_text': match.group(0),
                'context': context,
                'match_type': ptype,
            })
    
    return cases

def insert_case_to_db(case, cursor):
    """将单个命例插入数据库"""
    try:
        # 检查是否已存在
        cursor.execute('''
            SELECT id FROM bazi_dayun 
            WHERE year_pillar = ? AND month_pillar = ? AND day_pillar = ? AND hour_pillar = ?
        ''', (case['year_pillar'], case['month_pillar'], case['day_pillar'], case['hour_pillar']))
        
        if cursor.fetchone():
            return 'duplicate'
        
        # 插入基础信息
        cursor.execute('''
            INSERT INTO basic_info (name, gender, birth_time, birth_location)
            VALUES (?, ?, ?, ?)
        ''', (
            f"{case['day_master']}命例-{case['source'][:10]}",
            case['gender'],
            case['hour_pillar'][1] + '时',
            f"{case['year_pillar']} {case['month_pillar']} {case['day_pillar']} {case['hour_pillar']}"
        ))
        
        case_id = cursor.lastrowid
        
        # 插入八字大运
        cursor.execute('''
            INSERT INTO bazi_dayun (id, year_pillar, month_pillar, day_pillar, hour_pillar, day_master)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            case_id,
            case['year_pillar'],
            case['month_pillar'],
            case['day_pillar'],
            case['hour_pillar'],
            case['day_master']
        ))
        
        # 插入分析（如果有格局）
        if case['pattern']:
            cursor.execute('''
                INSERT INTO analysis (id, pattern, used_gods)
                VALUES (?, ?, ?)
            ''', (case_id, case['pattern'], case['yongshen']))
        else:
            # 插入空的分析记录以保持外键完整性
            cursor.execute('''
                INSERT INTO analysis (id, pattern, used_gods)
                VALUES (?, ?, ?)
            ''', (case_id, None, case['yongshen']))
        
        # 插入元数据
        cursor.execute('''
            INSERT INTO metadata (id, source, original_text, confidence, extracted_date, extractor)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            case_id,
            case['source'],
            case['context'][:500],
            4,  # 置信度
            datetime.now().strftime('%Y-%m-%d'),
            'batch_extractor_v1'
        ))
        
        return 'success'
    except Exception as e:
        print(f"    插入错误: {e}")
        return f'error: {e}'

def process_file(filepath, source_name):
    """处理单个OCR文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        
        cases = extract_cases_from_text(text, source_name)
        return cases
    except Exception as e:
        print(f"  错误: {e}")
        return []

def main():
    print("=" * 70)
    print("批量命例提取工具 v1.0")
    print("=" * 70)
    
    # 定义要处理的典籍（按优先级）
    sources = [
        # P0 - 核心典籍
        ('三命通会 ([明]万明英 撰  陈明  王胜恩 注释) (Z-Library).txt', '三命通会'),
        ('四库存目子平汇刊 4 秘授滴天髓阐微 (（宋）京图，（明）刘基，（清）任铁樵撰) (Z-Library).txt', '滴天髓阐微'),
        
        # P1 - 重要典籍
        ('四库存目子平汇刊 6 神峰通考命理正宗 ([明]张楠) (Z-Library).txt', '神峰通考'),
        ('四库存目子平汇刊 3 命理金鉴 附李虚中命书 ([清] 志于道 著) (Z-Library).txt', '命理金鉴'),
        ('四库存目 子平汇刊 5 穷通宝鉴评注 (（清）徐乐吾注) (Z-Library).txt', '穷通宝鉴'),
        
        # P2 - 补充典籍
        ('图解渊海子平 [图解干支密码 (1)]. ((宋)徐子平) (Z-Library).txt', '渊海子平'),
        ('中国古代术数经典 子平真诠评注 (（清）沈孝瞻) (Z-Library).txt', '子平真诠'),
        ('四库存目子平汇刊 8 重校绘图袁氏命谱 (（清）袁树珊撰) (Z-Library) (1).txt', '袁氏命谱'),
        
        # P3 - 其他
        ('四库存目子平汇刊 7 新校命理探原 (（清）袁树珊撰) (Z-Library).txt', '命理探原'),
        ('《命理千金赋》千里命稿(1).ocr.txt', '千里命稿'),
        ('中国古代术数全书 滴天髓 (（宋）京图撰；（明）刘基注；（清）任铁樵疏；孙正治点校, Jing Tu zhuan etc.) (Z-Library).txt', '滴天髓'),
    ]
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    total_stats = {
        'files_processed': 0,
        'cases_found': 0,
        'inserted': 0,
        'duplicates': 0,
        'errors': 0,
    }
    
    file_results = []
    
    print("\n开始处理典籍...\n")
    
    for filename, source_name in sources:
        filepath = os.path.join(OCR_DIR, filename)
        
        if not os.path.exists(filepath):
            print(f"[跳过] {source_name} (文件不存在)")
            continue
        
        print(f"[处理] {source_name}")
        print(f"   文件: {filename[:50]}...")
        
        cases = process_file(filepath, source_name)
        
        file_inserted = 0
        file_duplicates = 0
        file_errors = 0
        
        for case in cases:
            result = insert_case_to_db(case, cursor)
            if result == 'success':
                file_inserted += 1
            elif result == 'duplicate':
                file_duplicates += 1
            else:
                file_errors += 1
        
        conn.commit()
        
        total_stats['files_processed'] += 1
        total_stats['cases_found'] += len(cases)
        total_stats['inserted'] += file_inserted
        total_stats['duplicates'] += file_duplicates
        total_stats['errors'] += file_errors
        
        file_results.append({
            'source': source_name,
            'found': len(cases),
            'inserted': file_inserted,
            'duplicates': file_duplicates,
            'errors': file_errors,
        })
        
        print(f"   找到: {len(cases)} | 录入: {file_inserted} | 重复: {file_duplicates} | 错误: {file_errors}")
        print()
    
    conn.close()
    
    # 输出统计报告
    print("=" * 70)
    print("【处理统计】")
    print("=" * 70)
    print(f"\n处理文件数: {total_stats['files_processed']}")
    print(f"识别命例数: {total_stats['cases_found']}")
    print(f"成功录入: {total_stats['inserted']}")
    print(f"重复跳过: {total_stats['duplicates']}")
    print(f"错误: {total_stats['errors']}")
    
    print("\n【各典籍详情】")
    print("-" * 70)
    print(f"{'典籍':<15} {'找到':                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      