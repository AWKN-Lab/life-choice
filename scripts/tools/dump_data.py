import sqlite3
import json
import os

# 导出 knowledge-base/mingli.db
print("=" * 60)
print("knowledge-base/mingli.db")
print("=" * 60)
conn = sqlite3.connect(r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\knowledge-base\mingli.db')
cursor = conn.cursor()

cursor.execute("SELECT * FROM basic_info LIMIT 3")
rows = cursor.fetchall()
cursor.execute("PRAGMA table_info(basic_info)")
cols = [c[1] for c in cursor.fetchall()]
print(f"\n[basic_info] 字段: {cols}")
for r in rows:
    print(json.dumps(dict(zip(cols, r)), ensure_ascii=False, indent=2))

cursor.execute("SELECT * FROM bazi_dayun LIMIT 3")
rows = cursor.fetchall()
cursor.execute("PRAGMA table_info(bazi_dayun)")
cols = [c[1] for c in cursor.fetchall()]
print(f"\n[bazi_dayun] 字段: {cols}")
for r in rows:
    print(json.dumps(dict(zip(cols, r)), ensure_ascii=False, indent=2))

cursor.execute("SELECT * FROM analysis LIMIT 3")
rows = cursor.fetchall()
cursor.execute("PRAGMA table_info(analysis)")
cols = [c[1] for c in cursor.fetchall()]
print(f"\n[analysis] 字段: {cols}")
for r in rows:
    print(json.dumps(dict(zip(cols, r)), ensure_ascii=False, indent=2))
conn.close()

# 导出 knowledge-base/database/liuren.db
print("\n" + "=" * 60)
print("knowledge-base/database/liuren.db")
print("=" * 60)
conn = sqlite3.connect(r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\knowledge-base\database\liuren.db')
cursor = conn.cursor()

for table in ['gan_ji_gong', 'jiu_zong_men', 'tian_jiang', 'liuren_shensha']:
    cursor.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [c[1] for c in cursor.fetchall()]
    print(f"\n[{table}] 字段: {cols}, 数据量: {len(rows)}")
    for r in rows[:5]:
        print(json.dumps(dict(zip(cols, r)), ensure_ascii=False, indent=2))
conn.close()