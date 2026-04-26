import { useTranslation } from '@/lib/LanguageContext';
import { db } from '@/lib/firebase';
import { fs, ms, verticalScale } from '@/lib/responsive';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp, Timestamp, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MapAlertModalProps {
    isVisible: boolean;
    onClose: () => void;
    userLocation: { latitude: number; longitude: number } | null;
}

const MapAlertModal = ({ isVisible, onClose, userLocation }: MapAlertModalProps) => {
    const { t } = useTranslation();
    const [isMounted, setIsMounted] = useState(isVisible);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const scaleAnim = useSharedValue(0);
    const opacityAnim = useSharedValue(0);

    const categories = [
        { id: 'arroyo', label: 'Arroyo', icon: 'water', color: '#007AFF' },
        { id: 'accidente', label: 'Accidente', icon: 'car-sport', color: '#FF9500' },
        { id: 'incendio', label: 'Incendio', icon: 'flame', color: '#FF3B30' },
        { id: 'robo', label: 'Robo', icon: 'hand-right', color: '#FF3B30' },
    ];

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (isVisible) {
            setIsMounted(true);
            scaleAnim.value = withTiming(1, { duration: 300 });
            opacityAnim.value = withTiming(1, { duration: 300 });
        } else {
            scaleAnim.value = withTiming(0, { duration: 200 });
            opacityAnim.value = withTiming(0, { duration: 200 }, (finished) => {
                if (finished) {
                    runOnJS(setIsMounted)(false);
                }
            });
        }
    }, [isVisible]);

    const handlePublish = async () => {
        if (!selectedCategory) {
            Alert.alert(t('common.error'), 'Selecciona una categoría');
            return;
        }
        if (!userLocation) {
            Alert.alert(t('common.error'), 'No se pudo obtener tu ubicación. Por favor, activa el GPS.');
            return;
        }
        setIsPublishing(true);
        try {
            const threeHours = 3 * 60 * 60 * 1000;
            const expiresAt = Timestamp.fromMillis(Date.now() + threeHours);
            
            // Lógica de Verificación: Buscar alertas similares en un radio de 500m
            let isVerified = false;
            const now = Timestamp.now();
            // Simplificamos la query para evitar el error de índice compuesto en Firebase
            const q = query(
                collection(db, "posts"),
                where("expiresAt", ">", now)
            );

            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Filtrado manual para evitar índices complejos
                if (data.type === 'map_alert' && data.category === selectedCategory && data.location && userLocation) {
                    const distance = getDistanceMeters(
                        userLocation.latitude,
                        userLocation.longitude,
                        data.location.latitude,
                        data.location.longitude
                    );
                    if (distance <= 500) {
                        isVerified = true;
                    }
                }
            });

            await addDoc(collection(db, "posts"), {
                title: categories.find(c => c.id === selectedCategory)?.label || "Alerta",
                body: description.trim(),
                category: selectedCategory,
                createdAt: serverTimestamp(),
                expiresAt: expiresAt,
                author: "Anónimo",
                location: userLocation,
                type: 'map_alert',
                verified: isVerified
            });

            Alert.alert(t('common.success'), 'Alerta publicada');
            setDescription('');
            setSelectedCategory(null);
            onClose();
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), 'Error al publicar');
        } finally {
            setIsPublishing(false);
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleAnim.value }],
        opacity: opacityAnim.value,
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: opacityAnim.value,
    }));

    if (!isMounted) return null;

    return (
        <Animated.View style={[styles.overlay, overlayStyle]}>
            <KeyboardAvoidingView
                behavior="position"
                contentContainerStyle={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? -240 : -150}
            >
                <Animated.View style={[styles.card, animatedStyle]}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={[styles.header, keyboardVisible && { marginBottom: verticalScale(10) }]}>
                            <Text style={styles.headerTitle}>Reportar Alerta</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.content, keyboardVisible && { gap: verticalScale(8) }]}>
                            <Text style={styles.label}>¿Qué ocurrió?</Text>
                            <View style={styles.categoryGrid}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryButton,
                                            selectedCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
                                        ]}
                                        onPress={() => setSelectedCategory(cat.id)}
                                    >
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={ms(28)}
                                            color={selectedCategory === cat.id ? 'white' : cat.color}
                                        />
                                        <Text style={[
                                            styles.categoryText,
                                            selectedCategory === cat.id && { color: 'white' }
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Descripción (opcional, máx. 100 carac.):</Text>
                            <View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Añade detalles si quieres..."
                                    placeholderTextColor="#666"
                                    maxLength={100}
                                    multiline
                                    value={description}
                                    onChangeText={setDescription}
                                    editable={!isPublishing}
                                />
                                <Text style={[styles.charCount, description.length >= 90 && { color: '#FF3B30' }]}>
                                    {description.length} / 100
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.publishButton, (!selectedCategory || !userLocation || isPublishing) && styles.disabledButton]}
                                onPress={handlePublish}
                                disabled={!selectedCategory || !userLocation || isPublishing}
                            >
                                {isPublishing ? (
                                    <ActivityIndicator color="white" />
                                ) : !userLocation ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator size="small" color="white" />
                                        <Text style={styles.publishButtonText}>Buscando GPS...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.publishButtonText}>Enviar Alerta</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    keyboardView: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: width * 0.9,
        maxHeight: height * 0.75, // Reducido un poco para dar más aire al teclado
        backgroundColor: '#111',
        borderRadius: ms(28),
        borderWidth: 1,
        borderColor: '#333',
        padding: ms(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden',
    },
    scrollContent: {
        paddingBottom: verticalScale(5),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(15),
    },
    headerTitle: {
        color: 'white',
        fontSize: fs(20),
        fontWeight: '900',
    },
    closeButton: {
        padding: ms(5),
    },
    content: {
        gap: verticalScale(12),
    },
    label: {
        color: '#999',
        fontSize: fs(13),
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: verticalScale(10),
    },
    categoryButton: {
        width: '48.5%', // Ocupa casi la mitad para dejar espacio al gap
        backgroundColor: '#1A1A1A',
        borderRadius: ms(18),
        paddingVertical: verticalScale(15),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    categoryText: {
        color: '#999',
        marginTop: verticalScale(6),
        fontSize: fs(12),
        fontWeight: '800',
    },
    input: {
        backgroundColor: '#1A1A1A',
        borderRadius: ms(18),
        padding: ms(15),
        color: 'white',
        fontSize: fs(15),
        minHeight: verticalScale(70),
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
    },
    charCount: {
        color: '#666',
        fontSize: fs(11),
        textAlign: 'right',
        marginTop: verticalScale(4),
    },
    publishButton: {
        backgroundColor: '#FF3B30',
        borderRadius: ms(18),
        paddingVertical: verticalScale(16),
        alignItems: 'center',
        marginTop: verticalScale(5),
    },
    disabledButton: {
        backgroundColor: '#222',
        opacity: 0.5,
    },
    publishButtonText: {
        color: 'white',
        fontSize: fs(16),
        fontWeight: '900',
    },
});

export default MapAlertModal;
