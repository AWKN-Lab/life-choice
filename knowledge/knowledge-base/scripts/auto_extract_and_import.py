#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动化PDF提取和数据导入脚本
一键完成：安装OCR → 提取PDF → 补充数据
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path
from datetime import datetime

# 配置
DATA_DIR = r"C:\Users\10919\Desktop\AI\玄学data"
DB_PATH = r"c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\mingli.db"
EXTRACTED_DIR = r"c:\Users\10919\Desktop\AI\knowledge-base\ziping\extracted_texts"

def log(message, level="INFO"):
    """打印日志"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")

def run_command(cmd, description, timeout=300):
    """运行命令"""
    log(f"开始: {description}")
    log(f"命令: {cmd}")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.returncode == 0:
            log(f"✅ 成功: {description}")
            return True, result.stdout
        else:
            log(f"❌ 失败: {description}", "ERROR")
            log(f"错误: {result.stderr}", "ERROR")
            return False, result.stderr
    except subprocess.TimeoutExpired:
        log(f"⏱️ 超时: {description}", "WARNING")
        return False, "Timeout"
    except Exception as e:
        log(f"❌ 异常: {description} - {e}", "ERROR")
        return False, str(e)

def check_and_install_ocr():
    """检查并安装OCR环境"""
    log("="*60)
    log("步骤 1/3: 检查并安装OCR环境")
    log("="*60)
    
    # 检查是否已安装
    try:
        import paddle
        import paddleocr
        import fitz
        log("✅ OCR环境已安装，跳过安装步骤")
        return True
    except ImportError:
        log("OCR环境未安装，开始安装...")
    
    # 安装依赖
    packages = [
        ("pip install paddlepaddle -i https://pypi.tuna.tsinghua.edu.cn/simple", "PaddlePaddle"),
        ("pip install paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple", "PaddleOCR"),
        ("pip install PyMuPDF", "PyMuPDF"),
        ("pip install pdfplumber", "pdfplumber"),
        ("pip install pdf2image", "pdf2image"),
        ("pip install pillow", "Pillow"),
        ("pip install numpy", "NumPy"),
        ("pip install tqdm", "tqdm"),
    ]
    
    success_count = 0
    for cmd, name in packages:
        success, _ = run_command(cmd, f"安装 {name}")
        if success:
            success_count += 1
        time.sleep(1)  # 避免请求过快
    
    log(f"安装完成: {success_count}/{len(packages)} 个包")
    return success_count >= len(packages) - 2  # 允许2个失败

def extract_pdfs():
    """提取PDF文件"""
    log("="*60)
    log("步骤 2/3: 提取PDF文件")
    log("="*60)
    
    # 查找所有PDF文件
    pdf_files = []
    for ext in ["*.pdf", "**/*.pdf"]:
        pdf_files.extend(Path(DATA_DIR).glob(ext))
    
    # 过滤掉非命理相关的PDF
    keywords = ["滴天髓", "穷通宝鉴", "神峰通考", "三命通会", "渊海子平", 
                "子平真诠", "命理", "八字", "袁氏命谱", "命理金鉴"]
    
    mingli_pdfs = []
    for pdf in pdf_files:
        name = pdf.name
        if any(kw in name for kw in keywords):
            mingli_pdfs.append(pdf)
    
    log(f"找到 {len(mingli_pdfs)} 个命理相关PDF文件")
    
    if not mingli_pdfs:
        log("没有找到PDF文件", "WARNING")
        return []
    
    # 创建提取目录
    os.makedirs(EXTRACTED_DIR, exist_ok=True)
    
    # 导入提取模块
    sys.path.insert(0, r"c:\Users\10919\Desktop\AI\knowledge-base\ziping\agents\ocr-expert\scripts")
    
    try:
        from extract_pdf_text import PDFTextExtractor
        extractor = PDFTextExtractor()
        
        # 处理前5个PDF（避免时间过长）
        process_limit = 5
        for i, pdf_path in enumerate(mingli_pdfs[:process_limit], 1):
            log(f"\n处理 {i}/{min(process_limit, len(mingli_pdfs))}: {pdf_path.name}")
            extractor.process_pdf(str(pdf_path))
        
        # 生成报告
        report = extractor.generate_report()
        
        return extractor.results
        
    except Exception as e:
        log(f"提取过程出错: {e}", "ERROR")
        return []

def import_to_database(extracted_results):
    """将提取的数据导入数据库"""
    log("="*60)
    log("步骤 3/3: 导入数据到数据库")
    log("="*60)
    
    try:
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        total_cases = 0
        imported_cases = 0
        
        for result in extracted_results:
            cases = result.get('cases', [])
            source = result.get('filename', '未知来源')
            
            for case in cases:
                total_cases += 1
                try:
                    # 检查是否已存在
                    cursor.execute('''
                        SELECT id FROM basic_info 
                        WHERE name LIKE ?
                    ''', (f"%{case['day_master']}%",))
                    
                    if cursor.fetchone():
                        continue
                    
                    # 插入新记录
                    cursor.execute('''
                        INSERT INTO basic_info 
                        (name, gender, birth_date, birth_time, birth_location, lunar_date)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        f"{case['day_master']}命例-{source}",
                        case.get('gender', '男'),
                        None,
                        case['hour_pillar'][1] + '时' if len(case['hour_pillar']) >= 2 else None,
                        f"四柱:{case.get('year_pillar','')},{case['month_pillar']},{case['day_pillar']},{case['hour_pillar']}",
                        f"日干:{case['day_master']},月令:{case['month_branch']}"
                    ))
                    imported_cases += 1
                    
                except Exception as e:
                    log(f"导入命例失败: {e}", "WARNING")
        
        conn.commit()
        conn.close()
        
        log(f"命例统计: 找到 {total_cases} 个，导入 {imported_cases} 个新命例")
        return imported_cases
        
    except Exception as e:
        log(f"数据库导入失败: {e}", "ERROR")
        return 0

def generate_summary_report(start_time, ocr_success, extracted_results, imported_count):
    """生成总结报告"""
    duration = time.time() - start_time
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'duration_seconds': round(duration, 2),
        'steps': {
            'ocr_install': ocr_success,
            'pdf_extraction': len(extracted_results) > 0,
            'database_import': imported_count > 0
        },
        'results': {
            'pdfs_processed': len(extracted_results),
            'total_cases_found': sum(len(r.get('cases', [])) for r in extracted_results),
            'cases_imported': imported_count
        }
    }
    
    # 保存报告
    report_file = f"auto_extract_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    log("="*60)
    log("自动化流程完成！")
    log("="*60)
    log(f"总耗时: {duration:.1f} 秒")
    log(f"OCR安装: {'✅' if ocr_success else '❌'}")
    log(f"PDF处理: {len(extracted_results)} 个文件")
    log(f"命例导入: {imported_count} 个新命例")
    log(f"报告文件: {report_file}")
    
    return report

def main():
    """主函数"""
    start_time = time.time()
    
    print("="*60)
    print("PDF自动提取和数据导入系统")
    print("="*60)
    print("本脚本将自动完成：")
    print("  1. 安装OCR环境（PaddleOCR等）")
    print("  2. 提取PDF文件中的文本和命例")
    print("  3. 将命例数据导入数据库")
    print("="*60)
    
    # 步骤1: 安装OCR
    ocr_success = check_and_install_ocr()
    if not ocr_success:
        log("OCR环境安装不完整，尝试继续...", "WARNING")
    
    # 步骤2: 提取PDF
    extracted_results = extract_pdfs()
    
    # 步骤3: 导入数据库
    imported_count = import_to_database(extracted_results)
    
    # 生成报告
    report = generate_summary_report(start_time, ocr_success, extracted_results, imported_count)
    
    return report

if __name__ == '__main__':
    try:
        result = main()
        sys.exit(0 if result['steps']['database_import'] else 1)
    except KeyboardInterrupt:
        log("用户中断", "WARNING")
        sys.exit(1)
    except Exception as e:
        log(f"程序异常: {e}", "ERROR")
        sys.exit(1)
