/**
 * 共享 Framer Motion 动画变体与缓动曲线
 *
 * 使用方式：
 *   import { EASE_OUT_EXPO, msgVariants } from '@/lib/motion-variants';
 *   transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
 *   initial={msgVariants.system.initial} animate={msgVariants.system.animate}
 */

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * 聊天消息变体（带 x 位移 + scale 缩放）
 * 用于 FrontdeskChat / ResultChat 等左右分栏式聊天
 */
export const msgVariants = {
  system: {
    initial: { opacity: 0, x: -16, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
  },
  user: {
    initial: { opacity: 0, x: 16, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
  },
};

/**
 * 聊天消息变体（简化版，仅 y 位移）
 * 用于 DialogueChat 等纵向堆叠式聊天
 */
export const msgVariantsSimple = {
  system: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },
  user: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },
};

/**
 * 淡入上移（通用入场动画）
 */
export const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};
