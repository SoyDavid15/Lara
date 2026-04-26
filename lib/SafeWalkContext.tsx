/**
 * SafeWalkContext.tsx
 * 
 * Este archivo es el CEREBRO del sistema "Camina Seguro".
 * 
 * ¿Qué hace?
 *   - Maneja toda la lógica de rastreo de ubicación en tiempo real.
 *   - Detecta inactividad (si la persona deja de moverse) y lanza alertas.
 *   - Actualiza la ubicación del usuario en Firebase cada 50 metros.
 *   - Persiste el rastreo aunque el usuario navegue a otra pantalla,
 *     porque este contexto vive en el nivel más alto de la app (_layout.tsx)
 *     y nunca se desmonta mientras la app esté abierta.
 * 
 * Flujo de estados del SafeWalk:
 *   IDLE → El rastreo está desactivado (estado por defecto)
 *   TRACKING → Rastreo activo, la persona se está moviendo normalmente
 *   WARNING → La persona lleva +1 min sin moverse → se muestra alerta
 *   ALERT → La persona no contestó la alerta de WARNING → emergencia
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// TIPO: WalkState
// Define los posibles estados del sistema de rastreo.
// Solo puede ser uno de estos cuatro valores a la vez.
// ─────────────────────────────────────────────────────────────────────────────
export type WalkState = 'IDLE' | 'TRACKING' | 'WARNING' | 'ALERT';


// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN AUXILIAR: getDistanceMeters
// Calcula la distancia en metros entre dos coordenadas GPS usando
// la fórmula de Haversine (adaptada para la curvatura de la Tierra).
//
// Parámetros:
//   lat1, lon1 → Coordenadas del punto A (posición anterior)
//   lat2, lon2 → Coordenadas del punto B (posición actual)
//
// Retorna: distancia en metros (número decimal)
// ─────────────────────────────────────────────────────────────────────────────
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// ─────────────────────────────────────────────────────────────────────────────
// CLAVE DE ALMACENAMIENTO LOCAL
// AsyncStorage guarda datos pequeños en el teléfono (como un mini-diccionario).
// Esta clave identifica dónde guardamos la última posición enviada a Firebase.
// ─────────────────────────────────────────────────────────────────────────────
const LAST_FB_LOCATION_KEY = 'safewalk_fb_location';


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE TIEMPO Y DISTANCIA
// Aquí puedes ajustar el comportamiento del sistema fácilmente.
//
// INACTIVITY_MS   → Cuánto tiempo (ms) sin moverse para pasar a WARNING
//                   Actualmente: 60.000 ms = 1 minuto
//
// WARNING_MS      → Cuánto tiempo (ms) en WARNING sin respuesta para pasar a ALERT
//                   Actualmente: 60.000 ms = 1 minuto
//
// MOVEMENT_THRESHOLD_M → Cuántos metros mínimos debe moverse para "resetear"
//                         el contador de inactividad. Actualmente: 5 metros.
//
// FIREBASE_THRESHOLD_M → Cuántos metros debe moverse para actualizar Firebase.
//                         Actualmente: 50 metros. (Evita actualizaciones excesivas)
// ─────────────────────────────────────────────────────────────────────────────
const INACTIVITY_MS        = 60_000; // 1 minuto → pasa a WARNING
const WARNING_MS           = 60_000; // 1 minuto en WARNING → pasa a ALERT
const MOVEMENT_THRESHOLD_M = 5;      // 5 metros mínimos para contar como "movimiento"
const FIREBASE_THRESHOLD_M = 50;     // 50 metros para actualizar Firebase


// ─────────────────────────────────────────────────────────────────────────────
// TIPO: SafeWalkContextType
// Define qué datos y funciones estarán disponibles en toda la app
// cuando se use el hook useSafeWalk().
// ─────────────────────────────────────────────────────────────────────────────
interface SafeWalkContextType {
  /** Última coordenada GPS conocida del usuario */
  location: { latitude: number; longitude: number } | null;

  /** Estado actual del rastreo: IDLE | TRACKING | WARNING | ALERT */
  walkState: WalkState;

  /** true si el rastreo está activo (el switch está encendido) */
  isTracking: boolean;

  /** true si el estado es WARNING o ALERT (la persona no se está moviendo) */
  isInactive: boolean;

  /** Función para cambiar el estado manualmente (uso interno avanzado) */
  setWalkState: (state: WalkState) => void;

  /** Función para iniciar el rastreo. Pide permisos si es necesario. */
  startTracking: () => Promise<void>;

  /** Función para detener el rastreo completamente. */
  stopTracking: () => void;

  /** Función que llama el usuario cuando confirma que está bien (en WARNING o ALERT) */
  confirmSafe: () => void;
}


// ─────────────────────────────────────────────────────────────────────────────
// CREACIÓN DEL CONTEXTO
// El Context es como una "variable global" de React.
// Todos los componentes hijos pueden leer y modificar estos datos
// sin necesidad de pasar props manualmente.
// ─────────────────────────────────────────────────────────────────────────────
const SafeWalkContext = createContext<SafeWalkContextType | undefined>(undefined);


// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDOR: SafeWalkProvider
// Este componente "envuelve" toda la app (en _layout.tsx).
// Contiene toda la lógica de rastreo y comparte sus datos con los hijos.
//
// Importante: Porque vive en el _layout.tsx (nivel raíz), NUNCA se desmonta
// mientras la app esté abierta, lo que permite que el rastreo continúe
// aunque el usuario cambie de pantalla o apague la pantalla.
// ─────────────────────────────────────────────────────────────────────────────
export function SafeWalkProvider({ children }: { children: React.ReactNode }) {

  // ── ESTADOS (disparan re-render cuando cambian) ──────────────────────────
  const [location, setLocation]     = useState<{ latitude: number; longitude: number } | null>(null);
  const [walkState, setWalkState]   = useState<WalkState>('IDLE');
  const [isTracking, setIsTracking] = useState(false);

  // ── REFS (NO disparan re-render, persisten entre renders) ────────────────
  // Los refs son ideales para valores que necesitan ser leídos dentro de
  // callbacks asíncronos como el watcher de ubicación, donde el estado
  // de React podría estar desactualizado (closure stale).

  /** Referencia a la suscripción de GPS. Se usa para poder cancelarla. */
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  /** Referencia al intervalo que revisa inactividad cada 5 segundos. */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Espejo del walkState como ref.
   * Necesario porque los callbacks del GPS usan closures y no pueden
   * leer el estado de React directamente (quedaría "congelado" en el
   * valor que tenía cuando se creó el callback).
   */
  const walkStateRef = useRef<WalkState>('IDLE');

  /**
   * "Ancla de posición": la última coordenada donde el usuario SE DETUVO
   * (o empezó). Se compara con la posición actual para medir si hubo
   * movimiento real de al menos MOVEMENT_THRESHOLD_M metros.
   */
  const anchorLocRef = useRef<{ lat: number; lon: number } | null>(null);

  /**
   * Timestamp (ms) de cuándo se estableció el último ancla.
   * Si Date.now() - anchorTimeRef.current >= INACTIVITY_MS → pasa a WARNING.
   */
  const anchorTimeRef = useRef<number>(Date.now());

  /**
   * Timestamp de cuándo se entró en estado WARNING.
   * Si Date.now() - warningTimeRef.current >= WARNING_MS → pasa a ALERT.
   */
  const warningTimeRef = useRef<number>(Date.now());

  // Mantenemos el ref siempre sincronizado con el estado de React
  walkStateRef.current = walkState;

  // ── FUNCIÓN: syncWalkState ─────────────────────────────────────────────
  // Actualiza el estado tanto en React como en Firestore.
  // ─────────────────────────────────────────────────────────────────────────
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


  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: stopTracking
  // Detiene completamente el rastreo:
  //   1. Cancela la suscripción al GPS
  //   2. Limpia el intervalo de inactividad
  //   3. Resetea todos los estados a su valor inicial
  //
  // useCallback evita que la función se recree en cada render.
  // ─────────────────────────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    // Cancelar la escucha de GPS
    locationSubRef.current?.remove();
    locationSubRef.current = null;

    // Limpiar el timer de inactividad
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Resetear variables de control
    anchorLocRef.current = null;

    // Actualizar estados de la UI
    setIsTracking(false);
    syncWalkState('IDLE');
    setLocation(null);

    console.log('[SafeWalk] Tracking stopped.');
  }, [syncWalkState]);


  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: startTracking
  // Inicia el rastreo en segundo plano:
  //   1. Pide permisos de ubicación al sistema
  //   2. Resetea los contadores de tiempo y ancla
  //   3. Inicia watchPositionAsync (escucha GPS en tiempo real)
  //   4. Inicia setInterval (revisa inactividad cada 5 seg)
  // ─────────────────────────────────────────────────────────────────────────
  const startTracking = useCallback(async () => {

    // ── Paso 1: Solicitar permisos de ubicación ──────────────────────────
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      // Si el usuario negó el permiso, mostrar alerta con opción de ir a ajustes
      Alert.alert(
        'Permiso de Ubicación Necesario',
        'Lara necesita tu ubicación para protegerte durante la caminata. Actívala en los ajustes.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
        ]
      );
      return; // No continuar si no hay permisos
    }

    // ── Paso 2: Resetear variables de control ────────────────────────────
    anchorLocRef.current  = null;          // Se establecerá con la primera lectura GPS
    anchorTimeRef.current = Date.now();    // El contador de inactividad arranca ahora
    warningTimeRef.current = Date.now();   // El contador del warning también
    await AsyncStorage.removeItem(LAST_FB_LOCATION_KEY); // Borrar última posición de Firebase

    // Actualizar estados de la UI
    setIsTracking(true);
    syncWalkState('TRACKING');

    // ── Paso 3: Iniciar escucha de GPS ───────────────────────────────────
    // watchPositionAsync llama al callback cada vez que hay una nueva
    // posición GPS disponible, según los parámetros configurados.
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation, // Máxima precisión GPS
        timeInterval: 5000,    // Mínimo de tiempo entre actualizaciones: 5 seg
        distanceInterval: 1,   // Mínimo de distancia entre actualizaciones: 1 metro
      },
      async (loc) => {
        // Este callback se ejecuta cada vez que hay una nueva posición GPS
        const { latitude, longitude } = loc.coords;

        // Actualizar el estado de ubicación para la UI
        setLocation({ latitude, longitude });

        const state = walkStateRef.current; // Leemos del ref (no del estado) para evitar closures obsoletos

        if (!anchorLocRef.current) {
          // ── Primera lectura: establecer el ancla inicial ──────────────
          anchorLocRef.current  = { lat: latitude, lon: longitude };
          anchorTimeRef.current = Date.now();
        } else {
          // ── Lecturas siguientes: comparar con el ancla ────────────────
          const dist = getDistanceMeters(
            anchorLocRef.current.lat, anchorLocRef.current.lon,
            latitude, longitude
          );

          if (dist > MOVEMENT_THRESHOLD_M) {
            // La persona se movió más de 5 metros → hay movimiento real
            // Mover el ancla a la posición actual y resetear el contador
            anchorLocRef.current  = { lat: latitude, lon: longitude };
            anchorTimeRef.current = Date.now();

            // Si estaba en WARNING, volver a TRACKING porque ya se movió
            if (state === 'WARNING') {
              syncWalkState('TRACKING');
            }
          }
          // Si dist <= 5m → no se considera movimiento, el contador sigue corriendo
        }

        // ── Actualizar Firebase cada 50 metros ────────────────────────────
        // Solo se actualiza si la persona se movió al menos 50m desde
        // la última actualización (para no sobrecargar la base de datos).
        const user = auth.currentUser;
        if (user) {
          try {
            const prevStr = await AsyncStorage.getItem(LAST_FB_LOCATION_KEY);
            let shouldUpdate = !prevStr; // Si no hay ubicación previa guardada, actualizar

            if (prevStr) {
              const prev = JSON.parse(prevStr);
              // Calcular distancia desde la última actualización a Firebase
              shouldUpdate = getDistanceMeters(prev.lat, prev.lon, latitude, longitude) >= FIREBASE_THRESHOLD_M;
            }

            if (shouldUpdate) {
              // Guardar en Firestore bajo el documento del usuario
              await setDoc(
                doc(db, 'users', user.uid),
                {
                  location: {
                    latitude,
                    longitude,
                    lastUpdated: serverTimestamp(), // Timestamp del servidor de Firebase
                  }
                },
                { merge: true } // No sobreescribir otros campos del documento
              );

              // Guardar localmente para comparar en la próxima actualización
              await AsyncStorage.setItem(
                LAST_FB_LOCATION_KEY,
                JSON.stringify({ lat: latitude, lon: longitude })
              );
            }
          } catch (err) {
            console.error('[SafeWalk] Firebase update error:', err);
          }
        }
      }
    );

    // ── Paso 4: Intervalo de inactividad ─────────────────────────────────
    // Cada 5 segundos revisa si la persona lleva demasiado tiempo sin moverse.
    intervalRef.current = setInterval(() => {
      const now   = Date.now();
      const state = walkStateRef.current; // Leer del ref para evitar closures obsoletos

      if (state === 'TRACKING') {
        // Verificar si lleva más de INACTIVITY_MS sin moverse
        if (now - anchorTimeRef.current >= INACTIVITY_MS) {
          syncWalkState('WARNING'); // ¡Alerta! Deja de moverse
          warningTimeRef.current = now; // Guardar cuándo empezó el WARNING
        }
      } else if (state === 'WARNING') {
        // Si ya está en WARNING, verificar si ya pasó demasiado tiempo sin respuesta
        if (now - warningTimeRef.current >= WARNING_MS) {
          syncWalkState('ALERT'); // Emergencia: no contestó el WARNING
        }
      }
      // En estado IDLE o ALERT no hacemos nada en el intervalo
    }, 5000); // Se ejecuta cada 5 segundos

    console.log('[SafeWalk] Tracking started.');
  }, []);


  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: confirmSafe
  // El usuario presiona "Estoy bien" cuando aparece el WARNING o ALERT.
  // Resetea todos los contadores y vuelve a estado TRACKING.
  // ─────────────────────────────────────────────────────────────────────────
  const confirmSafe = useCallback(() => {
    // Resetear los contadores de tiempo para dar un período nuevo limpio
    anchorTimeRef.current  = Date.now();
    warningTimeRef.current = Date.now();

    // Mover el ancla GPS a la posición actual (si la conocemos)
    if (location) {
      anchorLocRef.current = { lat: location.latitude, lon: location.longitude };
    }

    // Volver al estado normal de rastreo
    syncWalkState('TRACKING');
  }, [location, syncWalkState]);


  // ─────────────────────────────────────────────────────────────────────────
  // EFECTO DE LIMPIEZA
  // Se ejecuta SOLO cuando el provider se desmonta (es decir, cuando se
  // cierra la app completamente). Cancela el GPS y el interval para
  // no dejar recursos abiertos.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      locationSubRef.current?.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // [] → solo se ejecuta al montar/desmontar, nunca por cambios de estado


  // isInactive es true si la persona no se está moviendo (WARNING) o hay emergencia (ALERT)
  const isInactive = walkState === 'WARNING' || walkState === 'ALERT';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER DEL PROVIDER
  // Comparte todos los estados y funciones con los componentes hijos.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeWalkContext.Provider
      value={{
        location,          // Última posición GPS
        walkState,         // Estado actual: IDLE | TRACKING | WARNING | ALERT
        isTracking,        // true si el switch está encendido
        isInactive,        // true si hay alerta de inactividad
        setWalkState,      // Cambiar estado manualmente
        startTracking,     // Activar el rastreo
        stopTracking,      // Desactivar el rastreo
        confirmSafe,       // Confirmar "estoy bien"
      }}
    >
      {children}
    </SafeWalkContext.Provider>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useSafeWalk
// Este hook es la forma de acceder al contexto desde cualquier componente.
// Uso: const { walkState, startTracking } = useSafeWalk();
//
// Lanza un error si se usa fuera del SafeWalkProvider (protección).
// ─────────────────────────────────────────────────────────────────────────────
export function useSafeWalk() {
  const context = useContext(SafeWalkContext);
  if (context === undefined) {
    throw new Error('useSafeWalk must be used within a SafeWalkProvider');
  }
  return context;
}
