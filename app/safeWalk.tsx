/**
 * safeWalk.tsx
 * 
 * Pantalla "Camina Seguro" de la app LARA.
 * 
 * IMPORTANTE: Esta pantalla es SOLO la interfaz visual (UI).
 * Toda la lógica real del rastreo vive en SafeWalkContext.tsx.
 * 
 * ¿Qué muestra?
 *   - Un icono de escudo que cambia según el estado del rastreo
 *   - Un switch para activar/desactivar el seguimiento
 *   - Un botón de pánico (SOS)
 *   - Overlays de WARNING y ALERT cuando la persona deja de moverse
 */

import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/ThemeProvider';
import { useSafeWalk } from '@/lib/SafeWalkContext';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';
import { useTranslation } from '@/lib/LanguageContext';

export default function SafeWalkScreen() {
  // ── Hooks de navegación y tema ───────────────────────────────────────────
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme(); // Colores del tema (claro/oscuro)
  const { t } = useTranslation();

  // useMemo recalcula los estilos SOLO cuando el tema cambia (optimización)
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // ── Datos y funciones del contexto global SafeWalk ───────────────────────
  // Toda la lógica de rastreo vive en SafeWalkContext.tsx
  const {
    walkState,      // Estado actual: IDLE | TRACKING | WARNING | ALERT
    isTracking,     // true si el rastreo está activo
    startTracking,  // Función para activar el rastreo
    stopTracking,   // Función para desactivar el rastreo
    confirmSafe,    // Función para confirmar "estoy bien" en WARNING/ALERT
  } = useSafeWalk();

  // Estado local para mostrar un spinner mientras se procesa el toggle
  const [loading, setLoading] = React.useState(false);


  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: toggleTracking
  // Se llama cuando el usuario toca el Switch (interruptor).
  // Si el rastreo estaba OFF → lo activa.
  // Si el rastreo estaba ON  → lo desactiva.
  // ─────────────────────────────────────────────────────────────────────────
  const toggleTracking = async () => {
    setLoading(true); // Mostrar spinner
    try {
      if (isTracking) {
        stopTracking();        // Apagar rastreo
      } else {
        await startTracking(); // Activar rastreo (async: pide permisos)
      }
    } finally {
      setLoading(false); // Ocultar spinner siempre, haya error o no
    }
  };


  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Estructura visual de la pantalla
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── BARRA SUPERIOR (Header) ─────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Botón menú hamburguesa: abre el drawer lateral */}
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuButton}
        >
          <Ionicons name="menu-outline" size={30} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('safewalk.title')}</Text>

        {/* Espaciador vacío para centrar el título */}
        <View style={{ width: 30 }} />
      </View>

      {/* ── CONTENIDO PRINCIPAL (desplazable) ──────────────────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── SECCIÓN VISUAL: Escudo e indicador de estado ─────────────── */}
        <View style={styles.visualContainer}>

          {/* Círculo con el icono de escudo.
              Si isTracking es true → aplica pulseActive (borde verde con sombra) */}
          <View style={[styles.pulseCircle, isTracking && styles.pulseActive]}>
            <Ionicons
              name={isTracking ? 'shield-checkmark' : 'shield-outline'} // Icono cambia según estado
              size={80}
              color={isTracking ? '#4CAF50' : colors.textSecondary}     // Verde si activo
            />
          </View>

          {/* Texto de estado debajo del escudo */}
          <Text style={styles.statusText}>
            {isTracking ? t('safewalk.tracking') : t('safewalk.inactive')}
          </Text>

          {/* Descripción explicativa */}
          <Text style={styles.description}>
            {t('safewalk.description')}
          </Text>
        </View>

        {/* ── TARJETA: Switch de activación ────────────────────────────── */}
        <View style={styles.actionCard}>
          <View style={styles.row}>
            <View>
              <Text style={styles.actionTitle}>{t('safewalk.liveTracking')}</Text>
              <Text style={styles.actionSubtitle}>{t('safewalk.backgroundActive')}</Text>
            </View>

            {/* Switch (interruptor): llama a toggleTracking al cambiar */}
            <Switch
              trackColor={{ false: isDark ? '#333' : '#e0e0e0', true: '#4CAF50' }}
              thumbColor={isTracking ? '#fff' : isDark ? '#666' : '#aaa'}
              onValueChange={toggleTracking} // Se ejecuta al tocar el switch
              value={isTracking}             // Estado actual (ON/OFF)
              disabled={loading}             // Deshabilitado mientras carga
            />
          </View>
        </View>

        {/* ── SECCIÓN: Botón de pánico SOS ─────────────────────────────── */}
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>{t('safewalk.assistanceTitle')}</Text>

          {/* Botón SOS - TODO: agregar lógica real de emergencia aquí */}
          <TouchableOpacity
            style={[styles.emergencyButton, styles.panicButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={24} color="white" />
            <Text style={styles.emergencyButtonText}>{t('safewalk.panicButton')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── OVERLAY DE CARGA ─────────────────────────────────────────────── */}
      {/* Se muestra encima de todo mientras loading === true */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* ── OVERLAY DE ADVERTENCIA (WARNING) ─────────────────────────────── */}
      {/* Aparece cuando walkState === 'WARNING': la persona lleva +1 min sin moverse */}
      {walkState === 'WARNING' && (
        <View style={styles.warningOverlay}>
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={60} color="#FFA500" />
            <Text style={styles.warningTitle}>{t('safewalk.warningTitle')}</Text>
            <Text style={styles.warningText}>
              {t('safewalk.warningText')}
            </Text>
            {/* Al presionar este botón, confirmSafe() resetea los contadores */}
            <TouchableOpacity style={styles.safeButton} onPress={confirmSafe}>
              <Text style={styles.safeButtonText}>{t('safewalk.warningButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── OVERLAY DE ALERTA (ALERT) ─────────────────────────────────────── */}
      {/* Aparece cuando walkState === 'ALERT': no contestó en WARNING por +1 min */}
      {walkState === 'ALERT' && (
        <View style={styles.alertOverlay}>
          <Ionicons name="warning" size={100} color="#ff4444" />
          <Text style={styles.alertTitle}>{t('safewalk.alertTitle')}</Text>
          <Text style={styles.alertText}>{t('safewalk.alertText')}</Text>
          <Text style={styles.alertSubtext}>
            {t('safewalk.alertSubtext')}
          </Text>
          {/* Botón para salir del estado de emergencia */}
          <TouchableOpacity style={styles.resetButton} onPress={confirmSafe}>
            <Text style={styles.resetButtonText}>{t('safewalk.alertButton')}</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// Se define como función para recibir `colors` e `isDark` y así
// adaptar los colores al tema actual (claro/oscuro) sin hardcodearlos.
//
// scale()        → escala ancho relativo al tamaño de pantalla
// verticalScale()→ escala alto relativo al tamaño de pantalla
// ms()           → escala mixta (para bordes, padding, radios)
// fs()           → escala de fuente
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    // Contenedor raíz que ocupa toda la pantalla
    container: { flex: 1, backgroundColor: colors.background },

    // Fila superior con menú + título
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
    menuButton: { padding: ms(5) },

    // Padding interno del ScrollView
    scrollContent: {
      paddingHorizontal: scale(25),
      paddingBottom: verticalScale(40),
    },

    // Sección del escudo e indicador de estado
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
    // Estilo adicional cuando el rastreo está activo (borde verde brillante)
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

    // Tarjeta del switch
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
    actionTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },
    actionSubtitle: {
      color: colors.textSecondary,
      fontSize: fs(13),
      marginTop: verticalScale(2),
    },

    // Sección de botones de emergencia
    emergencySection: { marginTop: verticalScale(10) },
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
    // Estilo especial rojo para el botón SOS
    panicButton: { backgroundColor: '#ff444422', borderColor: '#ff444444' },
    emergencyButtonText: {
      color: isDark ? '#fff' : '#000',
      fontSize: fs(15),
      fontWeight: '700',
      marginLeft: scale(15),
    },

    // Overlay semitransparente durante la carga
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject, // Cubre toda la pantalla absolutamente
      backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99, // Encima de todo lo demás
    },

    // Overlay naranja de advertencia (WARNING)
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
      borderColor: '#FFA500', // Naranja
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
      backgroundColor: '#4CAF50', // Verde
      paddingVertical: verticalScale(16),
      paddingHorizontal: scale(25),
      borderRadius: ms(16),
      width: '100%',
      alignItems: 'center',
    },
    safeButtonText: { color: '#fff', fontSize: fs(16), fontWeight: 'bold' },

    // Overlay rojo de emergencia (ALERT)
    alertOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(50, 0, 0, 0.95)', // Rojo muy oscuro casi opaco
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 200, // El más alto de todos los overlays
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
    resetButtonText: { color: '#ff4444', fontSize: fs(16), fontWeight: 'bold' },
  });
