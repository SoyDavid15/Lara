/**
 * index.tsx — Pantalla de Inicio (tab principal)
 *
 * Esta es la pantalla que aparece cuando el usuario abre la app.
 * Es el "Inicio" del menú lateral.
 *
 * ¿Qué hace?
 *   Es un contenedor simple que renderiza el componente <News />,
 *   que contiene toda la lógica del feed de publicaciones.
 *
 * ¿Por qué está separado?
 *   Esta pantalla pertenece al sistema de pestañas (tabs) de Expo Router.
 *   El componente News es reutilizable e independiente.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import News from '../../components/screens/news';
import { useAppTheme } from '../../lib/ThemeProvider';

export default function HomeScreen() {
  // Colores del tema activo (claro/oscuro)
  const { colors, isDark } = useAppTheme();

  // useMemo → recalcula los estilos solo cuando cambia el tema (optimización de renders)
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    // Contenedor que ocupa toda la pantalla con el color de fondo del tema
    <View style={styles.App}>
      {/* El componente News contiene todo: el feed, el botón de nuevo post, etc. */}
      <News />
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  // Contenedor raíz de pantalla completa
  App: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Estilo reservado para referencia (actualmente News ocupa todo el espacio)
  news: {
    flex: 1,
  },
});