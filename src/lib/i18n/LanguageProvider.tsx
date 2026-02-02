import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { en } from "./translations/en";
import { lg } from "./translations/lg";
import { 
  Language, 
  DEFAULT_LANGUAGE, 
  LANGUAGE_STORAGE_KEY, 
  isValidLanguage,
  getNestedValue,
  interpolate 
} from "./index";

// Define a recursive translation type
type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationDictionary = { [key: string]: TranslationValue };

// Translation dictionaries
const translations: Record<Language, TranslationDictionary> = {
  en: en as unknown as TranslationDictionary,
  lg: lg as unknown as TranslationDictionary,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize language on mount
  useEffect(() => {
    initializeLanguage();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
        await loadLanguageFromProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        // Fall back to localStorage
        const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLang && isValidLanguage(storedLang)) {
          setLanguageState(storedLang);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeLanguage = async () => {
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        await loadLanguageFromProfile(session.user.id);
      } else {
        // Not logged in - check localStorage
        const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLang && isValidLanguage(storedLang)) {
          setLanguageState(storedLang);
        }
      }
    } catch (error) {
      console.error("Error initializing language:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLanguageFromProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", uid)
        .single();

      if (!error && data?.preferred_language && isValidLanguage(data.preferred_language)) {
        setLanguageState(data.preferred_language);
        // Also update localStorage for consistency
        localStorage.setItem(LANGUAGE_STORAGE_KEY, data.preferred_language);
      } else {
        // Profile doesn't have language set - check localStorage
        const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLang && isValidLanguage(storedLang)) {
          setLanguageState(storedLang);
        }
      }
    } catch (error) {
      console.error("Error loading language from profile:", error);
    }
  };

  const setLanguage = useCallback(async (lang: Language) => {
    // Update state immediately
    setLanguageState(lang);
    
    // Always update localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    // If user is logged in, update profile
    if (userId) {
      try {
        await supabase
          .from("profiles")
          .update({ preferred_language: lang })
          .eq("id", userId);
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    }
  }, [userId]);

  // Translation function with fallback
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    // Try to get translation in current language
    const translation = getNestedValue(translations[language] as unknown as Record<string, unknown>, key);
    
    if (translation) {
      return interpolate(translation, params);
    }

    // Fallback to English if translation missing
    if (language !== 'en') {
      const fallback = getNestedValue(translations.en as unknown as Record<string, unknown>, key);
      if (fallback) {
        // Log missing translation in development
        if (import.meta.env.DEV) {
          console.warn(`Missing translation for key "${key}" in language "${language}"`);
        }
        return interpolate(fallback, params);
      }
    }

    // Return key if no translation found (for debugging)
    if (import.meta.env.DEV) {
      console.warn(`No translation found for key "${key}"`);
    }
    return key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
