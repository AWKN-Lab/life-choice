import { motion } from 'framer-motion';
import { Icon } from '../Icon';

interface VipService {
  id: string;
  iconName: string;
  title: string;
  subtitle: string;
  desc: string;
}

export function VipPromptMessage({ services, onUnlock }: { services: VipService[]; onUnlock: (id: string) => void }) {
  const iconMap: Record<string, string> = {
    breakthrough: 'cruelty_free',
    morning: 'calendar_month',
    kline: 'show_chart',
  };

  return (
    <div className="space-y-2 w-full">
      <p className="text-xs text-on-surface/40 mb-2">以下深度服务可助你更进一步：</p>
      <div className="grid grid-cols-1 gap-2">
        {services.map((service, i) => (
          <motion.button
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onUnlock(service.id)}
            className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-left hover:bg-primary/10 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Icon name={iconMap[service.id] || 'auto_awesome'} size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface font-medium">{service.title}</span>
                <span className="text-[10px] text-primary/70 border border-primary/30 rounded px-1.5 py-0.5">VIP</span>
              </div>
              <p className="text-xs text-on-surface/50 mt-0.5 truncate">{service.desc}</p>
            </div>
            <Icon name="chevron_right" size={16} className="text-on-surface/30 flex-shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
