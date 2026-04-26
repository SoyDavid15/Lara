/**
 * _layout.tsx — Diseño raíz de la aplicación
 *
 * Este es el archivo MÁS IMPORTANTE de la app. Es el punto de entrada
 * que Expo Router carga primero. Define:
 *
 *   1. Los PROVEEDORES globales (idioma, tema, SafeWalk) que envuelven toda la app.
 *   2. El FLUJO DE AUTENTICACIÓN: si no hay sesión → Login/Registro,
 *      si hay sesión → Drawer con las pantallas principales.
 *   3. El MENÚ LATERAL (drawer) con los 4 destinos de navegación.
 *
 * Jerarquía de proveedores (de afuera hacia adentro):
 *   LanguageProvider → ThemeProvider → SafeWalkProvider → RootLayoutContent
 *
 * Orden importante: SafeWalkProvider debe estar dentro de ThemeProvider
 * porque no usa colores, pero ThemeProvider debe estar dentro de LanguageProvider
 * porque el drawer usa t() y colors simultáneamente.
 */

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
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import FriendEmergencyModal from '@/components/common/FriendEmergencyModal';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: FriendSafetyWatcher
// Este componente escucha en segundo plano el estado de los amigos del usuario.
// Si algún amigo entra en estado 'ALERT', muestra el modal de emergencia.
// ─────────────────────────────────────────────────────────────────────────────
const FriendSafetyWatcher = () => {
  const { t } = useTranslation();
  const [emergencyFriend, setEmergencyFriend] = useState<{uid: string, name: string} | null>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeStatus: (() => void) | null = null;

    // 1. Escuchar la lista de amigos
    const friendsQuery = query(collection(db, 'users', currentUser.uid, 'friends'));
    
    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      // Limpiar el escucha anterior de estados si existe
      if (unsubscribeStatus) unsubscribeStatus();

      const friendUids = snapshot.docs.map(doc => doc.id);
      if (friendUids.length === 0) return;

      // 2. Escuchar el estado de emergencia de esos amigos
      const statusQuery = query(
        collection(db, 'users'),
        where('walkState', '==', 'ALERT'),
        where('uid', 'in', friendUids.slice(0, 30))
      );

      unsubscribeStatus = onSnapshot(statusQuery, (statusSnapshot) => {
        if (!statusSnapshot.empty) {
          const firstEmergency = statusSnapshot.docs[0];
          setEmergencyFriend({
            uid: firstEmergency.id,
            name: firstEmergency.data().fullName || t('common.loading')
          });
        } else {
          setEmergencyFriend(null);
        }
      });
    });

    return () => {
      unsubscribeFriends();
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, [currentUser]);

  return (
    <FriendEmergencyModal
      isVisible={!!emergencyFriend}
      friendName={emergencyFriend?.name || ''}
      friendUid={emergencyFriend?.uid || ''}
      onClose={() => setEmergencyFriend(null)}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL DRAWER (menú lateral)
// withLayoutContext conecta el navigator de React Navigation con Expo Router,
// permitiendo usar <Drawer.Screen> directamente en los archivos del router.
// ─────────────────────────────────────────────────────────────────────────────
const { Navigator } = createDrawerNavigator();
export const Drawer = withLayoutContext(Navigator);


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: CustomDrawerContent
// Renderiza el contenido personalizado del menú lateral.
// Reemplaza el drawer por defecto de React Navigation con nuestro diseño.
//
// Cada item navega a una pantalla usando router.push() y luego cierra el drawer.
// ─────────────────────────────────────────────────────────────────────────────
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getDrawerStyles(colors), [colors]);

  return (
    <DrawerContentScrollView
      {...props}
      scrollEnabled={false}
      contentContainerStyle={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={styles.drawerContainer}>

        {/* ── Inicio → Feed de noticias ─────────────────────────────── */}
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

        {/* ── Usuario → Perfil del usuario ─────────────────────────── */}
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

        {/* ── Camina Seguro → Rastreo de ubicación ─────────────────── */}
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

        {/* ── Opciones → Configuración de la app ───────────────────── */}
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


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: SplashView
// Pantalla de carga que se muestra mientras Firebase verifica si hay sesión.
// Se ve solo por unos instantes al abrir la app.
// ─────────────────────────────────────────────────────────────────────────────
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


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: RootLayoutContent
// El núcleo de la lógica de la app.
// Decide qué mostrar según el estado de autenticación del usuario.
//
// Estados posibles:
//   initializing = true → mostrar SplashView (Firebase aún carga)
//   user = null         → mostrar Login o Register
//   user != null        → mostrar el Drawer con todas las pantallas
// ─────────────────────────────────────────────────────────────────────────────
function RootLayoutContent() {
  const { isDark, colors } = useAppTheme();
  const { t } = useTranslation();

  // Estado del usuario autenticado (null si no hay sesión)
  const [user, setUser] = useState<User | null>(null);

  // true mientras Firebase determina si hay sesión guardada
  const [initializing, setInitializing] = useState(true);

  // Controla si mostrar Login (false) o Register (true)
  const [showRegister, setShowRegister] = useState(false);

  // ── Escuchar cambios de autenticación ────────────────────────────────────
  // onAuthStateChanged se dispara:
  //   - Al iniciar la app (detecta si había sesión guardada)
  //   - Al hacer login (user pasa de null al objeto del usuario)
  //   - Al hacer logout (user pasa del objeto a null)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false); // Ya tenemos respuesta, dejar de mostrar splash
    });

    return unsubscribe; // Limpiar el listener al desmontar
  }, []);

  // Mientras Firebase determina si hay sesión, mostrar pantalla de carga
  if (initializing) return <SplashView />;

  return (
    <>
      {user && <FriendSafetyWatcher />}
      
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
            <Drawer.Screen name="(tabs)"      options={{ title: 'Lara' }} />
            <Drawer.Screen name="user"        options={{ title: t('drawer.user') }} />
            <Drawer.Screen name="safeWalk"    options={{ title: t('drawer.safewalk') }} />
            <Drawer.Screen name="options"     options={{ title: t('drawer.options') }} />
            <Drawer.Screen name="friends"     options={{ title: t('friends.title'), drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="notifications" options={{ title: t('friends.requests'), drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="friendProfile" options={{ title: t('friendProfile.title'), drawerItemStyle: { display: 'none' } }} />
          </Drawer>
        )}

        <StatusBar style={isDark ? "light" : "dark"} />
      </NavigationThemeProvider>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: RootLayout
// Exportado por defecto. Expo Router lo llama automáticamente.
// ─────────────────────────────────────────────────────────────────────────────
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


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

function getDrawerStyles(colors: any) {
  return StyleSheet.create({
  // Contenedor del menú lateral con padding superior para dejar espacio al notch
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: verticalScale(80),
    paddingHorizontal: scale(20),
  },
  // Cada fila del menú (icono + texto)
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
}

function getSplashStyles(colors: any) {
  return StyleSheet.create({
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
}
