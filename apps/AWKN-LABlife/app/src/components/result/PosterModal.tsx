import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import { consultApi } from '@/api/consult';
import { ENGINE_NAMES } from '@/lib/intentRouter';
import { Icon } from './Icon';
import type { UnifiedResult } from './resultTypes';

export function PosterModal({ response, onClose, navigate, t }: { response: UnifiedResult; onClose: () => void; navigate: (path: string) => void; t: ReturnType<typeof useTranslation>['t'] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const engineName = t(`engines.${response.route_type}`, { defaultValue: ENGINE_NAMES[response.route_type] || t('engines.consult') });

  const generatePoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!response?.summary_line) return;

    canvas.width = 1080;
    canvas.height = 1920;

    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#1a1a2e');
    bgGrad.addColorStop(1, '#0a0a0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(canvas.width / 2, canvas.height / 3, 0, canvas.width / 2, canvas.height / 3, 450);
    glow.addColorStop(0, 'rgba(218,207,152,0.18)');
    glow.addColorStop(1, 'rgba(218,207,152,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(218,207,152,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 180); ctx.lineTo(1000, 180); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(80, 1740); ctx.lineTo(1000, 1740); ctx.stroke();

    ctx.fillStyle = '#dacf98';
    ctx.font = '36px Noto Serif SC, serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('app.name'), canvas.width / 2, 130);

    ctx.fillStyle = '#ffffff';
    ctx.font = '52px Noto Serif SC, serif';
    ctx.fillText(engineName, canvas.width / 2, 300);

    ctx.fillStyle = '#dacf98';
    ctx.font = 'bold 44px Noto Sans SC, sans-serif';
    const summaryLine = response.summary_line.length > 20 ? response.summary_line.slice(0, 20) + '...' : response.summary_line;
    ctx.fillText(summaryLine, canvas.width / 2, 400);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(60, 440, 960, 780);
    ctx.strokeStyle = 'rgba(218,207,152,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 440, 960, 780);

    let yPos = 500;
    const drawSection = (title: string, lines: string[]) => {
      ctx.fillStyle = '#dacf98';
      ctx.font = '28px Noto Sans SC, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(title, 100, yPos);
      yPos += 45;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '26px Noto Sans SC, sans-serif';
      lines.forEach((line) => {
        const wrapped = line.length > 28 ? line.match(/.{1,28}/g) || [line] : [line];
        wrapped.forEach((segment) => {
          ctx.fillText(segment, 120, yPos);
          yPos += 42;
        });
      });
      yPos += 25;
    };

    drawSection(t('resultPage.posterSections.analysis'), [response.summary_body.slice(0, 120)]);
    drawSection(t('resultPage.posterSections.risks'), response.risks.slice(0, 3));
    drawSection(t('resultPage.posterSections.actions'), response.actions.slice(0, 3));

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '24px Noto Sans SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(response.time_window, canvas.width / 2, 1280);

    ctx.fillStyle = 'rgba(218,207,152,0.15)';
    ctx.fillRect(canvas.width / 2 - 160, 1640, 320, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '22px Noto Sans SC, sans-serif';
    ctx.fillText(t('resultPage.recordId', { id: response.record_id }), canvas.width / 2, 1700);

    ctx.fillStyle = '#dacf98';
    ctx.font = '28px Noto Serif SC, serif';
    ctx.fillText(`${t('app.name')} · ${engineName}`, canvas.width / 2, 1860);

    setGenerated(true);
    trackEvent('poster_canvas_generated', { record_id: response.record_id });
    if (response.record_id) {
      consultApi.saveBehaviorEvent(response.record_id, 'poster_generated', {
        routeType: response.route_type,
      }).catch(() => {});
    }
  }, [response, t, engineName]);

  useEffect(() => {
    if (!generated) {
      const timer = setTimeout(generatePoster, 300);
      return () => clearTimeout(timer);
    }
  }, [generated, generatePoster]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `AWKN_${response.route_type}_${response.record_id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setSaved(true);
    trackEvent('poster_save_success', { record_id: response.record_id });
    consultApi.saveBehaviorEvent(response.record_id, 'poster_saved', {
      routeType: response.route_type,
    }).catch(() => {});
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const file = new File([blob], `AWKN_${response.route_type}_${response.record_id}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${t('app.name')} - ${engineName}`,
          text: response.summary_line,
          files: [file],
        });
        setShared(true);
        consultApi.saveBehaviorEvent(response.record_id, 'poster_shared', {
          routeType: response.route_type,
          method: 'webshare',
        }).catch(() => {});
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setShared(true);
        consultApi.saveBehaviorEvent(response.record_id, 'poster_shared', {
          routeType: response.route_type,
          method: 'clipboard',
        }).catch(() => {});
      }
      trackEvent('poster_share_success', { record_id: response.record_id });
    } catch {
      trackEvent('poster_share_cancelled', { record_id: response.record_id });
      consultApi.saveBehaviorEvent(response.record_id, 'poster_share_cancelled', {
        routeType: response.route_type,
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md p-4 flex items-center justify-center">
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 p-2 text-on-surface/50 hover:text-on-surface transition-colors z-10">
          <Icon name="close" size={20} />
        </button>
        <div className="bg-surface-container-lowest border border-primary/20 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-outline/5 flex items-center justify-between">
            <h3 className="text-on-surface font-semibold text-sm">{t('resultPage.poster')}</h3>
            <span className="text-[10px] text-on-surface/30 font-mono">{response.record_id}</span>
          </div>
          <div className="bg-black/40 p-3 flex items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg shadow-inner" style={{ maxHeight: '55vh', objectFit: 'contain' }} />
          </div>
          <div className="p-4 space-y-2.5">
            {!generated && (
              <div className="flex items-center justify-center gap-2 py-3 text-on-surface/40 text-sm">
                <Icon name="progress_activity" size={16} className="animate-spin" />
                {t('resultPage.generatingPoster')}
              </div>
            )}
            {generated && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={handleSave} className="gold-shimmer py-2.5 text-sm flex items-center justify-center gap-1.5">
                    <Icon name="download" size={16} />
                    {saved ? t('resultPage.saved') : t('resultPage.saveImage')}
                  </button>
                  <button onClick={handleShare} className="py-2.5 text-sm border border-primary/30 text-primary rounded-xl hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5">
                    <Icon name="share" size={16} />
                    {shared ? t('resultPage.shared') : t('resultPage.share')}
                  </button>
                </div>
                <button onClick={() => { trackEvent('poster_back_to_home'); onClose(); navigate('/'); }} className="w-full py-2.5 rounded-xl text-sm text-on-surface/40 hover:text-on-surface/60 hover:bg-on-surface/5 transition-all">
                  {t('resultPage.returnHome')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
