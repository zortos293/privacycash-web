'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from './ui/button';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-[#2D272F] border border-[#554D58] rounded-lg p-1">
      <Button
        onClick={() => setLanguage('en')}
        variant="ghost"
        size="sm"
        className={`h-8 px-3 text-xs font-medium transition-all ${
          language === 'en'
            ? 'bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] text-black hover:from-[#F8D12F] hover:to-[#F0B90B] shadow-lg shadow-[#F0B90B]/30'
            : 'text-gray-400 hover:text-white hover:bg-[#423C45]'
        }`}
      >
        EN
      </Button>
      <Button
        onClick={() => setLanguage('zh')}
        variant="ghost"
        size="sm"
        className={`h-8 px-3 text-xs font-medium transition-all ${
          language === 'zh'
            ? 'bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] text-black hover:from-[#F8D12F] hover:to-[#F0B90B] shadow-lg shadow-[#F0B90B]/30'
            : 'text-gray-400 hover:text-white hover:bg-[#423C45]'
        }`}
      >
        中文
      </Button>
    </div>
  );
}
