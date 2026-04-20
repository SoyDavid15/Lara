import { withLayoutContext } from 'expo-router';
import React from 'react';
import { StyleSheet, Platform, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useAppTheme } from '@/lib/ThemeProvider';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarIndicatorStyle: { display: 'none' },
        tabBarPressColor: 'transparent',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarContentContainerStyle: styles.tabBarContent,
      }}>
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'FEED',
          tabBarLabel: 'FEED',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="newspaper-outline" size={ms(24)} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="mapa"
        options={{
          title: 'MAPA',
          tabBarLabel: 'MAPA',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="map-outline" size={ms(24)} color={color} />
          ),
        }}
      />
    </MaterialTopTabs>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: verticalScale(25),
    left: scale(20),
    right: scale(20),
    backgroundColor: isDark ? '#000000' : '#ffffff',
    borderRadius: ms(20),
    height: verticalScale(75),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 5,
    shadowColor: isDark ? '#000' : '#888',
    shadowOffset: { width: 0, height: verticalScale(10) },
    shadowOpacity: 0.3,
    shadowRadius: ms(10),
    overflow: 'hidden',
  },
  tabBarContent: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarLabel: {
    fontSize: fs(10),
    fontWeight: 'bold',
    letterSpacing: scale(1),
    textTransform: 'uppercase',
  },
});
