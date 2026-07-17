#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ML 模型预测器模块
用于格局预测的机器学习封装
"""

import pickle
import numpy as np
from typing import Dict, Optional, List
from pathlib import Path


MODEL_PATH = Path(r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\pattern_model.pkl')

PATTERNS = [
    '正官格', '七杀格', '正印格', '偏印格',
    '正财格', '偏财格', '食神格', '伤官格',
    '建禄格', '羊刃格', '从财格', '从官杀格',
    '从儿格', '从旺格', '化土格', '化金格',
    '化水格', '化木格', '化火格'
]

WUXING = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火',
    '戊': '土', '己': '土', '庚': '金', '辛': '金',
    '壬': '水', '癸': '水'
}

BRANCH_WUXING = {
    '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金',
    '戌': '土', '亥': '水', '子': '水', '丑': '土'
}

HIDDEN_GAN = {
    '寅': ['甲', '丙', '戊'], '卯': ['乙'], '辰': ['戊', '乙', '癸'],
    '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'],
    '亥': ['壬', '甲'], '子': ['癸'], '丑': ['己', '癸', '辛']
}

SHENG_KE_MAP = {
    '木': {'生': '火', '克': '土', '被生': '水', '被克': '金'},
    '火': {'生': '土', '克': '金', '被生': '木', '被克': '水'},
    '土': {'生': '金', '克': '水', '被生': '火', '被克': '木'},
    '金': {'生': '水', '克': '木', '被生': '土', '被克': '火'},
    '水': {'生': '木', '克': '火', '被生': '金', '被克': '土'},
}

GAN_HE = [('甲', '己'), ('乙', '庚'), ('丙', '辛'), ('丁', '壬'), ('戊', '癸')]

SANHE = [
    ('申', '子', '辰'), ('寅', '午', '戌'),
    ('巳', '酉', '丑'), ('亥', '卯', '未')
]

LIUHE = [('子', '丑'), ('寅', '亥'), ('卯', '戌'), ('辰', '酉'), ('巳', '申'), ('午', '未')]


def get_shishen(day_master: str, gan: str) -> str:
    """计算十神"""
    if gan == day_master:
        return '比肩'
    
    tian_gan = '甲乙丙丁戊己庚辛壬癸'
    day_idx = tian_gan.index(day_master)
    gan_idx = tian_gan.index(gan)
    diff = (gan_idx - day_idx) % 10
    
    map10 = {0: '比肩', 1: '劫财', 2: '食神', 3: '伤官',
             4: '偏财', 5: '正财', 6: '七杀', 7: '正官',
             8: '偏印', 9: '正印'}
    return map10[diff]


def extract_features(bazi: Dict) -> np.ndarray:
    """
    从八字数据提取 51 维特征向量
    
    Args:
        bazi: 包含四柱信息的字典
            - year_pillar: 年柱 (如 '甲子')
            - month_pillar: 月柱
            - day_pillar: 日柱
            - hour_pillar: 时柱
            - day_master: 日干
    
    Returns:
        np.ndarray: 51 维特征向量
    """
    features = []
    
    year = bazi.get('year_pillar', '')
    month = bazi.get('month_pillar', '')
    day = bazi.get('day_pillar', '')
    hour = bazi.get('hour_pillar', '')
    day_master = bazi.get('day_master', '')
    
    if not all([year, month, day, hour, day_master]):
        return np.zeros(51)
    
    pillars = [year, month, day, hour]
    
    for gan in '甲乙丙丁戊己庚辛壬癸':
        features.append(1.0 if day_master == gan else 0.0)
    
    month_branch = month[1] if len(month) > 1 else ''
    for branch in '子丑寅卯辰巳午未申酉戌亥':
        features.append(1.0 if month_branch == branch else 0.0)
    
    wx_count = {'木': 0, '火': 0, '土': 0, '金': 0, '水': 0}
    
    for pillar in pillars:
        if len(pillar) >= 2:
            stem_wx = WUXING.get(pillar[0])
            if stem_wx:
                wx_count[stem_wx] += 1
            branch_wx = BRANCH_WUXING.get(pillar[1])
            if branch_wx:
                wx_count[branch_wx] += 1
    
    for wx in ['木', '火', '土', '金', '水']:
        features.append(wx_count[wx] / 8.0)
    
    day_wx = WUXING.get(day_master)
    for wx in ['木', '火', '土', '金', '水']:
        features.append(1.0 if day_wx == wx else 0.0)
    
    shishen_count = {}
    for ss in ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']:
        shishen_count[ss] = 0.0
    
    for pillar in [year, month, hour]:
        if len(pillar) >= 1:
            gan = pillar[0]
            if gan != day_master:
                ss = get_shishen(day_master, gan)
                shishen_count[ss] += 1.0
    
    for pillar in pillars:
        if len(pillar) >= 2:
            hidden = HIDDEN_GAN.get(pillar[1], [])
            for h in hidden:
                if h != day_master:
                    ss = get_shishen(day_master, h)
                    shishen_count[ss] += 0.5
    
    for ss in ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']:
        features.append(shishen_count[ss] / 5.0)
    
    stems = [p[0] for p in pillars if len(p) >= 1]
    branches = [p[1] for p in pillars if len(p) >= 2]
    
    has_gan_he = 0.0
    for a, b in GAN_HE:
        if a in stems and b in stems:
            has_gan_he = 1.0
            break
    features.append(has_gan_he)
    
    has_sanhe = 0.0
    for a, b, c in SANHE:
        if a in branches and b in branches and c in branches:
            has_sanhe = 1.0
            break
    features.append(has_sanhe)
    
    has_liuhe = 0.0
    for a, b in LIUHE:
        if a in branches and b in branches:
            has_liuhe = 1.0
            break
    features.append(has_liuhe)
    
    sizheng = sum(1 for b in branches if b in ['子', '午', '卯', '酉'])
    features.append(sizheng / 4.0)
    
    month_wx = BRANCH_WUXING.get(month_branch)
    
    if month_wx and day_wx:
        features.append(1.0 if month_wx == day_wx else 0.0)
        
        relation = SHENG_KE_MAP.get(day_wx, {})
        features.append(1.0 if month_wx == relation.get('被生') else 0.0)
        features.append(1.0 if month_wx == relation.get('被克') else 0.0)
        features.append(1.0 if month_wx == relation.get('生') else 0.0)
        features.append(1.0 if month_wx == relation.get('克') else 0.0)
    else:
        features.extend([0.0, 0.0, 0.0, 0.0, 0.0])
    
    return np.array(features, dtype=np.float32)


class MLPatternPredictor:
    """
    ML 格局预测器
    封装模型加载和预测功能
    """
    
    def __init__(self, model_path: Optional[Path] = None):
        """
        初始化预测器
        
        Args:
            model_path: 模型文件路径，默认使用全局 MODEL_PATH
        """
        self.model_path = model_path or MODEL_PATH
        self.model = None
        self.feature_names = None
        self.pattern_names = None
        self.accuracy = None
        self._load_model()
    
    def _load_model(self) -> bool:
        """
        加载模型文件
        
        Returns:
            bool: 加载成功返回 True，失败返回 False
        """
        try:
            if not self.model_path.exists():
                return False
            
            with open(self.model_path, 'rb') as f:
                data = pickle.load(f)
            
            if isinstance(data, dict):
                self.model = data.get('model')
                self.feature_names = data.get('feature_names')
                self.pattern_names = data.get('pattern_names', PATTERNS)
                self.accuracy = data.get('accuracy')
            else:
                self.model = data
                self.pattern_names = PATTERNS
            
            return self.model is not None
        except Exception:
            self.model = None
            return False
    
    def is_available(self) -> bool:
        """
        检查模型是否可用
        
        Returns:
            bool: 模型可用返回 True
        """
        return self.model is not None
    
    def predict(self, bazi: Dict) -> Optional[Dict]:
        """
        预测八字格局
        
        Args:
            bazi: 八字数据字典
        
        Returns:
            预测结果字典，包含:
            - pattern: 预测的格局名称
            - confidence: 置信度
            - probabilities: 各格局的概率分布
            如果模型不可用，返回 None
        """
        if not self.is_available():
            return None
        
        try:
            features = extract_features(bazi)
            if features is None or np.all(features == 0):
                return None
            
            X = features.reshape(1, -1)
            
            if hasattr(self.model, 'predict_proba'):
                proba = self.model.predict_proba(X)[0]
                pred_idx = np.argmax(proba)
                confidence = float(proba[pred_idx])
                pattern_names = self.pattern_names or PATTERNS
                probabilities = {pattern_names[i]: float(p) for i, p in enumerate(proba) if i < len(pattern_names)}
            else:
                pred_idx = self.model.predict(X)[0]
                confidence = 1.0
                pattern_names = self.pattern_names or PATTERNS
                probabilities = {pattern_names[pred_idx]: 1.0} if pred_idx < len(pattern_names) else {}
            
            pattern_names = self.pattern_names or PATTERNS
            if 0 <= pred_idx < len(pattern_names):
                return {
                    'pattern': pattern_names[pred_idx],
                    'confidence': confidence,
                    'probabilities': probabilities
                }
            
            return None
        except Exception:
            return None
    
    def predict_batch(self, bazi_list: List[Dict]) -> List[Optional[Dict]]:
        """
        批量预测八字格局
        
        Args:
            bazi_list: 八字数据列表
        
        Returns:
            预测结果列表
        """
        return [self.predict(bazi) for bazi in bazi_list]


def test_ml_predictor():
    """测试 ML 预测器功能"""
    print("=" * 60)
    print("测试 MLPatternPredictor")
    print("=" * 60)
    
    test_cases = [
        {
            'name': '测试案例1 - 正官格',
            'bazi': {
                'year_pillar': '甲子',
                'month_pillar': '丙寅',
                'day_pillar': '辛酉',
                'hour_pillar': '壬辰',
                'day_master': '辛'
            }
        },
        {
            'name': '测试案例2 - 食神格',
            'bazi': {
                'year_pillar': '壬申',
                'month_pillar': '癸卯',
                'day_pillar': '甲午',
                'hour_pillar': '丙寅',
                'day_master': '甲'
            }
        },
        {
            'name': '测试案例3 - 缺失数据',
            'bazi': {
                'year_pillar': '甲子',
                'month_pillar': '',
                'day_pillar': '辛酉',
                'hour_pillar': '壬辰',
                'day_master': '辛'
            }
        }
    ]
    
    predictor = MLPatternPredictor()
    
    print(f"\n模型状态: {'可用' if predictor.is_available() else '不可用 (降级模式)'}")
    print(f"模型路径: {predictor.model_path}")
    if predictor.accuracy:
        print(f"模型准确率: {predictor.accuracy:.4f}")
    if predictor.pattern_names:
        print(f"格局类别数: {len(predictor.pattern_names)}")
    
    print("\n" + "-" * 60)
    print("特征提取测试")
    print("-" * 60)
    
    features = extract_features(test_cases[0]['bazi'])
    print(f"特征维度: {len(features)}")
    print(f"特征类型: {type(features)}")
    print(f"非零特征数: {np.count_nonzero(features)}")
    
    print("\n" + "-" * 60)
    print("预测测试")
    print("-" * 60)
    
    for case in test_cases:
        print(f"\n{case['name']}:")
        result = predictor.predict(case['bazi'])
        
        if result is None:
            print("  结果: None (降级到规则引擎)")
        else:
            print(f"  预测格局: {result['pattern']}")
            print(f"  置信度: {result['confidence']:.4f}")
            top_3 = sorted(result['probabilities'].items(), key=lambda x: x[1], reverse=True)[:3]
            print(f"  Top 3 概率:")
            for pattern, prob in top_3:
                print(f"    {pattern}: {prob:.4f}")
    
    print("\n" + "-" * 60)
    print("批量预测测试")
    print("-" * 60)
    
    bazi_list = [case['bazi'] for case in test_cases]
    results = predictor.predict_batch(bazi_list)
    
    for i, result in enumerate(results):
        if result:
            print(f"案例{i+1}: {result['pattern']} ({result['confidence']:.4f})")
        else:
            print(f"案例{i+1}: None")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
    
    return predictor.is_available()


if __name__ == '__main__':
    test_ml_predictor()
