import Login from '@/components/screens/login';
import Register from '@/components/screens/register';
import { auth } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView
} from '@react-navigation/drawer';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { router, withLayoutContext } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';
import { ThemeProvider, useAppTheme } from '@/lib/ThemeProvider';
import { LanguageProvider, useTranslation } from '@/lib/LanguageContext';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';
import { SafeWalkProvider } from '@/lib/SafeWalkContext';

const { Navigator } = createDrawerNavigator();

export const Drawer = withLayoutContext(Navigator);

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getDrawerStyles(colors), [colors]);

  return (
    <DrawerContentScrollView {...props} scrollEnabled={false} contentContainerStyle={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.drawerContainer}>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/(tabs)');
          }}
        >
          <Ionicons name="home-outline" size={ms(24)} color={colors.text} />
          <Text style={styles.drawerText}>{t('drawer.home')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/user');
          }}
        >
          <Ionicons name="person-outline" size={ms(24)} color={colors.text} />
          <Text style={styles.drawerText}>{t('drawer.user')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/safeWalk');
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={ms(24)} color={colors.text} />
          <Text style={styles.drawerText}>{t('drawer.safewalk')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/options');
          }}
        >
          <Ionicons name="settings-outline" size={ms(24)} color={colors.text} />
          <Text style={styles.drawerText}>{t('drawer.options')}</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const SplashView = () => {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getSplashStyles(colors), [colors]);
  return (
    <View style={styles.splashContainer}>
      <Text style={styles.splashLogo}>LARA</Text>
      <ActivityIndicator size="small" color={isDark ? "#444" : "#ccc"} style={{ marginTop: 20 }} />
    </View>
  );
};

function RootLayoutContent() {
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return <SplashView />;

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      {!user ? (
        showRegister ? (
          <Register onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <Login onSwitchToRegister={() => setShowRegister(true)} />
        )
      ) : (
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerShown: false,
            drawerStyle: {
              backgroundColor: colors.background,
              width: scale(280),
            },
            drawerType: 'front',
          }}
        >
          <Drawer.Screen name="(tabs)" options={{ title: 'Lara' }} />
          <Drawer.Screen name="user" options={{ title: t('drawer.user') }} />
          <Drawer.Screen name="safeWalk" options={{ title: t('drawer.safewalk') }} />
          <Drawer.Screen name="options" options={{ title: t('drawer.options') }} />
        </Drawer>
      )}
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <SafeWalkProvider>
          <RootLayoutContent />
        </SafeWalkProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

const getDrawerStyles = (colors: any) => StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: verticalScale(80),
    paddingHorizontal: scale(20),
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(30),
    paddingVertical: verticalScale(10),
  },
  drawerText: {
    color: colors.text,
    fontSize: fs(18),
    marginLeft: scale(15),
    fontWeight: '500',
  },
});

const getSplashStyles = (colors: any) => StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    color: colors.text,
    fontSize: fs(60),
    fontWeight: '900',
    letterSpacing: scale(-2),
  }
});
