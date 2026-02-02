import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * Custom hook for translations
 * Provides easy access to translation function and language controls
 */
export function useTranslation() {
  const { t, language, setLanguage, isLoading } = useLanguage();
  
  return {
    t,
    language,
    setLanguage,
    isLoading,
  };
}
