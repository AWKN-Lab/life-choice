import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

interface ReportSection {
  key: string;
  icon: string;
  iconColor: string;
  title: string;
  content: string;
}

const SECTION_PATTERNS: { key: string; icon: string; iconColor: string; titlePattern: RegExp }[] = [
  { key: 'verdict', icon: 'target', iconColor: 'text-amber-400', titlePattern: /一句话定性[：:]/ },
  { key: 'basis', icon: 'search', iconColor: 'text-blue-400', titlePattern: /判断依据[：:]/ },
  { key: 'risks', icon: 'warning', iconColor: 'text-red-400', titlePattern: /当前风险[：:]/ },
  { key: 'actions', icon: 'shield', iconColor: 'text-emerald-400', titlePattern: /建议动作[：:]/ },
  { key: 'window', icon: 'schedule', iconColor: 'text-violet-400', titlePattern: /时间窗口[：:]/ },
  { key: 'bottomline', icon: 'format_quote', iconColor: 'text-rose-400', titlePattern: /落一句最实在的话[：:]/ },
];

function parseSections(raw: string): ReportSection[] {
  if (!raw || !raw.trim()) return [];

  const sections: ReportSection[] = [];
  let remaining = raw;

  for (let i = 0; i < SECTION_PATTERNS.length; i++) {
    const pattern = SECTION_PATTERNS[i];
    const match = remaining.match(pattern.titlePattern);

    if (!match || match.index === undefined) continue;

    const nextPattern = SECTION_PATTERNS[i + 1];
    const contentStart = match.index + match[0].length;

    let contentEnd: number;
    if (nextPattern) {
      const nextMatch = remaining.substring(contentStart).match(nextPattern.titlePattern);
      contentEnd = nextMatch && nextMatch.index !== undefined
        ? contentStart + nextMatch.index
        : remaining.length;
    } else {
      contentEnd = remaining.length;
    }

    const content = remaining.substring(contentStart, contentEnd).trim();
    if (content.length > 2) {
      sections.push({
        key: pattern.key,
        icon: pattern.icon,
        iconColor: pattern.iconColor,
        title: match[0].replace(/[：:]/, ''),
        content,
      });
    }

    remaining = remaining.substring(match.index);
  }

  if (sections.length === 0 && raw.trim().length > 10) {
    sections.push({
      key: 'raw',
      icon: 'auto_awesome',
      iconColor: 'text-primary',
      title: '推演报告',
      content: raw.trim(),
    });
  }

  return sections;
}

interface StructuredReportProps {
  content: string;
  defaultExpanded?: boolean;
}

export function StructuredReport({ content, defaultExpanded = true }: StructuredReportProps) {
  const sections = parseSections(content);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    sections.forEach((s) => { state[s.key] = defaultExpanded; });
    return state;
  });

  if (sections.length === 0) return null;

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-2">
      {sections.map((section, index) => (
        <motion.div
          key={section.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
          className="rounded-xl border border-outline/[0.06] bg-on-surface/[0.02] overflow-hidden"
        >
          <button
            onClick={() => toggleSection(section.key)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-on-surface/[0.03] transition-colors"
          >
            <Icon name={section.icon} size={16} className={section.iconColor} />
            <span className="text-sm font-medium text-on-surface/70">{section.title}</span>
            <div className="ml-auto">
              <Icon
                name={expanded[section.key] ? 'expand_less' : 'expand_more'}
                size={16}
                className="text-on-surface/30"
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {expanded[section.key] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3">
                  <p className="text-sm leading-relaxed text-on-surface/50 whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}