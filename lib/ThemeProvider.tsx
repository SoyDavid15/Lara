import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: Colors;
}

interface Colors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  danger: string;
  inputBackground: string;
}

const lightColors: Colors = {
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  primary: '#4CAF50',
  danger: '#ff4444',
  inputBackground: '#FFFFFF',
};

const darkColors: Colors = {
  background: '#000000',
  card: '#111111',
  text: '#FFFFFF',
  textSecondary: '#888888',
  border: '#333333',
  primary: '#4CAF50',
  danger: '#ff4444',
  inputBackground: '#1A1A1A',
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceTheme = useDeviceColorScheme();
  const [isDark, setIsDark] = useState(true); // Default to dark as requested previously

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          setIsDark(deviceTheme === 'dark');
        }
      } catch (error) {
        console.error("Failed to load theme preference", error);
      }
    };
    loadTheme();
  }, [deviceTheme]);

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('app_theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error("Failed to save theme preference", error);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
