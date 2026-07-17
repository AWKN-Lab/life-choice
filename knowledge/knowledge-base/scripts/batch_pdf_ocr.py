#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量 PDF OCR 处理器 - 处理多本扫描版命理书籍
"""

import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime

# Tesseract 路径
TESSERACT_CMD = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def setup_tesseract():
    """配置 Tesseract"""
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    return pytesseract

def process_single_pdf(pdf_path, output_dir, lang='chi_sim+eng', dpi=300):
    """处理单个 PDF 文件"""
    from pdf2image import convert_from_path
    import pytesseract
    
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 输出文件名
    output_name = pdf_path.stem + '.ocr.txt'
    output_path = output_dir / output_name
    
    print(f"\n{'='*60}")
    print(f"处理: {pdf_path.name}")
    print(f"输出: {output_path}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    # poppler 路径
    poppler_path = r'C:\Program Files\poppler\poppler-25.12.0\Library\bin'
    
    try:
        # 转换 PDF 为图像
        print(f"[1/3] 转换 PDF 为图像 (DPI={dpi})...")
        images = convert_from_path(str(pdf_path), dpi=dpi, poppler_path=poppler_path)
        total_pages = len(images)
        print(f"      共 {total_pages} 页")
        
        # OCR 处理
        print(f"[2/3] OCR 识别中...")
        all_text = []
        all_text.append(f"# {pdf_path.stem}\n")
        all_text.append(f"来源: {pdf_path.name}\n")
        all_text.append(f"OCR时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        all_text.append(f"页数: {total_pages}\n")
        all_text.append("="*60 + "\n\n")
        
        for i, image in enumerate(images, 1):
            print(f"      第 {i}/{total_pages} 页...", end='\r')
            text = pytesseract.image_to_string(image, lang=lang)
            all_text.append(f"\n--- 第 {i} 页 ---\n\n")
            all_text.append(text)
            all_text.append("\n")
        
        print(f"      完成 {total_pages} 页 OCR")
        
        # 保存结果
        print(f"[3/3] 保存结果...")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(''.join(all_text))
        
        elapsed = time.time() - start_time
        print(f"      已保存: {output_path}")
        print(f"      耗时: {elapsed:.1f} 秒 ({elapsed/total_pages:.1f} 秒/页)")
        
        return {
            'success': True,
            'pages': total_pages,
            'output': str(output_path),
            'time': elapsed
        }
        
    except Exception as e:
        print(f"[ERROR] 处理失败: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def batch_process(pdf_dir, output_dir, lang='chi_sim+eng', dpi=300):
    """批量处理目录中的所有 PDF"""
    pdf_dir = Path(pdf_dir)
    
    # 查找所有 PDF
    pdf_files = list(pdf_dir.glob('*.pdf'))
    
    if not pdf_files:
        print(f"[ERROR] 未找到 PDF 文件: {pdf_dir}")
        return
    
    print(f"\n{'#'*60}")
    print(f"批量 OCR 处理")
    print(f"{'#'*60}")
    print(f"目录: {pdf_dir}")
    print(f"文件数: {len(pdf_files)}")
    print(f"语言: {lang}")
    print(f"DPI: {dpi}")
    
    # 统计
    results = []
    total_start = time.time()
    
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"\n[{i}/{len(pdf_files)}] ", end='')
        result = process_single_pdf(pdf_file, output_dir, lang, dpi)
        result['file'] = pdf_file.name
        results.append(result)
    
    # 总结报告
    total_time = time.time() - total_start
    successful = sum(1 for r in results if r['success'])
    total_pages = sum(r.get('pages', 0) for r in results)
    
    print(f"\n\n{'#'*60}")
    print(f"处理完成!")
    print(f"{'#'*60}")
    print(f"成功: {successful}/{len(pdf_files)}")
    print(f"总页数: {total_pages}")
    print(f"总耗时: {total_time:.1f} 秒")
    print(f"平均: {total_time/total_pages:.1f} 秒/页" if total_pages > 0 else "")
    print(f"\n输出目录: {output_dir}")
    
    # 保存处理报告
    report_path = Path(output_dir) / 'ocr_report.txt'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(f"OCR 处理报告\n")
        f.write(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"{'='*60}\n\n")
        for r in results:
            status = "✓" if r['success'] else "✗"
            f.write(f"{status} {r['file']}\n")
            if r['success']:
                f.write(f"   页数: {r['pages']}, 耗时: {r['time']:.1f}s\n")
                f.write(f"   输出: {r['output']}\n")
            else:
                f.write(f"   错误: {r.get('error', 'Unknown')}\n")
            f.write("\n")
    
    print(f"报告已保存: {report_path}")

def main():
    parser = argparse.ArgumentParser(description='批量 PDF OCR 处理器')
    parser.add_argument('input_dir', help='输入 PDF 目录')
    parser.add_argument('-o', '--output', default='ocr_output', help='输出目录')
    parser.add_argument('-l', '--lang', default='chi_sim+eng', 
                       help='OCR 语言 (默认: chi_sim+eng)')
    parser.add_argument('--dpi', type=int, default=300, help='PDF 转图像 DPI')
    
    args = parser.parse_args()
    
    # 检查依赖
    try:
        import pytesseract
        from pdf2image import convert_from_path
        from PIL import Image
    except ImportError as e:
        print(f"[ERROR] 缺少依赖: {e}")
        print("请安装: pip install pytesseract pdf2image pillow")
        sys.exit(1)
    
    # 配置 Tesseract
    setup_tesseract()
    
    # 批量处理
    batch_process(args.input_dir, args.output, args.lang, args.dpi)

if __name__ == '__main__':
    main()
