import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import type { DestinyKlineBundle, KlineAspect, CardType, ShortCycleKlineResult } from '@/lib/destinyKline/types';
import { getStageKey, getStageName, getStageNameEn } from '@/lib/destinyKline/types';

interface KLineData {
  age: number;
  year: number;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
}

interface KLineShareCardProps {
  cardType: CardType;
  bundle: DestinyKlineBundle;
  chartData?: KLineData[];
  shortCycleData?: ShortCycleKlineResult;
  t: (key: string, options?: Record<string, unknown>) => string;
  onClose: () => void;
  className?: string;
  quality?: 'basic' | 'hd' | 'report';
}

const CARD_CONFIG: Record<CardType, { accent: string; accentRgb: string; labelKey: string; labelKeyEn: string }> = {
  currentStage: { accent: '#C9A96E', accentRgb: '201,169,110', labelKey: 'shareCard.currentStage', labelKeyEn: 'Current Stage' },
  future3Year: { accent: '#8b5cf6', accentRgb: '139,92,246', labelKey: 'shareCard.future3Year', labelKeyEn: 'Next 3 Years' },
  careerKline: { accent: '#6366f1', accentRgb: '99,102,241', labelKey: 'shareCard.careerKline', labelKeyEn: 'Career K-Line' },
  wealthKline: { accent: '#10b981', accentRgb: '16,185,129', labelKey: 'shareCard.wealthKline', labelKeyEn: 'Wealth K-Line' },
  relationshipWave: { accent: '#f43f5e', accentRgb: '244,63,94', labelKey: 'shareCard.relationshipWave', labelKeyEn: 'Love Wave' },
  keyYear: { accent: '#f59e0b', accentRgb: '245,158,11', labelKey: 'shareCard.keyYear', labelKeyEn: 'Key Years' },
  actionWindow: { accent: '#06b6d4', accentRgb: '6,182,212', labelKey: 'shareCard.actionWindow', labelKeyEn: 'Action Window' },
};

const ASPECT_COLORS: Record<string, { accent: string; accentRgb: string }> = {
  overall: { accent: '#C9A96E', accentRgb: '201,169,110' },
  career: { accent: '#6366f1', accentRgb: '99,102,241' },
  wealth: { accent: '#10b981', accentRgb: '16,185,129' },
  relationship: { accent: '#f43f5e', accentRgb: '244,63,94' },
};

const BG_DARK = '#0D0D1A';
const PANEL = 'rgba(255,255,255,0.075)';
const LINE_SOFT = 'rgba(255,255,255,0.16)';

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: string | number = 400) {
  ctx.font = `${weight} ${size}px Inter, "Segoe UI", "Noto Sans SC", system-ui, sans-serif`;
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

function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = PANEL) {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 20, true, false);
  ctx.strokeStyle = LINE_SOFT;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 20, false, true);
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
      ctx.fillText(lines === maxLines - 1 ? line + '...' : line, x, y);
      y += lineHeight;
      lines += 1;
      line = token.trimStart();
    } else {
      line = testLine;
    }
  });
  if (line.length > 0 && lines < maxLines) {
    ctx.fillText(lines === maxLines - 1 ? line + '...' : line, x, y);
  }
  return y;
}

function drawMiniLineChart(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  left: number, top: number, width: number, height: number,
  color: string, colorRgb: string
) {
  if (data.length === 0) return;
  const sampled = data.length > 40
    ? data.filter((_, i) => i % Math.ceil(data.length / 40) === 0 || i === data.length - 1)
    : data;
  const minScore = Math.min(...sampled.map(d => d.low ?? d.score ?? d.close));
  const maxScore = Math.max(...sampled.map(d => d.high ?? d.score ?? d.close));
  const range = maxScore - minScore || 100;
  const scoreOf = (point: any) => Number(point.score ?? point.close ?? point.open ?? 0);
  const xFor = (index: number) => left + (sampled.length <= 1 ? width / 2 : index * (width / (sampled.length - 1)));
  const yFor = (score: number) => top + height * (1 - ((score - minScore) / range));

  const gradient = ctx.createLinearGradient(0, top, 0, top + height);
  gradient.addColorStop(0, `rgba(${colorRgb},0.2)`);
  gradient.addColorStop(1, `rgba(${colorRgb},0.01)`);
  ctx.beginPath();
  sampled.forEach((point, i) => {
    const x = xFor(i);
    const y = yFor(scoreOf(point));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(xFor(sampled.length - 1), top + height);
  ctx.lineTo(xFor(0), top + height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  sampled.forEach((point, i) => {
    const x = xFor(i);
    const y = yFor(scoreOf(point));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

function drawScoreRing(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  score: number, color: string
) {
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const angle = (score / 100) * Math.PI * 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + angle);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  setFont(ctx, 36, 800);
  ctx.fillText(String(score), cx, cy + 8);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  setFont(ctx, 16, 500);
  ctx.fillText('分', cx, cy + 30);
  ctx.textAlign = 'left';
}

export function KLineShareCard({
  cardType,
  bundle,
  chartData,
  shortCycleData,
  t,
  onClose,
  className = '',
  quality = 'basic',
}: KLineShareCardProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith('en');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const scale = quality === 'hd' ? 2 : quality === 'report' ? 2 : 1;
  const CARD_W = 1080 * scale;
  const CARD_H = quality === 'report' ? 1920 * scale : 1350 * scale;
  const config = CARD_CONFIG[cardType];

  // Resolve aspect and colors based on cardType
  const resolveAspect = (): KlineAspect => {
    switch (cardType) {
      case 'careerKline': return 'career';
      case 'wealthKline': return 'wealth';
      case 'relationshipWave': return 'relationship';
      default: return 'overall';
    }
  };
  const aspect = resolveAspect();
  const colors = ASPECT_COLORS[aspect] || ASPECT_COLORS.overall;

  const aspectBundle = bundle?.aspects?.[aspect];
  const currentScore = Math.round(
    bundle?.currentStage?.score
    ?? aspectBundle?.points?.[Math.floor((aspectBundle?.points?.length ?? 1) / 2)]?.score
    ?? 50
  );
  const stageKey = getStageKey(currentScore);
  const stageLabel = isEnglish ? getStageNameEn(currentScore) : getStageName(currentScore);
  const oneLiner = aspectBundle?.oneLiner || t('klineImage.defaultOneLiner');
  const actionAdvice = aspectBundle?.actionAdvice || '';
  const primarySignal = aspectBundle?.primarySignal;

  const data = chartData || aspectBundle?.points || [];

  const oppYears: number[] = [];
  const riskYears: number[] = [];
  data.forEach((point) => {
    const s = point.score ?? point.close ?? 0;
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

  const keyYears = data
    .filter((_, i) => i % Math.max(1, Math.floor(data.length / 4)) === 0 || i === data.length - 1)
    .slice(0, 5);

  const future3Years = (() => {
    const cy = new Date().getFullYear();
    return [cy + 1, cy + 2, cy + 3].map(y => {
      const pt = data.find(d => d.year === y);
      return { year: y, score: pt?.score ?? Math.round(50 + Math.random() * 20) };
    });
  })();

  const drawCard = useCallback(async (ctx: CanvasRenderingContext2D) => {
    const w = CARD_W;
    const h = CARD_H;
    ctx.clearRect(0, 0, w, h);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0A0C12');
    bgGrad.addColorStop(0.5, BG_DARK);
    bgGrad.addColorStop(1, '#151321');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Radial glow
    const radialGrad = ctx.createRadialGradient(w / 2, 200, 0, w / 2, 200, 500);
    radialGrad.addColorStop(0, `rgba(${config.accentRgb},0.18)`);
    radialGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.textAlign = 'left';
    ctx.fillStyle = config.accent;
    setFont(ctx, 26, 700);
    ctx.fillText(t('app.name'), 60, 70);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    setFont(ctx, 20, 500);
    const brandW = ctx.measureText(t('app.name')).width;
    ctx.fillText('·', 60 + brandW + 14, 70);
    ctx.fillStyle = config.accent;
    setFont(ctx, 20, 600);
    ctx.fillText(isEnglish ? config.labelKeyEn : t(config.labelKey), 60 + brandW + 32, 70);

    ctx.strokeStyle = `rgba(${config.accentRgb},0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 95);
    ctx.lineTo(w - 60, 95);
    ctx.stroke();

    // Card-specific content
    switch (cardType) {
      case 'currentStage':
        drawCurrentStageCard(ctx, w, h);
        break;
      case 'future3Year':
        drawFuture3YearCard(ctx, w, h);
        break;
      case 'careerKline':
      case 'wealthKline':
      case 'relationshipWave':
        drawAspectKlineCard(ctx, w, h);
        break;
      case 'keyYear':
        drawKeyYearCard(ctx, w, h);
        break;
      case 'actionWindow':
        drawActionWindowCard(ctx, w, h);
        break;
    }

    // Footer
    const footerY = quality === 'report' ? 1750 * scale : 1180;
    ctx.strokeStyle = `rgba(${config.accentRgb},0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60 * scale, footerY);
    ctx.lineTo(w - 60 * scale, footerY);
    ctx.stroke();

    ctx.fillStyle = config.accent;
    setFont(ctx, 26 * scale, 800);
    ctx.fillText(t('app.name'), 60 * scale, footerY + 50 * scale);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    setFont(ctx, isEnglish ? 22 * scale : 24 * scale, 700);
    ctx.fillText('awkn.cn/life', w - 60 * scale, footerY + 50 * scale);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    setFont(ctx, 16 * scale, 400);
    ctx.fillText(t('klineImage.brandTagline'), 60 * scale, footerY + 85 * scale);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    setFont(ctx, 14 * scale, 400);
    ctx.fillText(t('klineImage.footerDisclaimer'), w / 2, footerY + 140 * scale);
    ctx.textAlign = 'left';

    if (quality === 'basic') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      setFont(ctx, 18 * scale, 600);
      ctx.fillText(t('resultPage.shareTiers.watermark'), w / 2, footerY + 120 * scale);
      ctx.textAlign = 'left';
    }

    if (quality === 'report') {
      const reportY = 1200 * scale;
      ctx.strokeStyle = `rgba(${config.accentRgb},0.15)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60 * scale, reportY);
      ctx.lineTo(w - 60 * scale, reportY);
      ctx.stroke();

      ctx.fillStyle = config.accent;
      setFont(ctx, 24 * scale, 700);
      ctx.fillText(isEnglish ? 'Four-Line Overview' : '四线总览', 60 * scale, reportY + 40 * scale);

      const aspectKeys = ['overall', 'career', 'wealth', 'relationship'] as const;
      const aspectLabels = isEnglish
        ? ['Overall', 'Career', 'Wealth', 'Relationship']
        : [t('resultPage.destinyKline.aspect.overall'), t('resultPage.destinyKline.aspect.career'), t('resultPage.destinyKline.aspect.wealth'), t('resultPage.destinyKline.aspect.relationship')];
      const aspectColorsArr = [ASPECT_COLORS.overall, ASPECT_COLORS.career, ASPECT_COLORS.wealth, ASPECT_COLORS.relationship];

      aspectKeys.forEach((asp, i) => {
        const aspY = reportY + 70 * scale + i * 120 * scale;
        const aspData = bundle?.aspects?.[asp];
        const aspScore = aspData?.points ? Math.round(aspData.points[Math.floor(aspData.points.length / 2)]?.score ?? 50) : 50;
        const aspColor = aspectColorsArr[i];

        drawPanel(ctx, 60 * scale, aspY, w - 120 * scale, 100 * scale, 'rgba(255,255,255,0.04)');
        ctx.fillStyle = aspColor.accent;
        setFont(ctx, 20 * scale, 700);
        ctx.fillText(aspectLabels[i], 90 * scale, aspY + 35 * scale);

        ctx.fillStyle = '#FFFFFF';
        setFont(ctx, 28 * scale, 800);
        ctx.fillText(`${aspScore}分`, 90 * scale, aspY + 75 * scale);

        const barW = 300 * scale;
        const barH = 8 * scale;
        const barX = w - 60 * scale - barW;
        const barY = aspY + 55 * scale;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        roundRect(ctx, barX, barY, barW, barH, 4 * scale, true, false);
        ctx.fillStyle = aspColor.accent;
        roundRect(ctx, barX, barY, barW * (aspScore / 100), barH, 4 * scale, true, false);

        if (aspData?.oneLiner) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          setFont(ctx, 14 * scale, 400);
          wrapText(ctx, aspData.oneLiner, 90 * scale, aspY + 95 * scale, w - 200 * scale, 20 * scale, 1, isEnglish);
        }
      });

      const badgeY = reportY + 570 * scale;
      ctx.fillStyle = 'rgba(201,169,110,0.15)';
      roundRect(ctx, w - 240 * scale, badgeY, 180 * scale, 32 * scale, 16 * scale, true, false);
      ctx.fillStyle = config.accent;
      setFont(ctx, 14 * scale, 600);
      ctx.textAlign = 'center';
      ctx.fillText(isEnglish ? 'Yearly Member Only' : '年会员专享', w - 150 * scale, badgeY + 22 * scale);
      ctx.textAlign = 'left';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, config, colors, currentScore, stageKey, stageLabel, oneLiner, actionAdvice, primarySignal, oppWindow, riskWindow, keyYears, future3Years, data, t, isEnglish, shortCycleData, quality, scale]);

  function drawCurrentStageCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Score ring
    drawScoreRing(ctx, 200, 190, 60, currentScore, colors.accent);

    // Stage label
    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, isEnglish ? 32 : 36, 800);
    ctx.fillText(stageLabel, 300, 175);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    setFont(ctx, isEnglish ? 18 : 20, 400);
    wrapText(ctx, oneLiner, 300, 210, 700, 28, 2, isEnglish);

    // Mini chart
    const chartY = 280;
    const chartH = 220;
    drawPanel(ctx, 60, chartY, w - 120, chartH, 'rgba(255,255,255,0.04)');
    drawMiniLineChart(ctx, data, 80, chartY + 20, w - 160, chartH - 40, colors.accent, colors.accentRgb);

    // Opportunity / Risk windows
    const winY = 530;
    const winCardW = (w - 140) / 2;
    drawPanel(ctx, 60, winY, winCardW, 120, 'rgba(72,213,151,0.08)');
    ctx.strokeStyle = 'rgba(72,213,151,0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, 60, winY, winCardW, 120, 20, false, true);
    ctx.fillStyle = 'rgba(72,213,151,0.65)';
    setFont(ctx, 18, 600);
    ctx.fillText(t('klineImage.bestWindow'), 84, winY + 36);
    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, isEnglish ? 30 : 34, 800);
    ctx.fillText(oppWindow, 84, winY + 85);

    const riskX = 60 + winCardW + 20;
    drawPanel(ctx, riskX, winY, winCardW, 120, 'rgba(255,107,107,0.08)');
    ctx.strokeStyle = 'rgba(255,107,107,0.2)';
    roundRect(ctx, riskX, winY, winCardW, 120, 20, false, true);
    ctx.fillStyle = 'rgba(255,107,107,0.65)';
    setFont(ctx, 18, 600);
    ctx.fillText(t('klineImage.riskWindow'), riskX + 24, winY + 36);
    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, isEnglish ? 30 : 34, 800);
    ctx.fillText(riskWindow, riskX + 24, winY + 85);

    // Signal + Advice
    const signalY = 690;
    if (primarySignal) {
      const signalColors: Record<string, string> = {
        positive: 'rgba(72,213,151,0.15)',
        warning: 'rgba(255,107,107,0.15)',
        neutral: 'rgba(255,255,255,0.08)',
      };
      const signalTextColors: Record<string, string> = {
        positive: '#48D597',
        warning: '#FF6B6B',
        neutral: 'rgba(255,255,255,0.7)',
      };
      const signalBg = signalColors[primarySignal.level] || signalColors.neutral;
      const signalTextColor = signalTextColors[primarySignal.level] || signalTextColors.neutral;
      setFont(ctx, 20, 700);
      const tagW = ctx.measureText(primarySignal.label).width + 32;
      ctx.fillStyle = signalBg;
      roundRect(ctx, 60, signalY, tagW, 40, 20, true, false);
      ctx.fillStyle = signalTextColor;
      setFont(ctx, 20, 700);
      ctx.fillText(primarySignal.label, 76, signalY + 27);
    }

    if (actionAdvice) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      setFont(ctx, isEnglish ? 20 : 22, 500);
      wrapText(ctx, actionAdvice, 60, signalY + (primarySignal ? 70 : 30), 940, 30, 3, isEnglish);
    }

    // Key years
    const keyY = 900;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    setFont(ctx, 18, 600);
    ctx.fillText(t('shareCard.keyYears'), 60, keyY);

    if (keyYears.length > 0) {
      const dotStartX = 60;
      const dotY = keyY + 36;
      const dotSpacing = Math.min(200, 940 / keyYears.length);
      keyYears.forEach((point, i) => {
        const x = dotStartX + i * dotSpacing;
        const s = point.score ?? point.close ?? 0;
        const dotColor = s >= 65 ? '#48D597' : s < 40 ? '#FF6B6B' : colors.accent;
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(x + 8, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        setFont(ctx, 16, 500);
        ctx.fillText(String(point.year), x, dotY + 28);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        setFont(ctx, 14, 400);
        ctx.fillText(t('klineImage.ageLabel', { age: Math.round(point.age) }), x, dotY + 48);
      });
    }
  }

  function drawFuture3YearCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const startY = 140;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    setFont(ctx, 18, 600);
    ctx.fillText(isEnglish ? 'Next 3 Years Forecast' : '未来三年走势', 60, startY);

    future3Years.forEach((fy, i) => {
      const y = startY + 60 + i * 140;
      drawPanel(ctx, 60, y, w - 120, 120, PANEL);

      ctx.fillStyle = config.accent;
      setFont(ctx, 28, 800);
      ctx.fillText(String(fy.year), 90, y + 45);

      const scoreColor = fy.score >= 65 ? '#48D597' : fy.score < 45 ? '#FF6B6B' : '#f59e0b';
      ctx.fillStyle = scoreColor;
      setFont(ctx, 32, 800);
      ctx.fillText(`${fy.score}分`, 220, y + 45);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      setFont(ctx, 20, 500);
      const stage = isEnglish ? getStageNameEn(fy.score) : getStageName(fy.score);
      ctx.fillText(stage, 340, y + 45);

      // Mini bar
      const barW = 300;
      const barH = 8;
      const barX = w - 60 - barW;
      const barY = y + 30;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, barX, barY, barW, barH, 4, true, false);
      ctx.fillStyle = scoreColor;
      roundRect(ctx, barX, barY, barW * (fy.score / 100), barH, 4, true, false);

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      setFont(ctx, 18, 400);
      const advice = fy.score >= 65
        ? (isEnglish ? 'Good time to push forward' : '适合主动推进')
        : fy.score < 45
          ? (isEnglish ? 'Stay conservative, build strength' : '宜守不宜攻，蓄力待机')
          : (isEnglish ? 'Steady progress, watch for signals' : '稳中有进，留意信号');
      wrapText(ctx, advice, 90, y + 90, w - 180, 26, 1, isEnglish);
    });
  }

  function drawAspectKlineCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Score ring
    drawScoreRing(ctx, 200, 190, 60, currentScore, colors.accent);

    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, isEnglish ? 32 : 36, 800);
    ctx.fillText(stageLabel, 300, 175);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    setFont(ctx, isEnglish ? 18 : 20, 400);
    wrapText(ctx, oneLiner, 300, 210, 700, 28, 2, isEnglish);

    // Full-width chart
    const chartY = 280;
    const chartH = 280;
    drawPanel(ctx, 60, chartY, w - 120, chartH, 'rgba(255,255,255,0.04)');
    drawMiniLineChart(ctx, data, 80, chartY + 20, w - 160, chartH - 40, colors.accent, colors.accentRgb);

    // Signal
    const signalY = 600;
    if (primarySignal) {
      const signalColors: Record<string, string> = {
        positive: 'rgba(72,213,151,0.15)',
        warning: 'rgba(255,107,107,0.15)',
        neutral: 'rgba(255,255,255,0.08)',
      };
      const signalTextColors: Record<string, string> = {
        positive: '#48D597',
        warning: '#FF6B6B',
        neutral: 'rgba(255,255,255,0.7)',
      };
      const signalBg = signalColors[primarySignal.level] || signalColors.neutral;
      const signalTextColor = signalTextColors[primarySignal.level] || signalTextColors.neutral;
      setFont(ctx, 20, 700);
      const tagW = ctx.measureText(primarySignal.label).width + 32;
      ctx.fillStyle = signalBg;
      roundRect(ctx, 60, signalY, tagW, 40, 20, true, false);
      ctx.fillStyle = signalTextColor;
      setFont(ctx, 20, 700);
      ctx.fillText(primarySignal.label, 76, signalY + 27);
    }

    if (actionAdvice) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      setFont(ctx, isEnglish ? 20 : 22, 500);
      wrapText(ctx, actionAdvice, 60, signalY + (primarySignal ? 70 : 30), 940, 30, 3, isEnglish);
    }

    // Best / Risk
    const winY = 800;
    const winCardW = (w - 140) / 2;
    drawPanel(ctx, 60, winY, winCardW, 120, 'rgba(72,213,151,0.08)');
    ctx.strokeStyle = 'rgba(72,213,151,0.2)';
    roundRect(ctx, 60, winY, winCardW, 120, 20, false, true);
    ctx.fillStyle = 'rgba(72,213,151,0.65)';
    setFont(ctx, 18, 600);
    ctx.fillText(t('klineImage.bestWindow'), 84, winY + 36);
    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, isEnglish ? 30 : 34, 800);
    ctx.fillText(oppWindow, 84, winY + 85);

    const riskX = 60 + winCardW + 20;
    drawPanel(ctx, riskX, winY, winCardW, 120, 'rgba(255,107,107,0.08)');
    ctx.strokeStyle = 'rgba(255,107,107,0.2)';
    roundRect(ctx, riskX, winY, winCardW, 120, 20, false, true);
    ctx.fillStyle = 'rgba(255,107,107,0.65)';
    setFont(ctx, 18, 600);
    ctx.fillText(t('klineImage.riskWindow'), riskX + 24, winY + 36);
    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, isEnglish ? 30 : 34, 800);
    ctx.fillText(riskWindow, riskX + 24, winY + 85);
  }

  function drawKeyYearCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const startY = 140;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    setFont(ctx, 18, 600);
    ctx.fillText(isEnglish ? 'Key Turning Points' : '人生关键年份', 60, startY);

    const topPoints = [...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3);
    const bottomPoints = [...data].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 2);
    const displayPoints = [...topPoints, ...bottomPoints].slice(0, 5);

    displayPoints.forEach((pt, i) => {
      const y = startY + 50 + i * 110;
      drawPanel(ctx, 60, y, w - 120, 95, PANEL);

      const s = pt.score ?? pt.close ?? 0;
      const scoreColor = s >= 65 ? '#48D597' : s < 45 ? '#FF6B6B' : '#f59e0b';

      ctx.fillStyle = '#FFFFFF';
      setFont(ctx, 28, 800);
      ctx.fillText(String(pt.year), 90, y + 40);

      ctx.fillStyle = scoreColor;
      setFont(ctx, 28, 800);
      ctx.fillText(`${Math.round(s)}分`, 220, y + 40);

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      setFont(ctx, 18, 400);
      const label = s >= 65
        ? (isEnglish ? 'Opportunity Window' : '机会窗口')
        : s < 45
          ? (isEnglish ? 'Caution Period' : '需谨慎')
          : (isEnglish ? 'Transition Phase' : '过渡期');
      ctx.fillText(label, 340, y + 40);

      // Bar
      const barW = 200;
      const barH = 6;
      const barX = w - 60 - barW;
      const barY = y + 28;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, barX, barY, barW, barH, 3, true, false);
      ctx.fillStyle = scoreColor;
      roundRect(ctx, barX, barY, barW * (s / 100), barH, 3, true, false);

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      setFont(ctx, 16, 400);
      ctx.fillText(t('klineImage.ageLabel', { age: Math.round(pt.age) }), 90, y + 72);
    });
  }

  function drawActionWindowCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const sc = shortCycleData;
    const startY = 140;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    setFont(ctx, 18, 600);
    ctx.fillText(isEnglish ? 'Recent Action Window' : '近期行动窗口', 60, startY);

    if (!sc) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      setFont(ctx, 22, 500);
      ctx.fillText(isEnglish ? 'No short-cycle data available' : '暂无短周期数据', 60, startY + 60);
      return;
    }

    // Today signal
    const todayScore = sc.points.find(p => p.dayOffset === 0)?.score ?? 50;
    const todaySignal = sc.summary.todaySignal;

    drawScoreRing(ctx, 200, startY + 80, 60, Math.round(todayScore), config.accent);

    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, isEnglish ? 28 : 32, 800);
    ctx.fillText(todaySignal, 300, startY + 70);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    setFont(ctx, 18, 400);
    ctx.fillText(sc.config.label, 300, startY + 105);

    // Trend
    const trendY = startY + 180;
    drawPanel(ctx, 60, trendY, w - 120, 80, PANEL);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    setFont(ctx, 18, 600);
    ctx.fillText(isEnglish ? 'Overall Trend' : '整体趋势', 90, trendY + 35);
    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, 24, 700);
    ctx.fillText(sc.summary.overallTrend, 90, trendY + 65);

    // Suitable
    const suitY = trendY + 110;
    if (sc.summary.suitable.length > 0) {
      drawPanel(ctx, 60, suitY, w - 120, 60 + sc.summary.suitable.length * 36, 'rgba(72,213,151,0.08)');
      ctx.strokeStyle = 'rgba(72,213,151,0.2)';
      roundRect(ctx, 60, suitY, w - 120, 60 + sc.summary.suitable.length * 36, 20, false, true);
      ctx.fillStyle = 'rgba(72,213,151,0.65)';
      setFont(ctx, 18, 600);
      ctx.fillText(isEnglish ? 'Suitable For' : '适合', 90, suitY + 35);
      sc.summary.suitable.forEach((s, i) => {
        ctx.fillStyle = '#FFFFFF';
        setFont(ctx, 20, 500);
        ctx.fillText(`· ${s}`, 90, suitY + 65 + i * 36);
      });
    }

    // Caution
    const cautionY = suitY + (sc.summary.suitable.length > 0 ? 80 + sc.summary.suitable.length * 36 : 0);
    if (sc.summary.caution.length > 0) {
      drawPanel(ctx, 60, cautionY, w - 120, 60 + sc.summary.caution.length * 36, 'rgba(255,107,107,0.08)');
      ctx.strokeStyle = 'rgba(255,107,107,0.2)';
      roundRect(ctx, 60, cautionY, w - 120, 60 + sc.summary.caution.length * 36, 20, false, true);
      ctx.fillStyle = 'rgba(255,107,107,0.65)';
      setFont(ctx, 18, 600);
      ctx.fillText(isEnglish ? 'Caution' : '注意', 90, cautionY + 35);
      sc.summary.caution.forEach((c, i) => {
        ctx.fillStyle = '#FFFFFF';
        setFont(ctx, 20, 500);
        ctx.fillText(`· ${c}`, 90, cautionY + 65 + i * 36);
      });
    }

    // Mini chart of short cycle
    const chartY = Math.min(cautionY + 120, 850);
    const chartH = 200;
    if (chartY + chartH < 1100) {
      drawPanel(ctx, 60, chartY, w - 120, chartH, 'rgba(255,255,255,0.04)');
      const scData = sc.points.map(p => ({
        age: p.dayOffset,
        year: p.dayOffset,
        open: p.score,
        close: p.score,
        high: p.score + 3,
        low: p.score - 3,
        score: p.score,
      }));
      drawMiniLineChart(ctx, scData, 80, chartY + 20, w - 160, chartH - 40, config.accent, config.accentRgb);
    }
  }

  const generateImage = useCallback(async () => {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext('2d')!;
      await drawCard(ctx);
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(dataUrl);
      trackEvent('kline_share_card_generated', { cardType });
    } catch (err) {
      console.error('[KLineShareCard] generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [drawCard, cardType]);

  const handleDownload = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    const fileNameMap: Record<CardType, string> = {
      currentStage: t('shareCard.fileNameCurrentStage'),
      future3Year: t('shareCard.fileNameFuture3Year'),
      careerKline: t('shareCard.fileNameCareer'),
      wealthKline: t('shareCard.fileNameWealth'),
      relationshipWave: t('shareCard.fileNameRelationship'),
      keyYear: t('shareCard.fileNameKeyYear'),
      actionWindow: t('shareCard.fileNameActionWindow'),
    };
    a.download = `${fileNameMap[cardType] || t('klineImage.fileName')}.png`;
    a.click();
    trackEvent('kline_share_card_downloaded', { cardType });
  }, [previewUrl, cardType, t]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="hidden" />

      <motion.button
        onClick={generateImage}
        disabled={isGenerating}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:from-amber-600/30 hover:to-yellow-600/30 transition-all disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-lg">share</span>
        {isGenerating ? t('klineImage.generating') : t('resultPage.destinyKline.shareCard')}
      </motion.button>

      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-6 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
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
                  style={{ aspectRatio: '4/5', objectFit: 'cover' }}
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
                  onClick={onClose}
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
