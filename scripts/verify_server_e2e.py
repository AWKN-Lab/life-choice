#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""服务器端到端验证脚本（HTTP API 测试）"""
import json
import urllib.request
import time

BASE = "http://127.0.0.1:8701"

print("=== 1. health-v2 ===")
resp = urllib.request.urlopen(f"{BASE}/health-v2")
data = json.loads(resp.read())
print(f"  status: {data['status']}")
print(f"  v2_initialized: {data['v2_initialized']}")
print(f"  vector_count: {data['vector_count']}")
print(f"  vector_mode: {data['vector_mode']}")

print("\n=== 2. embed_search（八字向量检索）===")
payload = json.dumps({"question": "日主旺衰", "systemType": "bazi", "limit": 3}).encode("utf-8")
req = urllib.request.Request(f"{BASE}/embed_search", data=payload, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print(f"  返回 {len(data['items'])} 条结果")
for i, item in enumerate(data["items"][:2]):
    print(f"  [{i}] score={item['score']} title={item['title']} text={item['text'][:80]}")

print("\n=== 3. embed_search（六壬向量检索）===")
payload = json.dumps({"question": "天地盘", "systemType": "liuren", "limit": 3}).encode("utf-8")
req = urllib.request.Request(f"{BASE}/embed_search", data=payload, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print(f"  返回 {len(data['items'])} 条结果")
for i, item in enumerate(data["items"][:2]):
    print(f"  [{i}] score={item['score']} title={item['title']} text={item['text'][:80]}")

print("\n=== 4. hybrid_search（混合检索）===")
payload = json.dumps({"routeType": "ziping", "question": "日主旺衰", "limit": 5}).encode("utf-8")
req = urllib.request.Request(f"{BASE}/hybrid_search", data=payload, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print(f"  返回 {len(data['items'])} 条结果")
for i, item in enumerate(data["items"][:3]):
    print(f"  [{i}] score={item['score']} title={item['title']} text={item['text'][:80]}")

print("\n=== 5. 冷启动时间（第二次 health-v2）===")
t0 = time.time()
resp = urllib.request.urlopen(f"{BASE}/health-v2")
elapsed = time.time() - t0
print(f"  响应时间: {elapsed:.3f}s")

print("\n[DONE] 端到端验证完成")
