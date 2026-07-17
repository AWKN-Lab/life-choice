"""
玄学排盘统一API服务
功能：八字、大六壬、六爻、奇门等排盘
"""
from flask import Flask, jsonify, request, abort
from datetime import datetime
import sys
import os

app = Flask(__name__)

# 添加工具路径
sys.path.insert(0, '/root/xuanxue_tools')
sys.path.insert(0, '/root/xuanxue_tools/da_liu_ren')
sys.path.insert(0, '/root/xuanxue_tools/liu_yao')
sys.path.insert(0, '/root/xuanxue_tools/lunar_tools')
sys.path.insert(0, '/root/xuanxue_tools/zi_wei')

# 导入模块
from dlr_core import DaLiuRenCore
from ly_core import LiuYaoCore
from ganzhi_calculator import GanzhiCalculator
from lunar_converter import LunarConverter

# ==================== 工具类实例 ====================
dlr = DaLiuRenCore()
liuyao = LiuYaoCore()
gzc = GanzhiCalculator()
lunar = LunarConverter()


# ==================== 统一入口 ====================
@app.route('/api/paipan', methods=['POST'])
def paipan():
    """
    统一排盘接口
    请求体: {
        "type": "bazi|liuren|liuyao|qimen|ziwei",
        "birth": {
            "year": 1990,
            "month": 1,
            "day": 15,
            "hour": 10,
            "minute": 30,
            "gender": "male|female"  # 仅八字需要
        },
        "ask_time": "2024-01-15T14:30",  # 仅大六壬需要（用户提问时刻）
        "city": "北京"  # 真太阳时校正
    }
    """
    if not request.json:
        abort(400)

    data = request.json
    ptype = data.get('type')
    birth = data.get('birth', {})
    ask_time = data.get('ask_time')
    city = data.get('city', '北京')

    try:
        if ptype == 'bazi':
            return jsonify(calc_bazi(birth))
        elif ptype == 'liuren':
            return jsonify(calc_liuren(ask_time, birth, city))
        elif ptype == 'liuyao':
            return jsonify(calc_liuyao(birth))
        elif ptype == 'qimen':
            return jsonify(calc_qimen(birth))
        elif ptype == 'ziwei':
            return jsonify(calc_ziwei(birth))
        else:
            abort(400, description=f"Unknown type: {ptype}")
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def calc_bazi(birth):
    """八字排盘"""
    year = birth.get('year')
    month = birth.get('month')
    day = birth.get('day')
    hour = birth.get('hour', 0)
    minute = birth.get('minute', 0)
    gender = birth.get('gender', 'male')

    date = datetime(year, month, day, hour, minute)
    four_pillars = gzc.get_four_pillars(date)

    return {
        'type': 'bazi',
        'four_pillars': four_pillars,
        'gender': gender,
        'wuxing': {
            'year': gzc.get_gan_wuxing(four_pillars['year_gan']),
            'month': gzc.get_gan_wuxing(four_pillars['month_gan']),
            'day': gzc.get_gan_wuxing(four_pillars['day_gan']),
            'hour': gzc.get_gan_wuxing(four_pillars['hour_gan'])
        }
    }


def calc_liuren(ask_time, birth, city):
    """大六壬排盘"""
    if not ask_time:
        # 使用当前时刻
        ask_time = datetime.now().strftime('%Y-%m-%dT%H:%M')

    ask_dt = datetime.strptime(ask_time, '%Y-%m-%dT%H:%M')

    # 解析出生信息用于真太阳时校正
    year = birth.get('year')
    month = birth.get('month')
    day = birth.get('day')
    hour = birth.get('hour', 0)

    result = dlr.paipan(ask_dt.year, ask_dt.month, ask_dt.day, ask_dt.hour)

    return {
        'type': 'liuren',
        'ask_time': ask_time,
        'city': city,
        'result': result
    }


def calc_liuyao(birth):
    """六爻排盘"""
    year = birth.get('year')
    month = birth.get('month')
    day = birth.get('day')
    hour = birth.get('hour', 0)

    date = datetime(year, month, day, hour)
    result = liuyao.paipan(date)

    return {
        'type': 'liuyao',
        'result': result
    }


def calc_qimen(birth):
    """奇门遁甲（暂用占卜法）"""
    # 占卜式奇门
    year = birth.get('year')
    month = birth.get('month')
    day = birth.get('day')
    hour = birth.get('hour', 0)

    date = datetime(year, month, day, hour)

    # 简化版奇门
    return {
        'type': 'qimen',
        'message': '奇门遁甲排盘开发中',
        'birth': birth
    }


def calc_ziwei(birth):
    """紫微斗数"""
    year = birth.get('year')
    month = birth.get('month')
    day = birth.get('day')
    hour = birth.get('hour', 0)

    try:
        from zi_wei.ziwei_engine import ZiWeiEngine
        zw = ZiWeiEngine()
        result = zw.paipan(year, month, day, hour)
        return {
            'type': 'ziwei',
            'result': result
        }
    except Exception as e:
        return {
            'type': 'ziwei',
            'message': f'紫微斗数排盘开发中: {str(e)}',
            'birth': birth
        }


# ==================== 健康检查 ====================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})


# ==================== 测试接口 ====================
@app.route('/api/test/bazi', methods=['GET'])
def test_bazi():
    """测试八字"""
    result = calc_bazi({
        'year': 1990, 'month': 1, 'day': 15,
        'hour': 10, 'gender': 'male'
    })
    return jsonify(result)


@app.route('/api/test/liuren', methods=['GET'])
def test_liuren():
    """测试大六壬"""
    result = calc_liuren(
        '2024-01-15T14:30',
        {'year': 1990, 'month': 1, 'day': 15, 'hour': 10},
        '北京'
    )
    return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
