"""
大六壬毕法赋格局匹配模块（集成银河棹正附集）
功能：100 条毕法赋格局识别、吉凶判断、银河棹口诀应用
来源：大六壬指南 + 六壬毕法赋 + 大六壬银河棹正附集
"""

from typing import Dict, List, Optional


class BifaPatterns:
    """毕法赋格局匹配（集成银河棹）"""
    
    # 100 条毕法赋（部分示例）
    PATTERNS = {
        '前后引从': {'jixiong': '吉', 'meaning': '升迁吉，前后呼应'},
        '首尾相见': {'jixiong': '吉', 'meaning': '始终宜，事情有始有终'},
        '帘幕贵人': {'jixiong': '吉', 'meaning': '高甲第，科举高中'},
        '六阳数足': {'jixiong': '平', 'meaning': '须公用，公事有利'},
        '六阴相继': {'jixiong': '凶', 'meaning': '尽昏迷，私谋虽吉'},
        '旺禄临身': {'jixiong': '吉', 'meaning': '徒妄作，宜守成'},
        '传财太旺': {'jixiong': '凶', 'meaning': '反财亏，身弱不胜财'},
        '脱上逢脱': {'jixiong': '凶', 'meaning': '防虚诈，被骗'},
        '交车相合': {'jixiong': '吉', 'meaning': '交关利，交易顺利'},
        '三传递生': {'jixiong': '吉', 'meaning': '人举荐，得人相助'},
        '三传互克': {'jixiong': '凶', 'meaning': '众人欺，受人排挤'},
        '太阳照武': {'jixiong': '吉', 'meaning': '宜擒贼，官事得理'},
        '富贵干支': {'jixiong': '吉', 'meaning': '逢禄马，富贵仕途'},
        '魁度天门': {'jixiong': '凶', 'meaning': '关隔定，谋望受阻'},
        '罡塞鬼户': {'jixiong': '吉', 'meaning': '任谋为，众鬼不侵'},
        '两蛇夹墓': {'jixiong': '大凶', 'meaning': '凶难免，病重'},
        '干支皆败': {'jixiong': '凶', 'meaning': '事倾颓，家道中落'},
        '虎临干鬼': {'jixiong': '凶', 'meaning': '凶速速，灾祸速来'},
        '来去俱空': {'jixiong': '凶', 'meaning': '岂动宜，不宜动'}
    }
    
    # 银河棹占断口诀
    YINHEZHUO_ORACLES = {
        '婚姻': [
            '干支相合，婚姻必成',
            '支干相冲，婚姻难成',
            '贵人临干，男得贵妻',
            '天后临支，女嫁贵夫'
        ],
        '求财': [
            '财神生合，其财自至',
            '青龙发用，大获其财',
            '玄武临财，防有失脱'
        ],
        '疾病': [
            '白虎发用，病势沉重',
            '天医临身，病可痊愈',
            '死气乘旺，防有凶危'
        ],
        '出行': [
            '驿马发动，出行吉利',
            '贵人扶助，一路平安',
            '白虎临身，防有凶险'
        ],
        '仕宦': [
            '贵人临身，升官有望',
            '禄马生合，仕途顺达',
            '朱雀发用，文书有利'
        ]
    }
    
    def __init__(self, sike: Dict, sanchuan: tuple, keti: str):
        """
        初始化毕法赋匹配
        :param sike: 四课数据
        :param sanchuan: 三传数据
        :param keti: 课体
        """
        self.sike = sike
        self.sanchuan = sanchuan
        self.keti = keti
    
    def match_patterns(self) -> List[str]:
        """
        匹配毕法赋格局
        :return: 匹配的格局列表
        """
        matched = []
        
        # 简化实现：根据课体匹配
        if self.keti == '伏吟课':
            matched.append('旺禄临身')
        elif self.keti == '返吟课':
            matched.append('来去俱空')
        
        # 根据三传匹配
        if self.sanchuan:
            chuanchuan, zhongchuan, mochuan = self.sanchuan
            # 三传递生
            if chuanchuan == zhongchuan == mochuan:
                matched.append('三传递生')
            # 三传互克
            elif chuanchuan != mochuan:
                matched.append('三传互克')
        
        return matched
    
    def get_pattern_meaning(self, pattern: str) -> Dict:
        """
        获取格局含义
        :param pattern: 格局名称
        :return: 吉凶和含义
        """
        return self.PATTERNS.get(pattern, {'jixiong': '未知', 'meaning': '待查'})
    
    def get_yinhezhuo_oracle(self, question_type: str) -> List[str]:
        """
        获取银河棹占断口诀
        :param question_type: 占类
        :return: 口诀列表
        """
        return self.YINHEZHUO_ORACLES.get(question_type, [])
    
    def get_analysis(self, question_type: str = None) -> Dict:
        """
        获取毕法赋分析
        :param question_type: 占类
        :return: 分析结果
        """
        patterns = self.match_patterns()
        oracles = self.get_yinhezhuo_oracle(question_type) if question_type else []
        
        return {
            'patterns': patterns,
            'pattern_meanings': [self.get_pattern_meaning(p) for p in patterns],
            'yinhezhuo_oracles': oracles
        }


# 便捷函数
def match_bifa_patterns(sike: Dict, sanchuan: tuple, keti: str, question_type: str = None) -> Dict:
    """匹配毕法赋格局"""
    bifa = BifaPatterns(sike, sanchuan, keti)
    return bifa.get_analysis(question_type)


# 测试
if __name__ == "__main__":
    sike = {'lesson1': '甲 → 子', 'lesson2': '子 → 申'}
    sanchuan = ('子', '子', '子')
    
    result = match_bifa_patterns(sike, sanchuan, '伏吟课', '婚姻')
    print(f"格局：{result['patterns']}")
    print(f"银河棹口诀：{result['yinhezhuo_oracles']}")
