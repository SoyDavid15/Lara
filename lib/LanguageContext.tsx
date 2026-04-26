/**
 * LanguageContext.tsx
 *
 * Sistema de internacionalización (i18n) de la app LARA.
 *
 * Permite que la app funcione en múltiples idiomas.
 * Actualmente soporta:
 *   - Español ('es') → idioma por defecto
 *   - Inglés  ('en')
 *
 * ¿Cómo funciona?
 *   1. Al iniciar, detecta el idioma del dispositivo o carga el idioma guardado.
 *   2. Provee la función t('clave') que devuelve el texto en el idioma activo.
 *   3. Al cambiar idioma, lo guarda en AsyncStorage para que persista.
 *
 * Cómo usarlo en cualquier componente:
 *   const { t, locale, setLocale } = useTranslation();
 *   <Text>{t('options.title')}</Text>   → "Opciones" o "Options"
 *
 * Los textos se definen en constants/translations.ts
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Locale, translations } from '../constants/translations';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que expone el contexto a los componentes */
interface LanguageContextType {
  locale: Locale;                        // Idioma actual: 'es' o 'en'
  setLocale: (locale: Locale) => Promise<void>; // Función para cambiar de idioma
  t: (path: string) => string;           // Función de traducción con clave punteada
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTO
// Valor por defecto: español, función t que devuelve la clave si no encuentra traducción
// ─────────────────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextType>({
  locale: 'es',
  setLocale: async () => {},
  t: (path: string) => path, // Fallback: devuelve la clave directamente
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDOR: LanguageProvider
// Envuelve toda la app en _layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────
export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('es');

  // ── Cargar idioma guardado al iniciar ────────────────────────────────────
  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem('app_locale');
        if (savedLocale !== null) {
          // El usuario ya eligió un idioma → usar ese
          setLocaleState(savedLocale as Locale);
        } else {
          // Primera vez → detectar idioma del dispositivo
          const deviceLocale = Localization.getLocales()[0].languageCode;
          // Solo cambiar si el idioma del dispositivo está soportado
          if (deviceLocale === 'en' || deviceLocale === 'es') {
            setLocaleState(deviceLocale as Locale);
          }
          // Si el dispositivo tiene otro idioma (p. ej. francés), queda en español
        }
      } catch (error) {
        console.error("Failed to load locale", error);
      }
    };
    loadLocale();
  }, []);

  // ── Función para cambiar el idioma ──────────────────────────────────────
  // Se llama desde la pantalla de opciones cuando el usuario toca un idioma.
  const setLocale = async (newLocale: Locale) => {
    try {
      setLocaleState(newLocale);
      // Guardar preferencia para que persista al cerrar la app
      await AsyncStorage.setItem('app_locale', newLocale);
    } catch (error) {
      console.error("Failed to save locale", error);
    }
  };

  // ── Función de traducción: t(path) ───────────────────────────────────────
  // Navega por el objeto de traducciones usando "notación punteada".
  //
  // Ejemplo: t('options.title')
  //   → busca translations['es']['options']['title']
  //   → retorna 'Opciones'
  //
  // Si la clave no existe, devuelve la clave misma como fallback.
  const t = (path: string): string => {
    const keys = path.split('.'); // ['options', 'title']
    let result: any = translations[locale];

    for (const key of keys) {
      if (result && result[key]) {
        result = result[key]; // Navegar al siguiente nivel
      } else {
        return path; // Clave no encontrada → devolver la ruta como texto
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

/**
 * Hook: useTranslation()
 *
 * La forma de acceder al sistema de idiomas desde cualquier componente.
 *
 * Ejemplo:
 *   const { t } = useTranslation();
 *   <Text>{t('drawer.home')}</Text>  → "Inicio" o "Home"
 */
export const useTranslation = () => useContext(LanguageContext);
