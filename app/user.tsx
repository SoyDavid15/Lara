/**
 * user.tsx — Pantalla de Perfil del Usuario
 *
 * Accesible desde el menú lateral → "Usuario".
 *
 * ¿Qué muestra?
 *   - Avatar con la inicial del nombre del usuario
 *   - Nombre completo, @username, ciudad y email
 *   - Estadísticas: número de alertas reportadas, karma y logros
 *   - Historial de las últimas 5 alertas que ha creado el usuario
 *   - Botón de compartir perfil
 *
 * ¿De dónde vienen los datos?
 *   - auth.currentUser → email del usuario autenticado (Firebase Auth)
 *   - Firestore 'users/{uid}' → nombre, username, ciudad, fecha nacimiento
 *   - Firestore 'alerts' → alertas filtrando por userId del usuario actual
 */

import { auth, db } from '@/lib/firebase';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';
import { useTranslation } from '@/lib/LanguageContext';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Estructura del documento de usuario en Firestore ('users/{uid}') */
interface UserProfileData {
  fullName?: string;   // Nombre completo
  username?: string;   // @username
  city?: string;       // Ciudad de residencia
  email?: string;      // Correo electrónico
  gender?: string;     // Género
  birthDate?: string;  // Fecha de nacimiento (DD/MM/YYYY)
}

/** Estructura de una alerta del feed de Firestore ('alerts/{id}') */
interface UserAlert {
  id: string;
  type: string;        // ID del tipo: 'robo', 'accidente', 'arroyo', 'incendio'
  typeName: string;    // Nombre legible: 'Robo', 'Accidente de tránsito', etc.
  description: string;
  createdAt: any;      // Timestamp de Firestore
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN VISUAL POR TIPO DE ALERTA
// Mapea cada tipo de alerta a su icono y color correspondiente.
// Para agregar un nuevo tipo: añade aquí el icono y color.
// ─────────────────────────────────────────────────────────────────────────────
const ALERT_ICONS: Record<string, { icon: any, color: string }> = {
  robo: { icon: 'hand-right-outline', color: '#FF3B30' },   // Rojo
  accidente: { icon: 'car-sport-outline', color: '#FF9500' },   // Naranja
  arroyo: { icon: 'water-outline', color: '#007AFF' },   // Azul
  incendio: { icon: 'flame-outline', color: '#FF453A' },   // Rojo fuego
};

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser; // Usuario actualmente autenticado
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Estado con los datos del perfil cargados desde Firestore
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  // Estado con el historial de alertas del usuario
  const [userAlerts, setUserAlerts] = useState<UserAlert[]>([]);
  // true mientras se cargan los datos
  const [loading, setLoading] = useState(true);


  // ─────────────────────────────────────────────────────────────────────────
  // EFECTO: Cargar datos al montar
  // Se ejecuta una vez al entrar en la pantalla (cuando user.uid está disponible).
  // Hace dos consultas a Firestore en paralelo:
  //   1. Perfil del usuario
  //   2. Historial de alertas del usuario (máximo 20, ordenadas por fecha)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.uid) {
      const fetchData = async () => {
        try {
          // ── 1. Cargar datos del perfil ─────────────────────────────────
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserProfileData);
          }

          // ── 2. Cargar historial de alertas del usuario ─────────────────
          // Nota: El ordenamiento se hace en memoria (no en la consulta)
          // para evitar requerir un índice compuesto en Firestore.
          const alertsQuery = query(
            collection(db, 'alerts'),
            where('userId', '==', user.uid),
            limit(20) // Limitar para no cargar demasiado
          );

          const alertsSnap = await getDocs(alertsQuery);
          const alertsList = alertsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as UserAlert[];

          // Ordenar de más reciente a más antiguo en memoria
          const sortedAlerts = alertsList.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA; // Mayor timestamp primero
          });

          setUserAlerts(sortedAlerts);
        } catch (error) {
          console.error("Error fetching user data/alerts:", error);
        } finally {
          setLoading(false); // Ocultar spinner siempre, haya error o no
        }
      };
      fetchData();
    } else {
      setLoading(false); // No hay usuario, dejar de cargar
    }
  }, [user?.uid]); // Solo se re-ejecuta si cambia el UID


  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuButton}
        >
          <Ionicons name="menu-outline" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── SECCIÓN: Avatar y datos del perfil ──────────────────────── */}
        <View style={styles.profileSection}>
          {/* Avatar circular con la inicial del nombre */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {/* Mostrar inicial del nombre, o del email, o 'U' por defecto */}
                {userData?.fullName
                  ? userData.fullName[0].toUpperCase()
                  : (user?.email ? user.email[0].toUpperCase() : 'U')}
              </Text>
            </View>
          </View>

          {/* Spinner mientras cargan los datos, luego mostrar la info */}
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} style={{ marginBottom: 20 }} />
          ) : (
            <>
              <Text style={styles.userName}>
                {userData?.fullName || user?.displayName || 'Usuario de Lara'}
              </Text>
              <Text style={styles.userUsername}>
                @{userData?.username || 'usuario'} • {userData?.city || 'Planeta Tierra'}
              </Text>
              <Text style={styles.userEmail}>
                {user?.email || 'email@example.com'} · {t('options.language')}: {userData?.birthDate || t('friendProfile.notAvailable')}
              </Text>
            </>
          )}
        </View>

        {/* ── SECCIÓN: Estadísticas (Alertas / Karma / Logros) ────────── */}
        <View style={styles.statsContainer}>
          {/* Número de alertas reales del usuario (viene de Firestore) */}
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userAlerts.length}</Text>
            <Text style={styles.statLabel}>{t('profile.alerts')}</Text>
          </View>
        </View>

        {/* ── SECCIÓN: Historial de alertas ───────────────────────────── */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>{t('profile.history')}</Text>

          {userAlerts.length > 0 ? (
            // Mostrar las primeras 5 alertas del historial
            userAlerts.slice(0, 5).map((alert) => {
              // Configuración visual según el tipo de alerta
              const config = ALERT_ICONS[alert.type] || { icon: 'notifications-outline', color: colors.text };

              // Formatear la fecha a texto legible (ej: "21 abr, 23:45")
              const timeString = alert.createdAt?.toMillis
                ? new Date(alert.createdAt.toMillis()).toLocaleString('es-ES', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit'
                })
                : t('common.loading');

              return (
                <View key={alert.id} style={styles.activityCard}>
                  {/* Icono del tipo de alerta con fondo de color del tipo */}
                  <View style={[styles.activityIcon, { backgroundColor: config.color + '15' }]}>
                    <Ionicons name={config.icon} size={20} color={config.color} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityText}>{t('common.reportedAt')}: {alert.typeName}</Text>
                    <Text style={styles.activityTime}>{timeString}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            // Estado vacío: el usuario aún no ha creado alertas
            <View style={styles.emptyActivity}>
              <Ionicons name="documents-outline" size={ms(40)} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('profile.noHistory')}</Text>
            </View>
          )}
        </View>

        {/* ── Botón: Agregar amigos ──────────────────────────────────── */}
        {/* ── Botón: Amigos (Consolidado) ──────────────────────────────── */}
        <TouchableOpacity
          style={styles.addFriendsButton}
          activeOpacity={0.8}
          onPress={() => router.push('/friends')}
        >
          <Ionicons name="people-outline" size={ms(20)} color={colors.background} />
          <Text style={styles.addFriendsButtonText}>{t('friends.alreadyFriends')}</Text>
        </TouchableOpacity>

        {/* ── Botón de compartir perfil (TODO: implementar funcionalidad) ── */}
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={ms(20)} color={colors.text} />
          <Text style={styles.shareButtonText}>{t('profile.shareProfile')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(40),
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: verticalScale(40),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: verticalScale(20),
  },
  // Círculo del avatar
  avatarPlaceholder: {
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    backgroundColor: isDark ? '#1A1A1A' : '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarInitial: {
    fontSize: fs(48),
    fontWeight: 'bold',
    color: colors.text,
  },
  editBadge: {
    position: 'absolute',
    bottom: ms(5),
    right: ms(5),
    backgroundColor: colors.text,
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: fs(28),
    fontWeight: '900',
    color: colors.text,
    marginBottom: verticalScale(2),
    textAlign: 'center',
  },
  userUsername: {
    fontSize: fs(14),
    color: colors.text,
    fontWeight: '700',
    marginBottom: verticalScale(5),
    textAlign: 'center',
  },
  userEmail: {
    fontSize: fs(14),
    color: colors.textSecondary,
    marginBottom: verticalScale(25),
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: colors.card,
    paddingHorizontal: scale(25),
    paddingVertical: verticalScale(12),
    borderRadius: ms(25),
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    color: colors.text,
    fontSize: fs(14),
    fontWeight: 'bold',
  },
  // Fila de estadísticas
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: ms(20),
    paddingVertical: verticalScale(20),
    marginBottom: verticalScale(35),
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: fs(22),
    fontWeight: '900',
    color: colors.text,
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: fs(12),
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: scale(1),
  },
  // Línea divisoria entre estadísticas
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  detailsSection: { marginBottom: verticalScale(30) },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '800',
    color: colors.text,
    marginBottom: verticalScale(20),
    paddingLeft: scale(5),
  },
  // Tarjeta de una alerta en el historial
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: ms(15),
    borderRadius: ms(18),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIcon: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },
  // Estado vacío (sin alertas)
  emptyActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(30),
    backgroundColor: colors.card,
    borderRadius: ms(18),
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    marginTop: verticalScale(10),
    fontSize: fs(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activityInfo: { flex: 1 },
  activityText: {
    fontSize: fs(15),
    color: colors.text,
    fontWeight: '500',
    marginBottom: verticalScale(4),
  },
  activityTime: {
    fontSize: fs(12),
    color: colors.textSecondary,
  },
  // Botón principal "Agregar Amigos" (relleno con el color del texto del tema)
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    paddingVertical: verticalScale(18),
    borderRadius: ms(18),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(12),
  },
  addFriendsButtonText: {
    color: colors.background,
    fontSize: fs(16),
    fontWeight: '700',
    marginLeft: scale(10),
    letterSpacing: scale(0.5),
  },
  // Botón de compartir con borde punteado
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#000' : '#f0f0f0',
    paddingVertical: verticalScale(18),
    borderRadius: ms(18),
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: verticalScale(10),
  },
  shareButtonText: {
    color: colors.text,
    fontSize: fs(16),
    fontWeight: '600',
    marginLeft: scale(10),
  },
});
