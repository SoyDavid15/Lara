import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from 'expo-router';
import { collection, getDocs, limit, onSnapshot, orderBy, query, QueryDocumentSnapshot, startAfter, Timestamp, where, writeBatch, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Dimensions, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/ThemeProvider';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';
import NewPost from '@/components/forms/newPost';
import AdCard from '@/components/common/AdCard';

const { width, height } = Dimensions.get('window');

interface Post {
    id: string;
    title: string;
    body: string;
    author: string;
    createdAt: Timestamp | null;
    expiresAt?: Timestamp | null;
    likes?: number;
    likedBy?: string[];
}

const News = () => {
    const navigation = useNavigation<DrawerNavigationProp<any>>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { colors, isDark } = useAppTheme();
    
    const currentUser = auth.currentUser;

    const handleLike = async (post: Post) => {
        if (!currentUser) return;

        const postRef = doc(db, "posts", post.id);
        const isLiked = post.likedBy?.includes(currentUser.uid);

        try {
            if (isLiked) {
                await updateDoc(postRef, {
                    likedBy: arrayRemove(currentUser.uid),
                    likes: (post.likes || 1) - 1
                });
            } else {
                await updateDoc(postRef, {
                    likedBy: arrayUnion(currentUser.uid),
                    likes: (post.likes || 0) + 1
                });
            }
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };

    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);    // Relative time helper
    
    // Logic to inject Ads every 3 posts
    const postsWithAds = useMemo(() => {
        const result: any[] = [];
        posts.forEach((post, index) => {
            result.push({ ...post, isAd: false });
            if ((index + 1) % 3 === 0) {
                result.push({ id: `ad-${index}-${post.id}`, isAd: true });
            }
        });
        return result;
    }, [posts]);

    const getTimeAgo = (timestamp: Timestamp | null) => {
        if (!timestamp) return 'Recién publicado';
        const seconds = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return `hace ${Math.floor(interval)} años`;
        interval = seconds / 2592000;
        if (interval > 1) return `hace ${Math.floor(interval)} meses`;
        interval = seconds / 86400;
        if (interval > 1) return `hace ${Math.floor(interval)} días`;
        interval = seconds / 3600;
        if (interval > 1) return `hace ${Math.floor(interval)} horas`;
        interval = seconds / 60;
        if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
        return 'hace unos segundos';
    };

    const fetchPosts = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (!lastVisible) setLoading(true);

            const now = Timestamp.now();
            const postsQuery = query(
                collection(db, "posts"),
                where("expiresAt", ">", now),
                orderBy("expiresAt", "desc"), // Sorting by expiresAt for consistent indexing with the where filter
                limit(5)
            );

            const documentSnapshots = await getDocs(postsQuery);
            const data = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

            setPosts(data);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadMore = async () => {
        if (loadingMore || !lastVisible) return;

        setLoadingMore(true);
        try {
            const now = Timestamp.now();
            const nextQuery = query(
                collection(db, "posts"),
                where("expiresAt", ">", now),
                orderBy("expiresAt", "desc"),
                startAfter(lastVisible),
                limit(5)
            );

            const documentSnapshots = await getDocs(nextQuery);
            const newData = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

            if (newData.length > 0) {
                setPosts(prev => [...prev, ...newData]);
                setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
            } else {
                setLastVisible(null); // No more posts
            }
        } catch (error) {
            console.error("Error loading more posts:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        const now = Timestamp.now();
        const q = query(
            collection(db, "posts"),
            where("expiresAt", ">", now),
            orderBy("expiresAt", "desc"),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(data);
            if (snapshot.docs.length > 0 && !lastVisible) {
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error en onSnapshot:", error);
            // Si da error de indice, recuerda que Firestore te dará un link en la consola para crearlo
        });

        return () => unsubscribe();
    }, []);

    const renderPost = ({ item }: { item: Post }) => {
        const isLiked = currentUser && item.likedBy?.includes(currentUser.uid);
        
        return (
            <View style={styles.postCard}>
                <View style={styles.postHeader}>
                    <View style={styles.authorBadge}>
                        <Text style={styles.authorText}>{item.author[0]}</Text>
                    </View>
                    <View>
                        <Text style={styles.authorName}>{item.author}</Text>
                        <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
                    </View>
                </View>
                <Text style={styles.postTitle}>{item.title}</Text>
                <Text style={styles.postBody}>{item.body}</Text>
                
                {/* Post Footer / Actions */}
                <View style={styles.postFooter}>
                    <TouchableOpacity 
                        style={styles.actionButton} 
                        activeOpacity={0.7}
                        onPress={() => handleLike(item)}
                    >
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
                    
                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Ionicons name="chatbubble-outline" size={ms(20)} color={colors.textSecondary} />
                        <Text style={styles.actionText}>0</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        if (item.isAd) {
            return <AdCard />;
        }
        return renderPost({ item });
    };

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

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: verticalScale(120) }} />;
        return (
            <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={colors.text} />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.openDrawer()}>
                    <Ionicons name="menu" size={ms(28)} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.brand}>LARA</Text>
                <TouchableOpacity activeOpacity={0.7}>
                    <Ionicons name="search" size={ms(24)} color={colors.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={colors.text} />
                </View>
            ) : (
                <FlatList
                    data={postsWithAds}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
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

            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: isDark ? 'white' : 'black' }]}
                activeOpacity={0.8}
                onPress={() => setIsModalVisible(true)}
            >
                <Ionicons name="add" size={ms(32)} color={isDark ? 'black' : 'white'} />
            </TouchableOpacity>

            <NewPost 
                isVisible={isModalVisible} 
                onClose={() => setIsModalVisible(false)} 
            />
        </SafeAreaView>
    );
};

export default News;

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
    listContent: {
        paddingBottom: verticalScale(20),
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    loaderFooter: {
        paddingVertical: verticalScale(40),
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: verticalScale(110),
        right: scale(20),
        backgroundColor: colors.primary,
        width: ms(60),
        height: ms(60),
        borderRadius: ms(30),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 100,
    },
});