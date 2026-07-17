import { Icon } from './Icon';

interface ShenShaCardProps {
  shenSha?: Record<string, string>;
}

const SHA_CATEGORIES = {
  jishi: {
    label: '吉神',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    icons: ['star', 'favorite', 'verified', 'auto_awesome'],
  },
  xiong: {
    label: '凶煞',
    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    icons: ['warning', 'error', 'gavel', 'shield'],
  },
  ping: {
    label: '中性',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    icons: ['balance', 'sync', 'swap_horiz'],
  },
};

const SHA_MAP: Record<string, string> = {
  天德: 'jishi', 天乙: 'jishi', 福星: 'jishi', 文昌: 'jishi', 太极: 'jishi',
  贵人: 'jishi', 天喜: 'jishi', 红鸾: 'jishi', 将星: 'jishi', 华盖: 'jishi',
  驿马: 'jishi', 桃花: 'jishi', 禄: 'jishi', 印: 'jishi',
  羊刃: 'xiong', 劫财: 'xiong', 伤官: 'xiong', 官鬼: 'xiong',
  丧门: 'xiong', 吊客: 'xiong', 披麻: 'xiong', 灾煞: 'xiong',
  血刃: 'xiong', 阴错: 'xiong', 孤辰: 'xiong', 寡宿: 'xiong',
};

function getShaCategory(shaName: string): string {
  return SHA_MAP[shaName] || 'ping';
}

export function ShenShaCard({ shenSha }: ShenShaCardProps) {
  if (!shenSha || Object.keys(shenSha).length === 0) return null;

  const entries = Object.entries(shenSha);
  
  const categorized = {
    jishi: entries.filter(([name]) => getShaCategory(name) === 'jishi'),
    xiong: entries.filter(([name]) => getShaCategory(name) === 'xiong'),
    ping: entries.filter(([name]) => getShaCategory(name) === 'ping'),
  };

  return (
    <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
      <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
        <Icon name="auto_awesome" size={18} />
        神煞解析
      </h3>

      <div className="space-y-4">
        {categorized.jishi.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-emerald-400">
              <Icon name="star" size={12} />
              <span>吉神 ({categorized.jishi.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categorized.jishi.map(([name, position]) => (
                <span
                  key={name}
                  className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300"
                >
                  {name}
                  {position && <span className="text-emerald-400/60 ml-1">·{position}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {categorized.xiong.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-rose-400">
              <Icon name="warning" size={12} />
              <span>凶煞 ({categorized.xiong.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categorized.xiong.map(([name, position]) => (
                <span
                  key={name}
                  className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-xs text-rose-300"
                >
                  {name}
                  {position && <span className="text-rose-400/60 ml-1">·{position}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {categorized.ping.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-amber-400">
              <Icon name="sync" size={12} />
              <span>中性 ({categorized.ping.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categorized.ping.map(([name, position]) => (
                <span
                  key={name}
                  className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-300"
                >
                  {name}
                  {position && <span className="text-amber-400/60 ml-1">·{position}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}