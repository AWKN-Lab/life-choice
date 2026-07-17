"""U12+U13: G5 PDF 评估综合脚本

评估内容:
1. 扫描本地所有 PDF 文件位置和数量
2. 检查 _archive/data-dumps/md_converted 是否已 OCR
3. 按 file_name 关键词分类术数占比
4. 抽样评估 OCR 可行性(若 PDF 已 OCR,直接评估质量)
"""
import json
import re
from pathlib import Path
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "knowledge" / "processed" / "_g5_pdf_report.json"

# 1. 扫描所有 PDF
print("[1] 扫描本地 PDF 文件 ...")
all_pdfs = list(ROOT.rglob("*.pdf"))
print(f"  本地 PDF 总数: {len(all_pdfs)}")

# 按目录分组
by_dir = defaultdict(list)
for p in all_pdfs:
    rel = p.relative_to(ROOT)
    top = str(rel.parts[0]) if len(rel.parts) > 1 else ""
    by_dir[top].append(str(rel))

print(f"  目录分布:")
for d, files in sorted(by_dir.items(), key=lambda x: -len(x[1])):
    print(f"    {d}: {len(files)} 个 PDF")

# 2. 术数关键词分类
SHUSHU_KEYWORDS = {
    "bazi": ["八字", "四柱", "子平", "三命", "滴天髓", "穷通宝鉴", "渊海子平", "李虚中"],
    "ziwei": ["紫微", "斗数", "紫薇"],
    "liuren": ["六壬", "大六壬", "壬学"],
    "qimen": ["奇门", "遁甲"],
    "meihua": ["梅花", "易数"],
    "fengshui": ["风水", "堪舆", "青囊", "撼龙", "八宅", "阳宅", "阴宅"],
    "xiangshu": ["相术", "面相", "手相", "骨相", "麻衣", "柳庄"],
    "quming": ["取名", "命名", "姓名"],
    "daoism": ["道教", "道藏", "道德经", "庄子", "列子"],
    "zhouyi": ["周易", "易经", "易传", "爻辞"],
    "taiyi": ["太乙", "太一"],
    "tieban": ["铁板", "铁版"],
}

def classify_pdf(filename: str) -> list:
    """根据文件名返回所有匹配的术数分类"""
    cats = []
    for cat, kws in SHUSHU_KEYWORDS.items():
        for kw in kws:
            if kw in filename:
                cats.append(cat)
                break
    return cats

print(f"\n[2] 按术数关键词分类 ...")
classified = {}
uncategorized = []
for pdf in all_pdfs:
    name = pdf.stem
    cats = classify_pdf(name)
    if cats:
        classified[str(pdf.relative_to(ROOT))] = cats
    else:
        uncategorized.append(str(pdf.relative_to(ROOT)))

cat_count = Counter()
for cats in classified.values():
    for c in cats:
        cat_count[c] += 1

print(f"  术数相关 PDF: {len(classified)}")
print(f"  未分类 PDF: {len(uncategorized)}")
print(f"  分类分布: {dict(cat_count)}")

# 3. 检查 _archive/md_converted 是否已 OCR
print(f"\n[3] 检查 OCR 转换状态 ...")
md_converted = ROOT / "_archive" / "data-dumps" / "md_converted"
md_count = 0
if md_converted.exists():
    md_files = list(md_converted.rglob("*.md"))
    md_count = len(md_files)
    print(f"  _archive/data-dumps/md_converted 下 md 文件数: {md_count}")
    # 抽样查看 md 内容质量
    sample_md = md_files[:3] if md_files else []
    for s in sample_md:
        try:
            content = s.read_text(encoding="utf-8", errors="ignore")
            chinese = len(re.findall(r"[\u4e00-\u9fff]", content))
            print(f"    样本 {s.name}: 总字数={len(content)}, 中文字={chinese}, 比例={chinese/max(len(content),1):.2f}")
        except Exception as e:
            print(f"    样本 {s.name}: 读取失败 {e}")
else:
    print(f"  _archive/data-dumps/md_converted 不存在")

# 4. 抽样评估 OCR 可行性(若有 PDF,抽样 10 个)
print(f"\n[4] 抽样评估 OCR 可行性 ...")
sample_size = min(10, len(all_pdfs))
samples = all_pdfs[:sample_size]
ocr_assessment = []

for pdf in samples:
    info = {"path": str(pdf.relative_to(ROOT)), "size_kb": round(pdf.stat().st_size/1024, 1)}
    # 尝试用 PyPDF2 或 pdfplumber 读取
    try:
        import PyPDF2
        with open(pdf, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            info["page_count"] = len(reader.pages)
            # 抽取第一页文本
            text = reader.pages[0].extract_text() if reader.pages else ""
            info["first_page_chars"] = len(text)
            info["first_page_chinese"] = len(re.findall(r"[\u4e00-\u9fff]", text))
            info["has_text_layer"] = len(text) > 50
            info["assessment"] = "有文本层" if len(text) > 50 else "需OCR"
    except ImportError:
        info["assessment"] = "PyPDF2未安装,无法评估"
    except Exception as e:
        info["assessment"] = f"读取失败: {type(e).__name__}"
    ocr_assessment.append(info)
    print(f"  {info['path'][:60]}: {info['assessment']}")

# 5. 总体建议
total_pdf = len(all_pdfs)
shushu_pdf = len(classified)

if total_pdf == 0:
    recommendation = "无可评估 PDF,G5 任务无法执行,延后到资产恢复后"
    ocr_rec = "不适用"
elif md_count > 0 and md_count >= total_pdf * 0.5:
    recommendation = "PDF 已批量 OCR 为 markdown,直接复用 md_converted 目录内容,无需重做 OCR"
    ocr_rec = "复用已有 OCR 结果"
elif shushu_pdf >= total_pdf * 0.3:
    recommendation = f"术数 PDF 占比 {shushu_pdf/total_pdf:.0%},建议全量 OCR"
    ocr_rec = "全量 OCR"
elif shushu_pdf > 0:
    recommendation = f"术数 PDF 占比 {shushu_pdf/total_pdf:.0%},建议部分 OCR(仅术数相关)"
    ocr_rec = "部分 OCR"
else:
    recommendation = "无可识别的术数 PDF,延后 G5"
    ocr_rec = "不 OCR"

print(f"\n[5] 总体建议: {recommendation}")
print(f"  OCR 建议: {ocr_rec}")

# 6. 输出报告
report = {
    "total_pdf_local": total_pdf,
    "shushu_pdf_count": shushu_pdf,
    "uncategorized_pdf_count": len(uncategorized),
    "category_distribution": dict(cat_count),
    "md_converted_count": md_count,
    "overall_recommendation": recommendation,
    "ocr_recommendation": ocr_rec,
    "samples_assessed": ocr_assessment,
    "note": "本地 PDF 数量远少于盘点报告的 1639,大量 PDF 可能在 Git dangling objects 中或已丢失",
}

OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[6] 报告已写入: {OUTPUT}")
