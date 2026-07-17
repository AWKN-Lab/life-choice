/**
 * SVG 共享工具函数
 */

/**
 * 极坐标转笛卡尔坐标
 * @param cx 圆心 x
 * @param cy 圆心 y
 * @param r 半径
 * @param angle 角度（度，0 = 右侧，顺时针）
 */
export function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
