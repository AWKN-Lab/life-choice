import sqlite3, os, glob

db_files = glob.glob('c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/knowledge-base/database/*.db')
for db_path in db_files:
    print(f'\n===== {os.path.basename(db_path)} =====')
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f'Tables: {[t[0] for t in tables]}')
        for t in tables:
            tname = t[0]
            cursor.execute(f'PRAGMA table_info({tname})')
            cols = cursor.fetchall()
            col_names = [c[1] for c in cols]
            print(f'  {tname}: {col_names}')
            try:
                cursor.execute(f'SELECT COUNT(*) FROM {tname}')
                count = cursor.fetchone()[0]
                print(f'  Count: {count}')
                if count > 0 and tname != 'sqlite_sequence':
                    cursor.execute(f'SELECT * FROM {tname} LIMIT 1')
                    row = cursor.fetchone()
                    if row:
                        print(f'  Sample: {dict(zip(col_names, row))}')
            except Exception as e:
                print(f'  Error reading: {e}')
        conn.close()
    except Exception as e:
        print(f'Error: {e}')
