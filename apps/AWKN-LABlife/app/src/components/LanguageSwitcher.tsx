import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { languages, type LanguageCode } from '@/lib/i18n';
import { useLanguageStore } from '@/store/languageStore';

export function LanguageSwitcher() {
  const { currentLanguage, setLanguage } = useLanguageStore();

  const handleLanguageChange = (langCode: LanguageCode) => {
    setLanguage(langCode);
  };

  const currentLang = languages.find((lang) => lang.code === currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-on-surface/70 hover:text-on-surface hover:bg-on-surface/5 flex items-center space-x-1"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>globe</span>
          <span className="hidden sm:inline text-sm">
            {currentLang?.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-black/95 border-outline/10 backdrop-blur-md"
      >
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`flex items-center justify-between cursor-pointer ${
              currentLanguage === language.code
                ? 'text-gold bg-gold/10'
                : 'text-on-surface/70 hover:text-on-surface hover:bg-on-surface/5'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{language.flag}</span>
              <span className="text-sm">{language.nameLocal}</span>
            </div>
            {currentLanguage === language.code && (
              <span className="material-symbols-outlined ml-2" style={{ fontSize: '16px' }}>check</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
