"""G4 恢复库清洗 - 检查 metaphysics.db 当前状态"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path('knowledge/knowledge_base/metaphysics.db')

def main():
    if not DB_PATH.exists():
        print(f'ERROR: DB not found: {DB_PATH}')
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 表结构
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print(f'Tables: {tables}')

    # books 表结构
    cur.execute("PRAGMA table_info(books)")
    print(f'\nbooks schema:')
    for row in cur.fetchall():
        print(f'  {row}')

    # passages 表结构
    cur.execute("PRAGMA table_info(passages)")
    print(f'\npassages schema:')
    for row in cur.fetchall():
        print(f'  {row}')

    # 总数
    cur.execute('SELECT COUNT(*) FROM books')
    print(f'\nBooks total: {cur.fetchone()[0]}')
    cur.execute('SELECT COUNT(*) FROM passages')
    print(f'Passages total: {cur.fetchone()[0]}')

    # 标题质量检查
    cur.execute("SELECT id, title, author FROM books LIMIT 5")
    print(f'\nSample books:')
    for row in cur.fetchall():
        print(f'  id={row[0]} title={row[1]!r} author={row[2]!r}')

    # 短标题（< 4 字符）
    cur.execute("SELECT COUNT(*) FROM books WHERE LENGTH(title) < 4 OR title IS NULL")
    print(f'\nBooks with title < 4 chars or NULL: {cur.fetchone()[0]}')

    # 空标题
    cur.execute("SELECT COUNT(*) FROM books WHERE title IS NULL OR title = ''")
    print(f'Books with NULL/empty title: {cur.fetchone()[0]}')

    # 重复标题
    cur.execute("""
        SELECT title, COUNT(*) as cnt
        FROM books
        WHERE title IS NOT NULL AND title != ''
        GROUP BY title
        HAVING cnt > 1
        ORDER BY cnt DESC
        LIMIT 10
    """)
    dups = cur.fetchall()
    print(f'\nDuplicate titles (top 10): {len(dups)}')
    for row in dups:
        print(f'  {row[1]!r}: {row[0]} 重复')

    # 总重复组数
    cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT title FROM books
            WHERE title IS NOT NULL AND title != ''
            GROUP BY title HAVING COUNT(*) > 1
        )
    """)
    print(f'Total duplicate title groups: {cur.fetchone()[0]}')

    # 重复标题总条数
    cur.execute("""
        SELECT COUNT(*) FROM books
        WHERE title IN (
            SELECT title FROM books
            WHERE title IS NOT NULL AND title != ''
            GROUP BY title HAVING COUNT(*) > 1
        ) AND title IS NOT NULL AND title != ''
    """)
    print(f'Total books in duplicate groups: {cur.fetchone()[0]}')

    conn.close()

if __name__ == '__main__':
    main()
