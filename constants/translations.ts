/**
 * translations.ts
 *
 * Diccionario de textos de la app LARA en todos los idiomas soportados.
 *
 * ¿Cómo agregar un nuevo texto?
 *   1. Agrégalo en el objeto 'es' con la clave que quieras.
 *   2. Agrégalo también en 'en' con la traducción al inglés.
 *   3. Úsalo en cualquier componente con: t('seccion.clave')
 *
 * ¿Cómo agregar un nuevo idioma?
 *   1. Agrega su código al tipo Locale (ej: 'fr' para francés).
 *   2. Copia la estructura de 'es' y traduce todos los valores.
 *   3. Actualiza el selector de idioma en options.tsx.
 */

// Tipo que define los códigos de idioma válidos
export type Locale = 'es' | 'en';

// ─────────────────────────────────────────────────────────────────────────────
// OBJETO DE TRADUCCIONES
// Estructura: translations[idioma][sección][clave] = 'texto'
// ─────────────────────────────────────────────────────────────────────────────
export const translations = {
  // ── ESPAÑOL ───────────────────────────────────────────────────────────────
  es: {
    options: {
      title: 'Opciones',
      appSection: 'Aplicación',
      darkMode: 'Modo oscuro',
      language: 'Idioma',
      version: 'Versión',
      accountSection: 'Cuenta',
      logout: 'Cerrar sesión',
      deleteAccount: 'Eliminar cuenta',
      selectLanguage: 'Seleccionar Idioma',
      spanish: 'Español',
      english: 'Inglés',
      logoutError: 'No se pudo cerrar la sesión.',
      securityError: 'Error de seguridad',
      reloginRequired: 'Para eliminar tu cuenta, debes haber iniciado sesión recientemente. Por favor, cierra sesión e inicia sesión de nuevo antes de intentarlo.',
      deleteError: 'No se pudo eliminar la cuenta.',
      deleteConfirmation: '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es permanente.',
    },
    common: {
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      error: 'Error',
      success: 'Éxito',
      status: 'Estado',
      verified: 'Verificada ✅',
      unverified: 'No verificada ⚠️',
      reportedAt: 'Reportado a las',
    },
    // Textos del menú lateral (drawer)
    drawer: {
        home: 'Inicio',
        user: 'Usuario',
        safewalk: 'Camina seguro',
        options: 'Opciones'
    }
  },

  // ── INGLÉS ────────────────────────────────────────────────────────────────
  en: {
    options: {
      title: 'Options',
      appSection: 'Application',
      darkMode: 'Dark Mode',
      language: 'Language',
      version: 'Version',
      accountSection: 'Account',
      logout: 'Log out',
      deleteAccount: 'Delete account',
      selectLanguage: 'Select Language',
      spanish: 'Spanish',
      english: 'English',
      logoutError: 'Failed to log out.',
      securityError: 'Security Error',
      reloginRequired: 'To delete your account, you must have logged in recently. Please log out and log in again before trying again.',
      deleteError: 'Failed to delete the account.',
      deleteConfirmation: 'Are you sure you want to delete your account? This action is permanent.',
    },
    common: {
      cancel: 'Cancel',
      confirm: 'Confirm',
      error: 'Error',
      success: 'Success',
      status: 'Status',
      verified: 'Verified ✅',
      unverified: 'Not verified ⚠️',
      reportedAt: 'Reported at',
    },
    drawer: {
        home: 'Home',
        user: 'User',
        safewalk: 'Safe Walk',
        options: 'Options'
    }
  },
};

/** Tipo inferido de la estructura de traducciones en español (usado para type-safety) */
export type TranslationKeys = typeof translations.es;
