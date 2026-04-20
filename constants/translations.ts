export type Locale = 'es' | 'en';

export const translations = {
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
    drawer: {
        home: 'Inicio',
        user: 'Usuario',
        safewalk: 'Camina seguro',
        options: 'Opciones'
    }
  },
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

export type TranslationKeys = typeof translations.es;
