#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
综合测试脚本
"""

import sys
sys.path.insert(0, r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\agents\case-analyzer')

from analyzer import CaseAnalyzer

print('=' * 70)
print('判案专家综合测试')
print('=' * 70)

analyzer = CaseAnalyzer()

print(f'\nML 预测器状态: {"可用" if analyzer.ml_available else "不可用"}')

test_cases = [
    ('甲子 丙寅 丁卯 戊申', '七杀格'),
    ('庚午 辛巳 壬寅 癸卯', None),
    ('癸酉 乙卯 乙巳 戊寅', '建禄格'),
]

for bazi_str, judgment in test_cases:
    print(f'\n【测试】{bazi_str}')
    report = analyzer.generate_report(bazi_str, judgment)
    
    parsed = report['input']['parsed']
    print(f'  解析: {parsed["year"]} {parsed["month"]} {parsed["day"]} {parsed["hour"]}')
    
    if 'ml_prediction' in report and report['ml_prediction']:
        ml = report['ml_prediction']
        print(f'  ML预测: {ml["pattern"]} (置信度: {ml["confidence"]:.1%})')
    
    if 'analysis' in report:
        analysis = report['analysis']['pattern']
        print(f'  规则引擎: {analysis["pattern"]} (置信度: {analysis["confidence"]:.1%})')
    
    print(f'  相似命例: {len(report["similar_cases"])} 个')

print('\n' + '=' * 70)
print('测试完成!')
print('=' * 70)
