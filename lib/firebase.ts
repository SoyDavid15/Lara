/**
 * firebase.ts
 *
 * Archivo de configuración e inicialización de Firebase.
 *
 * Firebase es el backend de la app LARA. Provee:
 *   - Authentication → manejo de usuarios (login, registro, logout)
 *   - Firestore → base de datos NoSQL en tiempo real (posts, alertas, usuarios)
 *
 * Este archivo se importa en casi todos los demás archivos que necesiten
 * acceder al backend. Solo se inicializa UNA vez gracias a la comprobación
 * `getApps().length === 0`.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { Auth, initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL PROYECTO FIREBASE
// Estos valores son públicos y se obtienen desde la consola de Firebase:
// https://console.firebase.google.com → Tu proyecto → Configuración de la app
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCJMg9cxRiaM38sl44mm00N3uuIFPwlyQc",
  authDomain: "lara-58bb9.firebaseapp.com",
  projectId: "lara-58bb9",
  storageBucket: "lara-58bb9.firebasestorage.app",
  messagingSenderId: "163304458035",
  appId: "1:163304458035:android:1f40815b7bace994ed2046"
};

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN (con guard para Expo Hot Reload)
// En desarrollo, Expo recarga el código frecuentemente. Sin este guard,
// Firebase lanzaría un error de "app ya inicializada".
// - Si ya hay apps inicializadas → reutilizar la existente con getApp()
// - Si no hay ninguna → inicializar con initializeApp()
// ─────────────────────────────────────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─────────────────────────────────────────────────────────────────────────────
// initializeAuth con getReactNativePersistence(AsyncStorage) hace que la
// sesión del usuario persista aunque se cierre la app. Sin esto, el usuario
// tendría que hacer login cada vez que abre la app.
// En Web, usamos getAuth() que usa la persistencia por defecto del navegador.
//
// Uso en otros archivos:
//   import { auth } from '@/lib/firebase';
//   const user = auth.currentUser; // Obtiene el usuario logueado actualmente
// ─────────────────────────────────────────────────────────────────────────────
let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // Si la autenticación ya fue inicializada (común en Fast Refresh), usamos la existente
    auth = getAuth(app);
  }
}

export { auth };

// ─────────────────────────────────────────────────────────────────────────────
// BASE DE DATOS (db)
// Instancia de Firestore (base de datos NoSQL en tiempo real).
// Las colecciones principales del proyecto son:
//   - 'users'  → perfiles de usuario
//   - 'posts'  → publicaciones del feed (expiran en 24h)
//   - 'alerts' → alertas de incidentes (expiran en 3h)
//
// Uso en otros archivos:
//   import { db } from '@/lib/firebase';
//   const ref = doc(db, 'users', user.uid);
// ─────────────────────────────────────────────────────────────────────────────
export const db = getFirestore(app);

export default app;