"""
大六壬四课起出模块
功能：十干寄宫定位、四课起出
来源：大六壬指南 + 六壬起课基础规则库
"""

from typing import Dict, List, Optional
from .dlr_basic import DLRBasicTools
from .dlr_tiandi import TiandiPan


class SikeCalculator:
    """四课计算器"""
    
    # 十干寄宫（禄位）
    GAN_LU = {
        "甲": "寅", "乙": "辰", "丙": "巳", "丁": "未",
        "戊": "巳", "己": "午", "庚": "申", "辛": "戌",
        "壬": "亥", "癸": "丑"
    }
    
    def __init__(self, day_gan: str, day_zhi: str, tianpan: List[str]):
        """
        初始化四课计算器
        :param day_gan: 日干
        :param day_zhi: 日支
        :param tianpan: 天盘列表
        """
        self.day_gan = day_gan
        self.day_zhi = day_zhi
        self.tianpan = tianpan
        self.dipan = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        self.tools = DLRBasicTools()
    
    def _get_shang_shen(self, base_shen: str) -> str:
        """
        获取某神上的天神
        :param base_shen: 基础神（地支）
        :return: 上神
        """
        if base_shen not in self.dipan:
            return "未知"
        
        index = self.dipan.index(base_shen)
        return self.tianpan[index]
    
    def get_sike(self) -> Dict[str, str]:
        """
        起四课
        :return: 四课字典
        """
        # 第一课：干阳（日干上神）
        # 日干寄宫位上的天神
        gan_lu = self.GAN_LU.get(self.day_gan)
        if not gan_lu:
            return {"error": "日干错误"}
        
        gan_shang = self._get_shang_shen(gan_lu)
        lesson1 = f"{self.day_gan} → {gan_shang}"
        
        # 第二课：干阴（干上神之阴神）
        gan_yin = self._get_shang_shen(gan_shang)
        lesson2 = f"{gan_shang} → {gan_yin}"
        
        # 第三课：支阳（日支上神）
        zhi_shang = self._get_shang_shen(self.day_zhi)
        lesson3 = f"{self.day_zhi} → {zhi_shang}"
        
        # 第四课：支阴（支上神之阴神）
        zhi_yin = self._get_shang_shen(zhi_shang)
        lesson4 = f"{zhi_shang} → {zhi_yin}"
        
        return {
            "lesson1": lesson1,
            "lesson2": lesson2,
            "lesson3": lesson3,
            "lesson4": lesson4,
            "gan_lu": gan_lu,
            "gan_shang": gan_shang,
            "gan_yin": gan_yin,
            "zhi_shang": zhi_shang,
            "zhi_yin": zhi_yin
        }
    
    def display(self) -> str:
        """
        显示四课
        :return: 格式化字符串
        """
        sike = self.get_sike()
        
        if "error" in sike:
            return f"错误：{sike['error']}"
        
        result = []
        result.append("四课：")
        result.append("-" * 40)
        result.append(f"第一课（干阳）：{sike['lesson1']}")
        result.append(f"第二课（干阴）：{sike['lesson2']}")
        result.append(f"第三课（支阳）：{sike['lesson3']}")
        result.append(f"第四课（支阴）：{sike['lesson4']}")
        result.append("-" * 40)
        
        return "\n".join(result)


# 便捷函数
def qi_sike(day_gan: str, day_zhi: str, tianpan: List[str]) -> Dict[str, str]:
    """
    起四课
    :param day_gan: 日干
    :param day_zhi: 日支
    :param tianpan: 天盘
    :return: 四课字典
    """
    calc = SikeCalculator(day_gan, day_zhi, tianpan)
    return calc.get_sike()


# 测试
if __name__ == "__main__":
    # 示例：甲子日，月将亥加占时寅
    print("示例：甲子日，月将亥加占时寅")
    
    # 先布天地盘
    from .dlr_tiandi import TiandiPan
    tiandi = TiandiPan("亥", "寅")
    tianpan = tiandi.get_tianpan()
    
    # 起四课
    sike_calc = SikeCalculator("甲", "子", tianpan)
    print(sike_calc.display())
    
    sike = sike_calc.get_sike()
    print(f"\n详细数据：{sike}")
