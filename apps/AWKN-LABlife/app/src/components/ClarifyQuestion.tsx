import { useState } from 'react';
import { useConsultStore } from '@/store/consultStore';
import { MagneticButton } from '@/components/MagneticButton';
import { trackEvent } from '@/lib/analytics';

export function ClarifyQuestion() {
  const [answer, setAnswer] = useState('');
  const { clarifyQuestion, isClarifying, submitClarifyAnswer } =
    useConsultStore();

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    try {
      await submitClarifyAnswer(answer.trim());
      setAnswer('');
    } catch (e) {
      console.error('Clarify answer failed:', e);
    }
  };

  if (!clarifyQuestion) return null;

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex items-start gap-2 mb-3">
          <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>auto_awesome</span>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {clarifyQuestion}
          </p>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="请补充说明您的具体需求..."
          className="input-mystic w-full min-h-[80px] resize-none"
          disabled={isClarifying}
        />

        <div className="flex justify-end mt-3">
          <MagneticButton
            onClick={handleSubmit}
            disabled={!answer.trim() || isClarifying}
            className="btn-electric px-5 py-2 text-sm"
          >
            {isClarifying ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined icon-sm">progress_activity</span>
                分析中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined icon-sm">send</span>
                提交
              </span>
            )}
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
