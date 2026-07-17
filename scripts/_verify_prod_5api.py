#!/usr/bin/env python3
"""生产环境 5 接口验证脚本"""
import json
import urllib.request

BASE = "http://127.0.0.1:8701"

def post(path, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get(path):
    req = urllib.request.Request(f"{BASE}{path}", method="GET")
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read().decode("utf-8"))

results = []

# 1. /health
print("=== 1. /health ===")
b = get("/health")
print(f"  bookCount={b['bookCount']}, passageCount={b['passageCount']}, loadedItems={b['loadedItems']}")
ok = b["bookCount"] == 587 and b["passageCount"] == 309355 and b["loadedItems"] == 309355
results.append(("health", ok))

# 2. /health-v2
print("\n=== 2. /health-v2 ===")
b = get("/health-v2")
print(f"  v2_initialized={b.get('v2_initialized')}, vector_mode={b.get('vector_mode')}")
print(f"  vector_count={b.get('vector_count')}, items_count={b.get('items_count')}")
ok = b.get("v2_initialized") is True and b.get("vector_count") == 309355
results.append(("health-v2", ok))

# 3. /retrieve
print("\n=== 3. /retrieve ===")
b = post("/retrieve", {"routeType": "ziping", "question": "日主身弱", "limit": 3})
print(f"  items={len(b['items'])}")
for it in b["items"][:3]:
    print(f"    - {it['sourceId'][:30]} score={it['score']} {it['text'][:50]}")
ok = len(b["items"]) > 0
results.append(("retrieve", ok))

# 4. /embed_search
print("\n=== 4. /embed_search ===")
b = post("/embed_search", {"question": "日主身弱如何取用神", "systemType": "bazi", "limit": 3})
print(f"  items={len(b['items'])}")
for it in b["items"][:3]:
    print(f"    - {it['sourceId'][:30]} score={it['score']} {it['text'][:60]}")
ok = len(b["items"]) > 0
results.append(("embed_search", ok))

# 5. /hybrid_search
print("\n=== 5. /hybrid_search ===")
b = post("/hybrid_search", {"routeType": "ziping", "question": "日主身弱", "limit": 5})
print(f"  items={len(b['items'])}")
for it in b["items"][:5]:
    print(f"    - {it['sourceId'][:30]} score={it['score']}")
ok = len(b["items"]) > 0
results.append(("hybrid_search", ok))

# Summary
print("\n" + "=" * 50)
passed = sum(1 for _, ok in results if ok)
print(f"PASSED: {passed}/{len(results)}")
for name, ok in results:
    print(f"  {'[OK]' if ok else '[FAIL]'} {name}")
print("=" * 50)
exit(0 if passed == len(results) else 1)
