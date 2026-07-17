#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
典籍采集与切分（步骤 2）

输入：
- knowledge/knowledge-base/preprocessed/*.passages.json（已切分 21 部八字典籍）
- knowledge/knowledge-base/preprocessed/*.md（未切分原典）
- knowledge/eastern-metaphysics/八字命理/**/*.md（八字原典 + 衍生）
- knowledge/eastern-metaphysics/六壬/**/*.md（六壬原典 + 衍生）

输出：
- knowledge/processed/classics_index.jsonl（统一格式：{passage_id, book, chapter, system_type, text, source, meta}）
- knowledge/processed/_manifest.json（每部典籍的来源/卷数/passages数）

切分策略：
- 复用 preprocessed/*.passages.json（已有人工校对）
- 未切分 .md：按段落+章节切分（200-500 字/段）
  - 标题检测：# / ## / 卷/章/节/篇
  - 段落边界：连续空行 / 段首 4 空格
  - 长度阈值：< 80 字合并到下一段，> 500 字强制切

幂等：相同源文件重跑结果相同（passage_id 用 book+idx 计算）
"""
import json
import os
import re
import hashlib
from pathlib import Path
from typing import List, Dict, Iterator, Optional

ROOT = Path(__file__).resolve().parent.parent
PREPROCESSED = ROOT / "knowledge" / "knowledge-base" / "preprocessed"
EASTERN = ROOT / "knowledge" / "eastern-metaphysics"
OUTPUT_DIR = ROOT / "knowledge" / "processed"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

INDEX_FILE = OUTPUT_DIR / "classics_index.jsonl"
MANIFEST_FILE = OUTPUT_DIR / "_manifest.json"

# 标题正则：井号标题、卷/章/节、纯字数标题
TITLE_PATTERNS = [
    re.compile(r"^#{1,4}\s+(.+)$"),
    re.compile(r"^第[一二三四五六七八九十百千]+[卷章节篇回].*$"),
    re.compile(r"^【.+】$"),
]
# 段落边界
PARA_BREAK = re.compile(r"\n\s*\n")

# 典籍到 system_type 的映射（按术数体系分类）
def detect_system_type(file_path: Path) -> str:
    """识别典籍所属的术数体系

    体系清单：
    - bazi: 八字命理（子平、滴天髓、三命通会、渊海子平等）
    - liuren: 大六壬（六壬大全、毕法赋、大六壬指南等）
    - meihua: 梅花易数
    - liuyao: 六爻卜筮（断易天机、增删卜易等）
    - qimen: 奇门遁甲
    - zhouyi: 周易/易经原典
    - taiyi: 太乙神数
    - fengshui: 风水堪舆（葬经、撼龙经、青囊经等）
    - xiangshu: 相术（冰鉴、公笃相法、太清神鉴等）
    - yuyan: 预言（推背图、烧饼歌等）
    - other: 其他/未分类
    """
    p = str(file_path).replace("\\", "/")
    name = file_path.name

    # G3-1 修复：书名关键词优先于目录判断（避免"八字命理/斗数骨髓赋"被误归 bazi）
    # 紫微斗数类（含"斗数/太微/玄微/紫微"）即使放在八字目录也归 ziwei
    if "斗数" in name or "太微" in name or "玄微" in name or "紫微" in name:
        return "ziwei"
    # 姓名学类
    if "姓名" in name or "起名" in name or "取名" in name:
        return "quming"
    # 道学/道法类
    if "道德经" in name or "清静经" in name or "阴符经" in name or "道法" in name:
        return "daoism"

    # 按目录路径判断（次优先级）
    if "/八字命理/" in p or "/八字/" in p:
        return "bazi"
    if "/六壬/" in p and "/梅花" not in p and "/断易" not in p:
        return "liuren"
    if "/梅花易数/" in p or "梅花" in name:
        return "meihua"
    if "/断易天机/" in p or "断易" in name or "六爻" in name or "卜筮" in name:
        return "liuyao"
    if "/奇门/" in p or "奇门" in name:
        return "qimen"
    if "/周易/" in p or "周易" in name or "易经" in name or "易传" in name:
        return "zhouyi"
    if "太乙" in name:
        return "taiyi"
    if "/山/" in p or "葬经" in name or "撼龙" in name or "青囊" in name or "水龙" in name or "阳宅" in name or "宅经" in name or "入地眼" in name or "催官" in name or "博山" in name or "玉尺" in name or "雪心" in name or "金锁" in name:
        return "fengshui"
    if "/相/" in p or "冰鉴" in name or "相法" in name or "神鉴" in name or "柳庄" in name or "相术" in name:
        return "xiangshu"
    if "推背图" in name or "烧饼歌" in name or "预言" in name:
        return "yuyan"

    # 按书名关键词判断（八字类）— G3-1: 删除斗数/太微/玄微（已归入 ziwei）
    if "八字" in name or "子平" in name or "滴天髓" in name or "穷通" in name or "三命通会" in name or "渊海" in name or "神峰" in name or "命理" in name or "命谱" in name or "五行精纪" in name or "五行大义" in name or "李虚中" in name or "鬼谷" in name or "格局" in name or "神煞" in name or "星平" in name or "星学" in name or "造化" in name or "玉照" in name or "流年" in name or "节气月将" in name or "真太阳时" in name:
        return "bazi"

    # 按书名关键词判断（六壬类）
    if "六壬" in name or "大六壬" in name or "毕法" in name or "壬归" in name or "壬学" in name:
        return "liuren"

    # 按书名关键词判断（奇门类）
    if "奇门" in name or "御定奇门" in name:
        return "qimen"

    # 按书名关键词判断（周易类）
    if "周易" in name or "筮学" in name or "易经" in name:
        return "zhouyi"

    # G3-1 修复：兜底改为 other（原为 bazi，导致未分类全部归入八字）
    return "other"


def detect_book_name(file_path: Path) -> str:
    """从文件名提取典籍名（去除 .md / .passages.json / 出版社等噪音）"""
    name = file_path.stem
    # 去除常见噪音
    name = re.sub(r"\s*\(Z-Library\)", "", name)
    name = re.sub(r"\s*\(z-library\.sk.*?\)", "", name)
    name = re.sub(r"\s*\(.*?lib\.sk.*?\)", "", name)
    # 截断到第一个空格或半角点
    name = name.strip()
    return name


def load_passages_json(json_path: Path, book: str, system_type: str) -> List[Dict]:
    """加载已切分的 passages.json"""
    items = []
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  [WARN] {json_path.name} 解析失败: {e}")
        return items
    # G3-2 修复：支持 list 和 dict 两种根节点格式（原仅支持 list）
    passages = []
    if isinstance(data, list):
        passages = data
    elif isinstance(data, dict):
        # dict 根节点：尝试常见字段名
        for key in ("passages", "items", "data", "contents"):
            if key in data and isinstance(data[key], list):
                passages = data[key]
                break
        else:
            # 单个 passage 的 dict
            if "text" in data or "content" in data or "passage" in data:
                passages = [data]
    for i, p in enumerate(passages):
        if not isinstance(p, dict):
            continue
        text = p.get("text") or p.get("content") or p.get("passage") or ""
        text = sanitize_text(text)
        if not text or len(text.strip()) < 5:
            continue
        items.append({
            "passage_id": f"{book}::p{i:05d}",
            "book": book,
            "chapter": p.get("chapter") or p.get("section") or "",
            "system_type": system_type,
            "text": text.strip(),
            "source": str(json_path.relative_to(ROOT)).replace("\\", "/"),
            "meta": {k: v for k, v in p.items() if k not in ("text", "content", "passage")},
        })
    return items


def sanitize_text(text: str) -> str:
    """清洗文本:去除 NULL bytes 和其他控制字符(保留 \n\t\r)

    触发场景:源 md 文件开头可能有 NULL bytes(OCR/编码错误),
    str.strip() 不去除 \x00,导致 classics_index.jsonl 前 2 条 text 全是 NULL bytes
    """
    if not text:
        return text
    # 去除 NULL bytes
    text = text.replace("\x00", "")
    # 去除其他控制字符(0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F),保留 \t(\x09) \n(\x0A) \r(\x0D)
    import unicodedata
    text = "".join(ch for ch in text if ch in ("\t", "\n", "\r") or unicodedata.category(ch) != "Cc")
    return text


def split_md_content(content: str, book: str, source: str, system_type: str) -> List[Dict]:
    """按段落+章节切分 .md 内容"""
    # 清洗 NULL bytes 和控制字符(防止 NULL bytes 进入 text 字段)
    content = sanitize_text(content)
    items = []
    # 按 ## 切章节
    chapter_pattern = re.compile(r"^(#{1,4}\s+.+|第[一二三四五六七八九十百千]+[卷章节篇回].*)$", re.MULTILINE)
    parts = chapter_pattern.split(content)
    chapter = ""
    idx = 0
    for i, part in enumerate(parts):
        if chapter_pattern.match(part or ""):
            chapter = re.sub(r"^#+\s*", "", part).strip()
            continue
        text = (part or "").strip()
        if not text:
            continue
        # 进一步按段落切
        for j, para in enumerate(PARA_BREAK.split(text)):
            para = para.strip()
            if not para or len(para) < 30:  # 太短丢弃
                continue
            MAX_LEN = 400  # G3-3: 从 500 降到 400，并增加超长单句硬切
            if len(para) > MAX_LEN:  # 强制切
                chunks = re.split(r"(?<=[。！？])\s*", para)
                buf = ""
                for c in chunks:
                    # G3-3: 单句超过 MAX_LEN 时按 MAX_LEN 硬切
                    while len(c) > MAX_LEN:
                        if buf:
                            items.append(_make_item(book, chapter, system_type, buf, source, idx))
                            idx += 1
                            buf = ""
                        hard_chunk = c[:MAX_LEN]
                        items.append(_make_item(book, chapter, system_type, hard_chunk, source, idx))
                        idx += 1
                        c = c[MAX_LEN:]
                    if len(buf) + len(c) > MAX_LEN and buf:
                        items.append(_make_item(book, chapter, system_type, buf, source, idx))
                        idx += 1
                        buf = c
                    else:
                        buf += c
                if buf.strip():
                    items.append(_make_item(book, chapter, system_type, buf, source, idx))
                    idx += 1
            else:
                items.append(_make_item(book, chapter, system_type, para, source, idx))
                idx += 1
    return items


def _make_item(book: str, chapter: str, system_type: str, text: str, source: str, idx: int) -> Dict:
    return {
        "passage_id": f"{book}::p{idx:05d}",
        "book": book,
        "chapter": chapter or "",
        "system_type": system_type,
        "text": sanitize_text(text),  # 防御性清洗
        "source": source,
        "meta": {"auto_split": True},
    }


def iter_md_files(root: Path) -> Iterator[Path]:
    """遍历目录下所有 .md 和 .txt 文件（排除已切分的 .passages.json 同名文件）"""
    for p in root.rglob("*"):
        if p.suffix.lower() not in (".md", ".txt"):
            continue
        # 跳过 bazi-knowledge-base 内部（结构化知识 JSON 为主，md 是说明性）
        if "/bazi-knowledge-base/" in str(p).replace("\\", "/"):
            continue
        # 跳过 README（说明性）
        if p.name.lower() in ("readme.md", "index.md", "reame.md"):
            continue
        # 跳过非知识类 txt（构建文件、依赖、停用词等）
        if p.suffix.lower() == ".txt":
            skip_names = {"cmakelists.txt", "requirements.txt", "stopwords.txt", "robots.txt"}
            if p.name.lower() in skip_names:
                continue
            # 跳过 _code/ 目录下的代码文件
            if "/_code/" in str(p).replace("\\", "/"):
                continue
            # 跳过 scripts/ 目录下的工具文件
            if "/scripts/" in str(p).replace("\\", "/"):
                continue
            # 跳过提取摘要文件
            if "summary" in p.name.lower() or "test_result" in p.name.lower():
                continue
        yield p


def main():
    print(f"[Ingest] 典籍采集与切分")
    print(f"  ROOT={ROOT}")
    print(f"  OUTPUT={OUTPUT_DIR}")

    all_items: List[Dict] = []
    seen_books: Dict[str, Dict] = {}  # book -> {passages_count, sources, system_type}

    # 1) 优先复用 preprocessed/*.passages.json
    print(f"\n[Phase 1] 复用已切分 passages.json ...")
    for json_path in PREPROCESSED.glob("*.passages.json"):
        book = detect_book_name(json_path).replace(".passages", "")
        if book.endswith(".md"):
            book = book[:-3]
        # 尝试从对应 .md 文件名取更干净的名字
        md_sibling = json_path.with_suffix(".md")
        if md_sibling.exists():
            book = detect_book_name(md_sibling)
        system_type = detect_system_type(json_path)
        items = load_passages_json(json_path, book, system_type)
        if items:
            all_items.extend(items)
            seen_books[book] = {
                "passages_count": len(items),
                "sources": [str(json_path.relative_to(ROOT)).replace("\\", "/")],
                "system_type": system_type,
                "pre_split": True,
            }
            print(f"  + {book}: {len(items)} passages (pre-split)")

    # 2) 处理 preprocessed/*.md（无对应 passages.json 的）
    print(f"\n[Phase 2] 切分 preprocessed/*.md（无 passages.json） ...")
    for md_path in PREPROCESSED.glob("*.md"):
        book = detect_book_name(md_path)
        system_type = detect_system_type(md_path)
        # 跳过已被 passages.json 覆盖的
        if book in seen_books:
            continue
        content = md_path.read_text(encoding="utf-8", errors="ignore")
        if len(content) < 200:
            continue
        items = split_md_content(content, book, str(md_path.relative_to(ROOT)).replace("\\", "/"), system_type)
        if items:
            all_items.extend(items)
            seen_books[book] = {
                "passages_count": len(items),
                "sources": [str(md_path.relative_to(ROOT)).replace("\\", "/")],
                "system_type": system_type,
                "pre_split": False,
            }
            print(f"  + {book}: {len(items)} passages (auto-split)")

    # 3) 处理 eastern-metaphysics/ 下所有子目录的 .md（八字命理、六壬、梅花、断易等）
    print(f"\n[Phase 3] 切分 eastern-metaphysics 子目录原典 ...")
    for md_path in iter_md_files(EASTERN):
        # 排除 xx.theojs.cn-main/（Phase 4 单独处理）
        if "xx.theojs.cn-main" in str(md_path):
            continue
        book = detect_book_name(md_path)
        # 跳过已处理（preprocessed 已有同名同 source）
        if book in seen_books:
            continue
        system_type = detect_system_type(md_path)
        content = md_path.read_text(encoding="utf-8", errors="ignore")
        if len(content) < 200:
            continue
        items = split_md_content(content, book, str(md_path.relative_to(ROOT)).replace("\\", "/"), system_type)
        if items:
            all_items.extend(items)
            seen_books[book] = {
                "passages_count": len(items),
                "sources": [str(md_path.relative_to(ROOT)).replace("\\", "/")],
                "system_type": system_type,
                "pre_split": False,
            }
            print(f"  + {book} ({system_type}): {len(items)} passages (auto-split)")

    # 3.5) 处理 eastern-metaphysics/ 根目录下的散落 .md/.txt（奇门、周易、预言等）
    print(f"\n[Phase 3.5] 切分 eastern-metaphysics 根目录散落文件 ...")
    for md_path in EASTERN.iterdir():
        if md_path.suffix.lower() not in (".md", ".txt"):
            continue
        if not md_path.is_file():
            continue
        # 跳过非知识类 txt
        if md_path.suffix.lower() == ".txt" and md_path.name.lower() in ("智能体提示词.txt",):
            continue
        book = detect_book_name(md_path)
        if book in seen_books:
            continue
        system_type = detect_system_type(md_path)
        content = md_path.read_text(encoding="utf-8", errors="ignore")
        if len(content) < 200:
            continue
        items = split_md_content(content, book, str(md_path.relative_to(ROOT)).replace("\\", "/"), system_type)
        if items:
            all_items.extend(items)
            seen_books[book] = {
                "passages_count": len(items),
                "sources": [str(md_path.relative_to(ROOT)).replace("\\", "/")],
                "system_type": system_type,
                "pre_split": False,
            }
            print(f"  + {book} ({system_type}): {len(items)} passages (auto-split)")

    # 4) 处理 xx.theojs.cn-main/content/ 下的山（风水）、相（相术）等典籍
    THEOJS_CONTENT = EASTERN / "xx.theojs.cn-main" / "content"
    if THEOJS_CONTENT.exists():
        print(f"\n[Phase 4] 切分 xx.theojs.cn-main/content 典籍 ...")
        # 只处理山/和相/目录（术数体系），跳过医/（中医）和灵宠/
        for sys_subdir in ["山", "相"]:
            sys_path = THEOJS_CONTENT / sys_subdir
            if not sys_path.exists():
                continue
            for md_path in iter_md_files(sys_path):
                book = detect_book_name(md_path)
                if book in seen_books:
                    continue
                system_type = detect_system_type(md_path)
                content = md_path.read_text(encoding="utf-8", errors="ignore")
                if len(content) < 200:
                    continue
                items = split_md_content(content, book, str(md_path.relative_to(ROOT)).replace("\\", "/"), system_type)
                if items:
                    all_items.extend(items)
                    seen_books[book] = {
                        "passages_count": len(items),
                        "sources": [str(md_path.relative_to(ROOT)).replace("\\", "/")],
                        "system_type": system_type,
                        "pre_split": False,
                    }
                    print(f"  + {book} ({system_type}): {len(items)} passages (auto-split)")
        # 处理 content/ 根目录下的散落典籍（周易参同契、难经等）
        for md_path in THEOJS_CONTENT.glob("*.md"):
            book = detect_book_name(md_path)
            if book in seen_books:
                continue
            # 只收录术数相关典籍（周易参同契等），跳过医学典籍
            system_type = detect_system_type(md_path)
            if system_type == "bazi" and "八字" not in md_path.name and "命" not in md_path.name:
                # 兜底分类为 bazi 的非八字典籍，跳过
                continue
            content = md_path.read_text(encoding="utf-8", errors="ignore")
            if len(content) < 200:
                continue
            items = split_md_content(content, book, str(md_path.relative_to(ROOT)).replace("\\", "/"), system_type)
            if items:
                all_items.extend(items)
                seen_books[book] = {
                    "passages_count": len(items),
                    "sources": [str(md_path.relative_to(ROOT)).replace("\\", "/")],
                    "system_type": system_type,
                    "pre_split": False,
                }
                print(f"  + {book} ({system_type}): {len(items)} passages (auto-split)")

    # 5) 去重（基于 text hash）
    print(f"\n[Dedupe] 去除重复 passages ...")
    seen_hash = set()
    deduped = []
    for item in all_items:
        h = hashlib.md5(item["text"].encode("utf-8")).hexdigest()
        if h in seen_hash:
            continue
        seen_hash.add(h)
        deduped.append(item)

    removed = len(all_items) - len(deduped)
    print(f"  共 {len(all_items)} -> {len(deduped)}（去重 {removed}）")

    # 5) 写入
    print(f"\n[Write] 写入 {INDEX_FILE}")
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        for item in deduped:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    # 6) manifest
    from collections import Counter
    system_counts = Counter(v["system_type"] for v in seen_books.values())
    manifest = {
        "total_passages": len(deduped),
        "total_books": len(seen_books),
        "by_system": dict(system_counts),
        "books": seen_books,
        "avg_passage_len": int(sum(len(it["text"]) for it in deduped) / max(len(deduped), 1)),
        "version": "v2.0",
        "generated_at": "2026-06-25",
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n[DONE]")
    print(f"  total_passages={len(deduped)}")
    print(f"  total_books={len(seen_books)}")
    print(f"  by_system: {dict(system_counts)}")
    print(f"  avg_passage_len={manifest['avg_passage_len']}")
    print(f"  output: {INDEX_FILE}")


if __name__ == "__main__":
    main()
