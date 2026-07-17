/**
 * 命运K线朋友圈传播卡生成器
 *
 * 使用场景：用户查看K线图后，生成精美的朋友圈传播卡分享
 * 流程：用户点击 → Canvas绘制 → 直接下载
 *
 * 技术方案：
 * 1. Canvas 2D API 绘制传播卡
 * 2. 输出 9:16 竖版手机长图 (1080x1920px)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';

interface KLineData {
  age: number;
  year: number;
  ganZhi: string;
  daYun: string;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  isUp?: boolean;
  status?: string;
  reason?: string;
}

interface MetaData {
  yearPillar?: string;
  monthPillar?: string;
  dayPillar?: string;
  hourPillar?: string;
  wuxing?: {
    wood?: number;
    fire?: number;
    earth?: number;
    metal?: number;
    water?: number;
  };
}

interface KLineImageGeneratorProps {
  chartData: KLineData[];
  meta: MetaData;
  overview?: string;
  trends?: Array<{ period: string; direction: string; probability: number }>;
  activeAspect?: 'overall' | 'career' | 'wealth' | 'relationship';
  onClose?: () => void;
  className?: string;
  quality?: 'basic' | 'hd' | 'report';
  bundle?: any;
}

const ACCENT = '#C9A96E';
const BG_DARK = '#0D0D1A';
const PANEL = 'rgba(255,255,255,0.075)';
const LINE_SOFT = 'rgba(255,255,255,0.16)';

function setPosterFont(ctx: CanvasRenderingContext2D, size: number, weight: string | number = 400) {
  ctx.font = `${weight} ${size}px Inter, "Segoe UI", "Noto Sans SC", system-ui, sans-serif`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  isEnglish: boolean
) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return y;
  const tokens = isEnglish ? source.split(/(\s+)/).filter(Boolean) : source.split('');
  let line = '';
  let lines = 0;
  tokens.forEach((token) => {
    if (lines >= maxLines) return;
    const testLine = line + token;
    if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
      const output = lines === maxLines - 1 ? trimToWidth(ctx, line, maxWidth, '...') : line;
      ctx.fillText(output, x, y);
      y += lineHeight;
      lines += 1;
      line = token.trimStart();
    } else {
      line = testLine;
    }
  });
  if (line.length > 0 && lines < maxLines) {
    const output = lines === maxLines - 1 ? trimToWidth(ctx, line, maxWidth, '...') : line;
    ctx.fillText(output, x, y);
    y += lineHeight;
  }
  return y;
}

function trimToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, suffix = '') {
  let output = text;
  while (output.length > 0 && ctx.measureText(output + suffix).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return output + suffix;
}

function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = PANEL) {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 24, true, false);
  ctx.strokeStyle = LINE_SOFT;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 24, false, true);
}

function drawSmallLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = 'rgba(255,255,255,0.52)') {
  ctx.fillStyle = color;
  setPosterFont(ctx, 22, 600);
  ctx.fillText(text, x, y);
}

function normalizeDirection(direction: string, t: ReturnType<typeof useTranslation>['t']) {
  if (direction === '上升') return t('resultPage.kline.rising');
  if (direction === '调整') return t('resultPage.kline.adjusting');
  return direction;
}

export function KLineImageGenerator({
  chartData,
  overview,
  trends,
  activeAspect,
  onClose,
  className = '',
  quality = 'basic',
  bundle,
}: KLineImageGeneratorProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith('en');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(0);

  const imgScale = quality === 'hd' ? 2 : quality === 'report' ? 2 : 1;
  const POSTER_W = 1080 * imgScale;
  const POSTER_H = quality === 'report' ? 2400 * imgScale : 1920 * imgScale;

  const getSegmentData = useCallback(() => {
    const yearlyData = chartData.filter((point) => typeof point?.age === 'number' && !point.year.toString().includes('.'));
    if (selectedSegment === 0) {
      return yearlyData;
    }
    if (selectedSegment === 1) return yearlyData.filter((point) => point.age >= 0 && point.age <= 35);
    if (selectedSegment === 2) return yearlyData.filter((point) => point.age >= 35 && point.age <= 65);
    return yearlyData.filter((point) => point.age >= 65 && point.age <= 100);
  }, [chartData, selectedSegment]);

  const drawImage = useCallback(async (ctx: CanvasRenderingContext2D) => {
    const data = getSegmentData();
    const w = POSTER_W;
    const h = POSTER_H;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0A0C12');
    bgGrad.addColorStop(0.46, BG_DARK);
    bgGrad.addColorStop(1, '#151321');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const radialGrad = ctx.createRadialGradient(w / 2, 300, 0, w / 2, 300, 700);
    radialGrad.addColorStop(0, 'rgba(201,169,110,0.22)');
    radialGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, w, h);

    const bestPoint = data.reduce((best, point) => (point.score || point.close) > (best.score || best.close) ? point : best, data[0] || { age: 0, year: '-', score: 0, close: 0 });
    const riskPoint = data.reduce((risk, point) => (point.score || point.close) < (risk.score || risk.close) ? point : risk, data[0] || { age: 0, year: '-', score: 0, close: 0 });
    const currentYear = new Date().getFullYear();
    const currentPoint = data.find((point) => Number(point.year) === currentYear) || data[Math.floor(data.length / 2)] || data[0];
    const currentScore = Math.round(currentPoint?.score || currentPoint?.close || 0);

    const currentStatus = currentPoint?.status || '';
    let stageLabel = t('klineImage.stageAccumulating');
    if (currentStatus.includes('上升') || currentStatus.includes('rise') || currentScore >= 70) {
      stageLabel = t('klineImage.stageRising');
    } else if (currentStatus.includes('调整') || currentStatus.includes('adjust') || currentScore < 40) {
      stageLabel = t('klineImage.stageAdjusting');
    }

    const oppYears: number[] = [];
    const riskYears: number[] = [];
    data.forEach((point) => {
      const s = point.score || point.close || 0;
      if (s >= 65) oppYears.push(Number(point.year));
      if (s < 40) riskYears.push(Number(point.year));
    });
    const formatYearRange = (years: number[]) => {
      if (years.length === 0) return '-';
      const sorted = [...years].sort((a, b) => a - b);
      if (sorted.length <= 2) return sorted.join('-');
      return `${sorted[0]}-${sorted[sorted.length - 1]}`;
    };
    const oppWindow = formatYearRange(oppYears);
    const riskWindow = formatYearRange(riskYears);

    const oneLiner = overview
      || (trends?.length ? t('klineImage.trendSentence', {
          period: trends[0].period,
          direction: normalizeDirection(trends[0].direction, t),
          probability: trends[0].probability,
        })
      : t('klineImage.defaultOneLiner'));

    // Y=0-200: Brand header
    ctx.textAlign = 'left';
    ctx.fillStyle = ACCENT;
    setPosterFont(ctx, 28, 700);
    ctx.fillText(t('app.name'), 72, 100);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    setPosterFont(ctx, 22, 400);
    ctx.fillText('·', 72 + ctx.measureText(t('app.name')).width + 16, 100);

    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    setPosterFont(ctx, 20, 500);
    ctx.fillText(t('klineImage.brandTagline'), 72 + ctx.measureText(t('app.name')).width + 36, 100);

    ctx.strokeStyle = 'rgba(201,169,110,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(72, 140);
    ctx.lineTo(w - 72, 140);
    ctx.stroke();

    const aspectLabel = activeAspect || 'overall';
    const aspectTitleMap: Record<string, string> = {
      overall: isEnglish ? 'Destiny K-Chart' : '命运K线',
      career: isEnglish ? 'Career K-Chart' : '事业K线',
      wealth: isEnglish ? 'Wealth K-Chart' : '财运K线',
      relationship: isEnglish ? 'Love K-Chart' : '情感K线',
    };
    const posterTitle = aspectTitleMap[aspectLabel] || t('klineImage.posterTitle');

    // Y=200-400: Large title + stage badge
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    setPosterFont(ctx, isEnglish ? 72 : 80, 900);
    ctx.fillText(posterTitle, 72, 290);

    const badgeX = 72 + ctx.measureText(posterTitle).width + 24;
    const badgeY = 258;
    const badgeText = stageLabel;
    setPosterFont(ctx, 24, 700);
    const badgeW = ctx.measureText(badgeText).width + 36;
    ctx.fillStyle = 'rgba(201,169,110,0.18)';
    roundRect(ctx, badgeX, badgeY, badgeW, 44, 22, true, false);
    ctx.strokeStyle = 'rgba(201,169,110,0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX, badgeY, badgeW, 44, 22, false, true);
    ctx.fillStyle = ACCENT;
    setPosterFont(ctx, 24, 700);
    ctx.fillText(badgeText, badgeX + 18, badgeY + 30);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    setPosterFont(ctx, isEnglish ? 24 : 26, 500);
    wrapText(ctx, t('klineImage.posterSubtitle'), 72, 360, 800, 34, 2, isEnglish);

    // Y=400-700: Key metrics cards (2 columns)
    const metricsY = 420;
    const mCardW = 448;
    const mCardH = 130;
    const mCardGap = 24;

    drawPanel(ctx, 72, metricsY, mCardW, mCardH, 'rgba(72,213,151,0.08)');
    ctx.strokeStyle = 'rgba(72,213,151,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, 72, metricsY, mCardW, mCardH, 24, false, true);
    drawSmallLabel(ctx, t('klineImage.bestWindow'), 108, metricsY + 46, 'rgba(72,213,151,0.7)');
    ctx.fillStyle = '#FFFFFF';
    setPosterFont(ctx, isEnglish ? 38 : 42, 800);
    ctx.fillText(oppWindow, 108, metricsY + 100);

    drawPanel(ctx, 72 + mCardW + mCardGap, metricsY, mCardW, mCardH, 'rgba(255,107,107,0.08)');
    ctx.strokeStyle = 'rgba(255,107,107,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, 72 + mCardW + mCardGap, metricsY, mCardW, mCardH, 24, false, true);
    drawSmallLabel(ctx, t('klineImage.riskWindow'), 72 + mCardW + mCardGap + 36, metricsY + 46, 'rgba(255,107,107,0.7)');
    ctx.fillStyle = '#FFFFFF';
    setPosterFont(ctx, isEnglish ? 38 : 42, 800);
    ctx.fillText(riskWindow, 72 + mCardW + mCardGap + 36, metricsY + 100);

    // Y=700-750: One-line summary quote
    const quoteY = 610;
    drawPanel(ctx, 72, quoteY, 936, 80, 'rgba(201,169,110,0.08)');
    ctx.fillStyle = ACCENT;
    setPosterFont(ctx, 22, 700);
    ctx.fillText('「', 108, quoteY + 52);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    setPosterFont(ctx, isEnglish ? 22 : 24, 500);
    const quoteStartX = 108 + ctx.measureText('「').width + 4;
    wrapText(ctx, oneLiner, quoteStartX, quoteY + 52, 820, 30, 2, isEnglish);

    // Y=750-1300: Simplified K-line curve chart
    const chartY = 740;
    const chartH = 560;
    const chartLeft = 72;
    const chartRight = w - 72;
    const chartWidth = chartRight - chartLeft;
    drawPanel(ctx, chartLeft, chartY, chartWidth, chartH, 'rgba(255,255,255,0.05)');

    if (data.length > 0) {
      const sampledData = data.length > 30
        ? data.filter((_, i) => i % Math.ceil(data.length / 30) === 0 || i === data.length - 1)
        : data;

      const minScore = Math.min(...sampledData.map(d => d.low ?? d.score ?? d.close));
      const maxScore = Math.max(...sampledData.map(d => d.high ?? d.score ?? d.close));
      const scoreRange = maxScore - minScore || 100;
      const innerLeft = chartLeft + 44;
      const innerRight = chartRight - 44;
      const innerWidth = innerRight - innerLeft;
      const chartTop = chartY + 40;
      const chartBottom = chartY + chartH - 60;
      const plotH = chartBottom - chartTop;
      const scoreOf = (point: any) => Number(point.score ?? point.close ?? point.open ?? 0);
      const xFor = (index: number) => innerLeft + (sampledData.length <= 1 ? innerWidth / 2 : index * (innerWidth / (sampledData.length - 1)));
      const yFor = (score: number) => chartTop + plotH * (1 - ((score - minScore) / scoreRange));

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 3; i++) {
        const gy = chartTop + plotH * (i / 3);
        ctx.beginPath();
        ctx.moveTo(innerLeft, gy);
        ctx.lineTo(innerRight, gy);
        ctx.stroke();
      }

      const gradient = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
      gradient.addColorStop(0, 'rgba(201,169,110,0.22)');
      gradient.addColorStop(1, 'rgba(201,169,110,0.01)');
      ctx.beginPath();
      sampledData.forEach((point, i) => {
        const x = xFor(i);
        const y = yFor(scoreOf(point));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(xFor(sampledData.length - 1), chartBottom);
      ctx.lineTo(xFor(0), chartBottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      for (let i = 0; i < sampledData.length - 1; i += 1) {
        const from = sampledData[i];
        const to = sampledData[i + 1];
        ctx.strokeStyle = scoreOf(to) >= scoreOf(from) ? '#FF5B6A' : '#3CD985';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xFor(i), yFor(scoreOf(from)));
        ctx.lineTo(xFor(i + 1), yFor(scoreOf(to)));
        ctx.stroke();
      }
      ctx.lineCap = 'butt';

      const highlightPoints = [
        { point: bestPoint, color: '#FF5B6A' },
        { point: currentPoint, color: ACCENT },
        { point: riskPoint, color: '#3CD985' },
      ].filter((item) => item.point);
      highlightPoints.forEach(({ point, color }) => {
        const index = Math.max(0, sampledData.findIndex((item) => item.age === point.age && item.year === point.year));
        const x = xFor(index);
        const y = yFor(scoreOf(point));
        ctx.fillStyle = '#101418';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
      });

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      setPosterFont(ctx, 18, 500);
      const labelCount = Math.min(5, sampledData.length);
      const labelIndexes = Array.from({ length: labelCount }, (_, i) =>
        Math.round(i * (sampledData.length - 1) / (labelCount - 1))
      ).filter((index) => index >= 0 && index < sampledData.length);
      labelIndexes.forEach((index) => {
        const point = sampledData[index];
        ctx.fillText(t('klineImage.ageLabel', { age: Math.round(point.age) }), xFor(index), chartBottom + 32);
      });
      ctx.textAlign = 'left';
    }

    // Y=1300-1500: Second one-liner
    const secondQuoteY = 1340;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    setPosterFont(ctx, isEnglish ? 22 : 24, 400);
    wrapText(ctx, t('klineImage.posterSecondLine'), 72, secondQuoteY, 936, 34, 3, isEnglish);

    // Y=1500-1700: Brand + URL
    const brandY = 1500;
    ctx.strokeStyle = 'rgba(201,169,110,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(72, brandY);
    ctx.lineTo(w - 72, brandY);
    ctx.stroke();

    ctx.fillStyle = ACCENT;
    setPosterFont(ctx, 30, 800);
    ctx.fillText(t('app.name'), 72, brandY + 60);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    setPosterFont(ctx, 22, 500);
    ctx.fillText(t('klineImage.brandTagline'), 72, brandY + 100);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    setPosterFont(ctx, isEnglish ? 26 : 28, 700);
    ctx.fillText('awkn.cn/life', w - 72, brandY + 60);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    setPosterFont(ctx, 18, 400);
    ctx.fillText(t('klineImage.scanHint'), w - 200, brandY + 100);

    // Y=1700-1920: Footer
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    setPosterFont(ctx, 16 * imgScale, 400);
    ctx.textAlign = 'center';
    ctx.fillText(t('klineImage.footerDisclaimer'), w / 2, (quality === 'report' ? 2300 : 1860) * imgScale);
    ctx.textAlign = 'left';

    if (quality === 'basic') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      setPosterFont(ctx, 20 * imgScale, 600);
      ctx.fillText(t('resultPage.shareTiers.watermark'), w / 2, 1830 * imgScale);
      ctx.textAlign = 'left';
    }

    if (quality === 'report' && bundle?.aspects) {
      const reportY = 1600 * imgScale;
      ctx.strokeStyle = `rgba(201,169,110,0.15)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(72 * imgScale, reportY);
      ctx.lineTo(w - 72 * imgScale, reportY);
      ctx.stroke();

      ctx.fillStyle = ACCENT;
      setPosterFont(ctx, 24 * imgScale, 700);
      ctx.fillText(isEnglish ? 'Four-Line Overview' : '四线总览', 72 * imgScale, reportY + 40 * imgScale);

      const aspKeys = ['overall', 'career', 'wealth', 'relationship'] as const;
      const aspLabels = isEnglish
        ? ['Overall', 'Career', 'Wealth', 'Relationship']
        : [t('resultPage.destinyKline.aspect.overall'), t('resultPage.destinyKline.aspect.career'), t('resultPage.destinyKline.aspect.wealth'), t('resultPage.destinyKline.aspect.relationship')];
      const aspColors = [
        { accent: '#C9A96E', accentRgb: '201,169,110' },
        { accent: '#6366f1', accentRgb: '99,102,241' },
        { accent: '#10b981', accentRgb: '16,185,129' },
        { accent: '#f43f5e', accentRgb: '244,63,94' },
      ];

      aspKeys.forEach((asp, i) => {
        const aspY = reportY + 70 * imgScale + i * 120 * imgScale;
        const aspData = bundle.aspects?.[asp];
        const aspScore = aspData?.points ? Math.round(aspData.points[Math.floor(aspData.points.length / 2)]?.score ?? 50) : 50;

        drawPanel(ctx, 72 * imgScale, aspY, w - 144 * imgScale, 100 * imgScale, 'rgba(255,255,255,0.04)');
        ctx.fillStyle = aspColors[i].accent;
        setPosterFont(ctx, 20 * imgScale, 700);
        ctx.fillText(aspLabels[i], 100 * imgScale, aspY + 35 * imgScale);

        ctx.fillStyle = '#FFFFFF';
        setPosterFont(ctx, 28 * imgScale, 800);
        ctx.fillText(`${aspScore}分`, 100 * imgScale, aspY + 75 * imgScale);

        const barW = 300 * imgScale;
        const barH = 8 * imgScale;
        const barX = w - 72 * imgScale - barW;
        const barY = aspY + 55 * imgScale;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        roundRect(ctx, barX, barY, barW, barH, 4 * imgScale, true, false);
        ctx.fillStyle = aspColors[i].accent;
        roundRect(ctx, barX, barY, barW * (aspScore / 100), barH, 4 * imgScale, true, false);

        if (aspData?.oneLiner) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          setPosterFont(ctx, 14 * imgScale, 400);
          wrapText(ctx, aspData.oneLiner, 100 * imgScale, aspY + 95 * imgScale, w - 220 * imgScale, 20 * imgScale, 1, isEnglish);
        }
      });

      const badgeY = reportY + 570 * imgScale;
      ctx.fillStyle = 'rgba(201,169,110,0.15)';
      roundRect(ctx, w - 250 * imgScale, badgeY, 180 * imgScale, 32 * imgScale, 16 * imgScale, true, false);
      ctx.fillStyle = ACCENT;
      setPosterFont(ctx, 14 * imgScale, 600);
      ctx.textAlign = 'center';
      ctx.fillText(isEnglish ? 'Yearly Member Only' : '年会员专享', w - 160 * imgScale, badgeY + 22 * imgScale);
      ctx.textAlign = 'left';
    }
  }, [getSegmentData, overview, trends, selectedSegment, t, isEnglish, activeAspect, quality, imgScale, bundle]);

  const generateImage = useCallback(async () => {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = POSTER_W;
      canvas.height = POSTER_H;
      const ctx = canvas.getContext('2d')!;

      await drawImage(ctx);

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(dataUrl);
      setShowPreview(true);
      trackEvent('kline_image_generated', { segment: selectedSegment });
    } catch (err) {
      console.error('[KLineImageGenerator] image generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [drawImage, selectedSegment]);

  const handleDownload = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `${t('klineImage.fileName')}.png`;
    a.click();
    trackEvent('kline_image_downloaded', { segment: selectedSegment });
  }, [previewUrl, selectedSegment, t]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="hidden" />

      <div className="mb-4">
        <p className="text-sm text-white/60 mb-2">{t('klineImage.selectRange')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSegment(0)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSegment === 0
                ? 'bg-primary text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {t('klineImage.ranges.all')}
          </button>
          <button
            onClick={() => setSelectedSegment(1)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSegment === 1
                ? 'bg-primary text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {t('klineImage.ranges.young')}
          </button>
          <button
            onClick={() => setSelectedSegment(2)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSegment === 2
                ? 'bg-primary text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {t('klineImage.ranges.middle')}
          </button>
          <button
            onClick={() => setSelectedSegment(3)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSegment === 3
                ? 'bg-primary text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {t('klineImage.ranges.late')}
          </button>
        </div>
      </div>

      <motion.button
        onClick={generateImage}
        disabled={isGenerating}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 text-green-400 text-sm font-medium hover:from-green-600/30 hover:to-emerald-600/30 transition-all disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-lg">image</span>
        {isGenerating ? t('klineImage.generating') : t('klineImage.generate')}
      </motion.button>

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
              <div className="mx-4 mb-4">
                <img
                  src={previewUrl}
                  alt={t('klineImage.previewAlt')}
                  className="w-full rounded-2xl shadow-2xl"
                  style={{ aspectRatio: '9/16', objectFit: 'cover' }}
                />
              </div>

              <div className="mx-4 flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white text-sm font-medium border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  {t('klineImage.saveImage')}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white text-sm font-medium border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
