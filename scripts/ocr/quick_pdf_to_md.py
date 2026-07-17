"""
PyMuPDF PDF -> Markdown 转换（用于有文本层的 PDF）
"""
import sys
import re
import fitz
from pathlib import Path

def page_to_markdown(page, page_num):
    """将单页转换为 Markdown"""
    text = page.get_text()

    # 基础清理
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    # 简单规则：基于字号的标题判断
    blocks = page.get_text("dict")["blocks"]
    md_lines = []

    for block in blocks:
        if "lines" not in block:
            # 可能是图片
            continue
        for line in block["lines"]:
            line_text = ""
            max_size = 0
            is_bold = False
            for span in line["spans"]:
                line_text += span["text"]
                if span["size"] > max_size:
                    max_size = span["size"]
                if "bold" in span.get("font", "").lower() or span.get("flags", 0) & 16:
                    is_bold = True
            line_text = line_text.strip()
            if not line_text:
                continue

            # 判断标题级别
            if max_size >= 18:
                md_lines.append(f"# {line_text}")
            elif max_size >= 15:
                md_lines.append(f"## {line_text}")
            elif max_size >= 13:
                md_lines.append(f"### {line_text}")
            elif is_bold and max_size >= 11:
                md_lines.append(f"**{line_text}**")
            else:
                md_lines.append(line_text)

    return "\n\n".join(md_lines)


def pdf_to_markdown(pdf_path: str, output_path: str):
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    total = len(doc)
    print(f"📖 处理 PDF: {pdf_path.name}")
    print(f"📄 总页数: {total}")

    all_content = [f"# {pdf_path.stem}\n"]
    all_content.append(f"> 源文件：`{pdf_path.name}`  |  页数：{total}  |  工具：PyMuPDF\n")
    all_content.append("\n---\n")

    for i, page in enumerate(doc):
        page_num = i + 1
        page_md = page_to_markdown(page, page_num)
        if page_md.strip():
            all_content.append(f"\n## 第 {page_num} 页\n")
            all_content.append(page_md)
        if page_num % 20 == 0 or page_num == total:
            print(f"  ✅ {page_num}/{total} 页处理完成")

    doc.close()

    output_path.write_text("\n".join(all_content), encoding="utf-8")
    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"\n🎉 转换完成: {output_path}")
    print(f"📦 文件大小: {size_mb:.2f} MB")
    return str(output_path)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python quick_pdf_to_md.py <input.pdf> <output.md>")
        sys.exit(1)

    pdf_to_markdown(sys.argv[1], sys.argv[2])
