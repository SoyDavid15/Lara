import { auth, db } from '@/lib/firebase';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

interface UserProfileData {
  fullName?: string;
  username?: string;
  city?: string;
  email?: string;
  gender?: string;
  birthDate?: string;
}

interface UserAlert {
  id: string;
  type: string;
  typeName: string;
  description: string;
  createdAt: any;
}

const ALERT_ICONS: Record<string, { icon: any, color: string }> = {
  robo: { icon: 'hand-right-outline', color: '#FF3B30' },
  accidente: { icon: 'car-sport-outline', color: '#FF9500' },
  arroyo: { icon: 'water-outline', color: '#007AFF' },
  incendio: { icon: 'flame-outline', color: '#FF453A' },
};

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser;
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [userAlerts, setUserAlerts] = useState<UserAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      const fetchData = async () => {
        try {
          // 1. Fetch Basic User Info
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserProfileData);
          }

          // 2. Fetch User Alerts History (Zero-Index Strategy)
          // We fetch the most recent ones by this user
          const alertsQuery = query(
            collection(db, 'alerts'),
            where('userId', '==', user.uid),
            limit(20)
          );
          
          const alertsSnap = await getDocs(alertsQuery);
          const alertsList = alertsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as UserAlert[];

          // Sort in memory to avoid needing a composite index
          const sortedAlerts = alertsList.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });

          setUserAlerts(sortedAlerts);
        } catch (error) {
          console.error("Error fetching user data/alerts:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user?.uid]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Hamburger */}
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
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {userData?.fullName ? userData.fullName[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U')}
              </Text>
            </View>
          </View>

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
                {user?.email || 'email@ejemplo.com'} · Nacimiento: {userData?.birthDate || 'Sin especificar'}
              </Text>
            </>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userAlerts.length}</Text>
            <Text style={styles.statLabel}>Alertas</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>248</Text>
            <Text style={styles.statLabel}>Karma</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Logros</Text>
          </View>
        </View>

        {/* Features / Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Actividad Reciente</Text>

          {userAlerts.length > 0 ? (
            userAlerts.slice(0, 5).map((alert) => {
              const config = ALERT_ICONS[alert.type] || { icon: 'notifications-outline', color: colors.text };
              const timeString = alert.createdAt?.toMillis 
                ? new Date(alert.createdAt.toMillis()).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Reciente';

              return (
                <View key={alert.id} style={styles.activityCard}>
                  <View style={[styles.activityIcon, { backgroundColor: config.color + '15' }]}>
                    <Ionicons name={config.icon} size={20} color={config.color} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityText}>Reportaste: {alert.typeName}</Text>
                    <Text style={styles.activityTime}>{timeString}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons name="documents-outline" size={ms(40)} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Aún no has reportado incidentes.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={ms(20)} color={colors.text} />
          <Text style={styles.shareButtonText}>Compartir Perfil</Text>
        </TouchableOpacity>
      </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: ms(20),
    paddingVertical: verticalScale(20),
    marginBottom: verticalScale(35),
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
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
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  detailsSection: {
    marginBottom: verticalScale(30),
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '800',
    color: colors.text,
    marginBottom: verticalScale(20),
    paddingLeft: scale(5),
  },
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
  activityInfo: {
    flex: 1,
  },
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
