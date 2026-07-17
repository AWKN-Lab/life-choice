/**
 * 海报生成组件 - Canvas 合成 + 一键分享
 *
 * 使用场景：结果页一键生成命理分析海报，用户分享到社交媒体
 * 流程：用户点击 → Canvas 合成 → 预览 → WebShare API / 保存图片
 *
 * 技术方案：
 * 1. 用 Canvas 2D API 绘制海报（无需后端）
 * 2. 海报包含：八字摘要 + 一句话 + 二维码 + 装饰背景
 * 3. 优先 WebShare API（手机端），降级为下载图片
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';
import { consultApi } from '@/api/consult';
import { generateQR, buildUTMUrl } from '@/lib/qrGenerator';
import { getUTMData } from '@/store/utmStore';

// 海报模板配置
interface PosterConfig {
  summaryLine: string;
  baZi: string[];
  routeType: 'liuren' | 'ziping' | 'quming' | 'ziwei';
  recordId?: string;
  userName?: string;

  accentColor?: string;
  bgGradient?: string[];
  qrCodeUrl?: string;

  namingData?: {
    totalScore: number;
    tianGe: number;
    renGe: number;
    diGe: number;
    waiGe: number;
    zongGe: number;
    sancai: string;
  };
  ziweiData?: {
    fiveElementsClass: string;
    mingGongStar: string;
    sihua: string;
  };
}

interface PosterGeneratorProps {
  config: PosterConfig;
  onShared?: () => void;
  className?: string;
}

const DEFAULT_ACCENT = '#C9A96E';
const DEFAULT_BG = ['#0D0D1A', '#1A1A2E'];

export function PosterGenerator({ config, onShared, className = '' }: PosterGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 海报尺寸（手机比例 9:16）
  const POSTER_W = 540;
  const POSTER_H = 960;

  /**
   * 在 Canvas 上绘制海报
   */
  const drawPoster = useCallback(async (ctx: CanvasRenderingContext2D) => {
    const { summaryLine, baZi, routeType, userName, accentColor, bgGradient, qrCodeUrl, namingData, ziweiData } = config;
    const accent = accentColor || DEFAULT_ACCENT;
    const bg = bgGradient || DEFAULT_BG;

    const routeLabelMap: Record<string, string> = {
      liuren: '断事推演',
      ziping: '东方命理',
      quming: '姓名分析',
      ziwei: '紫微斗数',
    };
    const routeTitleMap: Record<string, string> = {
      liuren: '命理分析报告',
      ziping: '命理分析报告',
      quming: '姓名分析报告',
      ziwei: '紫微斗数报告',
    };
    const labelText = routeLabelMap[routeType] || '命理分析';
    const titleText = routeTitleMap[routeType] || '命理分析报告';

    // ---- 背景 ----
    const bgGrad = ctx.createLinearGradient(0, 0, 0, POSTER_H);
    bgGrad.addColorStop(0, bg[0]);
    bgGrad.addColorStop(1, bg[1] || bg[0]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);

    // ---- 顶部装饰圆 ----
    const topCircleY = 120;
    const radialGrad = ctx.createRadialGradient(POSTER_W / 2, topCircleY, 10, POSTER_W / 2, topCircleY, 280);
    radialGrad.addColorStop(0, accent + '30');
    radialGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(POSTER_W / 2, topCircleY, 280, 0, Math.PI * 2);
    ctx.fill();

    // ---- 顶部 Logo ----
    ctx.fillStyle = accent;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('人生决策宗师', POSTER_W / 2, 70);

    // ---- 路线标签 ----
    const labelW = 100;
    const labelH = 28;
    const labelX = (POSTER_W - labelW) / 2;
    const labelY = 100;
    ctx.fillStyle = accent + '25';
    roundRect(ctx, labelX, labelY, labelW, labelH, 14, true, false);
    ctx.fillStyle = accent;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(labelText, POSTER_W / 2, labelY + 18);

    // ---- 标题 ----
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(titleText, POSTER_W / 2, 190);

    // ---- 分隔线 ----
    ctx.strokeStyle = accent + '60';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 215);
    ctx.lineTo(POSTER_W - 60, 215);
    ctx.stroke();

    // ---- 四柱展示 ----
    const pillarY = 260;
    const pillarGap = 120;
    const pillarStartX = (POSTER_W - pillarGap * 3) / 2;

    const pillarLabels = ['年柱', '月柱', '日柱', '时柱'];
    for (let i = 0; i < 4; i++) {
      const x = pillarStartX + i * pillarGap;
      // 标签
      ctx.fillStyle = '#FFFFFF50';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(pillarLabels[i], x + 30, pillarY);

      // 干支
      ctx.fillStyle = accent;
      ctx.font = 'bold 20px system-ui, sans-serif';
      const p = baZi[i] || '';
      ctx.fillText(p.slice(0, 1), x + 22, pillarY + 36);
      ctx.fillText(p.slice(1, 2), x + 50, pillarY + 36);
    }

    // ---- 一句话定性 ----
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const summaryY = 360;
    ctx.fillText(summaryLine, POSTER_W / 2, summaryY);

    // ---- 引用装饰线 ----
    ctx.strokeStyle = accent + '40';
    ctx.lineWidth = 1;
    const quoteY = summaryY + 20;
    ctx.beginPath();
    ctx.moveTo(POSTER_W / 2 - 40, quoteY);
    ctx.lineTo(POSTER_W / 2 + 40, quoteY);
    ctx.stroke();

    // ---- 分析维度卡片（按 routeType 区分） ----
    const cardY = 420;
    const cardH = 80;
    const cardW = (POSTER_W - 80) / 2;

    if (routeType === 'quming' && namingData) {
      const nd = namingData;
      const wugeItems = [
        { label: '天格', value: nd.tianGe },
        { label: '人格', value: nd.renGe },
        { label: '地格', value: nd.diGe },
        { label: '外格', value: nd.waiGe },
        { label: '总格', value: nd.zongGe },
        { label: '三才', value: nd.sancai },
      ];
      for (let i = 0; i < 6; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = 40 + col * (cardW + 20);
        const y = cardY + row * (cardH + 16);
        ctx.fillStyle = '#FFFFFF08';
        roundRect(ctx, x, y, cardW, cardH, 12, true, false);
        ctx.fillStyle = '#FFFFFF90';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(wugeItems[i].label, x + 16, y + 26);
        ctx.fillStyle = accent;
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText(String(wugeItems[i].value), x + 16, y + 58);
      }
    } else if (routeType === 'ziwei' && ziweiData) {
      const zd = ziweiData;
      const ziweiItems = [
        { label: '五行局', value: zd.fiveElementsClass },
        { label: '命宫主星', value: zd.mingGongStar },
        { label: '四化', value: zd.sihua },
        { label: '命宫', value: '参见完整报告' },
      ];
      for (let i = 0; i < 4; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = 40 + col * (cardW + 20);
        const y = cardY + row * (cardH + 16);
        ctx.fillStyle = '#FFFFFF08';
        roundRect(ctx, x, y, cardW, cardH, 12, true, false);
        ctx.fillStyle = '#FFFFFF90';
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(ziweiItems[i].label, x + 16, y + 26);
        ctx.fillStyle = accent;
        ctx.font = 'bold 20px system-ui, sans-serif';
        const v = ziweiItems[i].value;
        ctx.fillText(v.length > 8 ? v.slice(0, 8) + '..' : v, x + 16, y + 58);
      }
    } else {
      const dimensions = [
        { label: '事业运势', icon: '💼', desc: '把握时机，顺势而为' },
        { label: '财富走向', icon: '💰', desc: '稳中求进，忌冒险' },
        { label: '感情状态', icon: '❤️', desc: '以静制动，耐心等待' },
        { label: '健康提示', icon: '🏥', desc: '注意脾胃，调节作息' },
      ];
      for (let i = 0; i < 4; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = 40 + col * (cardW + 20);
        const y = cardY + row * (cardH + 16);
        ctx.fillStyle = '#FFFFFF08';
        roundRect(ctx, x, y, cardW, cardH, 12, true, false);
        ctx.font = '20px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(dimensions[i].icon, x + 14, y + 28);
        ctx.fillStyle = '#FFFFFF90';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(dimensions[i].label, x + 40, y + 24);
        ctx.fillStyle = '#FFFFFF50';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(dimensions[i].desc, x + 14, y + 52);
      }
    }

    // ---- 二维码区域 ----
    const qrY = 620;
    const qrSize = 100;
    const qrX = (POSTER_W - qrSize) / 2;

    // 二维码背景
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 8, true, false);

    // 二维码（真 QR 码，含 UTM 参数）
    const utm = getUTMData();
    const qrUrl = buildUTMUrl('https://awkn.cn/life/', {
      source: routeType || 'poster',
      medium: utm.medium || 'wechat',
      campaign: utm.campaign || 'share_poster',
      inviteCode: utm.inviteCode || undefined,
    });
    const qrDataUrl = await generateQR(qrUrl, qrSize);
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // 二维码说明
    ctx.fillStyle = '#FFFFFF50';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('微信扫码查看完整分析', POSTER_W / 2, qrY + qrSize + 30);

    // ---- 底部品牌 ----
    const brandY = POSTER_H - 80;
    ctx.fillStyle = accent;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('人生决策宗师', POSTER_W / 2, brandY);

    ctx.fillStyle = '#FFFFFF40';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('专业命理 · AI 智能分析', POSTER_W / 2, brandY + 24);

    // ---- 分享来源 ----
    if (userName) {
      ctx.fillStyle = '#FFFFFF30';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(`由 ${userName} 推荐`, POSTER_W / 2, brandY + 46);
    }
  }, [config]);

  /**
   * 圆角矩形辅助
   */
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number,
    fill: boolean, stroke: boolean
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  /**
   * 生成海报
   */
  const generatePoster = useCallback(async () => {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = POSTER_W;
      canvas.height = POSTER_H;
      const ctx = canvas.getContext('2d')!;
      ctx.textBaseline = 'middle';

      await drawPoster(ctx);

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(dataUrl);
      setShowPreview(true);
      trackEvent('poster_generated', { routeType: config.routeType });
      if (config.recordId) {
        consultApi.saveBehaviorEvent(config.recordId, 'poster_generated', {
          routeType: config.routeType,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('海报生成失败:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [drawPoster, config.routeType]);

  /**
   * 下载图片
   */
  const handleDownload = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    const nameMap: Record<string, string> = {
      quming: '姓名分析',
      ziwei: '紫微斗数',
      liuren: '命理分析',
      ziping: '命理分析',
    };
    const label = nameMap[config.routeType] || '分析报告';
    a.download = `${label}-${Date.now()}.png`;
    a.click();
    trackEvent('poster_downloaded', { routeType: config.routeType });
    if (config.recordId) {
      consultApi.saveBehaviorEvent(config.recordId, 'poster_saved', {
        routeType: config.routeType,
        method: 'download',
      }).catch(() => {});
    }
  }, [previewUrl, config.routeType, config.recordId]);

  /**
   * WebShare API 分享（移动端）
   */
  const handleShare = useCallback(async () => {
    if (!previewUrl) return;

    const blob = await (await fetch(previewUrl)).blob();
    const file = new File([blob], '命理分析海报.png', { type: 'image/png' });

    const shareData: ShareData = {
      title: '人生决策宗师 - 命理分析',
      text: config.summaryLine,
      files: [file],
    };

    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        trackEvent('poster_shared', { method: 'webshare', routeType: config.routeType });
        if (config.recordId) {
          consultApi.saveBehaviorEvent(config.recordId, 'poster_shared', {
            routeType: config.routeType,
            method: 'webshare',
          }).catch(() => {});
        }
        onShared?.();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('分享失败:', err);
        }
        if (config.recordId) {
          consultApi.saveBehaviorEvent(config.recordId, 'poster_share_cancelled', {
            routeType: config.routeType,
          }).catch(() => {});
        }
      }
    } else {
      handleDownload();
    }
  }, [previewUrl, config.summaryLine, config.routeType, config.recordId, onShared, handleDownload]);

  // 清理预览 URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className={className}>
      {/* 隐藏的 Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 生成按钮 */}
      <motion.button
        onClick={generatePoster}
        disabled={isGenerating}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-primary text-sm font-medium hover:from-primary/30 hover:to-secondary/30 transition-all disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-lg">auto_awesome</span>
        {isGenerating ? '生成中...' : '生成分享海报'}
      </motion.button>

      {/* 预览 + 分享浮层 */}
      <AnimatePresence>
        {showPreview && previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 海报预览 */}
              <div className="mx-4 mb-4">
                <img
                  src={previewUrl}
                  alt="海报预览"
                  className="w-full rounded-2xl shadow-2xl"
                  style={{ aspectRatio: '9/16', objectFit: 'cover' }}
                />
              </div>

              {/* 操作按钮 */}
              <div className="mx-4 flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white text-sm font-medium border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  保存图片
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  分享
                </button>
              </div>

              {/* 关闭 */}
              <button
                onClick={() => setShowPreview(false)}
                className="mt-3 mx-auto flex items-center gap-1 text-white/50 text-xs px-4 py-2 hover:text-white/80 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
