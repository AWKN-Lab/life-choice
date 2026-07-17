#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
子平经典知识库 - PDF/DOCX 文本提取脚本
功能：批量提取 PDF 和 DOCX 文件内容，保存为纯文本或 Markdown 格式
"""

import os
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Tuple
import re

# PDF 处理
try:
    import pdfplumber
    PDF_SUPPORT = True
except ImportError:
    print("警告：pdfplumber 未安装，PDF 提取功能将不可用")
    print("安装：pip install pdfplumber")
    PDF_SUPPORT = False

try:
    import fitz  # PyMuPDF
    PYMUPDF_SUPPORT = True
except ImportError:
    print("警告：PyMuPDF 未安装，高级 PDF 处理功能将不可用")
    print("安装：pip install PyMuPDF")
    PYMUPDF_SUPPORT = False

# DOCX 处理
try:
    from docx import Document
    DOCX_SUPPORT = True
except ImportError:
    print("警告：python-docx 未安装，DOCX 提取功能将不可用")
    print("安装：pip install python-docx")
    DOCX_SUPPORT = False


class TextExtractor:
    """文本提取器"""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 统计信息
        self.stats = {
            'pdf_success': 0,
            'pdf_failed': 0,
            'docx_success': 0,
            'docx_failed': 0,
            'total_files': 0
        }
    
    def extract_pdf(self, pdf_path: Path) -> Tuple[str, Dict]:
        """
        提取 PDF 文件内容
        
        Returns:
            Tuple[文本内容，元数据]
        """
        if not PDF_SUPPORT:
            raise ImportError("pdfplumber 未安装")
        
        text_content = []
        metadata = {
            'file': pdf_path.name,
            'pages': 0,
            'chapters': []
        }
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                metadata['pages'] = len(pdf.pages)
                
                for i, page in enumerate(pdf.pages, 1):
                    # 提取文本
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(f"--- 第 {i} 页 ---\n")
                        text_content.append(page_text)
                        text_content.append("\n")
                    
                    # 尝试识别章节标题（简化版）
                    # 可以根据字体大小、位置等更精确识别
                    if page_text:
                        lines = page_text.split('\n')
                        for line in lines[:10]:  # 检查前 10 行
                            if len(line.strip()) > 2 and len(line.strip()) < 50:
                                # 可能是标题
                                if not any(c.isdigit() for c in line.strip()):
                                    metadata['chapters'].append(line.strip())
            
            return '\n'.join(text_content), metadata
            
        except Exception as e:
            print(f"❌ 提取 PDF 失败 {pdf_path.name}: {str(e)}")
            raise
    
    def extract_pdf_pymupdf(self, pdf_path: Path) -> Tuple[str, Dict]:
        """使用 PyMuPDF 提取（适合扫描版或复杂 PDF）"""
        if not PYMUPDF_SUPPORT:
            raise ImportError("PyMuPDF 未安装")
        
        text_content = []
        metadata = {
            'file': pdf_path.name,
            'pages': 0,
            'chapters': []
        }
        
        try:
            doc = fitz.open(pdf_path)
            metadata['pages'] = len(doc)
            
            for i, page in enumerate(doc, 1):
                page_text = page.get_text()
                if page_text:
                    text_content.append(f"--- 第 {i} 页 ---\n")
                    text_content.append(page_text)
                    text_content.append("\n")
            
            doc.close()
            return '\n'.join(text_content), metadata
            
        except Exception as e:
            print(f"❌ PyMuPDF 提取失败 {pdf_path.name}: {str(e)}")
            raise
    
    def extract_docx(self, docx_path: Path) -> Tuple[str, Dict]:
        """提取 DOCX 文件内容"""
        if not DOCX_SUPPORT:
            raise ImportError("python-docx 未安装")
        
        text_content = []
        metadata = {
            'file': docx_path.name,
            'paragraphs': 0,
            'chapters': []
        }
        
        try:
            doc = Document(docx_path)
            metadata['paragraphs'] = len(doc.paragraphs)
            
            current_chapter = None
            
            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                
                # 识别章节标题（样式为 Heading 或粗体大字号）
                if para.style.name.startswith('Heading') or \
                   (para.runs and para.runs[0].bold and len(text) < 50):
                    current_chapter = text
                    metadata['chapters'].append(current_chapter)
                    text_content.append(f"\n## {current_chapter}\n")
                else:
                    text_content.append(text)
            
            return '\n'.join(text_content), metadata
            
        except Exception as e:
            print(f"❌ 提取 DOCX 失败 {docx_path.name}: {str(e)}")
            raise
    
    def clean_text(self, text: str) -> str:
        """
        清洗文本
        - 去除页眉页脚
        - 去除多余空行
        - 规范化空白
        """
        # 去除页码（如 "第 123 页"、"123" 单独成行）
        text = re.sub(r'\n\s*(第\d+ 页 | \d+)\s*\n', '\n', text)
        
        # 去除过多空行（保留最多 2 个连续空行）
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # 去除行首行尾空白
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)
        
        return text
    
    def process_file(self, file_path: Path, use_pymupdf: bool = False) -> bool:
        """处理单个文件"""
        print(f"\n处理：{file_path.name}")
        
        try:
            # 根据扩展名选择提取方法
            if file_path.suffix.lower() == '.pdf':
                if use_pymupdf and PYMUPDF_SUPPORT:
                    text, metadata = self.extract_pdf_pymupdf(file_path)
                else:
                    text, metadata = self.extract_pdf(file_path)
                self.stats['pdf_success'] += 1
                
            elif file_path.suffix.lower() == '.docx':
                text, metadata = self.extract_docx(file_path)
                self.stats['docx_success'] += 1
            else:
                print(f"⚠️  跳过不支持的格式：{file_path.suffix}")
                return False
            
            # 清洗文本
            text = self.clean_text(text)
            
            # 添加元数据头部
            import datetime
            header = [
                f"# {file_path.stem}",
                f"",
                f"**来源文件**: {file_path.name}",
                f"**提取时间**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                f"**页数/段落数**: {metadata.get('pages', metadata.get('paragraphs', 'N/A'))}",
                f"",
                f"---",
                f"",
            ]
            
            full_text = '\n'.join(header) + text
            
            # 保存
            output_path = self.output_dir / f"{file_path.stem}.md"
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_text)
            
            print(f"✅ 提取成功 → {output_path.name}")
            print(f"   章节数：{len(metadata.get('chapters', []))}")
            
            # 保存元数据
            import json
            meta_path = self.output_dir / f"{file_path.stem}.meta.json"
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            return True
            
        except Exception as e:
            print(f"❌ 处理失败：{str(e)}")
            if file_path.suffix.lower() == '.pdf':
                self.stats['pdf_failed'] += 1
            elif file_path.suffix.lower() == '.docx':
                self.stats['docx_failed'] += 1
            return False
    
    def batch_process(self, patterns: List[str] = None) -> None:
        """
        批量处理文件
        
        Args:
            patterns: 文件匹配模式列表，如 ['*.pdf', '*.docx']
        """
        if patterns is None:
            patterns = ['*.pdf', '*.docx']
        
        files_to_process = []
        for pattern in patterns:
            files_to_process.extend(self.input_dir.glob(pattern))
        
        # 去重（同一文件可能有多个匹配）
        files_to_process = list(set(files_to_process))
        
        self.stats['total_files'] = len(files_to_process)
        
        print(f"\n{'='*60}")
        print(f"子平经典知识库 - 文本提取工具")
        print(f"{'='*60}")
        print(f"输入目录：{self.input_dir}")
        print(f"输出目录：{self.output_dir}")
        print(f"待处理文件：{len(files_to_process)} 个")
        print(f"{'='*60}\n")
        
        # 按优先级排序（P0 典籍优先）
        priority_keywords = ['滴天髓', '子平真诠', '渊海子平', '穷通宝鉴', '神峰通考']
        
        def priority_sort_key(path: Path):
            name = path.name
            for i, keyword in enumerate(priority_keywords):
                if keyword in name:
                    return (0, i, name)  # P0 优先
            return (1, 0, name)  # 其他
        
        files_to_process.sort(key=priority_sort_key)
        
        # 处理文件
        for file_path in files_to_process:
            self.process_file(file_path)
        
        # 输出统计
        print(f"\n{'='*60}")
        print(f"提取完成统计")
        print(f"{'='*60}")
        print(f"总文件数：{self.stats['total_files']}")
        print(f"PDF 成功：{self.stats['pdf_success']}")
        print(f"PDF 失败：{self.stats['pdf_failed']}")
        print(f"DOCX 成功：{self.stats['docx_success']}")
        print(f"DOCX 失败：{self.stats['docx_failed']}")
        print(f"{'='*60}\n")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='子平经典知识库 - PDF/DOCX 文本提取工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 提取所有 PDF 和 DOCX 文件
  python extract_texts.py --input "玄学 data" --output "knowledge-base/ziping/sources"
  
  # 只提取 PDF（使用 PyMuPDF）
  python extract_texts.py --input "玄学 data" --output "sources" --pymupdf
  
  # 只处理特定文件
  python extract_texts.py --input "玄学 data" --output "sources" --pattern "*.docx"
        """
    )
    
    parser.add_argument(
        '--input', '-i',
        type=str,
        default='玄学 data',
        help='输入目录路径（默认：玄学 data）'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='knowledge-base/ziping/sources',
        help='输出目录路径（默认：knowledge-base/ziping/sources）'
    )
    
    parser.add_argument(
        '--pattern', '-p',
        type=str,
        nargs='+',
        default=['*.pdf', '*.docx'],
        help='文件匹配模式（默认：*.pdf *.docx）'
    )
    
    parser.add_argument(
        '--pymupdf',
        action='store_true',
        help='使用 PyMuPDF 提取 PDF（适合扫描版）'
    )
    
    args = parser.parse_args()
    
    # 创建提取器
    extractor = TextExtractor(args.input, args.output)
    
    # 批量处理
    extractor.batch_process(args.pattern)


if __name__ == '__main__':
    main()
