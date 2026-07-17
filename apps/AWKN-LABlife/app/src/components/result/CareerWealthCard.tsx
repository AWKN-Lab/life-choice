import { Icon } from './Icon';

interface CareerWealthCardProps {
  career?: string;
  wealth?: string;
  careerScore?: number;
  wealthScore?: number;
}

export function CareerWealthCard({ career, wealth, careerScore, wealthScore }: CareerWealthCardProps) {
  if (!career && !wealth) return null;

  return (
    <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4 space-y-4">
      <h3 className="text-primary font-semibold flex items-center gap-2">
        <Icon name="trending_up" size={18} />
        事业财运
      </h3>

      {career && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-on-surface/70">
              <Icon name="work" size={14} className="text-blue-400" />
              <span>事业分析</span>
            </div>
            {careerScore !== undefined && (
              <span className="text-primary text-sm font-semibold">{careerScore}/10</span>
            )}
          </div>
          <p className="text-on-surface/60 text-sm leading-relaxed">{career}</p>
        </div>
      )}

      {wealth && (
        <div className="border-t border-outline/5 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-on-surface/70">
              <Icon name="payments" size={14} className="text-amber-400" />
              <span>财富分析</span>
            </div>
            {wealthScore !== undefined && (
              <span className="text-primary text-sm font-semibold">{wealthScore}/10</span>
            )}
          </div>
          <p className="text-on-surface/60 text-sm leading-relaxed">{wealth}</p>
        </div>
      )}
    </div>
  );
}