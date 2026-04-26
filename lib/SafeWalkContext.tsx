/**
 * SafeWalkContext.tsx
 * 
 * Este archivo es el CEREBRO del sistema "Camina Seguro".
 * 
 * ACTUALIZACIÓN: Ahora incluye soporte para TaskManager, lo que permite
 * que el rastreo continúe incluso si la app se minimiza o se cierra.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE TAREAS EN SEGUNDO PLANO
// ─────────────────────────────────────────────────────────────────────────────
const LOCATION_TASK_NAME = 'LARA_BACKGROUND_LOCATION';
const LAST_FB_LOCATION_KEY = 'safewalk_fb_location';

export type WalkState = 'IDLE' | 'TRACKING' | 'WARNING' | 'ALERT';

// ─────────────────────────────────────────────────────────────────────────────
// DEFINICIÓN DE LA TAREA (Fuera del componente)
// Esta función se ejecuta por el sistema operativo incluso si la app está cerrada.
// ─────────────────────────────────────────────────────────────────────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[SafeWalk Task] Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const loc = locations[0];
    if (!loc) return;

    const { latitude, longitude } = loc.coords;
    const user = auth.currentUser;

    if (user) {
      try {
        const prevStr = await AsyncStorage.getItem(LAST_FB_LOCATION_KEY);
        let shouldUpdate = !prevStr;

        if (prevStr) {
          const prev = JSON.parse(prevStr);
          const dist = getDistanceMeters(prev.lat, prev.lon, latitude, longitude);
          shouldUpdate = dist >= 50; // Actualizar Firebase cada 50 metros
        }

        if (shouldUpdate) {
          await setDoc(doc(db, 'users', user.uid), {
            location: {
              latitude,
              longitude,
              lastUpdated: serverTimestamp(),
            },
            walkState: 'TRACKING', // Si hay movimiento en segundo plano, asumimos tracking
            isSafeWalkActive: true
          }, { merge: true });

          await AsyncStorage.setItem(LAST_FB_LOCATION_KEY, JSON.stringify({ lat: latitude, lon: longitude }));
          console.log('[SafeWalk Task] Location synced in background');
        }
      } catch (err) {
        console.error('[SafeWalk Task] Firestore sync error:', err);
      }
    }
  }
});

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface SafeWalkContextType {
  location: { latitude: number; longitude: number } | null;
  walkState: WalkState;
  isTracking: boolean;
  isInactive: boolean;
  setWalkState: (state: WalkState) => void;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  confirmSafe: () => void;
}

const SafeWalkContext = createContext<SafeWalkContextType | undefined>(undefined);

export function SafeWalkProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [walkState, setWalkState] = useState<WalkState>('IDLE');
  const [isTracking, setIsTracking] = useState(false);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const walkStateRef = useRef<WalkState>('IDLE');
  const anchorLocRef = useRef<{ lat: number; lon: number } | null>(null);
  const anchorTimeRef = useRef<number>(Date.now());
  const warningTimeRef = useRef<number>(Date.now());

  walkStateRef.current = walkState;

  const syncWalkState = useCallback(async (newState: WalkState) => {
    setWalkState(newState);
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          walkState: newState,
          isSafeWalkActive: newState !== 'IDLE'
        }, { merge: true });
      } catch (err) {
        console.error('[SafeWalk] Firestore sync error:', err);
      }
    }
  }, []);

  const stopTracking = useCallback(async () => {
    // 1. Detener escucha en primer plano
    locationSubRef.current?.remove();
    locationSubRef.current = null;

    // 2. Detener tarea en segundo plano
    const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    anchorLocRef.current = null;
    setIsTracking(false);
    syncWalkState('IDLE');
    setLocation(null);

    console.log('[SafeWalk] Background tracking stopped.');
  }, [syncWalkState]);

  const startTracking = useCallback(async () => {
    // Permisos de primer plano
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert('Permiso denegado', 'Lara necesita ubicación para protegerte.');
      return;
    }

    // Permisos de SEGUNDO PLANO (Esencial para TaskManager)
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      Alert.alert(
        'Ubicación en segundo plano necesaria',
        'Para que Lara te proteja incluso con el celular bloqueado, selecciona \"Permitir todo el tiempo\" en los ajustes de ubicación.',
        [
          { text: 'Ir a Ajustes', onPress: () => Linking.openSettings() },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    anchorLocRef.current = null;
    anchorTimeRef.current = Date.now();
    warningTimeRef.current = Date.now();
    await AsyncStorage.removeItem(LAST_FB_LOCATION_KEY);

    setIsTracking(true);
    syncWalkState('TRACKING');

    // ── Iniciar rastreo en SEGUNDO PLANO (TaskManager) ──
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 10,
      // En Android esto muestra una notificación persistente necesaria para el servicio foreground
      foregroundService: {
        notificationTitle: "Lara está cuidando tu camino",
        notificationBody: "Tu ubicación se comparte con tus amigos por seguridad.",
        notificationColor: "#FF3B30",
      },
    });

    // ── Iniciar escucha en PRIMER PLANO (para actualizar la UI rápido) ──
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });

        const state = walkStateRef.current;
        if (!anchorLocRef.current) {
          anchorLocRef.current = { lat: latitude, lon: longitude };
          anchorTimeRef.current = Date.now();
        } else {
          const dist = getDistanceMeters(anchorLocRef.current.lat, anchorLocRef.current.lon, latitude, longitude);
          if (dist > 5) {
            anchorLocRef.current = { lat: latitude, lon: longitude };
            anchorTimeRef.current = Date.now();
            if (state === 'WARNING') syncWalkState('TRACKING');
          }
        }
      }
    );

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const state = walkStateRef.current;
      if (state === 'TRACKING' && now - anchorTimeRef.current >= 60000) {
        syncWalkState('WARNING');
        warningTimeRef.current = now;
      } else if (state === 'WARNING' && now - warningTimeRef.current >= 60000) {
        syncWalkState('ALERT');
      }
    }, 5000);

    console.log('[SafeWalk] Background tracking started.');
  }, [syncWalkState]);

  const confirmSafe = useCallback(() => {
    anchorTimeRef.current = Date.now();
    warningTimeRef.current = Date.now();
    if (location) anchorLocRef.current = { lat: location.latitude, lon: location.longitude };
    syncWalkState('TRACKING');
  }, [location, syncWalkState]);

  useEffect(() => {
    // Intentar obtener la ubicación inicial incluso si no se está rastreando activamente
    const getInitialLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (err) {
        console.log('[SafeWalk] Could not get initial location:', err);
      }
    };
    getInitialLocation();

    return () => {
      locationSubRef.current?.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isInactive = walkState === 'WARNING' || walkState === 'ALERT';

  return (
    <SafeWalkContext.Provider value={{
      location, walkState, isTracking, isInactive, setWalkState, startTracking, stopTracking, confirmSafe
    }}>
      {children}
    </SafeWalkContext.Provider>
  );
}

export function useSafeWalk() {
  const context = useContext(SafeWalkContext);
  if (context === undefined) throw new Error('useSafeWalk must be used within a SafeWalkProvider');
  return context;
}
