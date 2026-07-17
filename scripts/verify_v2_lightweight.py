"""轻量验证：直接调用 main 的内部函数，不走 TestClient"""
import sys
import os
import time

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["ANONYMIZED_TELEMETRY"] = "False"

# 切换到 knowledge-service 目录
KS_DIR = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "apps", "AWKN-LABlife", "services", "knowledge-service"
))
os.chdir(KS_DIR)
sys.path.insert(0, ".")

print(f"[1] import main ...")
t0 = time.time()
import main
print(f"  imported in {time.time()-t0:.1f}s")

print(f"\n[2] _init_chroma() ...")
t0 = time.time()
ok = main._init_chroma()
print(f"  ok={ok}, elapsed={time.time()-t0:.1f}s")
if not ok:
    print(f"  error: {main._chroma_init_error}")
    sys.exit(1)

print(f"\n[3] chroma count ...")
cnt = main._chroma_col.count()
print(f"  count={cnt}")

print(f"\n[4] /embed_search 函数调用（bazi）...")
t0 = time.time()
req = main.EmbedSearchRequest(question="日主身弱如何取用神", systemType="bazi", limit=3)
resp = main.embed_search(req)
print(f"  elapsed={time.time()-t0:.2f}s, items={len(resp.items)}")
for i, it in enumerate(resp.items):
    print(f"    [{i+1}] score={it.score} title={it.title}")
    print(f"        {it.text[:80]}")

print(f"\n[5] /embed_search 函数调用（liuren）...")
req = main.EmbedSearchRequest(question="贼克法如何取三传", systemType="liuren", limit=3)
resp = main.embed_search(req)
print(f"  items={len(resp.items)}")
for i, it in enumerate(resp.items):
    print(f"    [{i+1}] score={it.score} title={it.title}")
    print(f"        {it.text[:80]}")

print(f"\n[6] /hybrid_search 函数调用 ...")
t0 = time.time()
req = main.HybridSearchRequest(routeType="ziping", question="日主身弱", limit=5)
resp = main.hybrid_search(req)
print(f"  elapsed={time.time()-t0:.2f}s, items={len(resp.items)}")
for i, it in enumerate(resp.items):
    print(f"    [{i+1}] score={it.score} title={it.title}")
    print(f"        {it.text[:60]}")

print("\n" + "=" * 60)
print("DONE - 步骤 5 验证通过")
