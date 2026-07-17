#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
处理特殊Unicode字符的提取脚本
文件中使用的是CJK兼容字符，需要映射到标准字符
"""

import os
import re
import json
import sqlite3
from datetime import datetime

DATA_DIR = r"C:\Users\10919\Desktop\AI\玄学data"
DB_PATH = r"c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db"

# 特殊字符映射表（兼容字符 -> 标准字符）
# CJK Kangxi Radicals (U+2F00 - U+2FD5) 到标准汉字的映射
CHAR_MAP = {
    # U+2F00 - U+2F1F
    '\u2f00': '一', '\u2f01': '丨', '\u2f02': '丶', '\u2f03': '丿',
    '\u2f04': '乙', '\u2f05': '亅', '\u2f06': '二', '\u2f07': '亠',
    '\u2f08': '人', '\u2f09': '儿', '\u2f0a': '入', '\u2f0b': '八',
    '\u2f0c': '冂', '\u2f0d': '冖', '\u2f0e': '冫', '\u2f0f': '几',
    # U+2F10 - U+2F2F
    '\u2f10': '凵', '\u2f11': '刀', '\u2f12': '力', '\u2f13': '勹',
    '\u2f14': '匕', '\u2f15': '匚', '\u2f16': '匸', '\u2f17': '十',
    '\u2f18': '卜', '\u2f19': '卩', '\u2f1a': '厂', '\u2f1b': '厶',
    '\u2f1c': '又', '\u2f1d': '口', '\u2f1e': '囗', '\u2f1f': '土',
    # U+2F20 - U+2F3F
    '\u2f20': '士', '\u2f21': '夂', '\u2f22': '夊', '\u2f23': '夕',
    '\u2f24': '大', '\u2f25': '女', '\u2f26': '子', '\u2f27': '宀',
    '\u2f28': '寸', '\u2f29': '小', '\u2f2a': '尢', '\u2f2b': '尸',
    '\u2f2c': '屮', '\u2f2d': '山', '\u2f2e': '巛', '\u2f2f': '工',
    # U+2F30 - U+2F4F
    '\u2f30': '己', '\u2f31': '巾', '\u2f32': '干', '\u2f33': '幺',
    '\u2f34': '广', '\u2f35': '廴', '\u2f36': '廾', '\u2f37': '弋',
    '\u2f38': '弓', '\u2f39': '彐', '\u2f3a': '彡', '\u2f3b': '彳',
    '\u2f3c': '心', '\u2f3d': '戈', '\u2f3e': '户', '\u2f3f': '手',
    # U+2F40 - U+2F5F
    '\u2f40': '支', '\u2f41': '攴', '\u2f42': '文', '\u2f43': '斗',
    '\u2f44': '斤', '\u2f45': '方', '\u2f46': '无', '\u2f47': '日',
    '\u2f48': '曰', '\u2f49': '月', '\u2f4a': '木', '\u2f4b': '欠',
    '\u2f4c': '止', '\u2f4d': '歹', '\u2f4e': '殳', '\u2f4f': '毋',
    # U+2F50 - U+2F6F
    '\u2f50': '比', '\u2f51': '毛', '\u2f52': '氏', '\u2f53': '气',
    '\u2f54': '水', '\u2f55': '火', '\u2f56': '爪', '\u2f57': '父',
    '\u2f58': '爻', '\u2f59': '爿', '\u2f5a': '片', '\u2f5b': '牙',
    '\u2f5c': '牛', '\u2f5d': '犬', '\u2f5e': '玄', '\u2f5f': '玉',
    # U+2F60 - U+2F7F
    '\u2f60': '瓜', '\u2f61': '瓦', '\u2f62': '甘', '\u2f63': '生',
    '\u2f64': '用', '\u2f65': '田', '\u2f66': '疋', '\u2f67': '疒',
    '\u2f68': '癶', '\u2f69': '白', '\u2f6a': '皮', '\u2f6b': '皿',
    '\u2f6c': '目', '\u2f6d': '矛', '\u2f6e': '矢', '\u2f6f': '石',
    # U+2F70 - U+2F8F
    '\u2f70': '示', '\u2f71': '禸', '\u2f72': '立', '\u2f73': '竹',
    '\u2f74': '米', '\u2f75': '糸', '\u2f76': '缶', '\u2f77': '网',
    '\u2f78': '羊', '\u2f79': '羽', '\u2f7a': '老', '\u2f7b': '而',
    '\u2f7c': '耒', '\u2f7d': '耳', '\u2f7e': '聿', '\u2f7f': '肉',
    # U+2F80 - U+2F8F (continued)
    '\u2f80': '臣', '\u2f81': '自', '\u2f82': '至', '\u2f83': '臼',
    '\u2f84': '舌', '\u2f85': '舛', '\u2f86': '舟', '\u2f87': '艮',
    '\u2f88': '色', '\u2f89': '艸', '\u2f8a': '虍', '\u2f8b': '虫',
    '\u2f8c': '血', '\u2f8d': '行', '\u2f8e': '衣', '\u2f8f': '襾',
    # U+2F90 - U+2FAF (修复：原为全部"貝")
    '\u2f90': '見', '\u2f91': '角', '\u2f92': '言', '\u2f93': '谷',
    '\u2f94': '豆', '\u2f95': '豕', '\u2f96': '豸', '\u2f97': '貝',
    '\u2f98': '赤', '\u2f99': '走', '\u2f9a': '足', '\u2f9b': '身',
    '\u2f9c': '車', '\u2f9d': '辛', '\u2f9e': '辰', '\u2f9f': '辵',
    # U+2FA0 - U+2FBF
    '\u2fa0': '邑', '\u2fa1': '酉', '\u2fa2': '釆', '\u2fa3': '里',
    '\u2fa4': '金', '\u2fa5': '長', '\u2fa6': '門', '\u2fa7': '阜',
    '\u2fa8': '隶', '\u2fa9': '隹', '\u2faa': '雨', '\u2fab': '靑',
    '\u2fac': '非', '\u2fad': '面', '\u2fae': '革', '\u2faf': '韋',
    # U+2FB0 - U+2FCF
    '\u2fb0': '韭', '\u2fb1': '音', '\u2fb2': '頁', '\u2fb3': '風',
    '\u2fb4': '飛', '\u2fb5': '食', '\u2fb6': '首', '\u2fb7': '香',
    '\u2fb8': '馬', '\u2fb9': '骨', '\u2fba': '高', '\u2fbb': '髟',
    '\u2fbc': '鬥', '\u2fbd': '鬯', '\u2fbe': '鬲', '\u2fbf': '鬼',
    # U+2FC0 - U+2FD5
    '\u2fc0': '魚', '\u2fc1': '鳥', '\u2fc2': '鹵', '\u2fc3': '鹿',
    '\u2fc4': '麥', '\u2fc5': '麻', '\u2fc6': '黃', '\u2fc7': '黍',
    '\u2fc8': '黑', '\u2fc9': '黹', '\u2fca': '黽', '\u2fcb': '鼎',
    '\u2fcc': '鼓', '\u2fcd': '鼠', '\u2fce': '鼻', '\u2fcf': '齊',
    '\u2fd0': '齒', '\u2fd1': '龍', '\u2fd2': '龜', '\u2fd3': '龠',
}

def normalize_text(text):
    """将特殊兼容字符转换为标准字符"""
    result = []
    for char in text:
        if char in CHAR_MAP:
            result.append(CHAR_MAP[char])
        else:
            result.append(char)
    return ''.join(result)

def extract_bazi_cases(content, source_name):
    """提取八字命例"""
    # 先标准化文本
    normalized = normalize_text(content)
    
    cases = []
    
    # 模式1: 六X年XX月XX日XX时
    pattern1 = r'六([甲乙丙丁戊己庚辛壬癸])年([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])时'
    for match in re.finditer(pattern1, normalized):
        cases.append({
            'year_pillar': match.group(1) + '?',
            'month_pillar': match.group(2),
            'day_pillar': match.group(3),
            'hour_pillar': match.group(4),
            'day_master': match.group(3)[0],
            'month_branch': match.group(2)[1],
            'source': source_name,
            'original_text': match.group(0),
            'pattern': 'liunian'
        })
    
    # 模式2: 标准八字格式
    pattern2 = r'([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])时'
    for match in re.finditer(pattern2, normalized):
        text_match = match.group(0)
        if not any(c['original_text'] == text_match for c in cases):
            cases.append({
                'year_pillar': match.group(1),
                'month_pillar': match.group(2),
                'day_pillar': match.group(3),
                'hour_pillar': match.group(4),
                'day_master': match.group(3)[0],
                'month_branch': match.group(2)[1],
                'source': source_name,
                'original_text': text_match,
                'pattern': 'standard'
            })
    
    return cases

def main():
    # 读取文件
    file_path = os.path.join(DATA_DIR, '三命通会 ([明]万明英 撰  陈明  王胜恩 注释) (Z-Library).md')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取命例
    cases = extract_bazi_cases(content, '三命通会')
    
    # 保存结果
    result = {
        'timestamp': datetime.now().isoformat(),
        'total': len(cases),
        'cases': cases
    }
    
    with open('extracted_special.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # 导入数据库
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
    
    # 写入摘要
    with open('extraction_special_summary.txt', 'w', encoding='utf-8') as f:
        f.write(f"提取完成\n")
        f.write(f"找到命例: {len(cases)}\n")
        f.write(f"导入数据库: {imported}\n")
        
        dm_count = {}
        for case in cases:
            dm = case['day_master']
            dm_count[dm] = dm_count.get(dm, 0) + 1
        
        f.write(f"\n日干分布:\n")
        for dm, count in sorted(dm_count.items(), key=lambda x: -x[1]):
            f.write(f"  {dm}: {count}\n")

if __name__ == '__main__':
    main()
