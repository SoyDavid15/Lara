import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms, fs } from '@/lib/responsive';

interface MapComponentProps {
  location: { latitude: number; longitude: number };
  isEmergency?: boolean;
  colors: any;
  isDark: boolean;
  t: (key: string) => string;
}

const MapComponent = ({ colors, isDark, t }: MapComponentProps) => {
  return (
    <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#111' : '#EEE' }]}>
      <Ionicons name="map-outline" size={ms(40)} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
        Mapa disponible en la app móvil
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    height: 150,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapComponent;
