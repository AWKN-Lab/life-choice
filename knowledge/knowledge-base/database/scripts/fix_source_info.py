#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
命例来源信息修复脚本
"""

import sqlite3
import re

DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db'

# 来源推断规则（从name或birth_location推断）
SOURCE_RULES = [
    (r'三命通会', '三命通会'),
    (r'滴天髓', '滴天髓阐微'),
    (r'神峰', '神峰通考'),
    (r'金鉴', '命理金鉴'),
    (r'穷通', '穷通宝鉴'),
    (r'渊海', '渊海子平'),
    (r'子平真诠', '子平真诠'),
    (r'袁氏', '袁氏命谱'),
    (r'探原', '命理探原'),
    (r'千里', '千里命稿'),
    (r'吕文艺', '吕文艺八字命理'),
]

def infer_source_from_name(name):
    """从命例名称推断来源"""
    if not name:
        return None
    
    for pattern, source in SOURCE_RULES:
        if re.search(pattern, name):
            return source
    
    return None

def main():
    print("=" * 70)
    print("命例来源信息修复工具")
    print("=" * 70)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 统计当前来源情况
    cursor.execute('SELECT COUNT(*) FROM metadata WHERE source IS NOT NULL')
    has_source = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM metadata')
    total = cursor.fetchone()[0]
    
    print(f"\n【当前统计】")
    print(f"总记录: {total}")
    print(f"有来源: {has_source}")
    print(f"来源完整率: {has_source/total*100:.1f}%" if total > 0 else "N/A")
    
    # 获取无来源的记录
    cursor.execute('''
        SELECT m.id, b.name, m.source 
        FROM metadata m
        JOIN basic_info b ON m.id = b.id
        WHERE m.source IS NULL OR m.source = ''
    ''')
    
    no_source_records = cursor.fetchall()
    print(f"\n待修复记录: {len(no_source_records)}")
    
    # 修复来源
    updated = 0
    failed = 0
    source_stats = {}
    
    for record_id, name, current_source in no_source_records:
        inferred = infer_source_from_name(name)
        
        if inferred:
            try:
                cursor.execute('UPDATE metadata SET source = ? WHERE id = ?', (inferred, record_id))
                updated += 1
                source_stats[inferred] = source_stats.get(inferred, 0) + 1
            except Exception as e:
                failed += 1
                print(f"  更新失败 ID {record_id}: {e}")
    
    conn.commit()
    
    # 最终统计
    cursor.execute('SELECT COUNT(*) FROM metadata WHERE source IS NOT NULL')
    final_has_source = cursor.fetchone()[0]
    
    print(f"\n【处理结果】")
    print(f"修复记录: {updated}")
    print(f"失败: {failed}")
    print(f"新来源完整率: {final_has_source/total*100:.1f}%" if total > 0 else "N/A")
    
    print(f"\n【来源分布】")
    for source, count in sorted(source_stats.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count}")
    
    # 清理非命理来源
    print(f"\n【清理非命理来源】")
    non_mingli_sources = ['六壬毕法赋', '六壬神煞总览', '六壬起课基础规则库', 
                          '大六壬指南', '节气月将对照表']
    
    deleted = 0
    for source in non_mingli_sources:
        cursor.execute('SELECT id FROM metadata WHERE source = ?', (source,))
        ids_to_delete = [r[0] for r in cursor.fetchall()]
        
        for id in ids_to_delete:
            cursor.execute('DELETE FROM bazi_dayun WHERE id = ?', (id,))
            cursor.execute('DELETE FROM analysis WHERE id = ?', (id,))
            cursor.execute('DELETE FROM life_events WHERE id = ?', (id,))
            cursor.execute('DELETE FROM metadata WHERE id = ?', (id,))
            cursor.execute('DELETE FROM basic_info WHERE id = ?', (id,))
            deleted += 1
    
    conn.commit()
    print(f"清理非命理记录: {deleted}")
    
    conn.close()
    
    print("\n" + "=" * 70)
    print("处理完成!")
    print("=" * 70)

if __name__ == '__main__':
    main()
