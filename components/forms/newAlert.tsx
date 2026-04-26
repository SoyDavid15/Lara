/**
 * newAlert.tsx — Modal para Crear una Nueva Alerta de Incidente
 *
 * Componente avanzado que permite al usuario reportar incidentes en su zona.
 *
 * ¿Qué hace?
 *   - Muestra un modal animado con un formulario para reportar un incidente
 *   - 4 tipos de alerta: Robo, Accidente, Arroyo, Incendio
 *   - Descripción opcional (máx. 150 caracteres)
 *   - Al confirmar, implementa dos lógicas especiales:
 *
 *     1. RATE LIMITING: El usuario solo puede crear 1 alerta cada 3 horas.
 *
 *     2. FUSIÓN DE ALERTAS (Alert Merging):
 *        Si ya existe una alerta del mismo tipo y "activa" a menos de 500 metros,
 *        en vez de crear una nueva, el reporte SE SUMA a la existente aumentando
 *        su `reportCount` y marcándola como `verified: true`.
 *        Esto evita duplicados y da más credibilidad a alertas con múltiples reportes.
 *
 *   - La alerta expira en 3 horas (expiresAt).
 *   - Requiere que el SafeWalk esté activo (necesita la ubicación del usuario).
 *
 * Estructura del documento en Firestore ('alerts'):
 *   type, typeName, description, latitude, longitude, createdAt, expiresAt,
 *   userId, status, verified, reportCount, reporterIds
 *
 * Props:
 *   isVisible → true si el modal debe mostrarse
 *   onClose   → función para cerrar el modal
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Dimensions, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS
} from 'react-native-reanimated';
import { db, auth } from '@/lib/firebase';
import {
  collection, addDoc, serverTimestamp, Timestamp,
  getDocs, query, where, limit, updateDoc, doc
} from 'firebase/firestore';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';
import { useSafeWalk } from '@/lib/SafeWalkContext';
import { getDistanceFromLatLonInMeters } from '@/lib/location-service';

const { width, height } = Dimensions.get('window');

interface NewAlertProps {
    isVisible: boolean;
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE ALERTA
// Para agregar un nuevo tipo: añadir aquí y actualizar la UI si es necesario.
// ─────────────────────────────────────────────────────────────────────────────
const ALERT_TYPES = [
    { id: 'robo',      label: 'Robo',                icon: 'hand-right-outline', color: '#FF3B30' },
    { id: 'accidente', label: 'Accidente de tránsito', icon: 'car-sport-outline',  color: '#FF9500' },
    { id: 'arroyo',    label: 'Arroyo',               icon: 'water-outline',      color: '#007AFF' },
    { id: 'incendio',  label: 'Incendio',             icon: 'flame-outline',      color: '#FF453A' },
];

const NewAlert = ({ isVisible, onClose }: NewAlertProps) => {
    // Obtener la ubicación actual del SafeWalk (necesaria para crear una alerta)
    const { location } = useSafeWalk();

    // isMounted controla si el componente está en el árbol de React
    const [isMounted, setIsMounted]     = useState(isVisible);
    const [selectedType, setSelectedType] = useState<string | null>(null); // Tipo seleccionado
    const [description, setDescription] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // Animaciones del modal (entrada/salida suave)
    const scaleAnim   = useSharedValue(0.9);
    const opacityAnim = useSharedValue(0);


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: handleConfirm
    // Proceso completo para crear o fusionar una alerta:
    //
    // 1. Validar que hay tipo seleccionado y ubicación disponible
    // 2. RATE LIMITING: Verificar si el usuario ya creó una alerta en las últimas 3h
    // 3. FUSIÓN: Buscar alertas cercanas del mismo tipo ya activas
    //    → Si hay una a menos de 500m: sumar el reporte a esa alerta
    //    → Si no hay ninguna: crear nueva alerta
    // ─────────────────────────────────────────────────────────────────────
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

            // ── Paso 1: Rate Limiting (máx. 1 alerta cada 3 horas) ────────
            const qUser = query(
                collection(db, "alerts"),
                where("userId", "==", user.uid),
                limit(5) // Solo revisar las más recientes
            );
            const userSnapshot = await getDocs(qUser);
            const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000; // 3h en ms

            const hasRecentAlert = userSnapshot.docs.some(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
                return createdAt > threeHoursAgo; // ¿Creó una alerta en las últimas 3h?
            });

            if (hasRecentAlert) {
                Alert.alert("Límite alcanzado", "Debe esperar 3 horas para crear una nueva alerta.");
                setIsPublishing(false);
                return;
            }

            // ── Paso 2: Buscar alertas cercanas para fusionar ─────────────
            // Buscar alertas activas del mismo tipo (no expiradas)
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

                // Calcular distancia entre la ubicación actual y la alerta existente
                const dist = getDistanceFromLatLonInMeters(
                    location.latitude,  location.longitude,
                    data.latitude,      data.longitude
                );

                // Si la alerta está a menos de 500m y fue creada por otro usuario
                if (dist <= 500 && data.userId !== user.uid) {
                    mergedAlertId = docSnap.id;
                    const reporterIds = data.reporterIds || [data.userId];

                    // Solo sumar si el usuario no ha reportado esta alerta antes
                    if (!reporterIds.includes(user.uid)) {
                        reporterIds.push(user.uid);
                        await updateDoc(doc(db, "alerts", docSnap.id), {
                            verified: true,               // Ahora está verificada (múltiples reportes)
                            reportCount: (data.reportCount || 1) + 1,
                            reporterIds: reporterIds,
                        });
                    }
                    break; // Solo fusionar con la primera alerta cercana que se encuentre
                }
            }

            // ── Paso 3: Si no se fusionó, crear nueva alerta ──────────────
            if (!mergedAlertId) {
                const expiresAt = Timestamp.fromMillis(Date.now() + 3 * 60 * 60 * 1000); // 3 horas
                await addDoc(collection(db, "alerts"), {
                    type:        selectedType,
                    typeName:    ALERT_TYPES.find(t => t.id === selectedType)?.label,
                    description: description.trim(),
                    latitude:    location.latitude,
                    longitude:   location.longitude,
                    createdAt:   serverTimestamp(),
                    expiresAt:   expiresAt,
                    userId:      user.uid,
                    status:      "active",
                    verified:    false,   // Empieza sin verificar (1 solo reporte)
                    reportCount: 1,
                    reporterIds: [user.uid]
                });
            }

            // Mensaje diferente si se fusionó o se creó nueva
            Alert.alert(
                "Éxito",
                mergedAlertId
                    ? "Tu reporte ha verificado una alerta cercana."
                    : "Tu reporte ha sido enviado con éxito."
            );

            resetForm();
            onClose();
        } catch (error: any) {
            console.error("Error creando alerta:", error);
            Alert.alert("Error", "No se pudo crear la alerta. Intenta de nuevo.");
        } finally {
            setIsPublishing(false);
        }
    };


    // Limpiar el formulario (se llama tras publicar o al cancelar)
    const resetForm = () => {
        setSelectedType(null);
        setDescription('');
    };


    // ─────────────────────────────────────────────────────────────────────
    // EFECTO: Animación de entrada/salida del modal (igual que en newPost.tsx)
    // ─────────────────────────────────────────────────────────────────────
    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        if (isVisible) {
            setIsMounted(true);
            scaleAnim.value   = withTiming(1, { duration: 300 });
            opacityAnim.value = withTiming(1, { duration: 300 });
        } else {
            scaleAnim.value   = withTiming(0.9, { duration: 200 });
            opacityAnim.value = withTiming(0, { duration: 200 }, (finished) => {
                if (finished) {
                    runOnJS(setIsMounted)(false); // Desmontar al terminar la animación
                }
            });
        }
    }, [isVisible]);
    /* eslint-enable react-hooks/exhaustive-deps */

    // Estilos animados de la tarjeta y el fondo
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

                {/* ── Header del modal ──────────────────────────────── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} disabled={isPublishing}>
                        <Text style={styles.cancelText}>Cerrar</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Crear Alerta</Text>
                    <View style={{ width: 60 }} /> {/* Espaciador para centrar el título */}
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* ── Selección del tipo de incidente ──────────── */}
                    <Text style={styles.sectionTitle}>¿Qué está sucediendo?</Text>

                    {/* Grid 2x2 de botones de tipo de alerta */}
                    <View style={styles.grid}>
                        {ALERT_TYPES.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.typeButton,
                                    // Resaltar el botón seleccionado con el color del tipo
                                    selectedType === item.id && {
                                        borderColor: item.color,
                                        backgroundColor: item.color + '20' // 20 = 12% opacidad en hex
                                    }
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

                    {/* ── Campo de descripción opcional ────────────── */}
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

                    {/* ── Botón de confirmación ─────────────────────── */}
                    {/* Deshabilitado si no hay tipo seleccionado */}
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


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS (estáticos, el modal siempre es oscuro independientemente del tema)
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Fondo semitransparente que cubre toda la pantalla
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000, // Por encima del modal de nuevo post (zIndex 1000)
    },
    // Tarjeta del modal
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
    content: { padding: ms(20) },
    sectionTitle: {
        color: '#999',
        fontSize: fs(14),
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: verticalScale(15),
        marginTop: verticalScale(10),
    },
    // Contenedor en cuadrícula de 2 columnas para los tipos de alerta
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: verticalScale(20),
    },
    // Cada botón de tipo ocupa el 48% del ancho (2 por fila con espacio entre ellos)
    typeButton: {
        width: '48%',
        backgroundColor: '#151515',
        borderRadius: ms(20),
        padding: ms(20),
        alignItems: 'center',
        marginBottom: verticalScale(15),
        borderWidth: 2,
        borderColor: 'transparent', // Sin borde por defecto, se colorea al seleccionar
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
    // Botón de confirmación (rojo con sombra)
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
    // Estado deshabilitado (gris, sin sombra)
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
