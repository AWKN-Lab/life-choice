"""
大六壬排盘系统综合测试
测试所有核心模块
"""

from datetime import datetime
from .dlr_core import qike
from .dlr_basic import DLRBasicTools
from .dlr_yuejiang import YuejiangCalculator
from .dlr_tiandi import TiandiPan
from .dlr_sike import SikeCalculator
from .dlr_sanchuan import fa_sanchuan
from .dlr_keti import judge_keti
from .dlr_shensha import lookup_shensha
from .dlr_bifa import match_bifa_patterns
from .dlr_zhanduan import zhanduan_question


def test_basic_tools():
    """测试基础工具"""
    print("=" * 60)
    print("测试：基础工具")
    print("=" * 60)
    
    tools = DLRBasicTools()
    
    print(f"十天干：{tools.GAN}")
    print(f"十二地支：{tools.ZHI}")
    print(f"五行生：金→水→木→火→土→金")
    print(f"五行克：金→木→土→水→火→金")
    
    return True


def test_yuejiang():
    """测试月将计算"""
    print("=" * 60)
    print("测试：月将计算")
    print("=" * 60)
    
    calc = YuejiangCalculator()
    
    test_dates = [
        (datetime(2024, 2, 20, 10), "北京"),  # 雨水后
        (datetime(2024, 3, 22, 10), "北京"),  # 春分后
        (datetime(2024, 4, 21, 10), "北京"),  # 谷雨后
    ]
    
    for date, location in test_dates:
        yuejiang = calc.get_yuejiang(date, location)
        print(f"{date.strftime('%Y-%m-%d %H:%M')} ({location}) → {yuejiang[0]} {yuejiang[1]}")
    
    return True


def test_tiandi_pan():
    """测试天地盘"""
    print("=" * 60)
    print("测试：天地盘")
    print("=" * 60)
    
    # 月将亥加占时寅
    pan = TiandiPan("亥", "寅")
    print(pan.display())
    
    return True


def test_sike():
    """测试四课"""
    print("=" * 60)
    print("测试：四课")
    print("=" * 60)
    
    # 先布天地盘
    tiandi = TiandiPan("亥", "寅")
    tianpan = tiandi.get_tianpan()
    
    # 甲子日
    sike = qi_sike("甲", "子", tianpan)
    print(f"甲子日四课：{sike}")
    
    return True


def test_sanchuan():
    """测试三传"""
    print("=" * 60)
    print("测试：三传")
    print("=" * 60)
    
    # 先布天地盘、起四课
    tiandi = TiandiPan("亥", "寅")
    tianpan = tiandi.get_tianpan()
    dipan = tiandi.get_dipan()
    sike = qi_sike("甲", "子", tianpan)
    
    # 发三传
    sanchuan = fa_sanchuan(sike, tianpan, dipan, "甲")
    print(f"三传：{sanchuan}")
    
    return True


def test_keti():
    """测试课体"""
    print("=" * 60)
    print("测试：课体")
    print("=" * 60)
    
    # 伏吟课
    keti = judge_keti({}, ('子', '子', '子'), is_fuyin=True)
    print(f"伏吟课：{keti}")
    
    # 返吟课
    keti = judge_keti({}, ('午', '子', '午'), is_fanyin=True)
    print(f"返吟课：{keti}")
    
    return True


def test_shensha():
    """测试神煞"""
    print("=" * 60)
    print("测试：神煞")
    print("=" * 60)
    
    date = datetime(2024, 1, 15)
    shensha = lookup_shensha(date, '甲', '子', '疾病')
    print(f"疾病占神煞：{shensha}")
    
    return True


def test_bifa():
    """测试毕法赋"""
    print("=" * 60)
    print("测试：毕法赋")
    print("=" * 60)
    
    sike = {'lesson1': '甲 → 子'}
    sanchuan = ('子', '子', '子')
    
    result = match_bifa_patterns(sike, sanchuan, '伏吟课', '婚姻')
    print(f"毕法赋格局：{result['patterns']}")
    print(f"银河棹口诀：{result['yinhezhuo_oracles']}")
    
    return True


def test_zhanduan():
    """测试分类占断"""
    print("=" * 60)
    print("测试：分类占断")
    print("=" * 60)
    
    sike = {'lesson1': '甲 → 子'}
    sanchuan = ('子', '子', '子')
    
    result = zhanduan_question(sike, sanchuan, '伏吟课', {}, [], '婚姻')
    print(f"婚姻占断：{result}")
    
    return True


def test_core_engine():
    """测试核心引擎"""
    print("=" * 60)
    print("测试：核心引擎（完整排盘）")
    print("=" * 60)
    
    # 起课
    kepan = qike(2024, 1, 15, 10, 30, location="北京", question="婚姻")
    print(kepan.display())
    
    return True


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("大六壬排盘系统综合测试")
    print("=" * 60 + "\n")
    
    tests = [
        ("基础工具", test_basic_tools),
        ("月将计算", test_yuejiang),
        ("天地盘", test_tiandi_pan),
        ("四课", test_sike),
        ("三传", test_sanchuan),
        ("课体", test_keti),
        ("神煞", test_shensha),
        ("毕法赋", test_bifa),
        ("分类占断", test_zhanduan),
        ("核心引擎", test_core_engine),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
            print()
        except Exception as e:
            print(f"❌ {name} 测试失败：{e}\n")
            results.append((name, False))
    
    # 汇总
    print("=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅ 通过" if success else "❌ 失败"
        print(f"{status} - {name}")
    
    print()
    print(f"总计：{passed}/{total} 通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！大六壬排盘系统功能正常！")
    else:
        print(f"\n⚠️  有 {total - passed} 个测试未通过，请检查！")
    
    return passed == total


if __name__ == "__main__":
    main()
