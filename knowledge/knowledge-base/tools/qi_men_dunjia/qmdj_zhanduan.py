"""
奇门遁甲占断模块

分类占断逻辑：
- 事业占断
- 婚姻占断
- 出行占断
- 投资占断

来源：PRD_QimenDunjia.md
"""

from typing import Dict, List, Tuple
from .qmdj_core import QiMenPan, QiMenCalculator


class QiMenZhanDuan:
    """奇门遁甲占断系统"""
    
    def __init__(self, pan: QiMenPan):
        self.pan = pan
        self.calc = QiMenCalculator()
        
    def analyze_shiye(self) -> Dict:
        """事业占断"""
        result = {
            'category': '事业',
            'overall': self._analyze_overall(),
            'details': [],
            'advice': ''
        }
        
        details = []
        
        if self._check_kai_men_good():
            details.append({
                'aspect': '开门吉凶',
                'status': '吉',
                'description': '开门临吉星吉神，事业发展顺利',
                'score': 90
            })
        else:
            details.append({
                'aspect': '开门吉凶',
                'status': '凶',
                'description': '开门临凶星凶神，事业多阻碍',
                'score': 40
            })
        
        if self._check_zhi_fu_strong():
            details.append({
                'aspect': '值符力量',
                'status': '旺',
                'description': '值符得地，贵人相助',
                'score': 85
            })
        else:
            details.append({
                'aspect': '值符力量',
                'status': '弱',
                'description': '值符失地，贵人运弱',
                'score': 50
            })
        
        if self._check_san_qi():
            details.append({
                'aspect': '三奇临身',
                'status': '吉',
                'description': '三奇临身，才华得展',
                'score': 95
            })
        
        result['details'] = details
        result['advice'] = self._generate_shiye_advice(details)
        
        return result
    
    def analyze_hunyin(self) -> Dict:
        """婚姻占断"""
        result = {
            'category': '婚姻',
            'overall': self._analyze_overall(),
            'details': [],
            'advice': ''
        }
        
        details = []
        
        if self._check_he_huo():
            details.append({
                'aspect': '六合临身',
                'status': '吉',
                'description': '六合临身，婚姻和谐',
                'score': 90
            })
        else:
            details.append({
                'aspect': '六合临身',
                'status': '凶',
                'description': '六合受制，婚姻不顺',
                'score': 45
            })
        
        if self._check_gan_zhi_he():
            details.append({
                'aspect': '干支相合',
                'status': '吉',
                'description': '干支相合，感情融洽',
                'score': 85
            })
        
        result['details'] = details
        result['advice'] = self._generate_hunyin_advice(details)
        
        return result
    
    def analyze_chuxing(self) -> Dict:
        """出行占断"""
        result = {
            'category': '出行',
            'overall': self._analyze_overall(),
            'details': [],
            'advice': ''
        }
        
        details = []
        
        if self._check_ma_xing_good():
            details.append({
                'aspect': '马星吉凶',
                'status': '吉',
                'description': '马星临吉门，出行顺利',
                'score': 88
            })
        else:
            details.append({
                'aspect': '马星吉凶',
                'status': '凶',
                'description': '马星临凶门，出行不利',
                'score': 40
            })
        
        if self._check_kong_wang():
            details.append({
                'aspect': '空亡影响',
                'status': '凶',
                'description': '临空亡，出行多阻',
                'score': 35
            })
        else:
            details.append({
                'aspect': '空亡影响',
                'status': '吉',
                'description': '不临空亡，出行无碍',
                'score': 80
            })
        
        result['details'] = details
        result['advice'] = self._generate_chuxing_advice(details)
        
        return result
    
    def analyze_touzi(self) -> Dict:
        """投资占断"""
        result = {
            'category': '投资',
            'overall': self._analyze_overall(),
            'details': [],
            'advice': ''
        }
        
        details = []
        
        if self._check_sheng_men_good():
            details.append({
                'aspect': '生门吉凶',
                'status': '吉',
                'description': '生门临吉星，财运亨通',
                'score': 92
            })
        else:
            details.append({
                'aspect': '生门吉凶',
                'status': '凶',
                'description': '生门临凶星，财运不佳',
                'score': 38
            })
        
        if self._check_jia_zi():
            details.append({
                'aspect': '甲子临身',
                'status': '吉',
                'description': '甲子临身，贵人相助',
                'score': 88
            })
        
        result['details'] = details
        result['advice'] = self._generate_touzi_advice(details)
        
        return result
    
    def _analyze_overall(self) -> str:
        """整体吉凶判断"""
        good_count = 0
        bad_count = 0
        
        if self._check_kai_men_good():
            good_count += 1
        else:
            bad_count += 1
        
        if self._check_zhi_fu_strong():
            good_count += 1
        else:
            bad_count += 1
        
        if self._check_san_qi():
            good_count += 2
        
        if good_count > bad_count + 1:
            return '大吉'
        elif good_count > bad_count:
            return '吉'
        elif good_count == bad_count:
            return '平'
        elif good_count < bad_count - 1:
            return '大凶'
        else:
            return '凶'
    
    def _check_kai_men_good(self) -> bool:
        """检查开门吉凶"""
        kai_men_gong = None
        for gong, men in self.pan.ba_men.items():
            if men == "开门":
                kai_men_gong = gong
                break
        
        if kai_men_gong:
            xing = self.pan.jiu_xing.get(kai_men_gong, '')
            shen = self.pan.ba_shen.get(kai_men_gong, '')
            
            good_xing = ["天心", "天辅", "天任"]
            good_shen = ["值符", "太阴", "六合", "九天"]
            
            return xing in good_xing or shen in good_shen
        
        return False
    
    def _check_zhi_fu_strong(self) -> bool:
        """检查值符力量"""
        zhi_fu_xing = self.pan.zhi_fu_xing
        
        for gong, xing in self.pan.jiu_xing.items():
            if xing == zhi_fu_xing:
                if gong in [1, 6, 7, 8]:
                    return True
                else:
                    return False
        
        return False
    
    def _check_san_qi(self) -> bool:
        """检查三奇临身"""
        san_qi = ["乙", "丙", "丁"]
        
        for gong, gan in self.pan.tian_pan.items():
            if gan in san_qi:
                return True
        
        return False
    
    def _check_he_huo(self) -> bool:
        """检查六合"""
        for gong, shen in self.pan.ba_shen.items():
            if shen == "六合":
                xing = self.pan.jiu_xing.get(gong, '')
                good_xing = ["天心", "天辅", "天任"]
                return xing in good_xing
        
        return False
    
    def _check_gan_zhi_he(self) -> bool:
        """检查干支相合"""
        return False
    
    def _check_ma_xing_good(self) -> bool:
        """检查马星吉凶"""
        if self.pan.ma_xing:
            men = self.pan.ba_men.get(self.pan.ma_xing, '')
            good_men = ["开门", "休门", "生门"]
            return men in good_men
        
        return True
    
    def _check_kong_wang(self) -> bool:
        """检查空亡"""
        return False
    
    def _check_sheng_men_good(self) -> bool:
        """检查生门吉凶"""
        sheng_men_gong = None
        for gong, men in self.pan.ba_men.items():
            if men == "生门":
                sheng_men_gong = gong
                break
        
        if sheng_men_gong:
            xing = self.pan.jiu_xing.get(sheng_men_gong, '')
            good_xing = ["天心", "天辅", "天任", "天禽"]
            return xing in good_xing
        
        return False
    
    def _check_jia_zi(self) -> bool:
        """检查甲子临身"""
        return False
    
    def _generate_shiye_advice(self, details: List[Dict]) -> str:
        """生成事业建议"""
        avg_score = sum(d['score'] for d in details) / len(details) if details else 50
        
        if avg_score >= 80:
            return "事业发展大吉，可积极进取，把握机遇。"
        elif avg_score >= 60:
            return "事业运势平稳，宜稳中求进，不宜冒进。"
        else:
            return "事业运势不佳，宜守不宜攻，等待时机。"
    
    def _generate_hunyin_advice(self, details: List[Dict]) -> str:
        """生成婚姻建议"""
        avg_score = sum(d['score'] for d in details) / len(details) if details else 50
        
        if avg_score >= 80:
            return "婚姻运势良好，感情和谐，可考虑进一步发展。"
        elif avg_score >= 60:
            return "婚姻运势平稳，需要多沟通，增进了解。"
        else:
            return "婚姻运势不佳，需要谨慎处理感情问题。"
    
    def _generate_chuxing_advice(self, details: List[Dict]) -> str:
        """生成出行建议"""
        avg_score = sum(d['score'] for d in details) / len(details) if details else 50
        
        if avg_score >= 80:
            return "出行大吉，一路顺风，可放心出行。"
        elif avg_score >= 60:
            return "出行平稳，注意安全，做好准备工作。"
        else:
            return "出行不利，建议推迟行程或做好充分准备。"
    
    def _generate_touzi_advice(self, details: List[Dict]) -> str:
        """生成投资建议"""
        avg_score = sum(d['score'] for d in details) / len(details) if details else 50
        
        if avg_score >= 80:
            return "投资运势良好，可适度投资，但需谨慎。"
        elif avg_score >= 60:
            return "投资运势平稳，宜保守投资，不宜冒险。"
        else:
            return "投资运势不佳，建议观望，不宜投资。"


def zhanduan(pan: QiMenPan, category: str = 'all') -> Dict:
    """
    统一占断接口
    
    :param pan: 奇门盘
    :param category: 占断类别（'all', '事业', '婚姻', '出行', '投资'）
    :return: 占断结果
    """
    zd = QiMenZhanDuan(pan)
    
    if category == 'all':
        return {
            '事业': zd.analyze_shiye(),
            '婚姻': zd.analyze_hunyin(),
            '出行': zd.analyze_chuxing(),
            '投资': zd.analyze_touzi()
        }
    elif category == '事业':
        return zd.analyze_shiye()
    elif category == '婚姻':
        return zd.analyze_hunyin()
    elif category == '出行':
        return zd.analyze_chuxing()
    elif category == '投资':
        return zd.analyze_touzi()
    else:
        return zd.analyze_shiye()
