import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Language } from '@/types';
import { TRANSLATIONS, TranslationKey } from '@/data/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}

// Font families for each language
const LANG_FONTS: Record<Language, string> = {
  en: "'Inter', 'Noto Sans', sans-serif",
  hi: "'Noto Sans Devanagari', 'Inter', sans-serif",
  gu: "'Noto Sans Gujarati', 'Inter', sans-serif",
  hinglish: "'Inter', 'Noto Sans', sans-serif",
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('billsaathi-lang') as Language) || 'en';
  });

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem('billsaathi-lang', l);
  }, []);

  // Apply font family when language changes
  useEffect(() => {
    document.body.style.fontFamily = LANG_FONTS[lang];
  }, [lang]);

  const t = useCallback((key: TranslationKey | string): string => {
    const entry = (TRANSLATIONS as any)[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  }, [lang]);

  const formatCurrency = useCallback((amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  }, []);

  const formatDate = useCallback((date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    
    if (lang === 'hi') {
      return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (lang === 'gu') {
      return d.toLocaleDateString('gu-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, formatCurrency, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}
