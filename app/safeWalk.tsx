import { startLocationTracking, stopLocationTracking } from '@/lib/location-service';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/ThemeProvider';
import { useSafeWalk } from '@/lib/SafeWalkContext';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

const LOCATION_TASK_NAME = 'safewalk-location';

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export default function SafeWalkScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { walkState, setWalkState, setLocation, isInactive } = useSafeWalk();
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);

  const walkStateRef = useRef(walkState);
  walkStateRef.current = walkState;

  const anchorLocationRef = useRef<{lat: number, lon: number} | null>(null);
  const anchorTimeRef = useRef<number>(Date.now());
  const warningTimeRef = useRef<number>(Date.now());
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let intervalId: any;

    if (isTracking) {
      setWalkState('TRACKING');
      anchorTimeRef.current = Date.now();
      anchorLocationRef.current = null;
      
      (async () => {
        try {
          locationSubRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 1 },
            (loc) => {
              const { latitude, longitude } = loc.coords;
              setLocation({ latitude, longitude });
              if (!anchorLocationRef.current) {
                anchorLocationRef.current = { lat: latitude, lon: longitude };
                anchorTimeRef.current = Date.now();
              } else {
                const dist = getDistanceFromLatLonInMeters(
                  anchorLocationRef.current.lat, anchorLocationRef.current.lon,
                  latitude, longitude
                );
                if (dist > 5) {
                  anchorLocationRef.current = { lat: latitude, lon: longitude };
                  anchorTimeRef.current = Date.now();
                  if (walkStateRef.current === 'WARNING') {
                     setWalkState('TRACKING');
                  }
                }
              }
            }
          );
        } catch (err) {
          console.error('Error starting foreground tracking:', err);
        }
      })();

      intervalId = setInterval(() => {
        const now = Date.now();
        if (walkStateRef.current === 'TRACKING') {
          if (now - anchorTimeRef.current >= 60000) {
            setWalkState('WARNING');
            warningTimeRef.current = now;
          }
        } else if (walkStateRef.current === 'WARNING') {
          if (now - warningTimeRef.current >= 60000) {
            setWalkState('ALERT');
          }
        }
      }, 5000);

    } else {
      setWalkState('IDLE');
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    };
  }, [isTracking]);

  const handleSafePress = () => {
    setWalkState('TRACKING');
    anchorTimeRef.current = Date.now();
  };

  useEffect(() => {
    checkTrackingStatus();
  }, []);

  const checkTrackingStatus = async () => {
    setIsTracking(false);
  };

  const toggleTracking = async () => {
    setLoading(true);
    try {
      if (isTracking) {
        await stopLocationTracking();
        setIsTracking(false);
        Alert.alert("Acompañamiento Finalizado", "Se ha detenido el rastreo de tu ubicación.");
      } else {
        await startLocationTracking();
        setIsTracking(true);
        Alert.alert(
          "Acompañamiento Activado",
          "Tu ubicación se actualizará cada 5 minutos en segundo plano para tu seguridad."
        );
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "No se pudo cambiar el estado del rastreo.");
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Camina Seguro</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Visual feedback area */}
        <View style={styles.visualContainer}>
          <View style={[styles.pulseCircle, isTracking && styles.pulseActive]}>
            <Ionicons
              name={isTracking ? "shield-checkmark" : "shield-outline"}
              size={80}
              color={isTracking ? "#4CAF50" : colors.textSecondary}
            />
          </View>
          <Text style={styles.statusText}>
            {isTracking ? "RASTREO ACTIVO" : "RASTREO DESACTIVADO"}
          </Text>
          <Text style={styles.description}>
            Al activar esta función, tu ubicación se compartirá con la central cada 5 minutos incluso si bloqueas tu teléfono.
          </Text>
        </View>

        {/* Action Section */}
        <View style={styles.actionCard}>
          <View style={styles.row}>
            <View>
              <Text style={styles.actionTitle}>Seguimiento en vivo</Text>
              <Text style={styles.actionSubtitle}>Actualización cada 5 min</Text>
            </View>
            <Switch
              trackColor={{ false: isDark ? "#333" : "#e0e0e0", true: "#4CAF50" }}
              thumbColor={isTracking ? "#fff" : (isDark ? "#666" : "#aaa")}
              onValueChange={toggleTracking}
              value={isTracking}
              disabled={loading}
            />
          </View>
        </View>

        {/* Emergency Assistance */}
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>Asistencia Inmediata</Text>

          <TouchableOpacity style={[styles.emergencyButton, styles.panicButton]} activeOpacity={0.8}>
            <Ionicons name="warning-outline" size={24} color="white" />
            <Text style={styles.emergencyButtonText}>BOTÓN DE PÁNICO (SOS)</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {walkState === 'WARNING' && (
        <View style={styles.warningOverlay}>
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={60} color="#FFA500" />
            <Text style={styles.warningTitle}>¿Te encuentras bien?</Text>
            <Text style={styles.warningText}>No hemos detectado avance de más de 5 metros en el último minuto.</Text>
            <TouchableOpacity style={styles.safeButton} onPress={handleSafePress}>
              <Text style={styles.safeButtonText}>Pulsa aquí si estás a salvo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {walkState === 'ALERT' && (
        <View style={styles.alertOverlay}>
          <Ionicons name="warning" size={100} color="#ff4444" />
          <Text style={styles.alertTitle}>¡ALERTA!</Text>
          <Text style={styles.alertText}>No hay movimiento y no respondiste a la notificación.</Text>
          <Text style={styles.alertSubtext}>Se ha enviado un aviso de emergencia a la central. (Prueba)</Text>
          <TouchableOpacity style={styles.resetButton} onPress={handleSafePress}>
            <Text style={styles.resetButtonText}>Cancelar Prueba / Restablecer</Text>
          </TouchableOpacity>
        </View>
      )}
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
  scrollContent: {
    paddingHorizontal: scale(25),
    paddingBottom: verticalScale(40),
  },
  visualContainer: {
    alignItems: 'center',
    marginVertical: verticalScale(40),
  },
  pulseCircle: {
    width: ms(180),
    height: ms(180),
    borderRadius: ms(90),
    backgroundColor: isDark ? '#111' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: verticalScale(25),
  },
  pulseActive: {
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: ms(20),
    elevation: 10,
  },
  statusText: {
    color: colors.text,
    fontSize: fs(14),
    fontWeight: '900',
    letterSpacing: scale(2),
    marginBottom: verticalScale(10),
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fs(22),
    fontSize: fs(15),
    paddingHorizontal: scale(20),
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: ms(20),
    padding: ms(20),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: verticalScale(35),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionTitle: {
    color: colors.text,
    fontSize: fs(17),
    fontWeight: '700',
  },
  actionSubtitle: {
    color: colors.textSecondary,
    fontSize: fs(13),
    marginTop: verticalScale(2),
  },
  emergencySection: {
    marginTop: verticalScale(10),
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '800',
    color: colors.text,
    marginBottom: verticalScale(20),
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#111' : '#fff',
    paddingVertical: verticalScale(18),
    paddingHorizontal: scale(20),
    borderRadius: ms(18),
    marginBottom: verticalScale(15),
    borderWidth: 1,
    borderColor: colors.border,
  },
  panicButton: {
    backgroundColor: '#ff444422',
    borderColor: '#ff444444',
  },
  emergencyButtonText: {
    color: isDark ? '#fff' : '#000',
    fontSize: fs(15),
    fontWeight: '700',
    marginLeft: scale(15),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  warningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: ms(20),
  },
  warningBox: {
    width: '100%',
    backgroundColor: colors.card,
    padding: ms(30),
    borderRadius: ms(24),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFA500',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: ms(15),
    elevation: 10,
  },
  warningTitle: {
    color: '#FFA500',
    fontSize: fs(24),
    fontWeight: '800',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  warningText: {
    color: colors.text,
    fontSize: fs(16),
    textAlign: 'center',
    marginBottom: verticalScale(30),
    lineHeight: fs(24),
  },
  safeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(25),
    borderRadius: ms(16),
    width: '100%',
    alignItems: 'center',
  },
  safeButtonText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: 'bold',
  },
  alertOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(50, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    padding: ms(30),
  },
  alertTitle: {
    color: '#ff4444',
    fontSize: fs(45),
    fontWeight: '900',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(15),
    letterSpacing: scale(2),
  },
  alertText: {
    color: '#fff',
    fontSize: fs(22),
    textAlign: 'center',
    marginBottom: verticalScale(15),
    fontWeight: 'bold',
  },
  alertSubtext: {
    color: '#ff8888',
    fontSize: fs(16),
    textAlign: 'center',
    marginBottom: verticalScale(50),
  },
  resetButton: {
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#ff4444',
    paddingVertical: verticalScale(18),
    paddingHorizontal: scale(30),
    borderRadius: ms(30),
    width: '100%',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#ff4444',
    fontSize: fs(16),
    fontWeight: 'bold',
  }
});
