#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
子平经典知识库 - 知识组织脚本
功能：自动将知识点分类到 15 个模块
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Set
import re


class KnowledgeOrganizer:
    """知识组织者"""
    
    def __init__(self, preprocessed_dir: str, modules_dir: str):
        self.preprocessed_dir = Path(preprocessed_dir)
        self.modules_dir = Path(modules_dir)
        
        # 15 个模块的关键词映射
        self.module_keywords = {
            '01-基础理论': {
                '阴阳', '五行', '天干', '地支', '十神', '宫位', '旺衰', '十二长生',
                '生克', '制化', '刑冲合害', '基础', '入门'
            },
            '02-格局论': {
                '格局', '八格', '正官', '七杀', '正印', '偏印', '正财', '偏财',
                '食神', '伤官', '从格', '化格', '专旺', '两神成象', '外格', '变格'
            },
            '03-用神论': {
                '用神', '扶抑', '喜神', '忌神', '用神层次', '用神变化'
            },
            '04-十干喜忌': {
                '十干', '喜忌', '甲木', '乙木', '丙火', '丁火', '戊土', '己土',
                '庚金', '辛金', '壬水', '癸水', '穷通宝鉴'
            },
            '05-经典断语': {
                '断语', '口诀', '歌诀', '赋文', '经典条文'
            },
            '06-六亲专题': {
                '六亲', '父母', '兄弟', '姐妹', '妻妾', '子女', '夫妻', '宫位'
            },
            '07-性情专题': {
                '性情', '性格', '脾气', '为人', '心性', '品德'
            },
            '08-疾病专题': {
                '疾病', '病', '灾', '伤', '疾厄', '健康', '医药'
            },
            '09-女命专题': {
                '女命', '女造', '妇人', '婚姻', '夫星', '子息', '产育'
            },
            '10-小儿专题': {
                '小儿', '儿童', '童限', '关煞', '养育', '小儿难养'
            },
            '11-纳音五行': {
                '纳音', '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
                '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水',
                '屋上土', '霹雳火', '松柏木', '长流水', '砂中金', '山下火',
                '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土',
                '钗钏金', '桑柘木', '大溪水', '砂中土', '天上火', '石榴木',
                '大海水'
            },
            '12-神煞库': {
                '神煞', '天乙贵人', '太极贵人', '文昌', '羊刃', '桃花', '驿马',
                '华盖', '将星', '亡神', '劫煞', '魁罡', '天德', '月德'
            },
            '13-刑冲合害': {
                '刑', '冲', '合', '害', '三合', '六合', '三会', '六冲', '三刑',
                '自刑', '穿', '破', '天干五合', '地支'
            },
            '14-从化专题': {
                '从化', '从强', '从弱', '从财', '从杀', '从儿', '化气', '化格',
                '甲己化土', '乙庚化金', '丙辛化水', '丁壬化木', '戊癸化火'
            },
            '15-形象专题': {
                '形象', '形人', '木形', '火形', '土形', '金形', '水形', '外貌',
                '相貌', '体态', '气质'
            }
        }
        
        # 统计信息
        self.stats = {
            'total_passages': 0,
            'classified_passages': 0,
            'module_counts': {name: 0 for name in self.module_keywords.keys()}
        }
    
    def classify_passage(self, passage: str) -> List[str]:
        """
        将段落分类到对应的模块
        
        Returns:
            匹配的模块名称列表
        """
        matched_modules = []
        passage_lower = passage.lower()
        
        for module_name, keywords in self.module_keywords.items():
            for keyword in keywords:
                if keyword.lower() in passage_lower:
                    matched_modules.append(module_name)
                    break  # 每个模块只匹配一次
        
        return matched_modules
    
    def load_passages(self) -> Dict[str, List[str]]:
        """加载所有关键段落"""
        all_passages = {
            '格局': [],
            '调候': [],
            '病药': [],
            '通关': [],
            '从化': [],
            '形象': []
        }
        
        passages_files = list(self.preprocessed_dir.glob('*.passages.json'))
        
        for passages_file in passages_files:
            try:
                with open(passages_file, 'r', encoding='utf-8') as f:
                    passages_data = json.load(f)
                
                # 合并所有类别的段落
                for category, passages_list in passages_data.items():
                    if category in all_passages:
                        all_passages[category].extend(passages_list)
                
                self.stats['total_passages'] += sum(len(v) for v in passages_data.values())
                
            except Exception as e:
                print(f"⚠️  读取 {passages_file.name} 失败：{e}")
        
        return all_passages
    
    def create_module_content(self, module_name: str, passages: List[Dict]) -> str:
        """创建模块内容"""
        content = [
            f"# {module_name.replace('-', ' ')}",
            "",
            f"> 自动整理自子平经典",
            "",
            f"**知识点数量**: {len(passages)}",
            "",
            f"**最后更新**: {Path.ctime(Path(__file__)) if hasattr(Path, 'ctime') else '2026-03-18'}",
            "",
            "---",
            ""
        ]
        
        # 按来源分组
        source_groups = {}
        for passage in passages:
            source = passage.get('source', '未知')
            if source not in source_groups:
                source_groups[source] = []
            source_groups[source].append(passage)
        
        # 输出每个来源的内容
        for source, source_passages in source_groups.items():
            content.append(f"## 📚 {source}")
            content.append("")
            
            for i, passage in enumerate(source_passages, 1):
                content.append(f"### {i}. {passage.get('title', '知识点')}")
                content.append("")
                content.append(passage.get('content', ''))
                content.append("")
                content.append(f"*关键词*: {', '.join(passage.get('keywords', []))}")
                content.append("")
                content.append("---")
                content.append("")
        
        return '\n'.join(content)
    
    def organize_knowledge(self) -> None:
        """组织知识到模块"""
        print(f"\n{'='*60}")
        print(f"子平经典知识库 - 知识组织工具")
        print(f"{'='*60}")
        print(f"输入目录：{self.preprocessed_dir}")
        print(f"输出目录：{self.modules_dir}")
        print(f"{'='*60}\n")
        
        # 1. 加载关键段落
        print("步骤 1: 加载关键段落...")
        passages_by_category = self.load_passages()
        print(f"   加载段落总数：{self.stats['total_passages']}")
        
        # 2. 分类到模块
        print("\n步骤 2: 分类到 15 个模块...")
        module_passages = {name: [] for name in self.module_keywords.keys()}
        
        for category, passages in passages_by_category.items():
            for passage in passages:
                # 简单包装
                wrapped_passage = {
                    'source': category,
                    'title': f'{category}知识点',
                    'content': passage if isinstance(passage, str) else str(passage),
                    'keywords': [category]
                }
                
                # 分类
                matched_modules = self.classify_passage(wrapped_passage['content'])
                
                if matched_modules:
                    for module in matched_modules:
                        module_passages[module].append(wrapped_passage)
                        self.stats['module_counts'][module] += 1
                    self.stats['classified_passages'] += 1
        
        # 3. 保存到模块文件
        print("\n步骤 3: 保存模块文件...")
        for module_name, passages in module_passages.items():
            if passages:
                module_path = self.modules_dir / module_name / f"{module_name.replace('-', '_')}.md"
                
                # 去重
                unique_passages = []
                seen_contents = set()
                for p in passages:
                    if p['content'] not in seen_contents:
                        unique_passages.append(p)
                        seen_contents.add(p['content'])
                
                # 创建内容
                content = self.create_module_content(module_name, unique_passages)
                
                # 保存
                with open(module_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"   ✅ {module_name}: {len(unique_passages)} 条知识点")
        
        # 4. 输出统计
        print(f"\n{'='*60}")
        print(f"知识组织完成统计")
        print(f"{'='*60}")
        print(f"总段落数：{self.stats['total_passages']}")
        print(f"已分类：{self.stats['classified_passages']}")
        print(f"分类率：{self.stats['classified_passages']/max(self.stats['total_passages'],1)*100:.1f}%")
        print(f"\n各模块知识点数量:")
        for module, count in self.stats['module_counts'].items():
            if count > 0:
                print(f"   {module}: {count} 条")
        print(f"{'='*60}\n")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='子平经典知识库 - 知识组织工具',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--input', '-i',
        type=str,
        default='knowledge-base/ziping/preprocessed',
        help='输入目录路径'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='knowledge-base/ziping/modules',
        help='输出目录路径'
    )
    
    args = parser.parse_args()
    
    # 创建组织者
    organizer = KnowledgeOrganizer(args.input, args.output)
    
    # 组织知识
    organizer.organize_knowledge()


if __name__ == '__main__':
    main()
