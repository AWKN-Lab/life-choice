"""临时探查脚本：检查manifest文件结构"""
import csv
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# manifest_import.csv
print("=" * 70)
print("manifest_import.csv")
print("=" * 70)
with open(ROOT / "_recovered_assets/docx_for_import/manifest_import.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print(f"Total: {len(rows)}")
print(f"Columns: {list(rows[0].keys())}")
print(f"Sample 3:")
for r in rows[:3]:
    print(f"  {r}")
print(f"\ndetected_type dist: {dict(Counter(r['detected_type'] for r in rows))}")

# manifest_big.csv
print("\n" + "=" * 70)
print("manifest_big.csv")
print("=" * 70)
with open(ROOT / "_recovered_assets/docx_for_import/manifest_big.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print(f"Total: {len(rows)}")
print(f"Columns: {list(rows[0].keys())}")
print(f"Sample 3:")
for r in rows[:3]:
    print(f"  {r}")

# manifest_small.csv
print("\n" + "=" * 70)
print("manifest_small.csv")
print("=" * 70)
with open(ROOT / "_recovered_assets/docx_for_import/manifest_small.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print(f"Total: {len(rows)}")
print(f"Columns: {list(rows[0].keys())}")
print(f"Sample 3:")
for r in rows[:3]:
    print(f"  {r}")

# manifest_epub_xlsx.csv (包含书名等元数据)
print("\n" + "=" * 70)
print("manifest_epub_xlsx.csv (含元数据)")
print("=" * 70)
with open(ROOT / "_recovered_assets/docx_for_import/manifest_epub_xlsx.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
print(f"Total: {len(rows)}")
print(f"Columns: {list(rows[0].keys())}")
print(f"book_type dist: {dict(Counter(r['book_type'] for r in rows))}")
