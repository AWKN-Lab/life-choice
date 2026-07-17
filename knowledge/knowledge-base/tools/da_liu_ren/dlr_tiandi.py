"""
大六壬天地盘布盘模块
功能：月将加占时、布天地盘、伏吟/返吟判断
来源：大六壬指南 + 六壬起课基础规则库
"""

from typing import List, Dict, Optional
from .dlr_basic import DLRBasicTools


class TiandiPan:
    """天地盘布盘系统"""
    
    # 十二地支
    ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    
    def __init__(self, yuejiang: str, zhanshi: str):
        """
        初始化天地盘
        :param yuejiang: 月将（地支）
        :param zhanshi: 占时（地支）
        """
        self.yuejiang = yuejiang
        self.zhanshi = zhanshi
        self.dipan = self.ZHI.copy()  # 地盘固定
        self.tianpan = self._bu_tianpan()  # 布天盘
        self.tools = DLRBasicTools()
    
    def _bu_tianpan(self) -> List[str]:
        """
        布天盘（月将加占时）
        :return: 天盘列表
        """
        yuejiang_index = self.ZHI.index(self.yuejiang)
        zhanshi_index = self.ZHI.index(self.zhanshi)
        
        # 月将加在占时上，顺布十二宫
        # 计算位移：月将索引 - 占时索引
        shift = (yuejiang_index - zhanshi_index) % 12
        
        # 天盘 = 地盘顺时针旋转 shift 位
        tianpan = self.ZHI[shift:] + self.ZHI[:shift]
        
        return tianpan
    
    def get_tianpan(self) -> List[str]:
        """获取天盘"""
        return self.tianpan
    
    def get_dipan(self) -> List[str]:
        """获取地盘"""
        return self.dipan
    
    def get_tianpan_shen(self, dizhi: str) -> str:
        """
        获取天盘某地支上的天神
        :param dizhi: 地盘地支
        :return: 天盘天神
        """
        if dizhi not in self.dipan:
            return "未知"
        
        index = self.dipan.index(dizhi)
        return self.tianpan[index]
    
    def get_dipan_shen(self, dizhi: str) -> str:
        """
        获取地盘某位置的地神
        :param dizhi: 地支
        :return: 地神（就是地支本身）
        """
        return dizhi
    
    def is_fuyin(self) -> bool:
        """
        判断是否伏吟（天地盘相同）
        :return: True/False
        """
        return self.tianpan == self.dipan
    
    def is_fanyin(self) -> bool:
        """
        判断是否返吟（天地盘对冲）
        :return: True/False
        """
        for i, tian in enumerate(self.tianpan):
            di = self.dipan[i]
            # 六冲关系
            chong_map = {
                "子": "午", "午": "子",
                "丑": "未", "未": "丑",
                "寅": "申", "申": "寅",
                "卯": "酉", "酉": "卯",
                "辰": "戌", "戌": "辰",
                "巳": "亥", "亥": "巳"
            }
            if chong_map.get(tian) != di:
                return False
        return True
    
    def get_keti(self) -> str:
        """
        获取课体判断
        :return: 课体名称
        """
        if self.is_fuyin():
            return "伏吟课"
        elif self.is_fanyin():
            return "返吟课"
        else:
            return "正常课"
    
    def display(self) -> str:
        """
        显示天地盘
        :return: 格式化字符串
        """
        result = []
        result.append("天地盘布局：")
        result.append("-" * 60)
        
        for i, dizhi in enumerate(self.dipan):
            tian = self.tianpan[i]
            result.append(f"{dizhi}: 天盘 {tian}")
        
        result.append("-" * 60)
        result.append(f"课体：{self.get_keti()}")
        
        return "\n".join(result)


# 便捷函数
def bu_tiandi_pan(yuejiang: str, zhanshi: str) -> TiandiPan:
    """
    布天地盘
    :param yuejiang: 月将
    :param zhanshi: 占时
    :return: 天地盘对象
    """
    return TiandiPan(yuejiang, zhanshi)


def is_fuyin(yuejiang: str, zhanshi: str) -> bool:
    """判断是否伏吟"""
    pan = TiandiPan(yuejiang, zhanshi)
    return pan.is_fuyin()


def is_fanyin(yuejiang: str, zhanshi: str) -> bool:
    """判断是否返吟"""
    pan = TiandiPan(yuejiang, zhanshi)
    return pan.is_fanyin()


# 测试
if __name__ == "__main__":
    # 测试 1：月将亥（登明）加占时寅（功曹）
    print("测试 1：月将亥加占时寅")
    pan1 = TiandiPan("亥", "寅")
    print(pan1.display())
    print()
    
    # 测试 2：伏吟课（月将子加占时子）
    print("测试 2：伏吟课（月将子加占时子）")
    pan2 = TiandiPan("子", "子")
    print(pan2.display())
    print(f"是否伏吟：{pan2.is_fuyin()}")
    print()
    
    # 测试 3：返吟课（月将午加占时子）
    print("测试 3：返吟课（月将午加占时子）")
    pan3 = TiandiPan("午", "子")
    print(pan3.display())
    print(f"是否返吟：{pan3.is_fanyin()}")
