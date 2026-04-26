/**
 * notifications.tsx — Pantalla de Notificaciones / Solicitudes
 *
 * Permite ver quién te ha enviado solicitud de amistad y aceptarla o rechazarla.
 */

import { auth, db } from '@/lib/firebase';
import { fs, ms, scale, verticalScale } from '@/lib/responsive';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { 
  collection, query, where, onSnapshot, doc, getDoc,
  updateDoc, deleteDoc, setDoc, serverTimestamp 
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromUsername: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export default function NotificationsScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserUid) return;

    // Escuchar solicitudes pendientes para el usuario actual
    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', currentUserUid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];
      setRequests(requestsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserUid]);

  const handleAccept = async (request: FriendRequest) => {
    if (!currentUserUid) return;

    try {
      // 0. Obtener mis propios datos para que el otro usuario también me tenga en su lista
      const myDoc = await getDoc(doc(db, 'users', currentUserUid));
      const myData = myDoc.data();

      if (!myData) {
        console.error("No se encontraron datos del usuario actual");
        return;
      }

      // 1. Marcar solicitud como aceptada
      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // 2. Agregar a amigos en AMBAS direcciones (subcolección)
      
      // A) Agregar al que envió la solicitud a MI lista de amigos
      await setDoc(doc(db, 'users', currentUserUid, 'friends', request.fromUid), {
        uid: request.fromUid,
        username: request.fromUsername,
        fullName: request.fromName,
        since: serverTimestamp()
      });

      // B) Agregarme a MI a la lista de amigos del que envió la solicitud
      await setDoc(doc(db, 'users', request.fromUid, 'friends', currentUserUid), {
        uid: currentUserUid,
        username: myData.username || 'usuario',
        fullName: myData.fullName || 'Usuario',
        since: serverTimestamp()
      });

      alert(`¡Ahora eres amigo de ${request.fromName}!`);
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Hubo un error al aceptar la solicitud.");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'rejected'
      });
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.fromName[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestText}>
          <Text style={{ fontWeight: 'bold' }}>{item.fromName}</Text> te envió una solicitud.
        </Text>
        <Text style={styles.requestUsername}>@{item.fromUsername}</Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(item)}
          >
            <Text style={styles.acceptButtonText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Text style={styles.rejectButtonText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={ms(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={{ width: ms(40) }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={ms(60)} color={colors.border} />
              <Text style={styles.emptyTitle}>Todo al día</Text>
              <Text style={styles.emptySubtitle}>No tienes solicitudes pendientes.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
  },
  headerTitle: { fontSize: fs(18), fontWeight: '800', color: colors.text },
  listContent: { paddingHorizontal: scale(20), paddingVertical: verticalScale(20) },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: ms(20),
    padding: ms(15),
    marginBottom: verticalScale(15),
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(25),
    backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },
  avatarText: { fontSize: fs(20), fontWeight: 'bold', color: colors.text },
  requestInfo: { flex: 1 },
  requestText: { fontSize: fs(15), color: colors.text, lineHeight: fs(20) },
  requestUsername: { fontSize: fs(13), color: colors.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  actionButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: ms(12),
    alignItems: 'center',
  },
  acceptButton: { backgroundColor: colors.text },
  acceptButtonText: { color: colors.background, fontWeight: 'bold', fontSize: fs(14) },
  rejectButton: { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0', borderWidth: 1, borderColor: colors.border },
  rejectButtonText: { color: colors.text, fontWeight: '600', fontSize: fs(14) },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: verticalScale(100) },
  emptyTitle: { fontSize: fs(18), fontWeight: 'bold', color: colors.text, marginTop: 20 },
  emptySubtitle: { fontSize: fs(14), color: colors.textSecondary, marginTop: 10 },
});
