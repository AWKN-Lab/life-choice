"""诊断脚本：确认 client.get('/health') 是否真卡住"""
import sys
import os
import time

os.chdir(os.path.join(os.path.dirname(__file__), "..", "apps", "AWKN-LABlife", "services", "knowledge-service"))
sys.path.insert(0, ".")

os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["HF_HUB_OFFLINE"] = "1"

print("[diag] importing main...", flush=True)
t0 = time.time()
import main
print(f"[diag] main imported in {time.time()-t0:.2f}s", flush=True)

print("[diag] creating TestClient...", flush=True)
t0 = time.time()
from fastapi.testclient import TestClient
client = TestClient(main.app)
print(f"[diag] TestClient created in {time.time()-t0:.2f}s", flush=True)

print("[diag] calling GET /health...", flush=True)
t0 = time.time()
r = client.get("/health")
elapsed = time.time() - t0
print(f"[diag] /health returned in {elapsed:.2f}s, status={r.status_code}", flush=True)
print(f"[diag] body keys: {list(r.json().keys())}", flush=True)

print("[diag] calling GET /health-v2 (will trigger _init_chroma)...", flush=True)
t0 = time.time()
r2 = client.get("/health-v2")
elapsed = time.time() - t0
print(f"[diag] /health-v2 returned in {elapsed:.2f}s, status={r2.status_code}", flush=True)
print(f"[diag] v2 body: {r2.json()}", flush=True)

print("[diag] DONE", flush=True)
