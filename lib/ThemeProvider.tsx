/**
 * ThemeProvider.tsx
 *
 * Sistema de temas (claro/oscuro) de la app LARA.
 *
 * ¿Qué hace?
 *   - Provee los colores del tema actual a todos los componentes de la app.
 *   - Permite cambiar entre modo claro y oscuro con toggleTheme().
 *   - Guarda la preferencia del usuario en AsyncStorage para que persista
 *     aunque se cierre la app.
 *   - En el primer uso, detecta automáticamente el tema del dispositivo.
 *
 * Cómo usarlo en cualquier componente:
 *   const { colors, isDark, toggleTheme } = useAppTheme();
 *   // colors.text, colors.background, colors.primary, etc.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que expone el contexto a los componentes */
interface ThemeContextType {
  isDark: boolean;        // true si está en modo oscuro
  toggleTheme: () => void; // función para cambiar entre claro/oscuro
  colors: Colors;         // objeto con todos los colores del tema actual
}

/** Paleta de colores de la app. Todos los componentes deben usar estos colores. */
interface Colors {
  background: string;     // Color de fondo principal de pantallas
  card: string;           // Color de fondo de tarjetas y superficies elevadas
  text: string;           // Color de texto principal
  textSecondary: string;  // Color de texto secundario / subtítulos / placeholders
  border: string;         // Color de bordes y separadores
  primary: string;        // Color de acento principal (verde LARA)
  danger: string;         // Color para acciones destructivas (eliminar, error)
  inputBackground: string; // Color de fondo de campos de texto
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETAS DE COLORES
// Para cambiar los colores de la app, edita estos objetos.
// ─────────────────────────────────────────────────────────────────────────────

/** Colores para el modo claro */
const lightColors: Colors = {
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  primary: '#4CAF50',    // Verde LARA
  danger: '#ff4444',
  inputBackground: '#FFFFFF',
};

/** Colores para el modo oscuro */
const darkColors: Colors = {
  background: '#000000',
  card: '#111111',
  text: '#FFFFFF',
  textSecondary: '#888888',
  border: '#333333',
  primary: '#4CAF50',    // Verde LARA (igual en ambos temas)
  danger: '#ff4444',
  inputBackground: '#1A1A1A',
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTO
// Valor por defecto: modo oscuro (como fue definido en el proyecto)
// ─────────────────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors,
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDOR: ThemeProvider
// Envuelve toda la app en _layout.tsx.
// Se encarga de cargar, guardar y proveer el tema actual.
// ─────────────────────────────────────────────────────────────────────────────
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Tema del sistema operativo del dispositivo (claro/oscuro)
  const deviceTheme = useDeviceColorScheme();

  // Estado interno del tema. Por defecto oscuro.
  const [isDark, setIsDark] = useState(true);

  // ── Cargar tema guardado al iniciar la app ───────────────────────────────
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme');
        if (savedTheme !== null) {
          // El usuario ya eligió un tema anteriormente → usar ese
          setIsDark(savedTheme === 'dark');
        } else {
          // Primera vez que abre la app → usar el tema del dispositivo
          setIsDark(deviceTheme === 'dark');
        }
      } catch (error) {
        console.error("Failed to load theme preference", error);
      }
    };
    loadTheme();
  }, [deviceTheme]);

  // ── Función para cambiar el tema ─────────────────────────────────────────
  // Se llama desde la pantalla de opciones con el Switch de modo oscuro.
  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      // Guardar la preferencia para que persista al cerrar la app
      await AsyncStorage.setItem('app_theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error("Failed to save theme preference", error);
    }
  };

  // Seleccionar la paleta correcta según el estado
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook: useAppTheme()
 *
 * La forma de acceder al tema desde cualquier componente.
 *
 * Ejemplo de uso:
 *   const { colors, isDark, toggleTheme } = useAppTheme();
 *   <View style={{ backgroundColor: colors.background }}>
 *     <Text style={{ color: colors.text }}>Hola</Text>
 *   </View>
 */
export const useAppTheme = () => useContext(ThemeContext);
