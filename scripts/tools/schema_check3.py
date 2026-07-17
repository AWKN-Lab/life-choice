import sqlite3
import os

db_dir = r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\knowledge-base\vector'

for f in os.listdir(db_dir):
    if f.endswith('.sqlite3'):
        db_path = os.path.join(db_dir, f)
        print(f'\n=== {f} ===')
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f'Tables: {[t[0] for t in tables]}')
            for table in tables:
                cursor.execute(f'PRAGMA table_info({table[0]})')
                cols = cursor.fetchall()
                print(f'\n  [{table[0]}]')
                for col in cols:
                    print(f'    {col[1]}: {col[2]}')
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM {table[0]}')
                    count = cursor.fetchone()[0]
                    print(f'  Rows: {count}')
                except: pass
            conn.close()
        except Exception as e:
            print(f'Error: {e}')