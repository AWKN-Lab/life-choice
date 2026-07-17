#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
子平命例数据库 - 命例提取脚本
功能：从《命理金鉴》等典籍中提取命例
"""

import re
import json
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime


class MingliExtractor:
    """命例提取器"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.cursor = self.conn.cursor()
        
        # 正则表达式模式
        self.patterns = {
            # 八字提取（四个干支）
            'bazi': r'([甲 - 癸][子 - 亥])\s+([甲 - 癸][子 - 亥])\s+([甲 - 癸][子 - 亥])\s+([甲 - 癸][子 - 亥])',
            
            # 大运提取
            'dayun': r'大运 [:：]?\s*([甲 - 癸][子 - 亥][\s 甲 - 癸子 - 亥]+)',
            
            # 年份提取
            'year': r'(\d{4}) 年 |(\d{2,3}) 岁',
            
            # 格局提取
            'pattern': r'([正偏]?[官杀印财食伤][格])',
        }
        
        # 统计信息
        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0
        }
    
    def extract_bazi(self, text: str) -> Optional[Dict]:
        """提取八字"""
        match = re.search(self.patterns['bazi'], text)
        if match:
            return {
                'year_pillar': match.group(1),
                'month_pillar': match.group(2),
                'day_pillar': match.group(3),
                'hour_pillar': match.group(4),
                'day_master': match.group(3)[0]  # 日干
            }
        return None
    
    def extract_dayun(self, text: str) -> Optional[List[str]]:
        """提取大运"""
        match = re.search(self.patterns['dayun'], text)
        if match:
            dayun_text = match.group(1)
            # 提取所有干支
            dayun_list = re.findall(r'([甲 - 癸][子 - 亥])', dayun_text)
            return dayun_list[:8]  # 通常 8 步大运
        return None
    
    def insert_example(self, example_data: Dict) -> bool:
        """
        插入命例到数据库
        
        Args:
            example_data: 命例数据字典
        
        Returns:
            bool: 是否成功
        """
        try:
            self.conn.execute("BEGIN TRANSACTION")
            
            # 1. 插入基础信息
            basic = example_data.get('basic_info', {})
            self.cursor.execute("""
                INSERT INTO basic_info 
                (name, gender, birth_date, birth_time, birth_location)
                VALUES (?, ?, ?, ?, ?)
            """, (
                basic.get('name'),
                basic.get('gender'),
                basic.get('birth_date'),
                basic.get('birth_time'),
                basic.get('birth_location')
            ))
            
            example_id = self.cursor.lastrowid
            
            # 2. 插入八字大运
            bazi = example_data.get('bazi_dayun', {})
            da_yun_json = json.dumps(bazi.get('da_yun', []), ensure_ascii=False)
            
            self.cursor.execute("""
                INSERT INTO bazi_dayun 
                (id, year_pillar, month_pillar, day_pillar, hour_pillar, 
                 day_master, yun_sex, yun_start_age, da_yun)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                example_id,
                bazi.get('year_pillar'),
                bazi.get('month_pillar'),
                bazi.get('day_pillar'),
                bazi.get('hour_pillar'),
                bazi.get('day_master'),
                bazi.get('yun_sex'),
                bazi.get('yun_start_age'),
                da_yun_json
            ))
            
            # 3. 插入命局分析
            analysis = example_data.get('analysis', {})
            liked_gods_json = json.dumps(analysis.get('liked_gods', []), ensure_ascii=False)
            used_gods_json = json.dumps(analysis.get('used_gods', []), ensure_ascii=False)
            disliked_gods_json = json.dumps(analysis.get('disliked_gods', []), ensure_ascii=False)
            energy_audit_json = json.dumps(analysis.get('energy_audit', {}), ensure_ascii=False)
            
            self.cursor.execute("""
                INSERT INTO analysis 
                (id, pattern, strong_weak, liked_gods, used_gods, disliked_gods, 
                 special_features, energy_audit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                example_id,
                analysis.get('pattern'),
                analysis.get('strong_weak'),
                liked_gods_json,
                used_gods_json,
                disliked_gods_json,
                analysis.get('special_features'),
                energy_audit_json
            ))
            
            # 4. 插入人生事件
            events = example_data.get('life_events', {})
            key_events_json = json.dumps(events.get('key_events', []), ensure_ascii=False)
            
            self.cursor.execute("""
                INSERT INTO life_events 
                (id, key_events, lifespan, wealth_level, official_rank, 
                 marriage_desc, offspring_desc, final_comment)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                example_id,
                key_events_json,
                events.get('lifespan'),
                events.get('wealth_level'),
                events.get('official_rank'),
                events.get('marriage_desc'),
                events.get('offspring_desc'),
                events.get('final_comment')
            ))
            
            # 5. 插入元数据
            metadata = example_data.get('metadata', {})
            self.cursor.execute("""
                INSERT INTO metadata 
                (id, source, original_text, confidence, extracted_date, extractor)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                example_id,
                metadata.get('source'),
                metadata.get('original_text'),
                metadata.get('confidence', 3),
                metadata.get('extracted_date', datetime.now().strftime('%Y-%m-%d')),
                metadata.get('extractor', '天师')
            ))
            
            self.conn.commit()
            self.stats['success'] += 1
            return True
            
        except Exception as e:
            self.conn.rollback()
            print(f"❌ 插入失败：{str(e)}")
            self.stats['failed'] += 1
            return False
    
    def close(self):
        """关闭数据库连接"""
        self.conn.close()
    
    def print_stats(self):
        """打印统计信息"""
        print(f"\n{'='*60}")
        print(f"提取统计")
        print(f"{'='*60}")
        print(f"总计：{self.stats['total']}")
        print(f"成功：{self.stats['success']}")
        print(f"失败：{self.stats['failed']}")
        print(f"{'='*60}\n")


def main():
    """主函数"""
    print("="*60)
    print("子平命例数据库 - 命例提取工具")
    print("="*60)
    
    # 数据库路径
    db_path = Path(__file__).parent.parent / "mingli.db"
    
    if not db_path.exists():
        print("❌ 数据库不存在，请先运行 create_db.py 创建数据库")
        return
    
    # 创建提取器
    extractor = MingliExtractor(str(db_path))
    
    # 示例：手动录入《命理金鉴》甲木第一例
    example_data = {
        'basic_info': {
            'name': '甲木例 1',
            'gender': '男',
            'birth_time': '卯时'
        },
        'bazi_dayun': {
            'year_pillar': '辛未',
            'month_pillar': '甲午',
            'day_pillar': '甲寅',
            'hour_pillar': '丁卯',
            'day_master': '甲',
            'yun_sex': '阴男',
            'yun_start_age': 5.0,
            'da_yun': ['癸巳', '壬辰', '辛卯', '庚寅', '己丑', '戊子', '丁亥', '丙戌']
        },
        'analysis': {
            'pattern': '木火通明',
            'strong_weak': '身弱',
            'liked_gods': ['水', '木'],
            'used_gods': ['水'],
            'disliked_gods': ['火', '土'],
            'special_features': '木火通明格'
        },
        'life_events': {
            'key_events': [
                {'age': '髫龄', 'event': '名欲速而不达'},
                {'age': '中年', 'event': '遇来大运，悉属用神，锦境格顾，名游泮水'}
            ],
            'wealth_level': '中富'
        },
        'metadata': {
            'source': '命理金鉴',
            'original_text': '辛未 甲午 甲寅 丁卯。甲木日元，系乔松之质...',
            'confidence': 5,
            'extractor': '天师'
        }
    }
    
    # 插入示例命例
    print("\n提取命例：《命理金鉴》甲木第一例")
    success = extractor.insert_example(example_data)
    
    if success:
        print("✅ 提取成功！")
    else:
        print("❌ 提取失败")
    
    # 打印统计
    extractor.print_stats()
    
    # 关闭连接
    extractor.close()
    
    print("下一步：运行 query_examples.py 查询命例")
    print("="*60)


if __name__ == '__main__':
    main()
