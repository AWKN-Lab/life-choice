#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库清理脚本 - 修复命例数据库质量问题
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db'

def get_db_stats():
    """获取数据库统计信息"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    stats = {}
    
    # 总记录数
    cursor.execute('SELECT COUNT(*) FROM basic_info')
    stats['total'] = cursor.fetchone()[0]
    
    # 日干为空的记录
    cursor.execute('''
        SELECT COUNT(*) FROM bazi_dayun 
        WHERE day_master IS NULL OR day_master = ''
    ''')
    stats['null_day_master'] = cursor.fetchone()[0]
    
    # 四柱不完整的记录
    cursor.execute('''
        SELECT COUNT(*) FROM bazi_dayun 
        WHERE year_pillar IS NULL OR month_pillar IS NULL 
           OR day_pillar IS NULL OR hour_pillar IS NULL
    ''')
    stats['incomplete_bazi'] = cursor.fetchone()[0]
    
    # 按来源统计
    cursor.execute('SELECT source, COUNT(*) FROM metadata GROUP BY source')
    stats['by_source'] = cursor.fetchall()
    
    # 查找重复（按四柱）
    cursor.execute('''
        SELECT year_pillar, month_pillar, day_pillar, hour_pillar, COUNT(*) as cnt
        FROM bazi_dayun
        WHERE year_pillar IS NOT NULL
        GROUP BY year_pillar, month_pillar, day_pillar, hour_pillar
        HAVING cnt > 1
    ''')
    stats['duplicates'] = cursor.fetchall()
    
    conn.close()
    return stats

def remove_duplicates():
    """删除重复记录，保留最早的一条"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 找出重复的四柱组合
    cursor.execute('''
        SELECT year_pillar, month_pillar, day_pillar, hour_pillar
        FROM bazi_dayun
        WHERE year_pillar IS NOT NULL
        GROUP BY year_pillar, month_pillar, day_pillar, hour_pillar
        HAVING COUNT(*) > 1
    ''')
    
    duplicates = cursor.fetchall()
    removed = 0
    
    for year, month, day, hour in duplicates:
        # 保留ID最小的一条，删除其余的
        cursor.execute('''
            SELECT id FROM bazi_dayun
            WHERE year_pillar = ? AND month_pillar = ? AND day_pillar = ? AND hour_pillar = ?
            ORDER BY id
        ''', (year, month, day, hour))
        
        ids = [r[0] for r in cursor.fetchall()]
        keep_id = ids[0]
        delete_ids = ids[1:]
        
        for del_id in delete_ids:
            # 删除关联表数据
            cursor.execute('DELETE FROM bazi_dayun WHERE id = ?', (del_id,))
            cursor.execute('DELETE FROM analysis WHERE id = ?', (del_id,))
            cursor.execute('DELETE FROM life_events WHERE id = ?', (del_id,))
            cursor.execute('DELETE FROM metadata WHERE id = ?', (del_id,))
            cursor.execute('DELETE FROM basic_info WHERE id = ?', (del_id,))
            removed += 1
    
    conn.commit()
    conn.close()
    return removed

def remove_invalid_records():
    """删除无效记录（日干为空或四柱不完整）"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 找出无效记录ID
    cursor.execute('''
        SELECT b.id FROM basic_info b
        LEFT JOIN bazi_dayun bd ON b.id = bd.id
        WHERE bd.day_master IS NULL 
           OR bd.year_pillar IS NULL 
           OR bd.month_pillar IS NULL
           OR bd.day_pillar IS NULL
           OR bd.hour_pillar IS NULL
    ''')
    
    invalid_ids = [r[0] for r in cursor.fetchall()]
    removed = 0
    
    for id in invalid_ids:
        cursor.execute('DELETE FROM bazi_dayun WHERE id = ?', (id,))
        cursor.execute('DELETE FROM analysis WHERE id = ?', (id,))
        cursor.execute('DELETE FROM life_events WHERE id = ?', (id,))
        cursor.execute('DELETE FROM metadata WHERE id = ?', (id,))
        cursor.execute('DELETE FROM basic_info WHERE id = ?', (id,))
        removed += 1
    
    conn.commit()
    conn.close()
    return removed

def standardize_sources():
    """标准化来源名称"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 来源名称映射
    source_mapping = {
        '八字基础数据知识库.md': '八字基础数据知识库',
        '三命通会.md': '三命通会',
        '大六壬指南.md': '大六壬指南',
        '六壬毕法赋.md': '六壬毕法赋',
        '六壬神煞总览.md': '六壬神煞总览',
        '六壬起课基础规则库.md': '六壬起课基础规则库',
        '《大六壬指南》分类占断纲要.md': '大六壬指南',
        '节气月将对照表.md': '节气月将对照表',
    }
    
    updated = 0
    for old, new in source_mapping.items():
        cursor.execute('UPDATE metadata SET source = ? WHERE source = ?', (new, old))
        updated += cursor.rowcount
    
    conn.commit()
    conn.close()
    return updated

def main():
    print("=" * 60)
    print("命例数据库清理工具")
    print("=" * 60)
    
    # 清理前统计
    print("\n【清理前统计】")
    stats = get_db_stats()
    print(f"总记录数: {stats['total']}")
    print(f"日干为空: {stats['null_day_master']}")
    print(f"四柱不完整: {stats['incomplete_bazi']}")
    print(f"重复四柱组合: {len(stats['duplicates'])}")
    
    # 执行清理
    print("\n【执行清理】")
    
    print("\n1. 删除重复记录...")
    dup_removed = remove_duplicates()
    print(f"   删除 {dup_removed} 条重复记录")
    
    print("\n2. 删除无效记录...")
    inv_removed = remove_invalid_records()
    print(f"   删除 {inv_removed} 条无效记录")
    
    print("\n3. 标准化来源名称...")
    src_updated = standardize_sources()
    print(f"   更新 {src_updated} 条来源记录")
    
    # 清理后统计
    print("\n【清理后统计】")
    stats = get_db_stats()
    print(f"总记录数: {stats['total']}")
    print(f"日干为空: {stats['null_day_master']}")
    print(f"四柱不完整: {stats['incomplete_bazi']}")
    print(f"重复四柱组合: {len(stats['duplicates'])}")
    
    print("\n" + "=" * 60)
    print("清理完成!")
    print("=" * 60)

if __name__ == '__main__':
    main()
