/**
 * KlineShareCard — V2 分享海报组件（P3-01）
 *
 * 替代 V1 中三个分散的海报实现：
 *   - V1-A: components/kline/KlineShareCard.tsx (MonthlyKlineBar/OHLCV) ← 本文件重写
 *   - V1-B: components/KLineShareCard.tsx (DestinyKlineBundle) ← 保留为 V1 兼容，待 V2 全量切换后移除
 *   - V1 链接分享：硬编码 SHARE_URL ← 改为动态 /share/:snapshotId
 *
 * 设计：
 *   - 直接消费 KlineProductViewModelV2，无 V1 类型依赖
 *   - Canvas 绘制 640×960 分享图片
 *   - 内容：当前阶段/趋势 + 趋势缩略图 + 近期机会节点 + 品牌 + 二维码占位
 *   - 操作：保存图片 + 复制分享链接（指向 /share/:snapshotId）
 *
 * 路由：被 KlinePage 弹窗消费，非路由组件
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type {
  KlineProductViewModelV2,
  KlinePoint,
  KlineNode,
} from '@/types/kline-v2';
import {
  STAGE_LABELS,
  TREND_LABELS,
  NODE_TYPE_LABELS,
} from '@/types/kline-v2';

// ── 配色（半山墨黑 + 青花瓷蓝 + 铜线金） ──
const C = {
  bg: '#1a1a2e',
  bgLight: '#22223a',
  text: '#6ea8d7',
  textLight: '#8bb8e0',
  gold: '#c9a84c',
  goldLight: '#e0c97a',
  white: '#e8e8f0',
  gray: '#6b6b8a',
  divider: 'rgba(201,168,76,0.3)',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
};

// ── 节点类型颜色 ──
function nodeTypeColor(nodeType: KlineNode['nodeType']): string {
  switch (nodeType) {
    case 'opportunity':
      return C.emerald;
    case 'risk':
      return C.rose;
    case 'turn':
      return C.amber;
  }
}

// ============================================================
// Canvas 绘制
// ============================================================

function drawShareCard(
  canvas: HTMLCanvasElement,
  vm: KlineProductViewModelV2,
  shareUrl: string,
) {
  const W = 640;
  const H = 960;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ── 背景 ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, C.bg);
  bgGrad.addColorStop(0.5, C.bgLight);
  bgGrad.addColorStop(1, C.bg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── 顶部装饰线 ──
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(W - 40, 40);
  ctx.stroke();

  // ── 标题 ──
  ctx.fillStyle = C.gold;
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('人生 K线 · 命运趋势', W / 2, 80);

  // ── 副标题 ──
  ctx.fillStyle = C.gray;
  ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('把人生的没底，变成可以被记录的判断力', W / 2, 108);

  // ── 当前阶段 + 趋势 ──
  const stageY = 140;
  ctx.fillStyle = C.textLight;
  ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(
    `当前阶段：${STAGE_LABELS[vm.current.stage]} · 趋势${TREND_LABELS[vm.current.trend]}`,
    W / 2,
    stageY,
  );

  // ── summary（自动换行） ──
  ctx.fillStyle = C.text;
  ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif';
  wrapText(ctx, vm.current.summary, W / 2, stageY + 30, W - 80, 22);

  // ── 趋势缩略图 ──
  const chartTop = stageY + 90;
  const chartH = 260;
  const chartLeft = 50;
  const chartRight = W - 50;
  const chartW = chartRight - chartLeft;

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  roundRect(ctx, chartLeft, chartTop, chartW, chartH, 12);
  ctx.fill();

  drawTrendMini(ctx, vm.series.overall, chartLeft, chartTop, chartW, chartH);

  // ── 最近一个机会节点 ──
  const nodeY = chartTop + chartH + 30;
  const oppNode = vm.windows.opportunity[0];
  if (oppNode) {
    drawNodeSummary(ctx, oppNode, 50, nodeY, W - 100);
  }

  // ── 金色分隔线 ──
  const divY = nodeY + 90;
  ctx.strokeStyle = C.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, divY);
  ctx.lineTo(W - 60, divY);
  ctx.stroke();

  // ── 金句 ──
  const quote = extractQuote(vm);
  ctx.fillStyle = C.text;
  ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  wrapText(ctx, `「${quote}」`, W / 2, divY + 40, W - 120, 30);

  // ── 底部分隔线 ──
  const bottomDivY = H - 180;
  ctx.strokeStyle = C.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, bottomDivY);
  ctx.lineTo(W - 60, bottomDivY);
  ctx.stroke();

  // ── 二维码占位 ──
  const qrSize = 100;
  const qrX = W / 2 - qrSize / 2;
  const qrY = bottomDivY + 20;
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = C.gray;
  ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('扫码查看', qrX + qrSize / 2, qrY + qrSize / 2 - 8);
  ctx.fillText('完整 K线', qrX + qrSize / 2, qrY + qrSize / 2 + 10);

  // ── 品牌 ──
  ctx.fillStyle = C.gold;
  ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('AWKN · 人生决策宗师', W / 2, H - 40);

  // ── 底部装饰线 ──
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, H - 20);
  ctx.lineTo(W - 40, H - 20);
  ctx.stroke();

  // shareUrl 在二维码占位下方小字（便于截图分享后用户手动访问）
  ctx.fillStyle = C.gray;
  ctx.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(shareUrl, W / 2, H - 60);
}

// ── 趋势缩略图：折线 + 区域填充 ──
function drawTrendMini(
  ctx: CanvasRenderingContext2D,
  points: KlinePoint[],
  left: number,
  top: number,
  width: number,
  height: number,
) {
  if (points.length === 0) return;

  const padding = 20;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const pts = points.map((p, i) => {
    const x = left + padding + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = top + padding + (1 - (p.value - min) / range) * innerH;
    return { x, y, value: p.value };
  });

  // ── 区域填充 ──
  const fillGrad = ctx.createLinearGradient(0, top, 0, top + height);
  fillGrad.addColorStop(0, 'rgba(201,168,76,0.3)');
  fillGrad.addColorStop(1, 'rgba(201,168,76,0)');
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, top + height - padding);
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, top + height - padding);
  ctx.closePath();
  ctx.fill();

  // ── 折线 ──
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // ── 数据点 ──
  pts.forEach((p) => {
    ctx.fillStyle = C.goldLight;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── 节点摘要 ──
function drawNodeSummary(
  ctx: CanvasRenderingContext2D,
  node: KlineNode,
  x: number,
  y: number,
  width: number,
) {
  const color = nodeTypeColor(node.nodeType);

  // 节点类型标签
  ctx.fillStyle = color;
  ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`◆ ${NODE_TYPE_LABELS[node.nodeType]} · ${node.monthLabel}`, x, y);

  // 分数
  ctx.fillStyle = color;
  ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${node.score.toFixed(0)}/100`, x + width, y);
  ctx.textAlign = 'left';

  // summary
  ctx.fillStyle = C.text;
  ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
  wrapText(ctx, node.summary, x, y + 24, width, 18);
}

// ── 金句提取 ──
function extractQuote(vm: KlineProductViewModelV2): string {
  if (vm.current.action) {
    const s = vm.current.action;
    return s.length > 30 ? s.slice(0, 30) + '…' : s;
  }
  if (vm.current.summary) {
    const s = vm.current.summary;
    return s.length > 30 ? s.slice(0, 30) + '…' : s;
  }
  return '命运的 K线，由你书写';
}

// ── 辅助：圆角矩形 ──
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── 辅助：自动换行 ──
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  let line = '';
  let lineY = y;
  for (const char of text) {
    const testLine = line + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = char;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}

// ============================================================
// Props
// ============================================================

export interface KlineShareCardProps {
  /** V2 ViewModel，作为海报数据源 */
  viewModel: KlineProductViewModelV2 | null;
  /** 弹窗开关 */
  open: boolean;
  onClose: () => void;
}

// ============================================================
// 组件
// ============================================================

export function KlineShareCard({
  viewModel,
  open,
  onClose,
}: KlineShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── 计算分享链接 ──
  const shareUrl = viewModel
    ? `${window.location.origin}/share/${encodeURIComponent(viewModel.meta.snapshotId)}`
    : '';

  // ── 绘制 ──
  useEffect(() => {
    if (!open || !canvasRef.current || !viewModel) return;
    drawShareCard(canvasRef.current, viewModel, shareUrl);
  }, [open, viewModel, shareUrl]);

  // ── 保存图片 ──
  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `命运K线_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── 复制链接 ──
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  if (!open || !viewModel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-4 px-4">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="关闭分享"
        >
          ✕
        </button>

        {/* Canvas 卡片预览 */}
        <div
          className="overflow-hidden rounded-xl shadow-2xl"
          style={{ width: 320, height: 480 }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'linear-gradient(135deg, #c9a84c, #e0c97a)',
              color: '#1a1a2e',
            }}
          >
            {saving ? '保存中…' : '保存图片'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              borderColor: C.gold,
              color: C.goldLight,
            }}
          >
            {copied ? '已复制 ✓' : '复制链接'}
          </button>
        </div>

        {/* 分享链接（可长按复制） */}
        <p className="max-w-md break-all text-center text-[10px] text-gray-500">
          {shareUrl}
        </p>
      </div>
    </div>
  );
}

export default KlineShareCard;
