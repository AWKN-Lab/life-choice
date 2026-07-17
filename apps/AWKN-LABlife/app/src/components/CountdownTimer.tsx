/**
 * 倒计时组件 - 会员窗口期专用
 *
 * 用途：
 * 1. 会员开通后的剩余有效期
 * 2. 限时优惠的截止时间
 * 3. 邀请奖励的过期提醒
 *
 * 特性：
 * - 精确到天/时/分/秒
 * - 服务器时间同步（防客户端作弊）
 * - 时间到自动触发回调
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface CountdownTimerProps {
  // 截止时间（ISO 字符串或 Date）
  endTime: string | Date;
  // 出发时间（可选，默认 "现在"）
  startTime?: string | Date;
  // 计时器类型
  type?: 'membership' | 'offer' | 'custom';
  // 到达零时的回调
  onExpire?: () => void;
  // 格式选项
  format?: 'full' | 'short' | 'compact';
  // 到达后的显示文本
  expiredText?: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // 剩余总毫秒数
}

function calcTimeLeft(endTime: Date, startTime: Date): TimeLeft {
  const diff = endTime.getTime() - startTime.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);

  return { days, hours, minutes, seconds, total: diff };
}

export function CountdownTimer({
  endTime,
  startTime,
  type = 'custom',
  onExpire,
  format = 'full',
  expiredText = '已过期',
  className = '',
}: CountdownTimerProps) {
  const end = useMemo(() => new Date(endTime), [endTime]);
  const start = useMemo(() => startTime ? new Date(startTime) : new Date(), [startTime]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(end, start));
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [synced, setSynced] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const hasExpiredRef = useRef(false);

  // 与服务器时间同步（可选，从后端获取）
  const syncWithServer = useCallback(async () => {
    try {
      const t0 = Date.now();
      // 简单起见用 httpbin.org 做延迟估算
      // 实际项目中从自己的后端 /health 或 /api/v1/time 接口获取服务器时间
      const res = await fetch(`${import.meta.env.BASE_URL}api/v1/health`, { method: 'HEAD' }).catch(() => null);
      const t1 = Date.now();
      if (res) {
        const serverNow = new Date(res.headers.get('date') || Date.now()).getTime();
        const offset = serverNow - (t0 + t1) / 2;
        setServerTimeOffset(offset);
        setSynced(true);
      }
    } catch {
      // 忽略，继续使用本地时间
    }
  }, []);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  useEffect(() => {
    // 立即计算一次
    const now = new Date(Date.now() + serverTimeOffset);
    const initial = calcTimeLeft(end, now);
    setTimeLeft(initial);

    if (initial.total <= 0) {
      hasExpiredRef.current = true;
      onExpire?.();
      return;
    }

    // 每秒更新
    intervalRef.current = setInterval(() => {
      const now = new Date(Date.now() + serverTimeOffset);
      const tl = calcTimeLeft(end, now);
      setTimeLeft(tl);

      if (tl.total <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire?.();
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [end, serverTimeOffset, onExpire]);

  if (timeLeft.total <= 0) {
    return (
      <span className={`font-mono text-on-surface/40 ${className}`}>
        {expiredText}
      </span>
    );
  }

  const { days, hours, minutes, seconds } = timeLeft;

  // ---- 紧凑格式：仅天和时 ----
  if (format === 'compact') {
    return (
      <span className={`font-mono text-primary font-medium ${className}`}>
        {days > 0 ? `${days}天` : ''}
        {String(hours).padStart(2, '0')}小时
        {String(minutes).padStart(2, '0')}分
      </span>
    );
  }

  // ---- 短格式：单个数字卡片 ----
  if (format === 'short') {
    const units = [
      { value: days, label: '天', show: days > 0 },
      { value: hours, label: '时', show: true },
      { value: minutes, label: '分', show: true },
      { value: seconds, label: '秒', show: true },
    ].filter(u => u.show);

    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {units.map(({ value, label }, idx) => (
          <div key={label} className="flex items-center">
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md bg-primary/15 text-primary text-sm font-bold font-mono">
              {String(value).padStart(2, '0')}
            </span>
            {idx < units.length - 1 && (
              <span className="text-primary/60 text-sm font-bold mx-0.5">{label}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ---- 完整格式 ----
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {[
        { value: days, label: '天' },
        { value: hours, label: '时' },
        { value: minutes, label: '分' },
        { value: seconds, label: '秒' },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <span className="text-primary text-lg font-bold font-mono">
              {String(value).padStart(2, '0')}
            </span>
          </div>
          <span className="text-primary/60 text-[10px] mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 会员有效期倒计时（专用）
 */
interface MembershipCountdownProps {
  expireDate: string | Date;
  onExpire?: () => void;
  className?: string;
}

export function MembershipCountdown({ expireDate, onExpire, className }: MembershipCountdownProps) {
  const expire = new Date(expireDate);
  const now = new Date();
  const daysLeft = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let expiredText = '已过期';
  let warnText = '';

  if (daysLeft <= 0) {
    expiredText = '今天到期';
  } else if (daysLeft <= 3) {
    warnText = `${daysLeft}天后到期，续费享优惠`;
  } else if (daysLeft <= 7) {
    warnText = `${daysLeft}天会员有效期`;
  }

  return (
    <div className={className}>
      <CountdownTimer
        endTime={expireDate}
        type="membership"
        format="short"
        expiredText={expiredText}
        onExpire={onExpire}
      />
      {warnText && (
        <p className="text-amber-400/80 text-xs mt-1">{warnText}</p>
      )}
    </div>
  );
}
