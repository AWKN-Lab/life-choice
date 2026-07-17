import { motion } from 'framer-motion';

interface StepCardData {
  title: string;
  items: string[];
  icon?: string;
}

interface StepCardMessageProps {
  data: StepCardData;
}

export function StepCardMessage({ data }: StepCardMessageProps) {
  const { title, items, icon } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 w-full max-w-lg"
    >
      <h4 className="flex items-center gap-2 font-medium text-primary text-sm">
        {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
        {title}
      </h4>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
              <span className="whitespace-pre-line">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
