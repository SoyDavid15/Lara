import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Locale, translations } from '../constants/translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'es',
  setLocale: async () => {},
  t: (path: string) => path,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('es');

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem('app_locale');
        if (savedLocale !== null) {
          setLocaleState(savedLocale as Locale);
        } else {
          // Fallback to device language if available and supported
          const deviceLocale = Localization.getLocales()[0].languageCode;
          if (deviceLocale === 'en' || deviceLocale === 'es') {
            setLocaleState(deviceLocale as Locale);
          }
        }
      } catch (error) {
        console.error("Failed to load locale", error);
      }
    };
    loadLocale();
  }, []);

  const setLocale = async (newLocale: Locale) => {
    try {
      setLocaleState(newLocale);
      await AsyncStorage.setItem('app_locale', newLocale);
    } catch (error) {
      console.error("Failed to save locale", error);
    }
  };

  /**
   * Simple helper to get nested translation keys.
   * Example: t('options.title')
   */
  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations[locale];
    
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        return path; // Return key path if not found
      }
    }
    
    return result as string;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
