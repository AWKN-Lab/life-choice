#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Git 恢复资产文本提取公共模块（U1+U2 共用）

提供能力：
- detect_zip_inner_type: 判断 zip 真实类型（docx_direct/docx_in_zip/xlsx_direct/...）
- extract_text: 根据类型调度提取函数
- detect_system_type_from_text: 基于文本内容关键词判断术数体系分类
- detect_system_type_with_meta: 综合优先级（元数据 > 文本内容 > 文件名 > other）

依赖：
- python-docx, openpyxl, ebooklib, bs4
"""
import zipfile
import re
from pathlib import Path
from typing import Optional


def detect_zip_inner_type(zip_path: Path) -> str:
    """判断 zip 文件的真实类型

    这些 zip 可能是:
    1. 本身就是 docx/xlsx/epub（OOXML 格式，本身是 zip）
    2. 包含 docx/xlsx/epub 文件的 zip 包
    """
    try:
        with zipfile.ZipFile(zip_path) as zf:
            names = set(zf.namelist())
            # 情况1: 本身就是 OOXML 格式
            if '[Content_Types].xml' in names:
                ct = zf.read('[Content_Types].xml').decode('utf-8', errors='ignore')
                if 'wordprocessingml' in ct:
                    return 'docx_direct'
                if 'spreadsheetml' in ct:
                    return 'xlsx_direct'
                if 'epub' in ct.lower():
                    return 'epub_direct'
            # 情况2: 包含 docx/xlsx/epub 文件
            for n in names:
                lower = n.lower()
                if lower.endswith('.docx') and not lower.startswith('~'):
                    return 'docx_in_zip'
                if lower.endswith('.xlsx') and not lower.startswith('~'):
                    return 'xlsx_in_zip'
                if lower.endswith('.epub'):
                    return 'epub_in_zip'
                if lower.endswith('.pdf'):
                    return 'pdf'
                if lower.endswith('.txt'):
                    return 'txt'
                if lower.endswith('.md'):
                    return 'md'
            # 检查是否有 mimetype 文件（epub 标志）
            if 'mimetype' in names:
                try:
                    mt = zf.read('mimetype').decode('utf-8', errors='ignore').strip()
                    if 'epub' in mt.lower():
                        return 'epub_direct'
                except Exception:
                    pass
            return 'unknown'
    except Exception as e:
        return f'error: {e}'


def extract_docx_direct(zip_path: Path) -> str:
    """zip 本身就是 docx，直接用 python-docx 读取"""
    from docx import Document
    doc = Document(str(zip_path))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_docx_in_zip(zip_path: Path) -> str:
    """zip 内包含 docx 文件"""
    from docx import Document
    with zipfile.ZipFile(zip_path) as zf:
        docx_names = [n for n in zf.namelist()
                      if n.lower().endswith('.docx') and not n.lower().startswith('~')]
        if not docx_names:
            return ""
        # 优先取第一个非~开头的
        with zf.open(docx_names[0]) as f:
            doc = Document(f)
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_xlsx_direct(zip_path: Path) -> str:
    """zip 本身就是 xlsx"""
    from openpyxl import load_workbook
    wb = load_workbook(str(zip_path), read_only=True, data_only=True)
    texts = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            for cell in row:
                if cell is not None and str(cell).strip():
                    texts.append(str(cell).strip())
    return "\n".join(texts)


def extract_xlsx_in_zip(zip_path: Path) -> str:
    """zip 内包含 xlsx 文件"""
    from openpyxl import load_workbook
    with zipfile.ZipFile(zip_path) as zf:
        xlsx_names = [n for n in zf.namelist()
                      if n.lower().endswith('.xlsx') and not n.lower().startswith('~')]
        if not xlsx_names:
            return ""
        with zf.open(xlsx_names[0]) as f:
            wb = load_workbook(f, read_only=True, data_only=True)
            texts = []
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    for cell in row:
                        if cell is not None and str(cell).strip():
                            texts.append(str(cell).strip())
            return "\n".join(texts)


def extract_epub_direct(zip_path: Path) -> str:
    """zip 本身就是 epub"""
    from ebooklib import epub, ITEM_DOCUMENT
    from bs4 import BeautifulSoup
    book = epub.read_epub(str(zip_path))
    texts = []
    for item in book.get_items_of_type(ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), 'html.parser')
        texts.append(soup.get_text(separator='\n'))
    return "\n".join(texts)


def extract_epub_in_zip(zip_path: Path) -> str:
    """zip 内包含 epub 文件"""
    from ebooklib import epub, ITEM_DOCUMENT
    from bs4 import BeautifulSoup
    with zipfile.ZipFile(zip_path) as zf:
        epub_names = [n for n in zf.namelist() if n.lower().endswith('.epub')]
        if not epub_names:
            return ""
        with zf.open(epub_names[0]) as f:
            book = epub.read_epub(f)
            texts = []
            for item in book.get_items_of_type(ITEM_DOCUMENT):
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                texts.append(soup.get_text(separator='\n'))
            return "\n".join(texts)


def extract_text_from_txt_md(zip_path: Path) -> str:
    """从 zip 中提取 txt/md 文本"""
    with zipfile.ZipFile(zip_path) as zf:
        for n in zf.namelist():
            lower = n.lower()
            if lower.endswith('.txt') or lower.endswith('.md'):
                with zf.open(n) as f:
                    raw = f.read()
                # 尝试多种编码
                for enc in ('utf-8', 'gb18030', 'gbk', 'utf-16'):
                    try:
                        return raw.decode(enc)
                    except UnicodeDecodeError:
                        continue
                return raw.decode('utf-8', errors='ignore')
    return ""


def extract_text(zip_path: Path, file_type: str) -> str:
    """根据类型调度提取函数"""
    handlers = {
        'docx_direct': extract_docx_direct,
        'docx_in_zip': extract_docx_in_zip,
        'xlsx_direct': extract_xlsx_direct,
        'xlsx_in_zip': extract_xlsx_in_zip,
        'epub_direct': extract_epub_direct,
        'epub_in_zip': extract_epub_in_zip,
        'txt': extract_text_from_txt_md,
        'md': extract_text_from_txt_md,
    }
    handler = handlers.get(file_type)
    if handler:
        return handler(zip_path)
    return ""


# ===== 基于文本内容的术数体系分类 =====

# 关键词权重表（匹配越多权重越高，用于细分）
SYSTEM_KEYWORDS = {
    'bazi': ['八字', '四柱', '十神', '日主', '比肩', '劫财', '食神', '伤官', '偏财', '正财',
             '七杀', '正官', '偏印', '正印', '大运', '流年', '子平', '滴天髓', '三命通会',
             '渊海子平', '穷通宝鉴', '神峰通考', '命理', '五行', '天干', '地支',
             '甲乙丙丁', '寅卯辰巳', '用神', '忌神', '格局'],
    'ziwei': ['紫微', '斗数', '太微', '玄微', '紫微斗数', '命宫', '身宫', '主星', '辅星',
              '十四主星', '天府', '天梁', '天机', '太阳', '太阴', '武曲', '天相', '巨门',
              '贪狼', '破军', '七杀', '廉贞', '左辅', '右弼', '文昌', '文曲'],
    'liuren': ['六壬', '大六壬', '毕法', '壬归', '壬学', '天盘', '地盘', '月将',
               '贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常',
               '玄武', '太阴', '天后', '四课', '三传'],
    'liuyao': ['六爻', '六文', '断易', '卜筮', '增删卜易', '黄金策', '世爻', '应爻',
               '官鬼', '妻财', '父母', '子孙', '兄弟', '用神', '原神', '忌神', '仇神',
               '六亲', '六神', '玄武', '白虎', '螣蛇', '勾陈', '朱雀', '青龙',
               '卦身', '世身', '归魂', '游魂', '六冲', '六合', '伏吟', '反吟'],
    'meihua': ['梅花', '梅花易数', '体卦', '用卦', '本卦', '互卦', '变卦', '体用',
               '邵雍', '梅花心易'],
    'qimen': ['奇门', '遁甲', '九星', '八门', '八神', '值符', '值使', '天蓬', '天芮',
              '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英', '休门', '生门',
              '伤门', '杜门', '景门', '死门', '惊门', '开门'],
    'zhouyi': ['周易', '易经', '易传', '系辞', '彖传', '象传', '文言', '说卦',
               '序卦', '杂卦', '乾坤', '屯蒙', '需讼', '师比', '小畜', '履泰'],
    'fengshui': ['风水', '堪舆', '葬经', '撼龙', '青囊', '水龙', '阳宅', '宅经',
                 '入地眼', '催官', '博山', '玉尺', '雪心', '金锁', '罗盘', '二十四山',
                 '玄空', '飞星', '三元', '三合'],
    'quming': ['姓名', '起名', '取名', '五行取名', '三才', '五格', '天格', '人格',
               '地格', '外格', '总格'],
    'xiangshu': ['相术', '相法', '冰鉴', '神鉴', '柳庄', '面相', '手相', '骨相',
                 '体相', '痣相'],
    'daoism': ['道德经', '清静经', '阴符经', '道法', '老子', '庄子', '内丹',
               '丹道', '修真'],
    'taiyi': ['太乙', '太乙神数'],
    'yuyan': ['推背图', '烧饼歌', '马前课', '梅花诗', '预言'],
}


def detect_system_type_from_text(text: str) -> str:
    """基于文本内容关键词判断术数体系分类

    策略：
    1. 取文本前 5000 字（足够覆盖书籍前言/目录）
    2. 统计每个体系的关键词命中次数
    3. 取命中次数最多的体系
    4. 全部为 0 时返回 'other'
    """
    if not text or len(text) < 50:
        return 'other'

    # 取前 5000 字（涵盖目录/前言）
    sample = text[:5000]

    scores = {}
    for system, keywords in SYSTEM_KEYWORDS.items():
        score = 0
        for kw in keywords:
            count = sample.count(kw)
            score += count
        if score > 0:
            scores[system] = score

    if not scores:
        return 'other'

    # 取最高分（同分时按字典序优先，确保稳定）
    best = max(scores.items(), key=lambda x: (x[1], x[0]))
    return best[0]


def detect_system_type_with_meta(
    text: str,
    zip_path: Optional[Path] = None,
    book_type: Optional[str] = None,
    title: Optional[str] = None,
) -> str:
    """综合优先级判断术数体系分类

    优先级：
    1. book_type 元数据（manifest_epub_xlsx.csv 提供）
    2. title 元数据（manifest_epub_xlsx.csv 提供）
    3. 文本内容关键词
    4. zip 文件名（sha 无意义，几乎都返回 other）
    5. 'other' 兜底
    """
    # 1. book_type 映射
    if book_type:
        bt = book_type.strip()
        # 中国术数 12 分类映射
        if bt in ('占星', '塔罗'):
            return 'other'  # 西方术数，归 other
        if bt == '命理综合':
            return 'bazi'  # 命理综合偏向八字
        if bt == '综合':
            # 综合需要进一步看内容
            pass
        # 其他直接映射
        mapping = {
            '八字': 'bazi', '紫微': 'ziwei', '斗数': 'ziwei',
            '六壬': 'liuren', '六爻': 'liuyao', '梅花': 'meihua',
            '奇门': 'qimen', '周易': 'zhouyi', '易经': 'zhouyi',
            '风水': 'fengshui', '堪舆': 'fengshui',
            '姓名': 'quming', '起名': 'quming', '取名': 'quming',
            '相术': 'xiangshu', '面相': 'xiangshu',
            '道德经': 'daoism', '道学': 'daoism',
        }
        for k, v in mapping.items():
            if k in bt:
                return v

    # 2. title 元数据（如果有）
    if title:
        from knowledge_ingest import detect_system_type
        # 用一个虚拟 Path 复用现有逻辑
        try:
            virtual_path = Path(f"/tmp/{title}.md")
            sys_type = detect_system_type(virtual_path)
            if sys_type != 'other':
                return sys_type
        except Exception:
            pass

    # 3. 文本内容关键词
    text_sys = detect_system_type_from_text(text)
    if text_sys != 'other':
        return text_sys

    # 4. zip 文件名（sha 通常无意义）
    if zip_path:
        from knowledge_ingest import detect_system_type
        try:
            file_sys = detect_system_type(zip_path)
            if file_sys != 'other':
                return file_sys
        except Exception:
            pass

    return 'other'


def detect_book_name_from_meta(
    zip_path: Path,
    title: Optional[str] = None,
    author: Optional[str] = None,
) -> str:
    """从元数据或文件名提取书名

    优先级：
    1. title 元数据
    2. zip 文件名（sha）
    """
    if title and title.strip():
        # 清理标题
        name = title.strip()
        # 截断过长标题
        if len(name) > 100:
            name = name[:100]
        return name

    # 兜底用 sha
    return zip_path.stem
