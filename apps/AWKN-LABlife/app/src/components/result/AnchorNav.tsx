import { motion } from 'framer-motion';
import { Icon } from './Icon';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface AnchorNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function AnchorNav({ items, activeId, onSelect }: AnchorNavProps) {
  return (
    <nav className="space-y-1">
      <div className="text-xs text-on-surface/40 mb-3 px-2">导航</div>
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive
                ? 'bg-primary/15 text-primary border-l-2 border-primary'
                : 'text-on-surface/50 hover:text-on-surface/80 hover:bg-on-surface/5'
            }`}
          >
            <Icon name={item.icon} size={16} className={isActive ? 'text-primary' : ''} />
            <span>{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}