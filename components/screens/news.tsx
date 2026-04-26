/**
 * news.tsx — Pantalla de Feed de Noticias
 *
 * Es la pantalla principal de la app (pantalla de Inicio).
 * Muestra un feed de publicaciones de la comunidad en tiempo real.
 *
 * ¿Qué hace?
 *   - Carga las publicaciones activas (no expiradas) de Firestore en tiempo real
 *   - Implementa paginación (carga 5 posts a la vez, más al llegar al final)
 *   - Permite hacer "pull to refresh" (deslizar hacia abajo para refrescar)
 *   - Muestra un anuncio (AdCard) cada 3 publicaciones
 *   - Botón flotante (+) para crear una nueva publicación
 *   - Sistema de "likes" en cada publicación
 *
 * Estructura de datos en Firestore (colección 'posts'):
 *   - title: string
 *   - body: string
 *   - author: string
 *   - createdAt: Timestamp
 *   - expiresAt: Timestamp (24 horas después de crearse)
 *   - likes: number
 *   - likedBy: string[] (UIDs de usuarios que dieron like)
 */

import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { router, useNavigation } from 'expo-router';
import {
  collection, getDocs, limit, onSnapshot, orderBy, query,
  QueryDocumentSnapshot, startAfter, Timestamp, where,
  doc, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/ThemeProvider';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';
import NewPost from '@/components/forms/newPost';
import AdCard from '@/components/common/AdCard';

// ─────────────────────────────────────────────────────────────────────────────
// TIPO: Post
// Define la estructura de un documento en la colección 'posts' de Firestore.
// ─────────────────────────────────────────────────────────────────────────────
interface Post {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: Timestamp | null;
  expiresAt?: Timestamp | null; // Cuando expiresAt < ahora, el post ya no aparece
  likes?: number;
  likedBy?: string[];           // Array de UIDs de usuarios que han dado like
}

const News = () => {
    const navigation = useNavigation<DrawerNavigationProp<any>>();

    // Estados del feed
    const [posts, setPosts]           = useState<Post[]>([]);
    const [loading, setLoading]       = useState(true);      // Carga inicial
    const [loadingMore, setLoadingMore] = useState(false);   // Carga de más posts
    const [refreshing, setRefreshing] = useState(false);     // Pull to refresh
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null); // Paginación

    // Estado del modal de nuevo post
    const [isModalVisible, setIsModalVisible] = useState(false);

    const { colors, isDark } = useAppTheme();

    // Usuario actualmente autenticado (para el sistema de likes)
    const currentUser = auth.currentUser;


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: handleLike
    // Alterna el like de un post. Si ya dio like → quitarlo, si no → agregarlo.
    //
    // Usa arrayUnion / arrayRemove de Firestore para evitar condiciones de carrera
    // (múltiples usuarios dando like al mismo tiempo).
    // ─────────────────────────────────────────────────────────────────────
    const handleLike = async (post: Post) => {
        if (!currentUser) return; // Solo usuarios autenticados pueden dar like

        const postRef = doc(db, "posts", post.id);
        const isLiked = post.likedBy?.includes(currentUser.uid);

        try {
            if (isLiked) {
                // Ya dio like → quitar like
                await updateDoc(postRef, {
                    likedBy: arrayRemove(currentUser.uid),
                    likes: (post.likes || 1) - 1
                });
            } else {
                // No ha dado like → agregar like
                await updateDoc(postRef, {
                    likedBy: arrayUnion(currentUser.uid),
                    likes: (post.likes || 0) + 1
                });
            }
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };

    // Recalcular estilos solo cuando cambia el tema
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);


    // ─────────────────────────────────────────────────────────────────────
    // LÓGICA: Inyección de anuncios
    // Inserta un elemento de anuncio (AdCard) cada 3 publicaciones reales.
    //
    // Ejemplo con 6 posts: [post1, post2, post3, AD, post4, post5, post6, AD]
    //
    // useMemo → solo recalcular cuando cambian los posts
    // ─────────────────────────────────────────────────────────────────────
    const postsWithAds = useMemo(() => {
        const result: any[] = [];
        posts.forEach((post, index) => {
            result.push({ ...post, isAd: false }); // Post normal
            if ((index + 1) % 3 === 0) {
                // Cada 3 posts → insertar un anuncio con ID único
                result.push({ id: `ad-${index}-${post.id}`, isAd: true });
            }
        });
        return result;
    }, [posts]);


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: getTimeAgo
    // Convierte un Timestamp de Firestore a texto relativo legible.
    // Ejemplos: "hace 5 minutos", "hace 2 horas", "hace 3 días"
    // ─────────────────────────────────────────────────────────────────────
    const getTimeAgo = (timestamp: Timestamp | null) => {
        if (!timestamp) return 'Recién publicado';
        const seconds = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);

        let interval = seconds / 31536000; // Segundos en un año
        if (interval > 1) return `hace ${Math.floor(interval)} años`;
        interval = seconds / 2592000;      // Segundos en un mes
        if (interval > 1) return `hace ${Math.floor(interval)} meses`;
        interval = seconds / 86400;        // Segundos en un día
        if (interval > 1) return `hace ${Math.floor(interval)} días`;
        interval = seconds / 3600;         // Segundos en una hora
        if (interval > 1) return `hace ${Math.floor(interval)} horas`;
        interval = seconds / 60;           // Segundos en un minuto
        if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
        return 'hace unos segundos';
    };


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: fetchPosts
    // Recarga los posts desde el principio (usada en pull-to-refresh).
    // ─────────────────────────────────────────────────────────────────────
    const fetchPosts = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (!lastVisible) setLoading(true);

            const now = Timestamp.now();
            // Solo cargar posts que aún no han expirado
            const postsQuery = query(
                collection(db, "posts"),
                where("expiresAt", ">", now),    // Filtro: solo posts activos
                orderBy("expiresAt", "desc"),    // Ordenar por expiración (los más recientes primero)
                limit(5)
            );

            const documentSnapshots = await getDocs(postsQuery);
            const data = documentSnapshots.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Post))
                .filter((p: any) => p.type !== 'map_alert'); // Excluir alertas del mapa

            setPosts(data);
            // Guardar el último documento para la paginación
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: loadMore
    // Carga los siguientes 5 posts (paginación infinita).
    // Se llama cuando el usuario llega al final de la lista.
    // ─────────────────────────────────────────────────────────────────────
    const loadMore = async () => {
        if (loadingMore || !lastVisible) return; // Evitar llamadas duplicadas

        setLoadingMore(true);
        try {
            const now = Timestamp.now();
            const nextQuery = query(
                collection(db, "posts"),
                where("expiresAt", ">", now),
                orderBy("expiresAt", "desc"),
                startAfter(lastVisible), // Continuar desde donde se quedó
                limit(5)
            );

            const documentSnapshots = await getDocs(nextQuery);
            const newData = documentSnapshots.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Post))
                .filter((p: any) => p.type !== 'map_alert'); // Excluir alertas del mapa

            if (newData.length > 0) {
                setPosts(prev => [...prev, ...newData]); // Agregar al final de la lista
                setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
            } else {
                setLastVisible(null); // No hay más posts
            }
        } catch (error) {
            console.error("Error loading more posts:", error);
        } finally {
            setLoadingMore(false);
        }
    };


    // ─────────────────────────────────────────────────────────────────────
    // EFECTO: Suscripción en tiempo real a posts activos
    // onSnapshot escucha cambios en Firestore en tiempo real.
    // Cuando alguien crea un post o da like, la UI se actualiza automáticamente.
    //
    // La suscripción se cancela al desmontar el componente (return unsubscribe).
    // ─────────────────────────────────────────────────────────────────────
    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        const now = Timestamp.now();
        const q = query(
            collection(db, "posts"),
            where("expiresAt", ">", now),
            orderBy("expiresAt", "desc"),
            limit(5)
        );

        // onSnapshot → escucha cambios en tiempo real
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Post))
                .filter((p: any) => p.type !== 'map_alert'); // Excluir alertas del mapa
            setPosts(data);
            if (snapshot.docs.length > 0 && !lastVisible) {
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error en onSnapshot:", error);
            // Nota: Si da error de índice, Firestore provee un link en consola para crearlo
        });

        return () => unsubscribe(); // Cancelar suscripción al salir de la pantalla
    }, []);
    /* eslint-enable react-hooks/exhaustive-deps */


    // ─────────────────────────────────────────────────────────────────────
    // RENDER: Tarjeta individual de un post
    // ─────────────────────────────────────────────────────────────────────
    const renderPost = ({ item }: { item: Post }) => {
        // Verificar si el usuario actual ya dio like a este post
        const isLiked = currentUser && item.likedBy?.includes(currentUser.uid);

        return (
            <View style={styles.postCard}>
                {/* ── Encabezado del post: avatar + autor + tiempo ──── */}
                <View style={styles.postHeader}>
                    {/* Avatar con inicial del autor */}
                    <View style={styles.authorBadge}>
                        <Text style={styles.authorText}>{item.author[0]}</Text>
                    </View>
                    <View>
                        <Text style={styles.authorName}>{item.author}</Text>
                        <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
                    </View>
                </View>

                {/* ── Contenido ────────────────────────────────────── */}
                <Text style={styles.postTitle}>{item.title}</Text>
                <Text style={styles.postBody}>{item.body}</Text>

                {/* ── Footer: botones de like y comentario ─────────── */}
                <View style={styles.postFooter}>
                    {/* Botón Like */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        activeOpacity={0.7}
                        onPress={() => handleLike(item)}
                    >
                        {/* Corazón relleno si ya dio like, vacío si no */}
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={ms(22)}
                            color={isLiked ? "#FF3B30" : colors.textSecondary}
                        />
                        <Text style={[
                            styles.actionText,
                            isLiked && { color: "#FF3B30", fontWeight: 'bold' }
                        ]}>
                            {item.likes || 0}
                        </Text>
                    </TouchableOpacity>

                    {/* Botón Comentario (TODO: implementar comentarios) */}
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Ionicons name="chatbubble-outline" size={ms(20)} color={colors.textSecondary} />
                        <Text style={styles.actionText}>0</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };


    // ─────────────────────────────────────────────────────────────────────
    // RENDER: Elemento de la FlatList (post normal o anuncio)
    // ─────────────────────────────────────────────────────────────────────
    const renderItem = ({ item }: { item: any }) => {
        if (item.isAd) {
            return <AdCard />; // Mostrar tarjeta de anuncio
        }
        return renderPost({ item }); // Mostrar post normal
    };

    // Encabezado del feed (título "Feed" y descripción)
    const renderHeader = () => (
        <View style={styles.content}>
            <Text style={styles.currentFeedLabel}>CURRENT FEED</Text>
            <Text style={styles.title}>Feed</Text>
            <Text style={styles.description}>
                Entérate de lo último que sucede a tu alrededor
            </Text>
            <View style={{ height: verticalScale(30) }} />
        </View>
    );

    // Footer del feed (spinner de "cargando más" o espacio vacío)
    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: verticalScale(120) }} />;
        return (
            <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={colors.text} />
            </View>
        );
    };


    // ─────────────────────────────────────────────────────────────────────
    // RENDER PRINCIPAL
    // ─────────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* ── BARRA SUPERIOR ──────────────────────────────────────── */}
            <View style={styles.header}>
                {/* Abrir menú lateral */}
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={ms(28)} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.brand}>LARA</Text>
                {/* Botón de Notificaciones */}
                <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => router.push('/notifications')}
                >
                    <Ionicons name="notifications-outline" size={ms(26)} color={colors.text} />
                    {/* TODO: Agregar indicador (punto rojo) si hay notificaciones pendientes */}
                </TouchableOpacity>
            </View>

            {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────── */}
            {loading ? (
                // Spinner de carga inicial
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={colors.text} />
                </View>
            ) : (
                // Lista de posts con paginación y pull-to-refresh
                <FlatList
                    data={postsWithAds}          // Array de posts + anuncios intercalados
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    onEndReached={loadMore}          // Cargar más al llegar al final
                    onEndReachedThreshold={0.5}      // Disparar cuando quedan 50% de visibilidad
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchPosts(true)}
                            tintColor={colors.text}
                        />
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ── BOTÓN FLOTANTE (+): Crear nuevo post ─────────────────── */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: isDark ? 'white' : 'black' }]}
                activeOpacity={0.8}
                onPress={() => setIsModalVisible(true)}
            >
                <Ionicons name="add" size={ms(32)} color={isDark ? 'black' : 'white'} />
            </TouchableOpacity>

            {/* ── MODAL: Formulario de nuevo post ──────────────────────── */}
            <NewPost
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
            />
        </SafeAreaView>
    );
};

export default News;


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
        paddingVertical: verticalScale(15),
        height: verticalScale(60),
    },
    brand: {
        color: colors.text,
        fontSize: fs(18),
        fontWeight: '900',
        letterSpacing: scale(2),
    },
    content: {
        paddingHorizontal: scale(25),
        paddingTop: verticalScale(40),
    },
    currentFeedLabel: {
        color: colors.textSecondary,
        fontSize: fs(12),
        fontWeight: '600',
        letterSpacing: scale(1.5),
        marginBottom: verticalScale(8),
    },
    title: {
        color: colors.text,
        fontSize: fs(48),
        fontWeight: 'bold',
    },
    description: {
        color: colors.textSecondary,
        fontSize: fs(16),
        lineHeight: fs(24),
        fontWeight: '400',
        marginTop: verticalScale(10),
    },
    listContent: { paddingBottom: verticalScale(20) },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Tarjeta de un post
    postCard: {
        backgroundColor: colors.background,
        paddingHorizontal: scale(25),
        paddingVertical: verticalScale(25),
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#E0E0E0',
        borderRadius: ms(20),
        marginHorizontal: scale(15),
        marginBottom: verticalScale(15),
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(15),
    },
    // Círculo con la inicial del autor
    authorBadge: {
        width: ms(36),
        height: ms(36),
        borderRadius: ms(18),
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(12),
        borderWidth: 1,
        borderColor: colors.border,
    },
    authorText: {
        color: colors.text,
        fontSize: fs(14),
        fontWeight: 'bold',
    },
    authorName: {
        color: colors.text,
        fontSize: fs(14),
        fontWeight: '700',
    },
    timeText: {
        color: colors.textSecondary,
        fontSize: fs(12),
        marginTop: verticalScale(2),
    },
    postTitle: {
        color: colors.text,
        fontSize: fs(22),
        fontWeight: 'bold',
        marginBottom: verticalScale(10),
        lineHeight: fs(28),
    },
    postBody: {
        color: isDark ? '#BBB' : '#444',
        fontSize: fs(15),
        lineHeight: fs(22),
        marginBottom: verticalScale(20),
    },
    postFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: isDark ? '#222' : '#F0F0F0',
        paddingTop: verticalScale(15),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(25),
    },
    actionText: {
        color: colors.textSecondary,
        fontSize: fs(14),
        marginLeft: scale(6),
        fontWeight: '500',
    },
    // Spinner de carga de más posts al final de la lista
    loaderFooter: {
        paddingVertical: verticalScale(40),
        alignItems: 'center',
    },
    // Botón flotante (+)
    fab: {
        position: 'absolute',
        bottom: verticalScale(110),  // Encima de la tab bar
        right: scale(20),
        backgroundColor: colors.primary,
        width: ms(60),
        height: ms(60),
        borderRadius: ms(30), // Círculo perfecto
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 100, // Encima de todo
    },
});