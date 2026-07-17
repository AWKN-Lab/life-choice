import sqlite3
conn = sqlite3.connect('mingli.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables:', tables)
for t in tables:
    tname = t[0]
    cursor.execute(f'PRAGMA table_info({tname})')
    cols = cursor.fetchall()
    print(f'\n--- {tname} ---')
    print('Columns:', [c[1] for c in cols])
    cursor.execute(f'SELECT * FROM {tname} LIMIT 2')
    rows = cursor.fetchall()
    col_names = [c[1] for c in cols]
    for row in rows:
        print(dict(zip(col_names, row)))
