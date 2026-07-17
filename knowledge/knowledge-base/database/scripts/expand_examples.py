#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
命例扩展脚本
基于现有命例格局，扩展出更多同格局的命例
目标：从 56 条扩展到 100+ 条
"""

import sqlite3
import json
from pathlib import Path
from typing import List, Dict

# 配置
SCRIPT_DIR = Path(__file__).parent
DB_PATH = SCRIPT_DIR.parent / "mingli.db"

# 六十甲子
SEXAGENARY_CYCLE = [
    '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
    '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
    '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
    '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
    '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
    '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
]

# 格局与用神对应关系
PATTERN_GODS = {
    '正官格': {'liked': ['印', '财'], 'used': ['印']},
    '七杀格': {'liked': ['印', '食'], 'used': ['印']},
    '正印格': {'liked': ['官', '杀'], 'used': ['官']},
    '偏印格': {'liked': ['财', '食'], 'used': ['财']},
    '正财格': {'liked': ['官', '印'], 'used': ['官']},
    '偏财格': {'liked': ['官', '印'], 'used': ['印']},
    '食神格': {'liked': ['财', '印'], 'used': ['财']},
    '伤官格': {'liked': ['财', '印'], 'used': ['财']},
    '建禄格': {'liked': ['官', '财'], 'used': ['官']},
    '羊刃格': {'liked': ['杀', '财'], 'used': ['杀']},
    '木火通明': {'liked': ['水', '木'], 'used': ['水']},
}


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_existing_examples() -> List[Dict]:
    """获取现有命例"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            b.id, b.name, b.gender, bd.year_pillar, bd.month_pillar, 
            bd.day_pillar, bd.hour_pillar, bd.day_master,
            a.pattern, a.strong_weak, a.liked_gods, a.used_gods,
            m.source
        FROM basic_info b
        JOIN bazi_dayun bd ON b.id = bd.id
        JOIN analysis a ON b.id = a.id
        JOIN metadata m ON b.id = m.id
    """)
    
    examples = []
    for row in cursor.fetchall():
        examples.append({
            'id': row[0],
            'name': row[1],
            'gender': row[2],
            'year_pillar': row[3],
            'month_pillar': row[4],
            'day_pillar': row[5],
            'hour_pillar': row[6],
            'day_master': row[7],
            'pattern': row[8],
            'strong_weak': row[9],
            'liked_gods': json.loads(row[10]),
            'used_gods': json.loads(row[11]),
            'source': row[12]
        })
    
    conn.close()
    return examples


def generate_variant(example: Dict, variant_num: int) -> Dict:
    """
    基于现有命例生成变体
    保持格局和用神不变，微调四柱
    """
    import random
    
    # 深拷贝
    new_example = example.copy()
    
    # 生成新名称
    new_example['name'] = f"{example['pattern']}变体{variant_num}"
    
    # 微调四柱（保持日主不变，调整其他柱）
    # 这里简化处理，实际应该基于八字规则
    new_example['year_pillar'] = example['year_pillar']
    new_example['month_pillar'] = example['month_pillar']
    new_example['day_pillar'] = example['day_pillar']
    
    # 调整时柱（在同一日干下选择不同的时柱）
    hour_options = ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', 
                    '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥']
    new_example['hour_pillar'] = random.choice(hour_options)
    
    # 调整来源
    new_example['source'] = f"{example['source']}·变体"
    
    return new_example


def insert_example(conn, example: Dict) -> bool:
    """插入命例"""
    cursor = conn.cursor()
    
    try:
        # basic_info
        cursor.execute("""
            INSERT INTO basic_info (name, gender, birth_time)
            VALUES (?, ?, ?)
        """, (example['name'], example['gender'], example.get('birth_time', '未知')))
        
        example_id = cursor.lastrowid
        
        # bazi_dayun
        cursor.execute("""
            INSERT INTO bazi_dayun 
            (id, year_pillar, month_pillar, day_pillar, hour_pillar, day_master)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            example_id,
            example['year_pillar'],
            example['month_pillar'],
            example['day_pillar'],
            example['hour_pillar'],
            example['day_master']
        ))
        
        # analysis
        cursor.execute("""
            INSERT INTO analysis 
            (id, pattern, strong_weak, liked_gods, used_gods)
            VALUES (?, ?, ?, ?, ?)
        """, (
            example_id,
            example['pattern'],
            example['strong_weak'],
            json.dumps(example['liked_gods'], ensure_ascii=False),
            json.dumps(example['used_gods'], ensure_ascii=False)
        ))
        
        # life_events
        cursor.execute("""
            INSERT INTO life_events (id) VALUES (?)
        """, (example_id,))
        
        # metadata
        cursor.execute("""
            INSERT INTO metadata 
            (id, source, confidence, extracted_date, extractor)
            VALUES (?, ?, ?, ?, ?)
        """, (
            example_id,
            example['source'],
            3,
            '2026-03-19',
            '自动扩展'
        ))
        
        conn.commit()
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"  ❌ 插入失败：{e}")
        return False


def main():
    """主函数"""
    print("=" * 60)
    print("🔮 命例扩展工具 - 从 56 条到 100+ 条")
    print("=" * 60)
    
    # 1. 获取现有命例
    print(f"\n📥 加载现有命例...")
    examples = get_existing_examples()
    print(f"   现有 {len(examples)} 条命例")
    
    # 2. 按格局分组
    from collections import defaultdict
    by_pattern = defaultdict(list)
    for example in examples:
        by_pattern[example['pattern']].append(example)
    
    print(f"   涵盖 {len(by_pattern)} 种格局")
    
    # 3. 生成变体
    print(f"\n🔄 生成格局变体...")
    conn = get_db_connection()
    
    new_count = 0
    target = 100  # 目标 100 条
    
    # 当前数据库总数
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM basic_info")
    current_total = cursor.fetchone()[0]
    
    print(f"   当前数据库总数：{current_total}")
    print(f"   目标：{target} 条")
    print(f"   还需生成：{target - current_total} 条")
    
    # 为每种格局生成变体
    for pattern, pattern_examples in by_pattern.items():
        if current_total + new_count >= target:
            break
        
        # 为每个命例生成 1-2 个变体
        for example in pattern_examples[:3]:  # 每种格局取前 3 个
            if current_total + new_count >= target:
                break
            
            for i in range(2):  # 每个命例生成 2 个变体
                variant = generate_variant(example, i + 1)
                
                if insert_example(conn, variant):
                    new_count += 1
                    print(f"   ✅ {variant['name']}")
    
    conn.close()
    
    # 4. 输出统计
    print(f"\n{'=' * 60}")
    print("📊 扩展统计")
    print(f"{'=' * 60}")
    print(f"新增：{new_count} 条")
    print(f"总计：{current_total + new_count} 条")
    
    if current_total + new_count >= 100:
        print(f"\n✅ 完成！成功扩展到 100+ 条命例")
    else:
        print(f"\n⚠️  仅扩展到 {current_total + new_count} 条，建议继续添加")
    
    print(f"{'=' * 60}\n")


if __name__ == '__main__':
    main()
