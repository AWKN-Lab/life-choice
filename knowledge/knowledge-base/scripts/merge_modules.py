#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
子平经典知识库 - 文件合并精简脚本
功能：
1. 合并小模块到根目录
2. 精简文件数量
3. 生成统一索引
"""

import os
from pathlib import Path
from typing import Dict, List


class KnowledgeMerger:
    """知识合并器"""
    
    def __init__(self, modules_dir: str, output_dir: str):
        self.modules_dir = Path(modules_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 合并方案：小模块合并到大模块
        self.merge_plan = {
            '01-基础理论': ['05-经典断语'],  # 23 条 → 基础理论
            '02-格局论': [],
            '03-用神论': [],
            '04-十干喜忌': [],
            '05-六亲专题': ['10-小儿专题'],  # 22 条 → 六亲
            '06-性情与形象': ['07-性情专题', '15-形象专题'],  # 30+150 条 → 合并
            '07-疾病专题': [],
            '08-女命专题': [],
            '09-神煞与纳音': ['12-神煞库', '11-纳音五行'],  # 42+248 条 → 合并
            '10-刑冲合害': [],
            '11-从化专题': [],
        }
        
        # 统计
        self.stats = {
            'total_files': 0,
            'merged_files': 0,
            'output_files': 0
        }
    
    def read_module_file(self, module_name: str) -> str:
        """读取模块文件内容"""
        # 尝试不同路径
        possible_paths = [
            self.modules_dir / module_name / f"{module_name.replace('-', '_')}.md",
            self.modules_dir / f"{module_name.replace('-', '_')}.md",
        ]
        
        for path in possible_paths:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read()
        
        return ""
    
    def merge_modules(self, target_name: str, source_modules: List[str]) -> str:
        """合并多个模块到一个文件"""
        content_parts = []
        
        # 添加标题
        content_parts.append(f"# {target_name}\n")
        content_parts.append(f"> 子平经典理论知识库 - {target_name}\n")
        content_parts.append("")
        content_parts.append(f"**最后更新**: 2026-03-18\n")
        content_parts.append("")
        content_parts.append("---\n")
        content_parts.append("")
        
        # 合并每个源模块
        for source_module in source_modules:
            source_content = self.read_module_file(source_module)
            if source_content:
                # 去除原有的 # 标题
                lines = source_content.split('\n')
                cleaned_lines = []
                skip_first_hash = True
                
                for line in lines:
                    if skip_first_hash and line.startswith('# '):
                        skip_first_hash = False
                        continue
                    cleaned_lines.append(line)
                
                content_parts.append('\n'.join(cleaned_lines))
                content_parts.append("\n\n---\n\n")
                self.stats['merged_files'] += 1
        
        return '\n'.join(content_parts)
    
    def merge_all(self) -> None:
        """执行全部合并"""
        print(f"\n{'='*60}")
        print(f"子平经典知识库 - 文件合并精简")
        print(f"{'='*60}")
        print(f"输入目录：{self.modules_dir}")
        print(f"输出目录：{self.output_dir}")
        print(f"{'='*60}\n")
        
        # 处理每个目标模块
        for target_name, source_modules in self.merge_plan.items():
            print(f"合并：{target_name}")
            
            if not source_modules:
                # 没有源模块，直接复制
                content = self.read_module_file(target_name)
                if content:
                    output_path = self.output_dir / f"{target_name}.md"
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"  ✅ 复制 → {target_name}.md")
                    self.stats['output_files'] += 1
            else:
                # 合并多个模块
                merged_content = self.merge_modules(target_name, source_modules)
                if merged_content:
                    output_path = self.output_dir / f"{target_name}.md"
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(merged_content)
                    print(f"  ✅ 合并 {len(source_modules)} 个模块 → {target_name}.md")
                    self.stats['output_files'] += 1
        
        print(f"\n{'='*60}")
        print(f"合并完成统计")
        print(f"{'='*60}")
        print(f"合并文件数：{self.stats['merged_files']}")
        print(f"输出文件数：{self.stats['output_files']}")
        print(f"{'='*60}\n")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='子平经典知识库 - 文件合并精简工具')
    
    parser.add_argument(
        '--input', '-i',
        type=str,
        default='knowledge-base/ziping/modules',
        help='输入目录路径'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='knowledge-base/ziping',
        help='输出目录路径'
    )
    
    args = parser.parse_args()
    
    # 创建合并器
    merger = KnowledgeMerger(args.input, args.output)
    
    # 执行合并
    merger.merge_all()


if __name__ == '__main__':
    main()
