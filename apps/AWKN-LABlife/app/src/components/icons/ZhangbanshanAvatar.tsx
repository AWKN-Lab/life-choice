/**
 * ZhangbanshanAvatar · 张半山头像组件（P1-1 统一入口）
 *
 * 用途：
 *   替代 MUI `psychology` 图标，让用户感知"张半山"在跟自己说话
 *
 * 设计要点：
 *   - 圆形裁切（陪断者是"人"，不是系统）
 *   - 按 size 字段选不同清晰度图片（节省带宽）
 *   - Feature Flag 包裹：avatar_replacement_enabled 关闭时回退 psychology 图标
 *   - rounded 支持 'full' | 'lg' | 'md' 三种圆角（消息气泡 / 侧栏 / 卡片）
 *   - 无外部 store 依赖，userId 从 prop 传入（避免组件与 store 耦合）
 *   - size 接受 number（精确像素）或 'sm'|'md'|'lg'（粗粒度，自动映射到 32/40/56）
 *
 * 关联资源：
 *   - 35 号源图：public/images/agents/zhangbanshan.png
 *   - 64×64：消息气泡
 *   - 128×128：侧栏 / ResultChat
 *   - 1024×1024：高 DPI 设备 / Hero
 *
 * 合并历史（2026-06-14）：
 *   - 之前存在 `components/common/ZhangbanshanAvatar.tsx`（Chat 组件用 sm/md/lg，
 *     远程 URL，无 Feature Flag）和本组件（Result/Brand 用数字，本地静态，有 Flag）
 *   - 合并后本组件为统一入口；common/ 改为 re-export 薄包装保持 import path 兼容
 *
 * @author P1-1 实施 + 合并
 * @date 2026-06-14
 */

import { useMemo, useState } from 'react';
import { isEnabled } from '../../lib/feature-flag';

/**
 * size 联合类型：精确像素（数字）或粗粒度（字符串）
 *
 * - 数字：直接使用（如 18 / 32 / 128）
 * - 'sm' → 32px（聊天消息气泡小头像）
 * - 'md' → 40px（聊天消息气泡中头像）
 * - 'lg' → 56px（聊天消息气泡大头像）
 */
export type AvatarSize = number | 'sm' | 'md' | 'lg';

/** 字符串 size → 像素映射（保持与旧 common/ 组件一致） */
const STRING_TO_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

/** 把 AvatarSize 统一解析为数字像素 */
function resolveSize(size: AvatarSize): number {
  return typeof size === 'number' ? size : STRING_TO_PX[size];
}

export type AvatarRounded = 'full' | 'lg' | 'md';

export interface ZhangbanshanAvatarProps {
  /** 头像尺寸（数字像素 或 'sm'/'md'/'lg'） */
  size?: AvatarSize;
  /** 圆角样式 */
  rounded?: AvatarRounded;
  /** 自定义 className */
  className?: string;
  /** alt 文本（无障碍） */
  alt?: string;
  /** 用户 ID（用于 Feature Flag 哈希分桶） */
  userId?: string;
  /** 强制启用（绕过 Feature Flag，主要用于 Storybook/测试） */
  forceEnabled?: boolean;
}

/**
 * 按 size 自动选最优图片（避免 16px 用 1024 浪费带宽）
 */
function pickImageSize(size: number): 64 | 128 | 1024 {
  if (size <= 64) return 64;
  if (size <= 128) return 128;
  return 1024;
}

function roundedClass(rounded: AvatarRounded): string {
  switch (rounded) {
    case 'full':
      return 'rounded-full';
    case 'lg':
      return 'rounded-xl';
    case 'md':
      return 'rounded-md';
  }
}

/**
 * 张半山头像组件（统一入口）
 *
 * 用法：
 *   <ZhangbanshanAvatar size={18} userId={userId} />              // 18px 精确像素
 *   <ZhangbanshanAvatar size="sm" userId={userId} />              // 32px 字符串（兼容旧 chat）
 *   <ZhangbanshanAvatar size={64} rounded="full" userId={userId} /> // 64px 圆形
 *   <ZhangbanshanAvatar size={128} rounded="lg" userId={userId} />  // 128px 大圆角
 *
 * Feature Flag 行为：
 *   - avatar_replacement_enabled = true → 显示张半山头像（35 号本地图）
 *   - avatar_replacement_enabled = false → 显示紫色 psychology 图标（MUI Icon fallback）
 *
 * ⚠️ 行为变化（合并后）：
 *   - 旧 `common/` 版本：始终显示远程 URL 头像，onError 降级为"山"字
 *   - 新本组件：受 Feature Flag 控制，关闭时降级为 psychology 图标
 *   - flag 默认 0% → 旧 chat 调用方会看到 psychology 图标 fallback
 *   - 如需恢复"始终显示头像"行为，调 setFlagOverride('avatar_replacement_enabled', true)
 */
export function ZhangbanshanAvatar({
  size = 32,
  rounded = 'full',
  className = '',
  alt = '张半山',
  userId = 'anonymous',
  forceEnabled = false,
}: ZhangbanshanAvatarProps) {
  const flagEnabled = useMemo(
    () => isEnabled('avatar_replacement_enabled', { userId }),
    [userId],
  );

  const showAvatar = forceEnabled || flagEnabled;
  const pxSize = resolveSize(size);
  const imageSize = pickImageSize(pxSize);
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const imgSrc = `${normalizedBaseUrl}images/agents/zhangbanshan-${imageSize}.png`;
  const [imageFailed, setImageFailed] = useState(false);

  if (!showAvatar || imageFailed) {
    // 回退到紫色 psychology 图标（MUI Icon 字符串协议）
    return (
      <span
        className={`inline-flex items-center justify-center ${roundedClass(rounded)} ${className}`}
        style={{ width: pxSize, height: pxSize, background: 'rgba(168, 85, 247, 0.15)' }}
        aria-label={alt}
        title="张半山（图标模式）"
      >
        <span
          className="material-icons"
          style={{ fontSize: pxSize * 0.7, color: '#a855f7' }}
        >
          psychology
        </span>
      </span>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={pxSize}
      height={pxSize}
      className={`${roundedClass(rounded)} ${className}`}
      style={{
        objectFit: 'cover',
        display: 'inline-block',
        flexShrink: 0,
      }}
      onError={() => setImageFailed(true)}
      loading="lazy"
      decoding="async"
    />
  );
}

export default ZhangbanshanAvatar;
