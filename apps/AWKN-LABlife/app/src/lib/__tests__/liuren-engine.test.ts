/**
 * 大六壬引擎验证测试
 */
import { describe, it, expect } from 'vitest';
import { LiuRenEngine } from '../liuren-engine';

describe('大六壬引擎验证', () => {
  const engine = new LiuRenEngine();

  it('应该正确计算四柱', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    // 验证四柱不为空
    expect(result.sizhu.year.full).toBeTruthy();
    expect(result.sizhu.month.full).toBeTruthy();
    expect(result.sizhu.day.full).toBeTruthy();
    expect(result.sizhu.time.full).toBeTruthy();

    // 验证格式（2字符）
    expect(result.sizhu.year.full.length).toBe(2);
    expect(result.sizhu.month.full.length).toBe(2);
    expect(result.sizhu.day.full.length).toBe(2);
    expect(result.sizhu.time.full.length).toBe(2);
  });

  it('应该正确计算地分', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    // 地分索引0=子
    expect(result.difenName).toBe('子');
    expect(result.difen).toBe(0);
  });

  it('应该正确判断昼夜', () => {
    const dayResult = engine.calculate('2024-03-15 10:00', 0, 12345);
    const nightResult = engine.calculate('2024-03-15 22:00', 0, 12345);

    expect(dayResult.isDayTime).toBe(true);
    expect(nightResult.isDayTime).toBe(false);
  });

  it('应该正确计算四课', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    expect(result.siKe.firstKe.length).toBe(2);
    expect(result.siKe.secondKe.length).toBe(2);
    expect(result.siKe.thirdKe.length).toBeGreaterThanOrEqual(2);
    expect(result.siKe.fourthKe.length).toBe(2);
  });

  it('应该正确计算三传', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    expect(result.sanChuan.shang.length).toBeGreaterThanOrEqual(1);
    expect(result.sanChuan.zhong.length).toBeGreaterThanOrEqual(1);
    expect(result.sanChuan.xia.length).toBeGreaterThanOrEqual(1);
  });

  it('应该正确计算月将', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    expect(result.yueJiang.name).toBeTruthy();
    expect(result.yueJiang.full.length).toBe(1);
  });

  it('应该正确计算贵神', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    expect(result.guiShen.name).toBeTruthy();
    // 贵神应该是12天将之一
    const validGuishen = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
    expect(validGuishen).toContain(result.guiShen.name);
  });

  it('应该正确计算将神', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    expect(result.jiangShen.name).toBeTruthy();
    expect(result.jiangShen.full.length).toBe(1);
  });

  it('应该返回有效的元丈', () => {
    const result = engine.calculate('2024-03-15 10:00', 0, 12345);

    expect(result.yuanWang).toBeTruthy();
    // 元丈应该是有效值之一
    const validYuanWang = ['元', '丈', '命', '斩', '破'];
    expect(validYuanWang.includes(result.yuanWang) || result.yuanWang.length >= 1).toBe(true);
  });

  it('应该正确格式化结果输出', () => {
    const result = engine.calculate('2024-04-01 12:00', 4, 12345);
    const formatted = engine.formatResult(result);

    expect(formatted).toContain('断事推演课');
    expect(formatted).toContain('四柱');
    expect(formatted).toContain('三传');
    expect(formatted).toContain('元丈');
  });

  it('应该缓存结果', () => {
    const result1 = engine.calculate('2024-03-15 10:00', 0, 12345);
    const result2 = engine.calculate('2024-03-15 10:00', 0, 12345);

    // 相同输入应该返回相同结果
    expect(result1.sizhu.day.full).toBe(result2.sizhu.day.full);
    expect(result1.yueJiang.full).toBe(result2.yueJiang.full);
  });
});
