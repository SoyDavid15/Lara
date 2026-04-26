/**
 * friendProfile.tsx — Perfil Público de un Amigo (Con Alertas)
 */

import { auth, db } from '@/lib/firebase';
import { fs, ms, scale, verticalScale } from '@/lib/responsive';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LanguageProvider, useTranslation } from '@/lib/LanguageContext';
import { deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapComponent from '@/components/MapComponent';

interface FriendData {
  fullName: string;
  username: string;
  city?: string;
  isSafeWalkActive?: boolean;
  walkState?: string; // IDLE | TRACKING | WARNING | ALERT
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: any;
  };
}

export default function FriendProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [friend, setFriend] = useState<FriendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);

  // Animación para el parpadeo de alerta
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FriendData;
        setFriend(data);

        // Si está en ALERT, iniciar animación de parpadeo
        if (data.walkState === 'ALERT') {
          Animated.loop(
            Animated.sequence([
              Animated.timing(flashAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
              Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
            ])
          ).start();
        } else {
          flashAnim.setValue(0);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  const handleRemoveFriend = () => {
    Alert.alert(
      t('friendProfile.removeConfirmTitle'),
      t('friendProfile.removeConfirmDesc').replace('{name}', friend?.fullName || ''),
      [
        { text: t('common.cancel'), style: "cancel" },
        { 
          text: t('common.delete'), 
          style: "destructive",
          onPress: async () => {
            const currentUser = auth.currentUser;
            if (!currentUser || !uid) return;

            try {
              setIsRemoving(true);
              // 1. Eliminar de mi lista de amigos
              await deleteDoc(doc(db, 'users', currentUser.uid, 'friends', uid));
              // 2. Eliminar de su lista de amigos (reciprocidad)
              await deleteDoc(doc(db, 'users', uid, 'friends', currentUser.uid));
              
              Alert.alert("Éxito", "Amigo eliminado correctamente");
              router.replace('/friends');
            } catch (error) {
              console.error("Error al eliminar amigo:", error);
              Alert.alert("Error", "No se pudo eliminar al amigo.");
            } finally {
              setIsRemoving(false);
            }
          }
        }
      ]
    );
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return t('friendProfile.notAvailable');
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [friend?.walkState === 'ALERT' ? '#FF3B30' : colors.background, '#800000']
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!friend) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <Text style={{ color: colors.text }}>{t('friendProfile.userNotFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isEmergency = friend.walkState === 'ALERT';

  return (
    <Animated.View style={[styles.container, { backgroundColor: isEmergency ? backgroundColor : colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={ms(24)} color={isEmergency ? 'white' : colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isEmergency && { color: 'white' }]}>{t('friendProfile.title')}</Text>
          <View style={{ width: ms(40) }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar y Datos Básicos */}
          <View style={styles.profileSection}>
            <View style={[styles.avatar, isEmergency && { borderColor: 'white' }]}>
              <Text style={[styles.avatarText, isEmergency && { color: 'white' }]}>
                {friend.fullName[0]?.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.name, isEmergency && { color: 'white' }]}>{friend.fullName}</Text>
            <Text style={[styles.username, isEmergency && { color: 'rgba(255,255,255,0.8)' }]}>
              @{friend.username} • {friend.city || t('friendProfile.notAvailable')}
            </Text>
          </View>

          {/* Estado SafeWalk */}
          <View style={[
            styles.statusCard,
            isEmergency ? styles.emergencyCard : (friend.isSafeWalkActive ? styles.activeCard : styles.inactiveCard)
          ]}>
            <View style={styles.statusHeader}>
              <Ionicons
                name={isEmergency ? "warning" : (friend.isSafeWalkActive ? "shield-checkmark" : "shield-outline")}
                size={ms(32)}
                color={isEmergency ? "white" : (friend.isSafeWalkActive ? "#4CAF50" : colors.textSecondary)}
              />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusTitle, isEmergency && { color: 'rgba(255,255,255,0.8)' }]}>{t('friendProfile.safewalkState')}</Text>
                <Text style={[
                  styles.statusValue,
                  { color: isEmergency ? "white" : (friend.isSafeWalkActive ? "#4CAF50" : colors.textSecondary) }
                ]}>
                  {isEmergency ? t('friendProfile.emergency') : (friend.isSafeWalkActive ? t('friendProfile.active') : t('friendProfile.inactive'))}
                </Text>
              </View>
            </View>

            {friend.isSafeWalkActive && (
              <View style={[styles.lastUpdateRow, isEmergency && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="time-outline" size={ms(16)} color={isEmergency ? "white" : colors.textSecondary} />
                <Text style={[styles.lastUpdateText, isEmergency && { color: 'white' }]}>
                  {t('friendProfile.lastSignal')}: {getTimeAgo(friend.location?.lastUpdated)}
                </Text>
              </View>
            )}

            <Text style={[styles.statusDescription, isEmergency && { color: 'white' }]}>
              {isEmergency
                ? t('friendProfile.descriptionEmergency')
                : friend.isSafeWalkActive
                  ? t('friendProfile.descriptionActive')
                  : t('friendProfile.descriptionInactive')}
            </Text>
          </View>

          {/* Mapa de Ubicación (Mini) */}
          {friend.location && (
            <View style={styles.mapCard}>
              <Text style={styles.mapTitle}>
                <Ionicons name="location" size={fs(14)} color={colors.primary} /> {t('friendProfile.currentLocation')}
              </Text>
              <View style={styles.mapWrapper}>
                <MapComponent 
                  location={friend.location}
                  isEmergency={isEmergency}
                  colors={colors}
                  isDark={isDark}
                  t={t}
                />
              </View>
              <Text style={styles.mapFootnote}>{t('friendProfile.mapDisclaimer')}</Text>
            </View>
          )}

          {/* Botón Eliminar Amigo */}
          {!isEmergency && (
            <TouchableOpacity 
              style={styles.removeButton} 
              onPress={handleRemoveFriend}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <>
                  <Ionicons name="person-remove-outline" size={ms(20)} color="#FF3B30" />
                  <Text style={styles.removeButtonText}>{t('friendProfile.removeFriend')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  centerBox: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  headerTitle: { fontSize: fs(18), fontWeight: '800', color: colors.text },
  scrollContent: { paddingHorizontal: scale(25), paddingTop: verticalScale(20), paddingBottom: 40 },
  profileSection: { alignItems: 'center', marginBottom: verticalScale(40) },
  avatar: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: verticalScale(15),
  },
  avatarText: { fontSize: fs(40), fontWeight: 'bold', color: colors.text },
  name: { fontSize: fs(24), fontWeight: '900', color: colors.text, marginBottom: 5 },
  username: { fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' },
  statusCard: {
    padding: ms(20),
    borderRadius: ms(24),
    borderWidth: 1,
    marginBottom: verticalScale(30),
  },
  activeCard: {
    backgroundColor: isDark ? '#0A2A0A' : '#F0FFF0',
    borderColor: '#4CAF5055',
  },
  inactiveCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  emergencyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'white',
    borderWidth: 2,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(15) },
  statusInfo: { marginLeft: scale(15) },
  statusTitle: { fontSize: fs(14), color: colors.textSecondary, fontWeight: '700' },
  statusValue: { fontSize: fs(18), fontWeight: '900', marginTop: 2 },
  lastUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  lastUpdateText: { fontSize: fs(13), color: colors.textSecondary, marginLeft: 6, fontWeight: '500' },
  statusDescription: { fontSize: fs(14), color: colors.text, lineHeight: fs(20), opacity: 0.8 },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(15),
    borderRadius: ms(10),
    borderWidth: 0.5,
    borderColor: '#FF3B3022',
    marginTop: 40,
    alignSelf: 'center', // No ocupa todo el ancho
    backgroundColor: isDark ? 'rgba(255,59,48,0.03)' : 'rgba(255,59,48,0.01)',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: fs(12), // Más pequeño
    fontWeight: '600',
    marginLeft: 8,
    opacity: 0.7, // Un poco más transparente para ser discreto
  },
  mapCard: {
    backgroundColor: colors.card,
    borderRadius: ms(24),
    padding: ms(15),
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: verticalScale(30),
  },
  mapTitle: {
    fontSize: fs(14),
    fontWeight: '800',
    color: colors.text,
    marginBottom: verticalScale(10),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapWrapper: {
    height: verticalScale(150),
    borderRadius: ms(16),
    overflow: 'hidden',
    backgroundColor: isDark ? '#111' : '#EEE',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFootnote: {
    fontSize: fs(11),
    color: colors.textSecondary,
    marginTop: verticalScale(8),
    fontStyle: 'italic',
    textAlign: 'center',
  },
  markerContainer: {
    width: ms(30),
    height: ms(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    backgroundColor: colors.primary,
    opacity: 0.2,
  },
  markerDot: {
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
    borderWidth: 2,
    borderColor: 'white',
  },
});
