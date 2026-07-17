import EntryCard from './EntryCard';
import CompactEntryCard from './CompactEntryCard';

interface EntryGridProps {
  onEntryClick?: (entryKey: 'kline' | 'naming' | 'question') => void;
}

export default function EntryGrid({ onEntryClick }: EntryGridProps) {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Desktop: 3 equal columns */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-3 lg:gap-6">
        <EntryCard entryKey="kline" index={0} onEntryClick={onEntryClick} />
        <EntryCard entryKey="naming" index={1} onEntryClick={onEntryClick} />
        <EntryCard entryKey="question" index={2} onEntryClick={onEntryClick} />
      </div>

      {/* Mobile: Kline full featured + naming/question compact stacked */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        {/* Kline: takes 2 columns, full content */}
        <div className="col-span-2">
          <EntryCard entryKey="kline" index={0} onEntryClick={onEntryClick} />
        </div>
        {/* Naming + Question: stacked in 1 column, compact */}
        <div className="col-span-1 flex flex-col gap-2">
          <CompactEntryCard entryKey="naming" index={1} onEntryClick={onEntryClick} />
          <CompactEntryCard entryKey="question" index={2} onEntryClick={onEntryClick} />
        </div>
      </div>
    </section>
  );
}
