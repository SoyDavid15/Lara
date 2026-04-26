/**
 * friendProfile.tsx — Perfil Público de un Amigo (Con Alertas)
 */

import { db } from '@/lib/firebase';
import { fs, ms, scale, verticalScale } from '@/lib/responsive';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [friend, setFriend] = useState<FriendData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'No disponible';
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
        <Text style={{ color: colors.text }}>Usuario no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Volver</Text>
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
          <Text style={[styles.headerTitle, isEmergency && { color: 'white' }]}>Perfil de Amigo</Text>
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
              @{friend.username} • {friend.city || 'Ubicación oculta'}
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
                <Text style={[styles.statusTitle, isEmergency && { color: 'rgba(255,255,255,0.8)' }]}>Estado de SafeWalk</Text>
                <Text style={[
                  styles.statusValue,
                  { color: isEmergency ? "white" : (friend.isSafeWalkActive ? "#4CAF50" : colors.textSecondary) }
                ]}>
                  {isEmergency ? '¡EMERGENCIA!' : (friend.isSafeWalkActive ? 'ACTIVO' : 'INACTIVO')}
                </Text>
              </View>
            </View>
            
            {friend.isSafeWalkActive && (
              <View style={[styles.lastUpdateRow, isEmergency && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="time-outline" size={ms(16)} color={isEmergency ? "white" : colors.textSecondary} />
                <Text style={[styles.lastUpdateText, isEmergency && { color: 'white' }]}>
                  Última señal: {getTimeAgo(friend.location?.lastUpdated)}
                </Text>
              </View>
            )}

            <Text style={[styles.statusDescription, isEmergency && { color: 'white' }]}>
              {isEmergency 
                ? '¡ATENCIÓN! Tu amigo está en una posible situación de peligro. No hay movimiento y no responde.'
                : friend.isSafeWalkActive 
                  ? 'Tu amigo está siendo monitoreado por Lara para su seguridad.'
                  : 'Tu amigo no tiene el rastreo activo en este momento.'}
            </Text>
          </View>

          {/* Acciones Rápidas */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionItem, isEmergency && styles.emergencyAction]}>
              <View style={[styles.actionIcon, isEmergency && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={ms(24)} color={isEmergency ? "white" : colors.text} />
              </View>
              <Text style={[styles.actionText, isEmergency && { color: 'white' }]}>Chatear</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionItem, isEmergency && styles.emergencyActionRed]}>
              <View style={[styles.actionIcon, isEmergency && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <Ionicons name="call" size={ms(24)} color={isEmergency ? "white" : colors.text} />
              </View>
              <Text style={[styles.actionText, isEmergency && { color: 'white' }]}>Llamar ahora</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: { paddingHorizontal: scale(25), paddingTop: verticalScale(20) },
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
  actionsGrid: { flexDirection: 'row', gap: scale(20) },
  actionItem: { 
    flex: 1, 
    backgroundColor: colors.card, 
    borderRadius: ms(20), 
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emergencyAction: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'white',
  },
  emergencyActionRed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'white',
  },
  actionIcon: { 
    width: ms(48), 
    height: ms(48), 
    borderRadius: ms(24), 
    backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: { fontSize: fs(14), fontWeight: '700', color: colors.text },
});
