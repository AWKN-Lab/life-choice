from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import json

# Monkey-patch: chromadb 旧版用了 np.float_（numpy 2.0 已移除）
import numpy as _np
if not hasattr(_np, 'float_'):
    _np.float_ = _np.float64
if not hasattr(_np, 'int_'):
    _np.int_ = _np.int64
if not hasattr(_np, 'uint'):
    _np.uint = _np.uint64

from loader import load_all
from jsonl_dataset import count_jsonl_rows, iter_jsonl_lines, resolve_jsonl_paths

app = FastAPI(title="Knowledge Service", version="2026-05-v1")

print("[Knowledge Service] Loading knowledge base...")
DATA = load_all()
TOTAL_SOURCES = DATA.get('sources', {}).get('books', 0)
TOTAL_PASSAGES = DATA.get('sources', {}).get('total', 0)
print(f"[Knowledge Service] Loaded {TOTAL_PASSAGES} passages, {TOTAL_SOURCES} books")

class RetrieveRequest(BaseModel):
    routeType: str
    question: str
    evidenceTags: List[str] = []
    limit: int = 6

class SimilarCasesRequest(BaseModel):
    evidenceTags: List[str] = []
    limit: int = 5

class KnowledgeItem(BaseModel):
    sourceId: str
    title: str
    text: str
    score: float

class RetrieveResponse(BaseModel):
    items: List[KnowledgeItem]

def keyword_match(query: str, text: str) -> float:
    if not query or not text:
        return 0.0
    query_lower = query.lower()
    text_lower = text.lower()
    score = 0.0
    for word in query_lower.split():
        if word in text_lower:
            score += 1.0
    for tag in query_lower.replace(':', ' ').split():
        if tag in text_lower:
            score += 0.5
    return min(score / max(len(query_lower.split()), 1), 1.0)

def search(route_type: str, query: str, tags: List[str], limit: int) -> List[KnowledgeItem]:
    # G1-2 修复：从 by_system 取对应分类池
    sys_key = 'bazi' if route_type in ('ziping', 'bazi') else route_type
    by_system = DATA.get('by_system', {})
    pool = list(by_system.get(sys_key, []))
    # 通用 fallback：如指定分类无数据，搜全量
    if not pool:
        pool = DATA.get('items', [])
    results = []
    for item in pool:
        score = keyword_match(query, item.get('text', ''))
        for tag in tags:
            if tag.lower() in item.get('text', '').lower():
                score += 0.3
        if score > 0.1:
            source_id = item.get('passage_id', item.get('source', ''))[:40]
            results.append(KnowledgeItem(
                sourceId=source_id,
                title=item.get('book', item.get('source', '').split('/')[-1]),
                text=item.get('text', '')[:300],
                score=round(min(score, 0.99), 2)
            ))
    results.sort(key=lambda x: x.score, reverse=True)
    return results[:limit]

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2026-05-v1",
        "bookCount": TOTAL_SOURCES,
        "passageCount": TOTAL_PASSAGES,
        "loadedItems": len(DATA.get('items', [])),
        "bySystem": {k: len(v) for k, v in DATA.get('by_system', {}).items()},
    }

@app.post("/retrieve", response_model=RetrieveResponse)
def retrieve(req: RetrieveRequest):
    items = search(req.routeType, req.question, req.evidenceTags, req.limit)
    return RetrieveResponse(items=items)

@app.post("/similar-cases", response_model=RetrieveResponse)
def similar_cases(req: SimilarCasesRequest):
    items = search('liuren', '', req.evidenceTags, req.limit)
    return RetrieveResponse(items=items)


# ============================================================
# v2: 向量检索 + 混合检索（2026-06-18 升级）
# ============================================================
# 路径统一：以 __file__ (services/knowledge-service/main.py) 为基准
# __file__ = .../apps/AWKN-LABlife/services/knowledge-service/main.py
# x1=knowledge-service, x2=services, x3=AWKN-LABlife, x4=apps, x5=人生决策宗师
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_APPS_LIFE_DIR = os.path.dirname(os.path.dirname(_THIS_DIR))  # apps/AWKN-LABlife
_PROJECT_ROOT = os.path.dirname(os.path.dirname(_APPS_LIFE_DIR))  # 人生决策宗师/

# ChromaDB 实际位置：apps/knowledge/services/chroma_db
CHROMA_DIR = os.path.join(_APPS_LIFE_DIR, 'knowledge', 'services', 'chroma_db')
CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", CHROMA_DIR)
CHROMA_DIR = os.path.abspath(CHROMA_DIR)
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "classics_v1")

# 向量索引产物位置：优先用环境变量 KNOWLEDGE_DATA_DIR（服务器部署用），否则基于 _PROJECT_ROOT
_KNOWLEDGE_DATA_DIR = os.getenv("KNOWLEDGE_DATA_DIR", os.path.join(_PROJECT_ROOT, 'knowledge', 'processed'))
# 环境变量切换 v2(TF-IDF 1024维) / v3(BGE-small-zh 512维)
_EMBED_VERSION = os.getenv("KNOWLEDGE_EMBED_VERSION", "v2").lower()
if _EMBED_VERSION == "v3":
    EMBED_FILE = os.path.join(_KNOWLEDGE_DATA_DIR, 'embeddings_v3.npy')
    _EMBED_META_FILE = os.path.join(_KNOWLEDGE_DATA_DIR, '_embed_meta_v3.json')
else:
    EMBED_FILE = os.path.join(_KNOWLEDGE_DATA_DIR, 'embeddings.npy')
    _EMBED_META_FILE = None
INDEX_FILE = os.path.join(_KNOWLEDGE_DATA_DIR, 'classics_index.jsonl')
IDF_CACHE_FILE = os.path.join(_KNOWLEDGE_DATA_DIR, 'idf_cache.pkl')

_chroma_client = None
_chroma_col = None  # 保留变量名兼容，实际不再使用 ChromaDB
_tfidf_embedder = None
_chroma_init_error = None
_loaded_items = None
_loaded_embeddings = None  # numpy 数组，内存向量检索
_emb_norms = None  # G1-4: 预计算的向量范数，避免每次查询重算


def _init_chroma():
    """惰性初始化向量检索（纯 numpy 内存模式，绕过 ChromaDB 兼容性问题）

    ChromaDB 0.5.5 与 pydantic v1 不兼容，改用直接加载 embeddings.npy + classics_index.jsonl
    做内存 cosine 相似度检索。
    """
    global _chroma_client, _chroma_col, _tfidf_embedder, _chroma_init_error, _loaded_items, _loaded_embeddings, _emb_norms
    if _loaded_embeddings is not None:
        return True
    try:
        import sys
        import numpy as np

        if not os.path.exists(EMBED_FILE):
            _chroma_init_error = f"embeddings 文件不存在: {EMBED_FILE}"
            return False
        index_paths = resolve_jsonl_paths(INDEX_FILE)
        if not index_paths:
            _chroma_init_error = f"classics_index 数据集不存在: {INDEX_FILE}"
            return False

        print(f"[{_EMBED_VERSION}] 加载 embeddings: {EMBED_FILE}")
        if _EMBED_VERSION == "v3":
            # v3: memmap 文件(无 .npy header),用 np.memmap 加载
            dim = 512  # 默认 BGE-small-zh
            if _EMBED_META_FILE and os.path.exists(_EMBED_META_FILE):
                _meta = json.loads(open(_EMBED_META_FILE, encoding="utf-8").read())
                dim = _meta.get("dim", 512)
            # 从单文件或有序分片的总行数推断 n
            n = count_jsonl_rows(INDEX_FILE)
            _loaded_embeddings = np.memmap(EMBED_FILE, dtype=np.float32, mode='r', shape=(n, dim))
            print(f"[v3] memmap 加载, dim={dim}")
        else:
            # v2: 低内存模式用 mmap,否则全量加载
            _use_mmap = os.getenv("KNOWLEDGE_USE_MMAP", "0") == "1"
            if _use_mmap:
                _loaded_embeddings = np.load(EMBED_FILE, mmap_mode='r')
                print(f"[v2] mmap 模式加载（低内存）")
            else:
                _loaded_embeddings = np.load(EMBED_FILE)
        print(f"[{_EMBED_VERSION}] embeddings shape={_loaded_embeddings.shape}, dtype={_loaded_embeddings.dtype}")

        print(f"[{_EMBED_VERSION}] 加载 classics_index 数据集: {', '.join(index_paths)}")
        # 精简加载：只保留检索必要字段，减少内存占用（text 截断到 500 字）
        _loaded_items = []
        for _path, _line_no, line in iter_jsonl_lines(INDEX_FILE):
            it = json.loads(line)
            _loaded_items.append({
                'passage_id': it.get('passage_id', ''),
                'book': it.get('book', ''),
                'chapter': it.get('chapter', ''),
                'system_type': it.get('system_type', 'bazi'),
                'text': it.get('text', '')[:500],  # 截断到 500 字，减少内存
                'source': it.get('source', ''),
            })
        print(f"[{_EMBED_VERSION}] items={len(_loaded_items)}")

        if len(_loaded_items) != _loaded_embeddings.shape[0]:
            _chroma_init_error = f"数量不匹配: items={len(_loaded_items)}, embeddings={_loaded_embeddings.shape[0]}"
            return False

        # query embedder 切换: v3 用 BGE-small-zh-v1.5, v2 用 TF-IDF
        if _EMBED_VERSION == "v3":
            # v3: BGE-small-zh-v1.5
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
            from sentence_transformers import SentenceTransformer
            _tfidf_embedder = SentenceTransformer("BAAI/bge-small-zh-v1.5")
            print(f"[v3] BGE 模型加载完成, dim={_tfidf_embedder.get_sentence_embedding_dimension()}")
        else:
            # v2: TF-IDF（优先加载 IDF 缓存，不存在时 fit 并保存）
            if _THIS_DIR not in sys.path:
                sys.path.insert(0, _THIS_DIR)
            sys.path.insert(0, _PROJECT_ROOT)
            try:
                from embed_classics import TfidfCharBigramEmbedder
            except ImportError:
                from scripts.embed_classics import TfidfCharBigramEmbedder
            _tfidf_embedder = TfidfCharBigramEmbedder(dim=_loaded_embeddings.shape[1])
            if os.path.exists(IDF_CACHE_FILE):
                print(f"[v2] 加载 IDF 缓存: {IDF_CACHE_FILE}")
                if not _tfidf_embedder.load_idf(IDF_CACHE_FILE):
                    print(f"[v2] IDF 缓存加载失败，回退到 fit")
                    _tfidf_embedder.fit([it['text'] for it in _loaded_items])
            else:
                print(f"[v2] IDF 缓存不存在，fit 并保存")
                _tfidf_embedder.fit([it['text'] for it in _loaded_items])
                try:
                    _tfidf_embedder.save_idf(IDF_CACHE_FILE)
                except Exception as save_err:
                    print(f"[v2] IDF 缓存保存失败（不影响运行）: {save_err}")
        print(f"[{_EMBED_VERSION}] 初始化完成，内存向量检索就绪")
        # G1-4: 预计算向量范数，避免每次 _vector_search 都重算
        # v3(memmap) 或 v2 mmap 模式: 分批计算，避免全量加载导致 OOM
        _use_mmap = _EMBED_VERSION == "v3" or os.getenv("KNOWLEDGE_USE_MMAP", "0") == "1"
        if _use_mmap:
            _n = _loaded_embeddings.shape[0]
            _emb_norms = np.zeros(_n, dtype=np.float32)
            _batch = 5000
            for _s in range(0, _n, _batch):
                _e = min(_s + _batch, _n)
                _chunk = np.asarray(_loaded_embeddings[_s:_e])
                _emb_norms[_s:_e] = np.linalg.norm(_chunk, axis=1)
                del _chunk
        else:
            _emb_norms = np.linalg.norm(_loaded_embeddings, axis=1)
        _emb_norms = np.where(_emb_norms < 1e-9, 1e-9, _emb_norms)
        print(f"[{_EMBED_VERSION}] 预计算范数完成, shape={_emb_norms.shape}")
        return True
    except Exception as e:
        _chroma_init_error = f"{type(e).__name__}: {str(e)[:200]}"
        print(f"[{_EMBED_VERSION} init error] {_chroma_init_error}")
        return False


def _vector_search(query: str, system_type: Optional[str], n_results: int):
    """纯 numpy 内存向量检索，返回 [(idx, distance, item), ...]"""
    import numpy as np
    if not _init_chroma():
        return []

    if _EMBED_VERSION == "v3":
        qvec = _tfidf_embedder.encode([query], normalize_embeddings=True, convert_to_numpy=True)[0].astype(np.float32)
    else:
        qvec = _tfidf_embedder.encode_one(query)
    # cosine 相似度 = dot(a,b) / (|a| * |b|)
    qnorm = np.linalg.norm(qvec)
    if qnorm < 1e-9:
        return []

    n = len(_loaded_items)
    _use_mmap = _EMBED_VERSION == "v3" or os.getenv("KNOWLEDGE_USE_MMAP", "0") == "1"
    # mmap 模式下分批计算，避免全量加载导致 OOM
    if _use_mmap and n > 50000:
        sims = np.zeros(n, dtype=np.float32)
        batch = 5000
        for start in range(0, n, batch):
            end = min(start + batch, n)
            chunk = np.asarray(_loaded_embeddings[start:end])
            chunk_sims = chunk.dot(qvec) / (_emb_norms[start:end] * qnorm)
            sims[start:end] = chunk_sims
            del chunk
    else:
        # G1-4: 使用预计算的范数，不再每次重算
        if _emb_norms is None:
            # 兜底：如 _init_chroma 未预计算（理论上不会发生）
            emb_norms = np.linalg.norm(_loaded_embeddings, axis=1)
            emb_norms = np.where(emb_norms < 1e-9, 1e-9, emb_norms)
        else:
            emb_norms = _emb_norms
        sims = _loaded_embeddings.dot(qvec) / (emb_norms * qnorm)

    # 按 system_type 过滤
    if system_type:
        mask = np.array([it.get('system_type', 'bazi') == system_type for it in _loaded_items])
        sims = np.where(mask, sims, -1.0)

    # Top-K
    top_indices = np.argsort(-sims)[:n_results]
    results = []
    for idx in top_indices:
        if sims[idx] < 0:
            continue
        results.append((int(idx), float(sims[idx]), _loaded_items[idx]))
    return results


@app.get("/health-v2")
def health_v2():
    """v2 健康检查（含向量库状态）"""
    base = health()
    chroma_ok = _init_chroma()
    base["v2_initialized"] = chroma_ok
    base["embed_version"] = _EMBED_VERSION
    base["vector_mode"] = "numpy_in_memory"  # 标识使用纯 numpy 内存模式
    base["chroma_dir"] = CHROMA_DIR
    base["collection_name"] = COLLECTION_NAME
    if chroma_ok:
        try:
            base["vector_count"] = int(_loaded_embeddings.shape[0])
            base["items_count"] = len(_loaded_items)
        except Exception as e:
            base["count_error"] = str(e)[:200]
    else:
        base["init_error"] = _chroma_init_error
    return base


class EmbedSearchRequest(BaseModel):
    question: str
    systemType: Optional[str] = None  # "bazi" | "liuren" | None（不过滤）
    limit: int = 6


@app.post("/embed_search", response_model=RetrieveResponse)
def embed_search(req: EmbedSearchRequest):
    """纯向量检索（基于 numpy 内存向量 + TF-IDF）"""
    try:
        results = _vector_search(req.question, req.systemType, req.limit)
        items = []
        for idx, sim, it in results:
            items.append(KnowledgeItem(
                sourceId=it.get('passage_id', f"p{idx:06d}")[:40],
                title=it.get('book', '')[:30],
                text=it.get('text', '')[:300],
                score=round(sim, 3),
            ))
        return RetrieveResponse(items=items)
    except Exception as e:
        print(f"[embed_search error] {e}")
        return RetrieveResponse(items=[])


class HybridSearchRequest(BaseModel):
    routeType: str
    question: str
    evidenceTags: List[str] = []
    limit: int = 6
    vectorWeight: float = 0.7
    keywordWeight: float = 0.3


@app.post("/hybrid_search", response_model=RetrieveResponse)
def hybrid_search(req: HybridSearchRequest):
    """混合检索：向量 Top-K ∪ 关键词 Top-K，重排去重"""
    # 1) 向量检索
    vec_items = []
    sys_type = "bazi" if req.routeType == "ziping" else req.routeType if req.routeType in ("bazi", "liuren") else None
    try:
        vec_results = _vector_search(req.question, sys_type, req.limit * 2)
        for idx, sim, it in vec_results:
            vec_items.append({
                "source": it.get('passage_id', f"p{idx:06d}"),
                "title": it.get('book', '')[:30],
                "text": it.get('text', '')[:300],
                "vec_score": sim,
                "kw_score": 0.0,
            })
    except Exception as e:
        print(f"[hybrid_search vec error] {e}")

    # 2) 关键词检索
    kw_items = []
    try:
        kw_results = search(req.routeType, req.question, req.evidenceTags, req.limit * 2)
        for k in kw_results:
            kw_items.append({
                "source": k.sourceId,
                "title": k.title,
                "text": k.text,
                "vec_score": 0.0,
                "kw_score": k.score,
            })
    except Exception as e:
        print(f"[hybrid_search kw error] {e}")

    # 3) 重排：按 source 去重，加权融合
    merged: Dict[str, Dict] = {}
    for v in vec_items:
        merged[v["source"]] = dict(v)
    for k in kw_items:
        if k["source"] in merged:
            merged[k["source"]]["kw_score"] = max(merged[k["source"]]["kw_score"], k["kw_score"])
        else:
            merged[k["source"]] = dict(k)
    ranked = []
    for src, m in merged.items():
        final = m["vec_score"] * req.vectorWeight + m["kw_score"] * req.keywordWeight
        ranked.append({
            "sourceId": src[:40],
            "title": m["title"],
            "text": m["text"],
            "score": round(final, 3),
        })
    ranked.sort(key=lambda x: x["score"], reverse=True)
    return RetrieveResponse(items=[KnowledgeItem(**r) for r in ranked[:req.limit]])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8701)
