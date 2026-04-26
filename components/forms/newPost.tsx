/**
 * newPost.tsx — Modal para Crear una Nueva Publicación
 *
 * Se abre cuando el usuario presiona el botón flotante (+) en el feed.
 *
 * ¿Qué hace?
 *   - Muestra un modal animado con un formulario para crear un post
 *   - El post tiene título (máx. 50 caracteres) y cuerpo (máx. 200 caracteres)
 *   - Al publicar, guarda el post en Firestore con una expiración de 24 horas
 *   - Usa animaciones de escala y opacidad (react-native-reanimated) para
 *     una entrada/salida suave del modal
 *
 * Props:
 *   isVisible → true si el modal debe mostrarse
 *   onClose   → función para cerrar el modal (llamada desde el padre)
 *
 * Estructura del documento guardado en Firestore ('posts'):
 *   title, body, createdAt, expiresAt (24h), author ("Anónimo")
 */

import { useTranslation } from '@/lib/LanguageContext';
import { db } from '@/lib/firebase';
import { fs, ms, scale, verticalScale } from '@/lib/responsive';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView, Platform,
    StyleSheet, Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

// Dimensiones de la pantalla para calcular el tamaño del modal
const { width, height } = Dimensions.get('window');

interface NewPostProps {
    isVisible: boolean;
    onClose: () => void;
}

const NewPost = ({ isVisible, onClose }: NewPostProps) => {
    const { t } = useTranslation();
    // isMounted controla si el componente está en el árbol de React
    // (false → retorna null → no renderiza nada)
    const [isMounted, setIsMounted] = useState(isVisible);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);

    const categories = [
        { id: 'arroyo', label: t('posts.categoryArroyo'), icon: 'water' },
        { id: 'accidente', label: t('posts.categoryAccidente'), icon: 'car-sport' },
        { id: 'incendio', label: t('posts.categoryIncendio'), icon: 'flame' },
        { id: 'robo', label: t('posts.categoryRobo'), icon: 'hand-right' },
    ];

    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: handlePublish
    // Valida los campos y crea el post en Firestore.
    // El post expira en 24 horas (expiresAt = ahora + 24h en ms).
    // ─────────────────────────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!category) {
            Alert.alert(t('common.error'), t('posts.selectCategoryError'));
            return;
        }
        if (!title.trim() || !body.trim()) {
            Alert.alert(t('common.error'), t('posts.bodyPlaceholder'));
            return;
        }

        setIsPublishing(true);
        try {
            // Calcular timestamp de expiración (24 horas desde ahora)
            const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

            // Crear el documento en Firestore
            await addDoc(collection(db, "posts"), {
                title: title.trim(),
                body: body.trim(),
                category: category,
                createdAt: serverTimestamp(),
                expiresAt: expiresAt,
                author: "Anónimo",
                type: 'news'
            });

            Alert.alert(t('common.success'), t('posts.success'));
            // Limpiar formulario y cerrar modal
            setTitle('');
            setBody('');
            setCategory(null);
            onClose();
        } catch (error: any) {
            console.error("Error publicando post:", error);
            Alert.alert(t('common.error'), "Hubo un problema al publicar tu post.");
        } finally {
            setIsPublishing(false);
        }
    };
    // ── Valores animados (react-native-reanimated) ───────────────────────
    const scaleAnim = useSharedValue(0);
    const opacityAnim = useSharedValue(0);

    // ─────────────────────────────────────────────────────────────────────
    // EFECTO: Animación de entrada/salida del modal
    // ─────────────────────────────────────────────────────────────────────
    /* eslint-disable react-hooks/exhaustive-deps */
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
    /* eslint-enable react-hooks/exhaustive-deps */

    // Estilo animado de la tarjeta del modal (escala + opacidad)
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleAnim.value }],
        opacity: opacityAnim.value,
    }));

    // Estilo animado del fondo oscuro semitransparente (solo opacidad)
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: opacityAnim.value,
    }));

    // Si el modal no está montado, no renderizar nada
    if (!isMounted) return null;

    return (
        // Fondo semitransparente animado
        <Animated.View style={[styles.overlay, overlayStyle]}>
            {/* Tarjeta del modal animada */}
            <Animated.View style={[styles.card, animatedStyle]}>

                {/* ── Header del modal ──────────────────────────────── */}
                <View style={styles.header}>
                    {/* Botón cancelar */}
                    <TouchableOpacity onPress={onClose} disabled={isPublishing}>
                        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('posts.createTitle')}</Text>
                    {/* Botón publicar (o spinner si está publicando) */}
                    <TouchableOpacity
                        style={[styles.postButton, (isPublishing || !category) && styles.postButtonDisabled]}
                        onPress={handlePublish}
                        disabled={isPublishing || !category}
                    >
                        {isPublishing ? (
                            <ActivityIndicator size="small" color="black" />
                        ) : (
                            <Text style={styles.postButtonText}>{t('posts.publish')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Formulario ────────────────────────────────────── */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.form}
                >
                    {/* Selección de Categoría */}
                    <Text style={styles.sectionLabel}>{t('posts.selectCategory')}</Text>
                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryItem,
                                    category === cat.id && styles.categoryItemActive
                                ]}
                                onPress={() => setCategory(cat.id)}
                            >
                                <Ionicons
                                    name={cat.icon as any}
                                    size={ms(24)}
                                    color={category === cat.id ? 'white' : '#999'}
                                />
                                <Text style={[
                                    styles.categoryLabel,
                                    category === cat.id && styles.categoryLabelActive
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Campo: Título */}
                    <View style={{ marginTop: verticalScale(10) }}>
                        <TextInput
                            placeholder={t('posts.titlePlaceholder')}
                            placeholderTextColor="#666"
                            style={styles.titleInput}
                            value={title}
                            onChangeText={setTitle}
                            editable={!isPublishing}
                            maxLength={50}
                        />
                        <Text style={[
                            styles.charCount,
                            title.length >= 45 ? styles.charCountWarning : null
                        ]}>
                            {title.length} / 50
                        </Text>
                    </View>

                    {/* Campo: Cuerpo del post */}
                    <View>
                        <TextInput
                            placeholder={t('posts.bodyPlaceholder')}
                            placeholderTextColor="#666"
                            style={styles.bodyInput}
                            multiline
                            value={body}
                            onChangeText={setBody}
                            editable={!isPublishing}
                            maxLength={200}
                        />
                        <Text style={[
                            styles.charCount,
                            body.length >= 190 ? styles.charCountWarning : null
                        ]}>
                            {body.length} / 200
                        </Text>
                    </View>
                </KeyboardAvoidingView>

            </Animated.View>
        </Animated.View>
    );
};

export default NewPost;


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS (estáticos, no dependen del tema porque el modal siempre es oscuro)
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Fondo semitransparente que cubre toda la pantalla
    overlay: {
        ...StyleSheet.absoluteFillObject, // Posición absoluta cubriendo todo
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000, // Encima de todo el contenido
    },
    // Tarjeta del modal
    card: {
        width: width * 0.9,     // 90% del ancho de pantalla
        maxHeight: height * 0.8, // Máximo 80% del alto
        backgroundColor: '#111',
        borderRadius: ms(24),
        borderWidth: 1,
        borderColor: '#333',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(20),
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    headerTitle: {
        color: 'white',
        fontSize: fs(18),
        fontWeight: 'bold',
    },
    cancelText: {
        color: '#999',
        fontSize: fs(16),
    },
    // Botón "Publicar" (fondo blanco, texto negro)
    postButton: {
        backgroundColor: 'white',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: ms(20),
        minWidth: scale(80),
        alignItems: 'center',
    },
    postButtonDisabled: { opacity: 0.5 },
    postButtonText: {
        color: 'black',
        fontWeight: 'bold',
    },
    sectionLabel: {
        color: '#999',
        fontSize: fs(14),
        fontWeight: 'bold',
        marginBottom: verticalScale(15),
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: ms(10),
        marginBottom: verticalScale(20),
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
        borderRadius: ms(12),
        borderWidth: 1,
        borderColor: '#333',
    },
    categoryItemActive: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    categoryLabel: {
        color: '#666',
        marginLeft: scale(8),
        fontSize: fs(14),
        fontWeight: '600',
    },
    categoryLabelActive: {
        color: 'white',
    },
    form: { padding: ms(20) },
    titleInput: {
        color: 'white',
        fontSize: fs(22),
        fontWeight: 'bold',
        marginBottom: verticalScale(15),
    },
    bodyInput: {
        color: 'white',
        fontSize: fs(16),
        minHeight: verticalScale(120),
        textAlignVertical: 'top', // El texto empieza desde arriba en Android
        marginBottom: verticalScale(20),
    },
    mediaSection: {
        borderTopWidth: 1,
        borderTopColor: '#222',
        paddingTop: verticalScale(20),
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        padding: ms(15),
        borderRadius: ms(16),
        justifyContent: 'center',
    },
    mediaButtonText: {
        color: 'white',
        marginLeft: scale(10),
        fontWeight: '600',
    },
    // Contador de caracteres
    charCount: {
        color: '#666',
        fontSize: fs(12),
        textAlign: 'right',
        marginTop: verticalScale(-15),
        marginBottom: verticalScale(10),
        fontWeight: '500',
    },
    // Contador en rojo cuando se acerca al límite
    charCountWarning: { color: '#FF3B30' }
});
