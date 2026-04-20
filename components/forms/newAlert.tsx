import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, where, limit, updateDoc, doc } from 'firebase/firestore';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';
import { useSafeWalk } from '@/lib/SafeWalkContext';
import { getDistanceFromLatLonInMeters } from '@/lib/location-service';

const { width, height } = Dimensions.get('window');

interface NewAlertProps {
    isVisible: boolean;
    onClose: () => void;
}

const ALERT_TYPES = [
    { id: 'robo', label: 'Robo', icon: 'hand-right-outline', color: '#FF3B30' },
    { id: 'accidente', label: 'Accidente de tránsito', icon: 'car-sport-outline', color: '#FF9500' },
    { id: 'arroyo', label: 'Arroyo', icon: 'water-outline', color: '#007AFF' },
    { id: 'incendio', label: 'Incendio', icon: 'flame-outline', color: '#FF453A' },
];

const NewAlert = ({ isVisible, onClose }: NewAlertProps) => {
    const { location } = useSafeWalk();
    const [isMounted, setIsMounted] = useState(isVisible);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
    const scaleAnim = useSharedValue(0.9);
    const opacityAnim = useSharedValue(0);

    const handleConfirm = async () => {
        if (!selectedType) {
            Alert.alert("Error", "Por favor selecciona el tipo de incidente.");
            return;
        }

        if (!location) {
            Alert.alert("Error", "No se pudo obtener tu ubicación. Asegúrate de tener el GPS activo.");
            return;
        }

        setIsPublishing(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Error", "Debes estar autenticado para crear alertas.");
                return;
            }

            // --- RATE LIMITING CHECK (3 Hours) ---
            const qUser = query(
                collection(db, "alerts"),
                where("userId", "==", user.uid),
                limit(5)
            );

            const userSnapshot = await getDocs(qUser);
            const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
            
            const hasRecentAlert = userSnapshot.docs.some(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
                return createdAt > threeHoursAgo;
            });

            if (hasRecentAlert) {
                Alert.alert(
                    "Límite alcanzado", 
                    "Debe esperar 3 horas para crear una nueva alerta."
                );
                setIsPublishing(false);
                return;
            }
            
            // --- ALERT MERGING LOGIC ---
            // Search all active alerts of this type (we don't filter by distance in query due to index limitations, so we filter in-memory)
            // Since active alerts are usually few, this is performant.
            const qActive = query(
                collection(db, "alerts"),
                where("type", "==", selectedType),
                where("status", "==", "active"),
                where("expiresAt", ">", Timestamp.now())
            );

            const activeSnapshot = await getDocs(qActive);
            let mergedAlertId = null;

            for (const docSnap of activeSnapshot.docs) {
                const data = docSnap.data();
                const dist = getDistanceFromLatLonInMeters(
                    location.latitude,
                    location.longitude,
                    data.latitude,
                    data.longitude
                );

                // If within 500m and not reported by the same user
                if (dist <= 500 && data.userId !== user.uid) {
                    mergedAlertId = docSnap.id;
                    const reporterIds = data.reporterIds || [data.userId];
                    
                    if (!reporterIds.includes(user.uid)) {
                        reporterIds.push(user.uid);
                        await updateDoc(doc(db, "alerts", docSnap.id), {
                            verified: true,
                            reportCount: (data.reportCount || 1) + 1,
                            reporterIds: reporterIds,
                        });
                    }
                    break;
                }
            }

            if (!mergedAlertId) {
                // Create new unverified alert
                const expiresAt = Timestamp.fromMillis(Date.now() + 3 * 60 * 60 * 1000);
                await addDoc(collection(db, "alerts"), {
                    type: selectedType,
                    typeName: ALERT_TYPES.find(t => t.id === selectedType)?.label,
                    description: description.trim(),
                    latitude: location.latitude,
                    longitude: location.longitude,
                    createdAt: serverTimestamp(),
                    expiresAt: expiresAt,
                    userId: user.uid,
                    status: "active",
                    verified: false,
                    reportCount: 1,
                    reporterIds: [user.uid]
                });
            }

            Alert.alert("Éxito", mergedAlertId ? "Tu reporte ha verificado una alerta cercana." : "Tu reporte ha sido enviado con éxito.");
            resetForm();
            onClose();
        } catch (error: any) {
            console.error("Error creando alerta:", error);
            Alert.alert("Error", "No se pudo crear la alerta. Intenta de nuevo.");
        } finally {
            setIsPublishing(false);
        }
    };

   const resetForm = () => {
     setSelectedType(null);
     setDescription('');
   };

   /* eslint-disable react-hooks/exhaustive-deps */
   useEffect(() => {
        if (isVisible) {
            setIsMounted(true);
            scaleAnim.value = withTiming(1, { duration: 300 });
            opacityAnim.value = withTiming(1, { duration: 300 });
        } else {
            scaleAnim.value = withTiming(0.9, { duration: 200 });
            opacityAnim.value = withTiming(0, { duration: 200 }, (finished) => {
                if (finished) {
                    runOnJS(setIsMounted)(false);
                }
            });
        }
      }, [isVisible]);
   /* eslint-enable react-hooks/exhaustive-deps */

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
            <Animated.View style={[styles.card, animatedStyle]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} disabled={isPublishing}>
                        <Text style={styles.cancelText}>Cerrar</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Crear Alerta</Text>
                    <View style={{ width: 60 }} /> 
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>¿Qué está sucediendo?</Text>
                    
                    {/* Alert Type Selection Grid */}
                    <View style={styles.grid}>
                        {ALERT_TYPES.map((item) => (
                            <TouchableOpacity 
                                key={item.id}
                                style={[
                                    styles.typeButton,
                                    selectedType === item.id && { borderColor: item.color, backgroundColor: item.color + '20' }
                                ]}
                                onPress={() => setSelectedType(item.id)}
                                activeOpacity={0.7}
                            >
                                <Ionicons 
                                    name={item.icon as any} 
                                    size={32} 
                                    color={selectedType === item.id ? item.color : '#666'} 
                                />
                                <Text style={[
                                    styles.typeLabel,
                                    selectedType === item.id && { color: item.color, fontWeight: 'bold' }
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Descripción (Opcional)</Text>
                    <TextInput 
                        placeholder="Añade detalles adicionales..."
                        placeholderTextColor="#666"
                        style={styles.descriptionInput}
                        multiline
                        value={description}
                        onChangeText={setDescription}
                        maxLength={150}
                    />

                    <TouchableOpacity 
                        style={[styles.confirmButton, !selectedType && styles.confirmButtonDisabled]}
                        onPress={handleConfirm}
                        disabled={isPublishing || !selectedType}
                    >
                        {isPublishing ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.confirmButtonText}>Reportar Incidente</Text>
                        )}
                    </TouchableOpacity>
                    
                    <View style={{ height: verticalScale(30) }} />
                </ScrollView>
            </Animated.View>
        </Animated.View>
    );
};

export default NewAlert;

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    card: {
        width: width * 0.92,
        maxHeight: height * 0.85,
        backgroundColor: '#0A0A0A',
        borderRadius: ms(28),
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(18),
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
    },
    headerTitle: {
        color: 'white',
        fontSize: fs(18),
        fontWeight: 'bold',
    },
    cancelText: {
        color: '#999',
        fontSize: fs(16),
        width: 60,
    },
    content: {
        padding: ms(20),
    },
    sectionTitle: {
        color: '#999',
        fontSize: fs(14),
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: verticalScale(15),
        marginTop: verticalScale(10),
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: verticalScale(20),
    },
    typeButton: {
        width: '48%',
        backgroundColor: '#151515',
        borderRadius: ms(20),
        padding: ms(20),
        alignItems: 'center',
        marginBottom: verticalScale(15),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    typeLabel: {
        color: '#888',
        fontSize: fs(13),
        marginTop: verticalScale(10),
        textAlign: 'center',
    },
    descriptionInput: {
        backgroundColor: '#151515',
        color: 'white',
        borderRadius: ms(16),
        padding: ms(15),
        fontSize: fs(16),
        minHeight: verticalScale(80),
        textAlignVertical: 'top',
        marginBottom: verticalScale(25),
    },
    confirmButton: {
        backgroundColor: '#FF3B30',
        borderRadius: ms(18),
        paddingVertical: verticalScale(16),
        alignItems: 'center',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmButtonDisabled: {
        backgroundColor: '#333',
        shadowOpacity: 0,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: fs(16),
        fontWeight: 'bold',
    },
});
