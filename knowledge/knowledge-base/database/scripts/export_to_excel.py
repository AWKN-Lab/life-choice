#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导出命例数据库为 Excel/CSV 格式
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime


def export_to_excel(db_path, output_dir):
    """导出为 Excel 文件"""
    try:
        import pandas as pd
    except ImportError:
        print("⚠️  未安装 pandas，请先运行：pip install pandas openpyxl")
        return False
    
    conn = sqlite3.connect(db_path)
    
    # 使用 full_examples 视图
    df = pd.read_sql_query("SELECT * FROM full_examples", conn)
    
    # 转换 JSON 字段为字符串
    for col in ['liked_gods', 'used_gods']:
        df[col] = df[col].apply(lambda x: ', '.join(json.loads(x)) if x else '')
    
    # 保存为 Excel
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    excel_file = output_dir / f"mingli_examples_{timestamp}.xlsx"
    df.to_excel(excel_file, index=False, sheet_name='命例数据')
    
    print(f"✅ Excel 已导出：{excel_file}")
    
    # 同时导出 CSV
    csv_file = output_dir / f"mingli_examples_{timestamp}.csv"
    df.to_csv(csv_file, index=False, encoding='utf-8-sig')
    print(f"✅ CSV 已导出：{csv_file}")
    
    conn.close()
    return True


def export_to_simple_csv(db_path, output_dir):
    """导出为简化版 CSV（仅核心字段）"""
    try:
        import pandas as pd
    except ImportError:
        print("⚠️  未安装 pandas")
        return False
    
    conn = sqlite3.connect(db_path)
    
    # 使用 full_examples 视图
    df = pd.read_sql_query("SELECT id, name, gender, year_pillar, month_pillar, day_pillar, hour_pillar, day_master, pattern, strong_weak, source, confidence FROM full_examples", conn)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_file = output_dir / f"mingli_simple_{timestamp}.csv"
    df.to_csv(csv_file, index=False, encoding='utf-8-sig')
    print(f"✅ 简化版 CSV 已导出：{csv_file}")
    
    conn.close()
    return True


def main():
    """主函数"""
    print("="*60)
    print("命例数据库 - Excel/CSV 导出工具")
    print("="*60)
    
    # 路径
    db_path = Path(__file__).parent.parent / "mingli.db"
    output_dir = Path(__file__).parent.parent / "export"
    
    if not db_path.exists():
        print("❌ 数据库不存在")
        return
    
    # 创建导出目录
    output_dir.mkdir(exist_ok=True)
    
    print(f"\n📊 数据库：{db_path}")
    print(f"📁 导出目录：{output_dir}")
    
    # 导出完整版
    print("\n📝 导出完整版（Excel + CSV）...")
    export_to_excel(db_path, output_dir)
    
    # 导出简化版
    print("\n📝 导出简化版（CSV）...")
    export_to_simple_csv(db_path, output_dir)
    
    print("\n" + "="*60)
    print("✅ 导出完成！")
    print("="*60)


if __name__ == '__main__':
    main()
