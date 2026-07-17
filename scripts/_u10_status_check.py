"""U10 状态检查:metaphysics.db 标题治理是否完成"""
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "knowledge" / "knowledge_base" / "metaphysics.db"

conn = sqlite3.connect(str(DB))
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM books")
total = cur.fetchone()[0]
print(f"总书数: {total}")

cur.execute("SELECT COUNT(*) FROM books WHERE length(title) < 4")
short = cur.fetchone()[0]
print(f"短标题数(<4字): {short}")

cur.execute("SELECT COUNT(*) FROM books WHERE title IS NULL OR title = ''")
empty = cur.fetchone()[0]
print(f"空标题数: {empty}")

cur.execute("SELECT title, COUNT(*) c FROM books GROUP BY title HAVING c > 1 LIMIT 10")
dups = cur.fetchall()
print(f"重复标题(前10): {dups}")
print(f"重复标题组数: {len(dups)}")

cur.execute("SELECT COUNT(*) FROM passages")
total_passages = cur.fetchone()[0]
print(f"总passages数: {total_passages}")

conn.close()
