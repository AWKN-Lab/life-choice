"""探查5个small_docx_hits txt文件内容"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
d = ROOT / "_recovered_assets" / "small_docx_hits"

for p in sorted(d.glob("*.txt")):
    size = p.stat().st_size
    text = p.read_text(encoding="utf-8", errors="ignore")
    print("=" * 70)
    print(f"{p.name}: {size} bytes, text_len={len(text)}")
    print(f"First 300 chars:\n{text[:300]}")
    print(f"Last 200 chars:\n{text[-200:]}")
    print()
