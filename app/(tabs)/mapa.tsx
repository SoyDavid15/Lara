import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/ThemeProvider';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { ms, fs, scale, verticalScale } from '@/lib/responsive';

export default function MapaScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
   const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuButton}
        >
          <Ionicons name="menu-outline" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mapa de Alertas</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Coming Soon Message */}
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1A1A1A' : '#e0e0e0' }]}>
          <Ionicons
            name="map-outline"
            size={ms(80)}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Próximamente</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          El mapa de alertas estará disponible próximamente.
          Podrás ver reportes cercanos y navegar por ellos.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(10),
      paddingBottom: verticalScale(20),
    },
    headerTitle: {
      fontSize: fs(20),
      fontWeight: '800',
      color: colors.text,
      letterSpacing: scale(-0.5),
    },
    menuButton: {
      padding: ms(5),
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: scale(40),
    },
    iconContainer: {
      width: ms(160),
      height: ms(160),
      borderRadius: ms(80),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(40),
    },
    title: {
      fontSize: fs(32),
      fontWeight: '900',
      marginBottom: verticalScale(20),
      textAlign: 'center',
    },
    description: {
      fontSize: fs(16),
      textAlign: 'center',
      lineHeight: fs(24),
      paddingHorizontal: scale(20),
    },
  });
