#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版PDF提取脚本（无需OCR）
处理可提取文本的PDF和已有文本文件
"""

import os
import sys
import json
import re
import sqlite3
from pathlib import Path
from datetime import datetime

# 配置
DATA_DIR = r"C:\Users\10919\Desktop\AI\玄学data"
DB_PATH = r"c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db"

def log(message, level="INFO"):
    """打印日志"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")

def extract_bazi_cases(text, source_name):
    """从文本中提取八字命例"""
    cases = []
    
    # 模式1: 六X年XX月XX日XX时
    pattern1 = r'六([甲乙丙丁戊己庚辛壬癸])年([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])时'
    for match in re.finditer(pattern1, text):
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
    for match in re.finditer(pattern2, text):
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
    
    # 模式3: 乾造/坤造格式
    pattern3 = r'([乾坤])造[：:]\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])'
    for match in re.finditer(pattern3, text):
        gender = '男' if match.group(1) == '乾' else '女'
        cases.append({
            'year_pillar': match.group(2),
            'month_pillar': match.group(3),
            'day_pillar': match.group(4),
            'hour_pillar': match.group(5),
            'day_master': match.group(4)[0],
            'month_branch': match.group(3)[1],
            'gender': gender,
            'source': source_name,
            'original_text': match.group(0),
            'pattern': 'gender'
        })
    
    return cases

def process_md_files():
    """处理Markdown文件"""
    log("="*60)
    log("处理Markdown文件")
    log("="*60)
    
    md_files = list(Path(DATA_DIR).glob("*.md"))
    log(f"找到 {len(md_files)} 个Markdown文件")
    
    all_cases = []
    
    for md_file in md_files:
        log(f"处理: {md_file.name}")
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            cases = extract_bazi_cases(content, md_file.name)
            log(f"  找到 {len(cases)} 个命例")
            all_cases.extend(cases)
            
        except Exception as e:
            log(f"  错误: {e}", "ERROR")
    
    return all_cases

def process_docx_files():
    """处理Word文档"""
    log("="*60)
    log("处理Word文档")
    log("="*60)
    
    try:
        import docx
    except ImportError:
        log("安装python-docx...")
        os.system("pip install python-docx")
        import docx
    
    docx_files = list(Path(DATA_DIR).glob("*.docx"))
    # 过滤非命理文件
    keywords = ["滴天髓", "穷通宝鉴", "神峰通考", "三命通会", "渊海子平", 
                "子平真诠", "命理", "八字", "命理金鉴", "吕文艺"]
    mingli_docs = [f for f in docx_files if any(kw in f.name for kw in keywords)]
    
    log(f"找到 {len(mingli_docs)} 个命理相关Word文档")
    
    all_cases = []
    
    for doc_file in mingli_docs[:3]:  # 限制处理数量
        log(f"处理: {doc_file.name}")
        try:
            doc = docx.Document(doc_file)
            full_text = "\n".join([para.text for para in doc.paragraphs])
            
            cases = extract_bazi_cases(full_text, doc_file.name)
            log(f"  找到 {len(cases)} 个命例")
            all_cases.extend(cases)
            
        except Exception as e:
            log(f"  错误: {e}", "ERROR")
    
    return all_cases

def import_to_database(cases):
    """导入命例到数据库"""
    log("="*60)
    log("导入数据到数据库")
    log("="*60)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    imported = 0
    skipped = 0
    
    for case in cases:
        try:
            # 检查是否已存在
            cursor.execute('''
                SELECT id FROM basic_info 
                WHERE birth_location LIKE ?
            ''', (f"%{case['day_pillar']}%",))
            
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
                case.get('gender', '男'),
                None,
                case['hour_pillar'][1] + '时' if len(case['hour_pillar']) >= 2 else None,
                f"四柱:{case.get('year_pillar','')},{case['month_pillar']},{case['day_pillar']},{case['hour_pillar']}",
                f"日干:{case['day_master']},月令:{case['month_branch']}"
            ))
            imported += 1
            
        except Exception as e:
            log(f"导入失败: {e}", "WARNING")
    
    conn.commit()
    conn.close()
    
    log(f"导入统计: 新导入 {imported} 个，跳过 {skipped} 个重复")
    return imported

def save_cases_to_json(cases):
    """保存命例到JSON文件"""
    output_file = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\extracted_cases_auto.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
    
    log(f"命例已保存到: {output_file}")
    return output_file

def generate_report(cases, imported):
    """生成报告"""
    log("="*60)
    log("处理完成！")
    log("="*60)
    
    # 统计日干分布
    day_master_count = {}
    for case in cases:
        dm = case['day_master']
        day_master_count[dm] = day_master_count.get(dm, 0) + 1
    
    log(f"\n总共找到 {len(cases)} 个命例")
    log(f"成功导入 {imported} 个新命例")
    
    log("\n日干分布:")
    for dm, count in sorted(day_master_count.items(), key=lambda x: -x[1]):
        log(f"  {dm}: {count}")
    
    # 保存报告
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_cases': len(cases),
        'imported_cases': imported,
        'day_master_distribution': day_master_count
    }
    
    report_file = f"extraction_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    log(f"\n报告已保存: {report_file}")

def main():
    """主函数"""
    print("="*60)
    print("自动提取和导入系统")
    print("="*60)
    
    all_cases = []
    
    # 处理Markdown文件
    md_cases = process_md_files()
    all_cases.extend(md_cases)
    
    # 处理Word文档
    docx_cases = process_docx_files()
    all_cases.extend(docx_cases)
    
    log(f"\n总共找到 {len(all_cases)} 个命例")
    
    if all_cases:
        # 保存到JSON
        save_cases_to_json(all_cases)
        
        # 导入数据库
        imported = import_to_database(all_cases)
        
        # 生成报告
        generate_report(all_cases, imported)
    else:
        log("没有找到命例", "WARNING")

if __name__ == '__main__':
    main()
