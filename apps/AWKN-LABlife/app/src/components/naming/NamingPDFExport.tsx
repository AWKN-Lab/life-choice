import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/result/Icon';
import { trackEvent } from '@/lib/analytics';
import { useAuthStore } from '@/store/authStore';
import type { UnifiedResult } from '@/components/result/resultTypes';

interface NamingPDFExportProps {
  result: UnifiedResult;
  recordId?: string;
}

export function NamingPDFExport({ result, recordId }: NamingPDFExportProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isPremium = user && user.membership !== 'free';
  const [showPreview, setShowPreview] = useState(false);

  const handleExport = useCallback(() => {
    trackEvent('naming_pdf_export_click', { record_id: recordId, is_premium: isPremium });

    if (!isPremium) {
      // 免费用户：仅预览（打开新窗口查看），不触发打印
      setShowPreview(true);
      openPreviewWindow();
      return;
    }

    // 付费用户：直接打印/下载
    openPrintWindow();
  }, [result, recordId, t, isPremium]);

  const openPreviewWindow = () => {
    const html = buildPdfHtml();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const openPrintWindow = () => {
    const html = buildPdfHtml();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const buildPdfHtml = () => {
    const nameSuggestions = result.name_suggestions || [];
    const bazi = result.bazi || {};
    const wuxingAnalysis = result.wuxing_analysis || {};
    const xiYongShen = result.xi_yong_shen || {};

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${t('resultPage.namingAnnual.pdfTitle', { defaultValue: '取名方案' })}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.6; }
  h1 { font-size: 24px; text-align: center; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 32px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 16px; font-weight: 600; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-bottom: 12px; }
  .pillars { display: flex; gap: 16px; margin-bottom: 16px; }
  .pillar { flex: 1; text-align: center; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; }
  .pillar-label { font-size: 12px; color: #999; }
  .pillar-value { font-size: 20px; font-weight: 600; }
  .name-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .name-title { font-size: 18px; font-weight: 600; }
  .name-score { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px; }
  .name-reason { font-size: 14px; color: #666; margin-top: 8px; }
  .wuxing-row { display: flex; gap: 8px; margin-top: 8px; }
  .wuxing-item { flex: 1; text-align: center; padding: 8px; border-radius: 4px; background: #f5f5f5; }
  .wuxing-count { font-size: 18px; font-weight: 600; }
  .wuxing-label { font-size: 12px; color: #999; }
  .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  .watermark { position: fixed; bottom: 20px; right: 20px; color: rgba(0,0,0,0.06); font-size: 48px; font-weight: bold; pointer-events: none; }
  @media print { body { padding: 20px; } .watermark { display: none; } }
</style>
</head>
<body>
<h1>${t('resultPage.namingAnnual.pdfTitle', { defaultValue: '取名方案' })}</h1>
<div class="subtitle">${t('resultPage.namingAnnual.pdfSubtitle', { defaultValue: '人生决策宗师 · AI智能取名' })}</div>

${bazi.yearPillar ? `
<div class="section">
  <div class="section-title">${t('resultPage.bazi.fourPillars', { defaultValue: '四柱' })}</div>
  <div class="pillars">
    <div class="pillar"><div class="pillar-label">${t('resultPage.bazi.year', { defaultValue: '年柱' })}</div><div class="pillar-value">${bazi.yearPillar}</div></div>
    <div class="pillar"><div class="pillar-label">${t('resultPage.bazi.month', { defaultValue: '月柱' })}</div><div class="pillar-value">${bazi.monthPillar}</div></div>
    <div class="pillar"><div class="pillar-label">${t('resultPage.bazi.day', { defaultValue: '日柱' })}</div><div class="pillar-value">${bazi.dayPillar}</div></div>
    <div class="pillar"><div class="pillar-label">${t('resultPage.bazi.hour', { defaultValue: '时柱' })}</div><div class="pillar-value">${bazi.hourPillar}</div></div>
  </div>
</div>
` : ''}

${wuxingAnalysis.current ? `
<div class="section">
  <div class="section-title">${t('resultPage.bazi.fiveElements', { defaultValue: '五行' })}</div>
  <div class="wuxing-row">
    ${Object.entries(wuxingAnalysis.current).map(([k, v]) => `
      <div class="wuxing-item"><div class="wuxing-count">${v}</div><div class="wuxing-label">${k === 'wood' ? '木' : k === 'fire' ? '火' : k === 'earth' ? '土' : k === 'metal' ? '金' : '水'}</div></div>
    `).join('')}
  </div>
  ${(wuxingAnalysis.missing as string[])?.length ? `<p style="margin-top:8px;color:#e74c3c;font-size:14px;">缺：${(wuxingAnalysis.missing as string[]).join('、')}</p>` : ''}
</div>
` : ''}

${xiYongShen.yong?.length ? `
<div class="section">
  <div class="section-title">${t('resultPage.namingGating.wuxingMatch', { defaultValue: '喜用神' })}</div>
  <p style="font-size:14px;">用神：${xiYongShen.yong.join('、')} | 喜神：${xiYongShen.xi?.join('、') || '—'} | 忌神：${xiYongShen.ji?.join('、') || '—'}</p>
</div>
` : ''}

<div class="section">
  <div class="section-title">${t('resultPage.quming.nameSuggestions', { defaultValue: '推荐名字' })}</div>
  ${nameSuggestions.map((s: any, i: number) => {
    const name = s.names?.[0] || s.name || '';
    const score = s.score;
    const scoreColor = score >= 80 ? '#27ae60' : score >= 60 ? '#f39c12' : '#e74c3c';
    return `
      <div class="name-card">
        <span class="name-title">${i + 1}. ${name}</span>
        ${score != null ? `<span class="name-score" style="background:${scoreColor}20;color:${scoreColor}">${score}分</span>` : ''}
        ${s.reason ? `<p class="name-reason">${s.reason}</p>` : ''}
        ${s.wuxingMatch ? `<p style="font-size:12px;color:#888;margin-top:4px;">五行匹配：${s.wuxingMatch}</p>` : ''}
        ${s.caveat ? `<p style="font-size:12px;color:#e67e22;margin-top:4px;">注意：${s.caveat}</p>` : ''}
      </div>
    `;
  }).join('')}
</div>

${!isPremium ? '<div class="watermark">预览版</div>' : ''}

<div class="footer">
  ${t('resultPage.namingAnnual.pdfFooter', { defaultValue: '由人生决策宗师 AI 生成，仅供参考' })}<br/>
  ${new Date().toLocaleDateString('zh-CN')}
</div>
</body>
</html>`;
  };

  return (
    <div className="w-full">
      <button
        onClick={handleExport}
        className="w-full py-3 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center gap-2 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
      >
        <Icon name={isPremium ? 'picture_as_pdf' : 'visibility'} size={18} />
        {isPremium
          ? t('resultPage.namingAnnual.pdfExport', { defaultValue: '导出 PDF' })
          : t('resultPage.namingAnnual.pdfPreview', { defaultValue: '预览取名报告' })
        }
      </button>
      {!isPremium && (
        <p className="text-center text-xs text-on-surface-variant/50 mt-1.5">
          {t('resultPage.namingAnnual.pdfUpgradeHint', { defaultValue: '升级会员可下载完整 PDF' })}
        </p>
      )}
    </div>
  );
}
