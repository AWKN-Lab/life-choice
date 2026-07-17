/**
 * K线 + 潮汐图 种子数据生成脚本
 *
 * 生成 2025-07 ~ 2025-12 共 6 个月的模拟数据，讲述一个完整的故事弧线：
 *   盛夏忙碌冲刺 → 初秋倦怠透支 → 深秋触底调整 → 年末恢复成长
 *
 * 运行方式：npx tsx prisma/seed-kline-tide.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── 常量 ──────────────────────────────────────────────
const USER_ID = 'seed-user-001';

/** 6 个月的 (year, month) 列表 */
const MONTHS = [
  { year: 2025, month: 7 },
  { year: 2025, month: 8 },
  { year: 2025, month: 9 },
  { year: 2025, month: 10 },
  { year: 2025, month: 11 },
  { year: 2025, month: 12 },
];

// ─── 工具函数 ──────────────────────────────────────────

/** 将数值限制在 [lo, hi] 范围 */
function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

/** 保留一位小数 */
function r1(v: number) {
  return Math.round(v * 10) / 10;
}

/**
 * 确定性伪随机：基于种子值生成 [-1, 1] 范围的偏移
 * 保证每次运行结果一致（同一条 seed 产生同一个故事）
 */
function seededOffset(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return (x - Math.floor(x)) * 2 - 1; // → [-1, 1]
}

// ─── K 线 OHLCV 生成 ────────────────────────────────────

/** 人生线趋势配置：起点 + 每月增量序列 + 月内振幅 */
interface LineConfig {
  name: string;
  /** 月初基准 open */
  start: number;
  /** 6 个月各月的 close 增量（累加到上一月 close 上） */
  deltas: number[];
  /** 月内振幅系数（0~1），决定 high/low 距 open/close 的距离 */
  swing: number;
}

/**
 * 七条人生线的趋势设计——
 *
 * | 线         | 故事弧线                                            |
 * |-----------|----------------------------------------------------|
 * | career    | 从 55 起步，夏季冲高(7、8月)，秋季小幅回落，年末反弹      |
 * | wealth    | 波动大：7 月平 → 8 月小赚 → 9 月回撤 → 年末反弹创新高    |
 * | health    | 从 65 开始，夏季透支下滑，10 月触底，年末恢复到中高水平     |
 * | relationship | 稳定在 60 附近，小幅波动                               |
 * | growth    | 稳步上升：从 45 一路增长到 68                           |
 * | freedom   | 从 62 缓慢下降（工作挤压），年末稍有恢复                   |
 * | buffer    | 随机波动较大：模拟"余量"的不确定性                       |
 */
const LINE_CONFIGS: LineConfig[] = [
  {
    name: 'career',
    start: 55,
    deltas: [+5, +3, -2, -3, +4, +6],
    swing: 0.15,
  },
  {
    name: 'wealth',
    start: 50,
    deltas: [+2, +6, -8, +3, +5, +7],
    swing: 0.25,
  },
  {
    name: 'health',
    start: 65,
    deltas: [-2, -5, -6, -3, +6, +5],
    swing: 0.12,
  },
  {
    name: 'relationship',
    start: 60,
    deltas: [+1, -1, +2, -1, +1, +2],
    swing: 0.08,
  },
  {
    name: 'growth',
    start: 45,
    deltas: [+3, +4, +3, +5, +4, +5],
    swing: 0.10,
  },
  {
    name: 'freedom',
    start: 62,
    deltas: [-1, -3, -2, -1, +2, +3],
    swing: 0.10,
  },
  {
    name: 'buffer',
    start: 55,
    deltas: [+3, -5, -4, +6, -2, +5],
    swing: 0.20,
  },
];

/**
 * 为单条人生线生成一个月的 OHLCV 数据
 *
 * @param cfg  该线配置
 * @param i    月份索引 0~5
 * @param prevClose 上月收盘价
 * @returns {{ open, high, low, close, volume, closeValue }}
 */
function generateOHLCV(cfg: LineConfig, i: number, prevClose: number) {
  // 种子 = 线名 hash + 月份，保证确定性
  const seed = cfg.name.length * 100 + i * 7 + cfg.start;
  const noise = seededOffset(seed) * cfg.swing * 10;

  const open = r1(clamp(prevClose + noise * 0.3));
  const close = r1(clamp(prevClose + cfg.deltas[i] + noise * 0.5));

  // high 取 open/close 较大值 + 正向摆动；low 取较小值 - 负向摆动
  const peak = Math.max(open, close);
  const trough = Math.min(open, close);
  const swingRange = cfg.swing * 12;
  const high = r1(clamp(peak + Math.abs(seededOffset(seed + 1)) * swingRange));
  const low = r1(clamp(trough - Math.abs(seededOffset(seed + 2)) * swingRange));

  // volume = 月行动次数 5~20，基于忙碌程度：夏季和年末偏高
  const volumeBase = [15, 18, 12, 8, 10, 16]; // 叙事弧线：忙碌→透支→低谷→恢复
  const volume = clamp(volumeBase[i] + Math.round(seededOffset(seed + 3) * 3), 5, 20);

  return { open, high, low, close, volume };
}

/**
 * 生成全部 6 个月的 KlineBar 数据
 */
function generateKlineBars() {
  // 记录每条线上月收盘价，用于下月开盘参考
  const prevClose: Record<string, number> = {};
  LINE_CONFIGS.forEach((c) => (prevClose[c.name] = c.start));

  return MONTHS.map(({ year, month }, i) => {
    const lines: Record<string, { open: number; high: number; low: number; close: number; volume: number }> = {};

    LINE_CONFIGS.forEach((cfg) => {
      const ohlcv = generateOHLCV(cfg, i, prevClose[cfg.name]);
      lines[cfg.name] = ohlcv;
      prevClose[cfg.name] = ohlcv.close;
    });

    // compositeCapital = 七线收盘均值
    const closes = LINE_CONFIGS.map((c) => lines[c.name].close);
    const compositeCapital = r1(closes.reduce((a, b) => a + b, 0) / closes.length);

    // volatility = 七线 (high - low) 均值，衡量整体波动
    const ranges = LINE_CONFIGS.map((c) => lines[c.name].high - lines[c.name].low);
    const volatility = r1(ranges.reduce((a, b) => a + b, 0) / ranges.length);

    const monthLabel = `${year}-${String(month).padStart(2, '0')}`;

    return {
      userId: USER_ID,
      year,
      month,
      monthLabel,
      career: JSON.stringify(lines.career),
      wealth: JSON.stringify(lines.wealth),
      health: JSON.stringify(lines.health),
      relationship: JSON.stringify(lines.relationship),
      growth: JSON.stringify(lines.growth),
      freedom: JSON.stringify(lines.freedom),
      buffer: JSON.stringify(lines.buffer),
      compositeCapital,
      volatility,
    };
  });
}

// ─── 潮汐图 StateSnapshot 生成 ───────────────────────────

/**
 * 12 维状态向量的月度基准值设计——
 *
 * 故事弧线：
 * - 7 月：精力充沛、状态不错，全力冲刺期
 * - 8 月：高强度导致恢复不足，情绪和清晰度开始下滑
 * - 9 月：透支加深，能量/恢复/动量跌至低谷
 * - 10 月：触底，但支持系统和秩序感托底，开始反思
 * - 11 月：主动调整，恢复和情绪明显回升
 * - 12 月：全面恢复，成长感和能动性达到年内高点
 */
const STATE_BASELINES = [
  // 7月：高能冲刺
  { energy: 72, recovery: 65, emotion: 68, clarity: 70, liquidity: 55, momentum: 70, support: 60, agency: 68, order: 65, growth: 60, optionality: 58, buffer: 52 },
  // 8月：高强度持续，恢复跟不上
  { energy: 60, recovery: 48, emotion: 55, clarity: 58, liquidity: 52, momentum: 62, support: 58, agency: 60, order: 58, growth: 63, optionality: 52, buffer: 45 },
  // 9月：透支显现，倦怠期
  { energy: 45, recovery: 38, emotion: 42, clarity: 45, liquidity: 48, momentum: 40, support: 55, agency: 48, order: 50, growth: 58, optionality: 45, buffer: 40 },
  // 10月：触底，但秩序和支持托住
  { energy: 42, recovery: 40, emotion: 45, clarity: 48, liquidity: 50, momentum: 38, support: 62, agency: 50, order: 55, growth: 55, optionality: 48, buffer: 42 },
  // 11月：主动调整，恢复回升
  { energy: 58, recovery: 60, emotion: 62, clarity: 60, liquidity: 55, momentum: 55, support: 65, agency: 62, order: 62, growth: 65, optionality: 55, buffer: 50 },
  // 12月：全面恢复，年末收获
  { energy: 70, recovery: 72, emotion: 75, clarity: 72, liquidity: 60, momentum: 72, support: 68, agency: 75, order: 68, growth: 72, optionality: 62, buffer: 55 },
];

/**
 * 计算 capacity（承载力）
 * = 加权平均(energy, recovery, liquidity, support, clarity, order, buffer) - entropy 惩罚
 *
 * 权重偏向"硬实力"维度：energy(0.18), recovery(0.15), liquidity(0.15),
 * support(0.12), clarity(0.15), order(0.12), buffer(0.13)
 */
function calcCapacity(dims: Record<string, number>, entropy: number): number {
  const w = {
    energy: 0.18,
    recovery: 0.15,
    liquidity: 0.15,
    support: 0.12,
    clarity: 0.15,
    order: 0.12,
    buffer: 0.13,
  };
  let sum = 0;
  for (const [k, weight] of Object.entries(w)) {
    sum += dims[k] * weight;
  }
  // entropy 惩罚：熵值越高，承载力折损越大（最多扣 15 分）
  const penalty = (entropy / 100) * 15;
  return r1(clamp(sum - penalty));
}

/**
 * 计算 entropy（熵 / 系统混乱度）
 * = 状态波动代理(0.4) + 开放回路代理(0.35) + 计划偏差代理(0.25)
 *
 * - 状态波动代理：本月 12 维标准差越大 → 系统越不稳定
 * - 开放回路代理：energy 和 recovery 的差值越大 → 未关闭的消耗回路越多
 * - 计划偏差代理：momentum 与 agency 的差值越大 → 想做 vs 能做的落差
 */
function calcEntropy(dims: Record<string, number>): number {
  const values = Object.values(dims);

  // 1) 状态波动代理：标准差
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const volatilityProxy = clamp(stdDev * 2.5); // 放大到 0~100 量级

  // 2) 开放回路代理：|energy - recovery|，消耗和恢复脱节程度
  const openLoopProxy = clamp(Math.abs(dims.energy - dims.recovery) * 1.5);

  // 3) 计划偏差代理：|momentum - agency|，动力与掌控力的落差
  const scheduleVarianceProxy = clamp(Math.abs(dims.momentum - dims.agency) * 1.5);

  return r1(
    clamp(
      volatilityProxy * 0.4 +
        openLoopProxy * 0.35 +
        scheduleVarianceProxy * 0.25,
    ),
  );
}

/**
 * 判断象限（四象限模型）
 *
 * | capacity | entropy | quadrant      | 中文含义     |
 * |----------|---------|---------------|-------------|
 * | high     | low     | prosperous    | 稳健扩张     |
 * | high     | high    | exploration | 高压探索     |
 * | low      | low     | recovery    | 收敛修复     |
 * | low      | high    | risk        | 风险暴露     |
 *
 * 阈值：capacity 以 55 为界，entropy 以 25 为界
 */
function calcQuadrant(capacity: number, entropy: number): string {
  const highCap = capacity >= 55;
  const highEnt = entropy >= 25;

  if (highCap && !highEnt) return 'prosperous'; // 稳健扩张
  if (highCap && highEnt) return 'exploration'; // 高压探索
  if (!highCap && !highEnt) return 'recovery'; // 收敛修复
  return 'risk'; // 风险暴露
}

/**
 * 生成全部 6 个月的 StateSnapshot 数据
 */
function generateSnapshots() {
  return MONTHS.map(({ year, month }, i) => {
    const base = STATE_BASELINES[i];

    // 加入微量确定性噪声（±3），让数据不死板
    const dims: Record<string, number> = {};
    for (const [key, val] of Object.entries(base)) {
      const noise = seededOffset(i * 13 + key.length * 7) * 3;
      dims[key] = r1(clamp(val + noise));
    }

    // 先算 entropy，再算 capacity（capacity 依赖 entropy）
    const entropy = calcEntropy(dims);
    const capacity = calcCapacity(dims, entropy);
    const quadrant = calcQuadrant(capacity, entropy);

    const date = `${year}-${String(month).padStart(2, '0')}`;

    return {
      userId: USER_ID,
      year,
      month,
      date,
      energy: dims.energy,
      recovery: dims.recovery,
      emotion: dims.emotion,
      clarity: dims.clarity,
      liquidity: dims.liquidity,
      momentum: dims.momentum,
      support: dims.support,
      agency: dims.agency,
      order: dims.order,
      growth: dims.growth,
      optionality: dims.optionality,
      buffer: dims.buffer,
      capacity,
      entropy,
      quadrant,
    };
  });
}

// ─── 主函数 ──────────────────────────────────────────────

async function main() {
  console.log('🌱 开始生成 K 线 + 潮汐图种子数据...\n');

  const klineBars = generateKlineBars();
  const snapshots = generateSnapshots();

  // ── 插入 KlineBar ──
  console.log('📊 写入 KlineBar（6 个月 × 7 条人生线）：');
  for (const bar of klineBars) {
    await prisma.klineBar.upsert({
      where: { userId_year_month: { userId: bar.userId, year: bar.year, month: bar.month } },
      update: {
        monthLabel: bar.monthLabel,
        career: bar.career,
        wealth: bar.wealth,
        health: bar.health,
        relationship: bar.relationship,
        growth: bar.growth,
        freedom: bar.freedom,
        buffer: bar.buffer,
        compositeCapital: bar.compositeCapital,
        volatility: bar.volatility,
      },
      create: bar,
    });

    // 打印摘要
    const careerObj = JSON.parse(bar.career) as { close: number };
    const healthObj = JSON.parse(bar.health) as { close: number };
    console.log(
      `  ${bar.monthLabel}  综合资本=${bar.compositeCapital}  波动=${bar.volatility}  事业收盘=${careerObj.close}  健康收盘=${healthObj.close}`,
    );
  }

  // ── 插入 StateSnapshot ──
  console.log('\n🌊 写入 StateSnapshot（6 个月 × 12 维状态 + 衍生指标）：');
  for (const snap of snapshots) {
    await prisma.stateSnapshot.upsert({
      where: { userId_year_month: { userId: snap.userId, year: snap.year, month: snap.month } },
      update: {
        date: snap.date,
        energy: snap.energy,
        recovery: snap.recovery,
        emotion: snap.emotion,
        clarity: snap.clarity,
        liquidity: snap.liquidity,
        momentum: snap.momentum,
        support: snap.support,
        agency: snap.agency,
        order: snap.order,
        growth: snap.growth,
        optionality: snap.optionality,
        buffer: snap.buffer,
        capacity: snap.capacity,
        entropy: snap.entropy,
        quadrant: snap.quadrant,
      },
      create: snap,
    });

    // 象限中文映射
    const quadrantLabels: Record<string, string> = {
      prosperous: '稳健扩张',
      exploration: '高压探索',
      recovery: '收敛修复',
      risk: '风险暴露',
    };
    console.log(
      `  ${snap.date}  承载力=${snap.capacity}  熵=${snap.entropy}  象限=${snap.quadrant}(${quadrantLabels[snap.quadrant] ?? ''})  能量=${snap.energy}  恢复=${snap.recovery}`,
    );
  }

  console.log('\n✅ 种子数据写入完成！共 KlineBar×' + klineBars.length + ' + StateSnapshot×' + snapshots.length);
}

main()
  .catch((e) => {
    console.error('❌ 种子脚本失败：', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
