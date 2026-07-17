"""G4 恢复库清洗 - 清洗 metaphysics.db 标题 + 去重

清洗规则：
1. 短标题（< 4 字符或 NULL/empty）：
   - 优先用 description 前 20 字符（若有）
   - 否则用 source_sha 前 8 字符
   - 都没有则 `未命名书籍-{id}`
2. 重复标题：
   - 保留 id 最小的一本原样
   - 其余改为 `{title}（副本-{id}）`

注意：
- 仅修改 books.title 字段
- 不动 passages / chapters / cases / FTS 索引
- book_id 关系不受影响
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path('knowledge/knowledge_base/metaphysics.db')

def derive_title(book_id: int, description: str | None, source_sha: str | None) -> str:
    """从 description / source_sha 派生标题"""
    if description and description.strip():
        base = description.strip()[:20]
        return f'{base}（id={book_id}）'
    if source_sha and source_sha.strip():
        return f'sha-{source_sha[:8]}（id={book_id}）'
    return f'未命名书籍-{book_id}'

def main():
    if not DB_PATH.exists():
        print(f'ERROR: DB not found: {DB_PATH}')
        sys.exit(1)

    # 二次确认备份存在
    bak = DB_PATH.parent / 'metaphysics.db.bak-g4-20260703'
    if not bak.exists():
        print(f'ERROR: Backup not found: {bak}')
        print('Please backup first: cp metaphysics.db metaphysics.db.bak-g4-20260703')
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # === Step 1: 清洗短标题 ===
    cur.execute("""
        SELECT id, title, description, source_sha
        FROM books
        WHERE title IS NULL OR LENGTH(title) < 4
    """)
    short_books = cur.fetchall()
    print(f'[Step 1] 短标题书籍: {len(short_books)} 本')

    short_fixed = 0
    for book_id, title, description, source_sha in short_books:
        new_title = derive_title(book_id, description, source_sha)
        # 确保 new_title 长度 >= 4
        if len(new_title) < 4:
            new_title = f'未命名书籍-{book_id}'
        cur.execute('UPDATE books SET title = ? WHERE id = ?', (new_title, book_id))
        short_fixed += 1
        print(f'  id={book_id}: {title!r} -> {new_title!r}')
    conn.commit()
    print(f'[Step 1] 修复短标题: {short_fixed} 本')

    # === Step 2: 去重 ===
    cur.execute("""
        SELECT title, COUNT(*) as cnt
        FROM books
        WHERE title IS NOT NULL AND title != ''
        GROUP BY title
        HAVING cnt > 1
        ORDER BY cnt DESC
    """)
    dup_groups = cur.fetchall()
    print(f'\n[Step 2] 重复标题组: {len(dup_groups)} 组')

    dup_fixed = 0
    for title, _ in dup_groups:
        # 保留 id 最小的一本，其余改名
        cur.execute("""
            SELECT id FROM books WHERE title = ? ORDER BY id ASC
        """, (title,))
        ids = [r[0] for r in cur.fetchall()]
        # 跳过第一个（保留原样）
        for book_id in ids[1:]:
            new_title = f'{title}（副本-{book_id}）'
            cur.execute('UPDATE books SET title = ? WHERE id = ?', (new_title, book_id))
            dup_fixed += 1
            print(f'  id={book_id}: {title!r} -> {new_title!r}')
    conn.commit()
    print(f'[Step 2] 重命名重复: {dup_fixed} 本')

    # === Step 3: 验证 ===
    print('\n[Step 3] 验证清洗结果...')
    cur.execute("SELECT COUNT(*) FROM books WHERE title IS NULL OR LENGTH(title) < 4")
    remaining_short = cur.fetchone()[0]
    print(f'  短标题（< 4 字符）剩余: {remaining_short}')

    cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT title FROM books
            WHERE title IS NOT NULL AND title != ''
            GROUP BY title HAVING COUNT(*) > 1
        )
    """)
    remaining_dups = cur.fetchone()[0]
    print(f'  重复标题组剩余: {remaining_dups}')

    cur.execute('SELECT COUNT(*) FROM books')
    total_books = cur.fetchone()[0]
    print(f'  总书籍数: {total_books}')

    if remaining_short == 0 and remaining_dups == 0:
        print('\n✅ G4 清洗 PASS：所有标题 ≥ 4 字符且无重复')
    else:
        print(f'\n⚠️  G4 清洗 PARTIAL：短标题 {remaining_short}，重复组 {remaining_dups}')
        sys.exit(2)

    conn.close()

if __name__ == '__main__':
    main()
