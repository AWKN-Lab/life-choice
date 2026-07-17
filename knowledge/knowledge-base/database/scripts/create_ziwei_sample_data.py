#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建紫微斗数示例案例数据
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = r'c:\Users\10919\Desktop\AI\knowledge-base\ziping\database\ziwei_cases.db'

EXAMPLE_CASES = [
    {
        'name': '张伟',
        'gender': '男',
        'birth_date': '甲子年三月初五',
        'solar_date': '1984-04-05',
        'birth_time': '卯时',
        'birth_location': '北京',
        'gongs': [
            {'name': '命宫', 'wei': '午', 'major': ['紫微', '天府'], 'minor': ['左辅', '文昌'], 'other': []},
            {'name': '兄弟', 'wei': '未', 'major': ['天机'], 'minor': ['右弼'], 'other': []},
            {'name': '夫妻', 'wei': '申', 'major': ['太阳'], 'minor': ['文曲'], 'other': []},
            {'name': '子女', 'wei': '酉', 'major': ['武曲', '天相'], 'minor': ['天魁'], 'other': []},
            {'name': '财帛', 'wei': '戌', 'major': ['太阴'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '亥', 'major': ['贪狼'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '子', 'major': ['巨门'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '丑', 'major': ['天梁'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '寅', 'major': ['七杀'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '卯', 'major': ['天同'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '辰', 'major': ['廉贞', '破军'], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '巳', 'major': [], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '紫微天府同宫，格局宏大，主人贵气，有领导才能。'},
            {'category': '事业', 'content': '官禄宫七杀坐守，事业心强，宜从事管理或创业。'},
            {'category': '婚姻', 'content': '夫妻宫太阳坐守，配偶能干，婚姻美满。'},
            {'category': '财运', 'content': '财帛宫太阴得禄，财运亨通，宜理财投资。'}
        ]
    },
    {
        'name': '李娜',
        'gender': '女',
        'birth_date': '乙丑年七月十五',
        'solar_date': '1985-08-30',
        'birth_time': '午时',
        'birth_location': '上海',
        'gongs': [
            {'name': '命宫', 'wei': '子', 'major': ['天机', '太阴'], 'minor': ['文昌', '天魁'], 'other': []},
            {'name': '兄弟', 'wei': '丑', 'major': ['紫微', '天府'], 'minor': ['左辅'], 'other': []},
            {'name': '夫妻', 'wei': '寅', 'major': ['太阳'], 'minor': ['右弼'], 'other': []},
            {'name': '子女', 'wei': '卯', 'major': ['武曲', '贪狼'], 'minor': ['文曲'], 'other': []},
            {'name': '财帛', 'wei': '辰', 'major': ['天同', '巨门'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '巳', 'major': ['天相'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '午', 'major': ['天梁'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '未', 'major': ['七杀'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '申', 'major': ['廉贞'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '酉', 'major': ['破军'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '戌', 'major': [], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '亥', 'major': ['天府'], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '天机太阴同宫，聪明伶俐，心思细腻，宜从事文职。'},
            {'category': '事业', 'content': '官禄宫廉贞坐守，工作认真，宜从事行政或教育。'},
            {'category': '婚姻', 'content': '夫妻宫太阳坐守，配偶正直，婚姻稳定。'},
            {'category': '财运', 'content': '财帛宫天同巨门，财运平稳，宜稳健理财。'}
        ]
    },
    {
        'name': '王强',
        'gender': '男',
        'birth_date': '丙寅年正月初一',
        'solar_date': '1986-02-09',
        'birth_time': '子时',
        'birth_location': '广州',
        'gongs': [
            {'name': '命宫', 'wei': '寅', 'major': ['太阳', '巨门'], 'minor': ['左辅', '文昌'], 'other': []},
            {'name': '兄弟', 'wei': '卯', 'major': ['武曲', '天相'], 'minor': ['右弼'], 'other': []},
            {'name': '夫妻', 'wei': '辰', 'major': ['天梁'], 'minor': ['文曲'], 'other': []},
            {'name': '子女', 'wei': '巳', 'major': ['七杀'], 'minor': ['天魁'], 'other': []},
            {'name': '财帛', 'wei': '午', 'major': ['天同'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '未', 'major': ['廉贞', '破军'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '申', 'major': [], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '酉', 'major': ['紫微', '贪狼'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '戌', 'major': ['天机', '太阴'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '亥', 'major': ['紫微', '天府'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '子', 'major': [], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '丑', 'major': ['天府'], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '太阳巨门同宫，口才好，宜从事演讲、销售或法律。'},
            {'category': '事业', 'content': '官禄宫天机太阴，工作灵活，宜从事策划或咨询。'},
            {'category': '婚姻', 'content': '夫妻宫天梁坐守，配偶稳重，婚姻和谐。'},
            {'category': '财运', 'content': '财帛宫天同得禄，财运不错，宜稳健投资。'}
        ]
    },
    {
        'name': '赵敏',
        'gender': '女',
        'birth_date': '丁卯年五月二十',
        'solar_date': '1987-06-15',
        'birth_time': '酉时',
        'birth_location': '成都',
        'gongs': [
            {'name': '命宫', 'wei': '辰', 'major': ['天同', '巨门'], 'minor': ['文昌', '天魁'], 'other': []},
            {'name': '兄弟', 'wei': '巳', 'major': ['廉贞', '贪狼'], 'minor': ['左辅'], 'other': []},
            {'name': '夫妻', 'wei': '午', 'major': ['太阴'], 'minor': ['右弼'], 'other': []},
            {'name': '子女', 'wei': '未', 'major': ['天府'], 'minor': ['文曲'], 'other': []},
            {'name': '财帛', 'wei': '申', 'major': ['紫微', '天相'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '酉', 'major': ['天梁'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '戌', 'major': ['七杀'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '亥', 'major': [], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '子', 'major': ['太阳'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '丑', 'major': ['武曲', '破军'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '寅', 'major': ['天机'], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '卯', 'major': [], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '天同巨门同宫，性格温和，善于沟通，宜从事服务行业。'},
            {'category': '事业', 'content': '官禄宫太阳坐守，事业光明，宜从事教育或传媒。'},
            {'category': '婚姻', 'content': '夫妻宫太阴坐守，配偶温柔，婚姻美满。'},
            {'category': '财运', 'content': '财帛宫紫微天相，财运亨通，有贵人相助。'}
        ]
    },
    {
        'name': '陈刚',
        'gender': '男',
        'birth_date': '戊辰年八月十五',
        'solar_date': '1988-09-25',
        'birth_time': '亥时',
        'birth_location': '深圳',
        'gongs': [
            {'name': '命宫', 'wei': '戌', 'major': ['廉贞', '破军'], 'minor': ['左辅', '文昌'], 'other': []},
            {'name': '兄弟', 'wei': '亥', 'major': ['天梁'], 'minor': ['右弼'], 'other': []},
            {'name': '夫妻', 'wei': '子', 'major': ['七杀'], 'minor': ['文曲'], 'other': []},
            {'name': '子女', 'wei': '丑', 'major': [], 'minor': ['天魁'], 'other': []},
            {'name': '财帛', 'wei': '寅', 'major': ['太阳', '巨门'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '卯', 'major': ['武曲', '天相'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '辰', 'major': ['天同', '太阴'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '巳', 'major': ['贪狼'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '午', 'major': ['紫微', '天府'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '未', 'major': ['天机'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '申', 'major': [], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '酉', 'major': ['天府'], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '廉贞破军同宫，性格刚强，有魄力，宜从事创业或管理。'},
            {'category': '事业', 'content': '官禄宫紫微天府，事业有成，有领导才能。'},
            {'category': '婚姻', 'content': '夫妻宫七杀坐守，配偶能干，但需注意沟通。'},
            {'category': '财运', 'content': '财帛宫太阳巨门，财运起伏，宜谨慎投资。'}
        ]
    },
    {
        'name': '林芳',
        'gender': '女',
        'birth_date': '己巳年三月十八',
        'solar_date': '1989-04-23',
        'birth_time': '辰时',
        'birth_location': '杭州',
        'gongs': [
            {'name': '命宫', 'wei': '申', 'major': ['天梁'], 'minor': ['文昌', '天魁'], 'other': []},
            {'name': '兄弟', 'wei': '酉', 'major': ['七杀'], 'minor': ['左辅'], 'other': []},
            {'name': '夫妻', 'wei': '戌', 'major': [], 'minor': ['右弼'], 'other': []},
            {'name': '子女', 'wei': '亥', 'major': ['紫微', '贪狼'], 'minor': ['文曲'], 'other': []},
            {'name': '财帛', 'wei': '子', 'major': ['天机', '太阴'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '丑', 'major': ['紫微', '天府'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '寅', 'major': ['太阳', '巨门'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '卯', 'major': ['武曲', '天相'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '辰', 'major': ['天同', '巨门'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '巳', 'major': ['廉贞', '贪狼'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '午', 'major': ['太阴'], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '未', 'major': [], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '天梁坐守命宫，为人正直，有贵人运，宜从事医疗或教育。'},
            {'category': '事业', 'content': '官禄宫天同巨门，工作稳定，宜从事服务或咨询。'},
            {'category': '婚姻', 'content': '夫妻宫无主星，需看对宫，婚姻需谨慎选择。'},
            {'category': '财运', 'content': '财帛宫天机太阴，财运平稳，宜稳健理财。'}
        ]
    },
    {
        'name': '黄伟',
        'gender': '男',
        'birth_date': '庚午年十一月二十',
        'solar_date': '1990-12-06',
        'birth_time': '巳时',
        'birth_location': '武汉',
        'gongs': [
            {'name': '命宫', 'wei': '子', 'major': ['贪狼'], 'minor': ['左辅', '文昌'], 'other': []},
            {'name': '兄弟', 'wei': '丑', 'major': ['太阴'], 'minor': ['右弼'], 'other': []},
            {'name': '夫妻', 'wei': '寅', 'major': ['天府'], 'minor': ['文曲'], 'other': []},
            {'name': '子女', 'wei': '卯', 'major': [], 'minor': ['天魁'], 'other': []},
            {'name': '财帛', 'wei': '辰', 'major': ['天机'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '巳', 'major': ['紫微', '天相'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '午', 'major': ['天梁'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '未', 'major': ['七杀'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '申', 'major': [], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '酉', 'major': ['廉贞', '破军'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '戌', 'major': ['天同', '巨门'], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '亥', 'major': ['太阳'], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '贪狼坐守命宫，多才多艺，有艺术天赋，宜从事创意行业。'},
            {'category': '事业', 'content': '官禄宫无主星，需看对宫，事业发展需贵人相助。'},
            {'category': '婚姻', 'content': '夫妻宫天府坐守，配偶稳重，婚姻稳定。'},
            {'category': '财运', 'content': '财帛宫天机得禄，财运不错，宜灵活理财。'}
        ]
    },
    {
        'name': '刘婷',
        'gender': '女',
        'birth_date': '辛未年六月十二',
        'solar_date': '1991-07-23',
        'birth_time': '未时',
        'birth_location': '南京',
        'gongs': [
            {'name': '命宫', 'wei': '丑', 'major': ['武曲', '贪狼'], 'minor': ['文昌', '天魁'], 'other': []},
            {'name': '兄弟', 'wei': '寅', 'major': ['天同', '太阴'], 'minor': ['左辅'], 'other': []},
            {'name': '夫妻', 'wei': '卯', 'major': ['天府'], 'minor': ['右弼'], 'other': []},
            {'name': '子女', 'wei': '辰', 'major': ['太阳', '巨门'], 'minor': ['文曲'], 'other': []},
            {'name': '财帛', 'wei': '巳', 'major': ['天相'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '午', 'major': ['天机', '天梁'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '未', 'major': ['紫微'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '申', 'major': [], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '酉', 'major': ['廉贞', '七杀'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '戌', 'major': [], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '亥', 'major': ['天同'], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '子', 'major': ['破军'], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '武曲贪狼同宫，有财有艺，宜从事金融或艺术。'},
            {'category': '事业', 'content': '官禄宫廉贞七杀，事业心强，宜从事管理或创业。'},
            {'category': '婚姻', 'content': '夫妻宫天府坐守，配偶可靠，婚姻美满。'},
            {'category': '财运', 'content': '财帛宫天相得禄，财运亨通，有贵人相助。'}
        ]
    },
    {
        'name': '周杰',
        'gender': '男',
        'birth_date': '壬申年四月二十五',
        'solar_date': '1992-05-17',
        'birth_time': '申时',
        'birth_location': '重庆',
        'gongs': [
            {'name': '命宫', 'wei': '亥', 'major': ['天府'], 'minor': ['左辅', '文昌'], 'other': []},
            {'name': '兄弟', 'wei': '子', 'major': ['太阴'], 'minor': ['右弼'], 'other': []},
            {'name': '夫妻', 'wei': '丑', 'major': ['贪狼'], 'minor': ['文曲'], 'other': []},
            {'name': '子女', 'wei': '寅', 'major': ['天同', '巨门'], 'minor': ['天魁'], 'other': []},
            {'name': '财帛', 'wei': '卯', 'major': ['武曲', '天相'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '辰', 'major': ['太阳', '天梁'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '巳', 'major': ['七杀'], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '午', 'major': ['天机'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '未', 'major': ['紫微'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '申', 'major': [], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '酉', 'major': ['廉贞', '破军'], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '戌', 'major': [], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '天府坐守命宫，为人稳重，有财库，宜从事金融或管理。'},
            {'category': '事业', 'content': '官禄宫紫微坐守，事业有成，有领导才能。'},
            {'category': '婚姻', 'content': '夫妻宫贪狼坐守，配偶有魅力，但需注意专一。'},
            {'category': '财运', 'content': '财帛宫武曲天相，财运亨通，宜稳健投资。'}
        ]
    },
    {
        'name': '吴静',
        'gender': '女',
        'birth_date': '癸酉年九月三十',
        'solar_date': '1993-10-14',
        'birth_time': '戌时',
        'birth_location': '西安',
        'gongs': [
            {'name': '命宫', 'wei': '卯', 'major': ['天机', '天梁'], 'minor': ['文昌', '天魁'], 'other': []},
            {'name': '兄弟', 'wei': '辰', 'major': ['紫微', '天相'], 'minor': ['左辅'], 'other': []},
            {'name': '夫妻', 'wei': '巳', 'major': ['天同', '巨门'], 'minor': ['右弼'], 'other': []},
            {'name': '子女', 'wei': '午', 'major': ['武曲', '贪狼'], 'minor': ['文曲'], 'other': []},
            {'name': '财帛', 'wei': '未', 'major': ['太阳', '太阴'], 'minor': ['禄存'], 'other': []},
            {'name': '疾厄', 'wei': '申', 'major': ['天府'], 'minor': ['擎羊'], 'other': []},
            {'name': '迁移', 'wei': '酉', 'major': [], 'minor': ['陀罗'], 'other': []},
            {'name': '仆役', 'wei': '戌', 'major': ['天机'], 'minor': ['火星'], 'other': []},
            {'name': '官禄', 'wei': '亥', 'major': ['紫微', '七杀'], 'minor': ['铃星'], 'other': []},
            {'name': '田宅', 'wei': '子', 'major': ['廉贞', '破军'], 'minor': ['地空'], 'other': []},
            {'name': '福德', 'wei': '丑', 'major': [], 'minor': ['地劫'], 'other': []},
            {'name': '父母', 'wei': '寅', 'major': ['天梁'], 'minor': ['天钺'], 'other': []}
        ],
        'analysis': [
            {'category': '命宫总论', 'content': '天机天梁同宫，聪明睿智，有贵人运，宜从事教育或咨询。'},
            {'category': '事业', 'content': '官禄宫紫微七杀，事业有成，有领导才能。'},
            {'category': '婚姻', 'content': '夫妻宫天同巨门，配偶温和，婚姻和谐。'},
            {'category': '财运', 'content': '财帛宫太阳太阴，财运平稳，宜稳健理财。'}
        ]
    }
]

def create_sample_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    created_at = datetime.now().isoformat()
    
    for case in EXAMPLE_CASES:
        cursor.execute('''
            INSERT INTO ziwei_cases (name, gender, birth_date, solar_date, birth_time, birth_location, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (case['name'], case['gender'], case['birth_date'], case['solar_date'],
              case['birth_time'], case['birth_location'], created_at))
        
        case_id = cursor.lastrowid
        
        for gong in case['gongs']:
            cursor.execute('''
                INSERT INTO ziwei_gong (case_id, gong_name, gong_wei, major_stars, minor_stars, other_stars)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (case_id, gong['name'], gong['wei'], 
                  json.dumps(gong['major']), json.dumps(gong['minor']), json.dumps(gong['other'])))
        
        for analysis in case['analysis']:
            cursor.execute('''
                INSERT INTO ziwei_analysis (case_id, category, content, source, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (case_id, analysis['category'], analysis['content'], '示例数据', created_at))
    
    conn.commit()
    
    cursor.execute('SELECT COUNT(*) FROM ziwei_cases')
    case_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM ziwei_gong')
    gong_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM ziwei_analysis')
    analysis_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT gender, COUNT(*) FROM ziwei_cases GROUP BY gender')
    by_gender = cursor.fetchall()
    
    conn.close()
    
    print("=" * 60)
    print("紫微斗数案例数据创建完成")
    print("=" * 60)
    print(f"总案例数: {case_count}")
    print(f"总宫位记录: {gong_count}")
    print(f"总解盘断语: {analysis_count}")
    print(f"\n按性别分布:")
    for g, c in by_gender:
        print(f"  {g}: {c}")
    print("=" * 60)

if __name__ == '__main__':
    create_sample_data()
