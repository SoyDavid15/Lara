/**
 * friends.tsx — Pantalla de Amigos (Unificada y Refinada)
 *
 * ¿Qué hace?
 *   - Muestra la lista de tus amigos actuales.
 *   - Permite buscar globalmente y detectar si ya son amigos o hay solicitud pendiente.
 */

import { auth, db } from '@/lib/firebase';
import { fs, ms, scale, verticalScale } from '@/lib/responsive';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { 
  collection, getDocs, limit, orderBy, query, where, onSnapshot, 
  doc, setDoc, serverTimestamp, addDoc, getDoc 
} from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserItem {
  uid: string;
  username: string;
  fullName: string;
  isFriend?: boolean;
  isPending?: boolean; // Nueva propiedad para detectar solicitudes enviadas
}

export default function FriendsScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [searchText, setSearchText] = useState('');
  const [myFriends, setMyFriends] = useState<UserItem[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]); // Lista de UIDs a los que enviamos solicitud
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  const currentUserUid = auth.currentUser?.uid;

  // 1. Escuchar amigos actuales
  useEffect(() => {
    if (!currentUserUid) return;

    const q = query(collection(db, 'users', currentUserUid, 'friends'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        isFriend: true
      })) as UserItem[];
      setMyFriends(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserUid]);

  // 2. Escuchar solicitudes enviadas (para mostrar "Pendiente")
  useEffect(() => {
    if (!currentUserUid) return;

    const q = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', currentUserUid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uids = snapshot.docs.map(doc => doc.data().toUid);
      setSentRequests(uids);
    });

    return () => unsubscribe();
  }, [currentUserUid]);

  // 3. Búsqueda Global
  const handleSearch = useCallback(async (text: string) => {
    setSearchText(text);

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingGlobal(true);
    try {
      const term = text.trim().toLowerCase();
      const q = query(
        collection(db, 'users'),
        where('username', '>=', term),
        where('username', '<=', term + '\uf8ff'),
        limit(15)
      );

      const snap = await getDocs(q);
      const globalUsers = snap.docs
        .filter(doc => doc.id !== currentUserUid)
        .map(doc => ({
          uid: doc.id,
          username: doc.data().username || '',
          fullName: doc.data().fullName || 'Usuario',
          isFriend: myFriends.some(f => f.uid === doc.id),
          isPending: sentRequests.includes(doc.id)
        }));

      setSearchResults(globalUsers);
    } catch (error) {
      console.error("Error global search:", error);
    } finally {
      setSearchingGlobal(false);
    }
  }, [currentUserUid, myFriends, sentRequests]);

  // Enviar solicitud
  const sendRequest = async (user: UserItem) => {
    if (!currentUserUid) return;
    
    try {
      // Obtener mis datos para la solicitud
      const myDoc = await getDoc(doc(db, 'users', currentUserUid));
      const myData = myDoc.data();

      await addDoc(collection(db, 'friendRequests'), {
        fromUid: currentUserUid,
        fromName: myData?.fullName || 'Usuario',
        fromUsername: myData?.username || 'usuario',
        toUid: user.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      Alert.alert("Solicitud Enviada", `Has enviado una solicitud a @${user.username}`);
    } catch (error) {
      console.error("Error sending request:", error);
      Alert.alert("Error", "No se pudo enviar la solicitud.");
    }
  };

  const renderUser = ({ item }: { item: UserItem }) => {
    const isFriend = myFriends.some(f => f.uid === item.uid);
    const isPending = sentRequests.includes(item.uid);

    return (
      <TouchableOpacity 
        style={styles.userCard}
        activeOpacity={isFriend ? 0.8 : 1}
        onPress={() => isFriend && router.push({ pathname: '/friendProfile', params: { uid: item.uid } })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
        
        {isFriend ? (
          <View style={styles.friendBadge}>
            <Ionicons name="chatbubble-ellipses-outline" size={ms(18)} color={colors.text} />
            <Text style={styles.badgeText}>Amigo</Text>
          </View>
        ) : isPending ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pendiente</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={() => sendRequest(item)}>
            <Ionicons name="person-add-outline" size={ms(20)} color={colors.background} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={ms(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Amigos</Text>
        <View style={{ width: ms(40) }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={ms(20)} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Busca amigos o nuevos usuarios..."
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchingGlobal && <ActivityIndicator size="small" color={colors.textSecondary} />}
      </View>

      <FlatList
        data={searchText ? searchResults : myFriends}
        keyExtractor={item => item.uid}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
            searchText && searchResults.length > 0 ? (
                <Text style={styles.sectionTitle}>Resultados de Búsqueda</Text>
            ) : !searchText && myFriends.length > 0 ? (
                <Text style={styles.sectionTitle}>Tus Amigos</Text>
            ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={ms(60)} color={colors.border} />
              <Text style={styles.emptyTitle}>
                {searchText ? 'No se encontraron resultados' : 'Aún no tienes amigos'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchText ? 'Prueba con otro nombre o @username' : 'Busca personas para conectar'}
              </Text>
            </View>
          ) : null
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: ms(16),
    marginHorizontal: scale(20),
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: scale(10) },
  searchInput: { flex: 1, fontSize: fs(16), color: colors.text, paddingVertical: verticalScale(12) },
  listContent: { paddingHorizontal: scale(20), paddingBottom: verticalScale(40) },
  sectionTitle: { fontSize: fs(14), fontWeight: 'bold', color: colors.textSecondary, marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: ms(18),
    padding: ms(15),
    marginTop: verticalScale(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  avatarText: { fontSize: fs(20), fontWeight: 'bold', color: colors.text },
  userInfo: { flex: 1 },
  userName: { fontSize: fs(15), fontWeight: '700', color: colors.text },
  userUsername: { fontSize: fs(13), color: colors.textSecondary },
  addButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  badgeText: { fontSize: fs(12), color: colors.text, fontWeight: 'bold' },
  pendingBadge: {
    backgroundColor: isDark ? '#333' : '#EEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: { fontSize: fs(12), color: colors.textSecondary, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: verticalScale(60) },
  emptyTitle: { fontSize: fs(18), fontWeight: 'bold', color: colors.text, marginTop: 20 },
  emptySubtitle: { fontSize: fs(14), color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
});
