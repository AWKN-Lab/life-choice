import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CITIES, CITY_LABELS_EN } from '@/constants/cities';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/languageStore';

interface CityQuickInputProps {
  value: string;
  onChange: (city: string) => void;
  showQuickButtons?: boolean;
  maxQuickButtons?: number;
  placeholder?: string;
  className?: string;
}

export function CityQuickInput({
  value,
  onChange,
  showQuickButtons = true,
  maxQuickButtons = 8,
  placeholder,
  className,
}: CityQuickInputProps) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const isEnglish = currentLanguage === 'en';
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredCities = value.trim()
    ? CITIES.filter((c) => c.includes(value.trim()))
    : [];

  const quickCities = CITIES.slice(0, maxQuickButtons);

  return (
    <div className={className}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder || t('form.cityPlaceholder', { defaultValue: '请输入出生城市' })}
        className="input-mystic w-full"
      />
      {showSuggestions && filteredCities.length > 0 && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-outline/20 bg-surface-container shadow-lg z-10">
          {filteredCities.slice(0, 8).map((city) => (
            <button
              key={city}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(city);
                setShowSuggestions(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-on-surface hover:bg-surface-container-high"
            >
              {isEnglish ? CITY_LABELS_EN[city] || city : city}
            </button>
          ))}
        </div>
      )}
      {showQuickButtons && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {quickCities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-all',
                value === c
                  ? 'bg-primary/15 text-primary border border-primary/40'
                  : 'bg-surface-container-low/50 text-on-surface/40 border border-outline/20 hover:text-on-surface/60'
              )}
            >
              {isEnglish ? CITY_LABELS_EN[c] || c : c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
