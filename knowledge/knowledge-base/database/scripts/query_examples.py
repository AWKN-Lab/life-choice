#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
子平命例数据库 - 查询脚本
功能：查询、检索命例
"""

import sqlite3
import json
from pathlib import Path
from typing import Dict, List, Optional


class MingliQuery:
    """命例查询器"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row  # 返回字典格式
        self.cursor = self.conn.cursor()
    
    def query_by_day_master(self, day_master: str) -> List[Dict]:
        """按日干查询"""
        self.cursor.execute("""
            SELECT * FROM full_examples
            WHERE day_master = ?
            ORDER BY id
        """, (day_master,))
        
        return [dict(row) for row in self.cursor.fetchall()]
    
    def query_by_pattern(self, pattern: str) -> List[Dict]:
        """按格局查询"""
        self.cursor.execute("""
            SELECT * FROM full_examples
            WHERE pattern = ?
            ORDER BY id
        """, (pattern,))
        
        return [dict(row) for row in self.cursor.fetchall()]
    
    def query_by_source(self, source: str) -> List[Dict]:
        """按来源典籍查询"""
        self.cursor.execute("""
            SELECT * FROM full_examples
            WHERE source = ?
            ORDER BY id
        """, (source,))
        
        return [dict(row) for row in self.cursor.fetchall()]
    
    def query_advanced(self, **kwargs) -> List[Dict]:
        """高级查询"""
        conditions = []
        params = []
        
        if 'day_master' in kwargs:
            conditions.append("day_master = ?")
            params.append(kwargs['day_master'])
        
        if 'pattern' in kwargs:
            conditions.append("pattern = ?")
            params.append(kwargs['pattern'])
        
        if 'strong_weak' in kwargs:
            conditions.append("strong_weak = ?")
            params.append(kwargs['strong_weak'])
        
        if 'source' in kwargs:
            conditions.append("source = ?")
            params.append(kwargs['source'])
        
        if 'gender' in kwargs:
            conditions.append("gender = ?")
            params.append(kwargs['gender'])
        
        if conditions:
            where_clause = " AND ".join(conditions)
            query = f"SELECT * FROM full_examples WHERE {where_clause} ORDER BY id"
        else:
            query = "SELECT * FROM full_examples ORDER BY id LIMIT 10"
        
        self.cursor.execute(query, params)
        return [dict(row) for row in self.cursor.fetchall()]
    
    def get_example_detail(self, example_id: int) -> Optional[Dict]:
        """获取命例详情"""
        self.cursor.execute("""
            SELECT b.*, bd.*, a.*, le.*, m.*
            FROM basic_info b
            JOIN bazi_dayun bd ON b.id = bd.id
            JOIN analysis a ON b.id = a.id
            JOIN life_events le ON b.id = le.id
            JOIN metadata m ON b.id = m.id
            WHERE b.id = ?
        """, (example_id,))
        
        row = self.cursor.fetchone()
        if row:
            return dict(row)
        return None
    
    def get_statistics(self) -> Dict:
        """获取统计信息"""
        stats = {}
        
        # 总数
        self.cursor.execute("SELECT COUNT(*) FROM basic_info")
        stats['total'] = self.cursor.fetchone()[0]
        
        # 按日干统计
        self.cursor.execute("""
            SELECT day_master, COUNT(*) as count 
            FROM bazi_dayun 
            GROUP BY day_master
        """)
        stats['by_day_master'] = {row['day_master']: row['count'] for row in self.cursor.fetchall()}
        
        # 按格局统计
        self.cursor.execute("""
            SELECT pattern, COUNT(*) as count 
            FROM analysis 
            WHERE pattern IS NOT NULL
            GROUP BY pattern
        """)
        stats['by_pattern'] = {row['pattern']: row['count'] for row in self.cursor.fetchall()}
        
        # 按来源统计
        self.cursor.execute("""
            SELECT source, COUNT(*) as count 
            FROM metadata 
            GROUP BY source
        """)
        stats['by_source'] = {row['source']: row['count'] for row in self.cursor.fetchall()}
        
        return stats
    
    def export_to_json(self, output_path: str, examples: List[Dict]):
        """导出为 JSON"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(examples, f, ensure_ascii=False, indent=2)
    
    def close(self):
        """关闭连接"""
        self.conn.close()


def main():
    """主函数"""
    print("="*60)
    print("子平命例数据库 - 查询工具")
    print("="*60)
    
    # 数据库路径
    db_path = Path(__file__).parent.parent / "mingli.db"
    
    if not db_path.exists():
        print("❌ 数据库不存在，请先运行 create_db.py 创建数据库")
        return
    
    # 创建查询器
    query = MingliQuery(str(db_path))
    
    # 1. 显示统计信息
    print("\n【数据库统计】")
    stats = query.get_statistics()
    print(f"总命例数：{stats['total']}")
    print(f"\n按日干分布:")
    for dm, count in stats['by_day_master'].items():
        print(f"  {dm}: {count}条")
    print(f"\n按格局分布:")
    for pattern, count in list(stats['by_pattern'].items())[:5]:
        print(f"  {pattern}: {count}条")
    
    # 2. 查询示例
    print("\n【查询示例】")
    
    # 查询所有甲木日主
    print("\n查询：甲木日主")
    examples = query.query_by_day_master('甲')
    for ex in examples:
        print(f"  ID:{ex['id']} - {ex['name']} - {ex['year_pillar']} {ex['month_pillar']} {ex['day_pillar']} {ex['hour_pillar']}")
    
    # 高级查询
    print("\n查询：身弱的木火通明格")
    examples = query.query_advanced(day_master='甲', pattern='木火通明', strong_weak='身弱')
    for ex in examples:
        print(f"  ID:{ex['id']} - {ex['name']} - 喜用：{ex['liked_gods']}")
    
    # 3. 导出 JSON
    print("\n导出：所有命例到 JSON")
    all_examples = query.query_advanced()
    output_path = Path(__file__).parent.parent / "export" / "mingli_examples.json"
    query.export_to_json(str(output_path), all_examples)
    print(f"✅ 已导出到：{output_path}")
    
    # 关闭连接
    query.close()
    
    print("\n" + "="*60)
    print("查询完成！")
    print("="*60)


if __name__ == '__main__':
    main()
