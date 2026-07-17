"""快速验证 ChromaDB 检索（只读，不重导入）"""
import sys
import json
import numpy as np

sys.path.insert(0, ".")

import chromadb
from chromadb.config import Settings
from scripts.embed_classics import TfidfCharBigramEmbedder

CHROMA_DIR = "knowledge/services/chroma_db"
INDEX_FILE = "knowledge/processed/classics_index.jsonl"
EMB_FILE = "knowledge/processed/embeddings.npy"

print("Loading data...")
items = [json.loads(l) for l in open(INDEX_FILE, encoding="utf-8")]
embeddings = np.load(EMB_FILE)
print(f"  passages={len(items)}")

print("Init Chroma...")
client = chromadb.PersistentClient(
    path=CHROMA_DIR,
    settings=Settings(anonymized_telemetry=False, allow_reset=False),
)
col = client.get_collection("classics_v1", embedding_function=None)
print(f"  count={col.count()}")

print("Building TF-IDF...")
qe = TfidfCharBigramEmbedder(dim=embeddings.shape[1])
qe.fit([it["text"] for it in items])

queries = [
    ("bazi", "日主身弱如何取用神"),
    ("bazi", "甲木生于午月用神"),
    ("liuren", "贼克法如何取三传"),
]
for sys_type, q in queries:
    print(f"\nquery [{sys_type}]: {q}")
    qvec = qe.encode_one(q).tolist()
    res = col.query(
        query_embeddings=[qvec],
        n_results=3,
        where={"system_type": sys_type},
    )
    if res.get("ids") and res["ids"][0]:
        for i, (doc, meta, dist) in enumerate(zip(res["documents"][0], res["metadatas"][0], res["distances"][0])):
            book = meta["book"][:30]
            print(f"  [{i+1}] dist={dist:.3f} | {book} | {doc[:80]}...")
    else:
        print("  no results")

print("\nDONE")
