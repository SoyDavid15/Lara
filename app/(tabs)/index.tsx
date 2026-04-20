import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import News from '../../components/screens/news';
import { useAppTheme } from '../../lib/ThemeProvider';

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.App}>
      <News />
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  App: {
    flex: 1,
    backgroundColor: colors.background,
  },

  news: {
    flex: 1,
  },
});