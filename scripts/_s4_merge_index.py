"""S4: 合并 _g4_15books_import.jsonl 到 classics_index.jsonl + 重新生成 _manifest.json"""
import json
import shutil
from pathlib import Path
from collections import Counter
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
NEW_IMPORT = ROOT / "knowledge" / "processed" / "_g4_15books_import.jsonl"
MANIFEST = ROOT / "knowledge" / "processed" / "_manifest.json"

TS = datetime.now().strftime("%Y%m%d_%H%M%S")

# 1. 备份
print("[1] 备份 ...")
bak_index = INDEX.with_suffix(f".jsonl.bak-pre-g4-15books-{TS}")
bak_manifest = MANIFEST.with_suffix(f".json.bak-pre-g4-15books-{TS}")
shutil.copy2(INDEX, bak_index)
shutil.copy2(MANIFEST, bak_manifest)
print(f"  备份: {bak_index.name}")
print(f"  备份: {bak_manifest.name}")

# 2. 统计原始行数
print("\n[2] 统计原始行数 ...")
with open(INDEX, encoding="utf-8") as f:
    orig_count = sum(1 for _ in f)
print(f"  原 classics_index.jsonl: {orig_count} 行")

with open(NEW_IMPORT, encoding="utf-8") as f:
    new_count = sum(1 for _ in f)
print(f"  _g4_15books_import.jsonl: {new_count} 行")

# 3. 合并
print("\n[3] 合并 ...")
with open(INDEX, "a", encoding="utf-8") as out_f:
    with open(NEW_IMPORT, encoding="utf-8") as in_f:
        for line in in_f:
            out_f.write(line)

# 4. 验证合并后行数
print("\n[4] 验证合并后行数 ...")
with open(INDEX, encoding="utf-8") as f:
    final_count = sum(1 for _ in f)
print(f"  合并后 classics_index.jsonl: {final_count} 行")
expected = orig_count + new_count
print(f"  期望: {orig_count} + {new_count} = {expected}")
assert final_count == expected, f"行数不匹配: {final_count} != {expected}"

# 5. 检查重复 passage_id
print("\n[5] 检查重复 passage_id ...")
ids = set()
duplicates = 0
books = set()
cat_counter = Counter()
with open(INDEX, encoding="utf-8") as f:
    for line in f:
        d = json.loads(line)
        pid = d.get("passage_id", "")
        if pid in ids:
            duplicates += 1
        ids.add(pid)
        books.add(d.get("book", ""))
        cat_counter[d.get("system_type", "other")] += 1

print(f"  重复 passage_id: {duplicates}")
print(f"  唯一 books: {len(books)}")
print(f"  分类分布: {dict(cat_counter)}")

if duplicates > 0:
    print("  [WARN] 有重复,但可能因原有索引已含相同 id,继续")

# 6. 重新生成 _manifest.json
print("\n[6] 重新生成 _manifest.json ...")
manifest = {
    "count": final_count,
    "books": len(books),
    "categories": dict(cat_counter),
    "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "source": "classics_index.jsonl + _g4_15books_import.jsonl",
    "version": "v1.1-g4-15books",
}
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"  _manifest.json 已更新")
print(f"  count={final_count}, books={len(books)}")

print("\n[完成] S4 合并成功")
print(f"  原 {orig_count} → 新 {final_count} (+{new_count})")
