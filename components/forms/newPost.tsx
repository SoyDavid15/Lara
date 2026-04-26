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

import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Dimensions, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS
} from 'react-native-reanimated';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

// Dimensiones de la pantalla para calcular el tamaño del modal
const { width, height } = Dimensions.get('window');

interface NewPostProps {
    isVisible: boolean;
    onClose: () => void;
}

const NewPost = ({ isVisible, onClose }: NewPostProps) => {
    // isMounted controla si el componente está en el árbol de React
    // (false → retorna null → no renderiza nada)
    const [isMounted, setIsMounted]     = useState(isVisible);
    const [title, setTitle]             = useState('');
    const [body, setBody]               = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // ── Valores animados (react-native-reanimated) ───────────────────────
    // useSharedValue → valores que corren en el hilo de UI (más fluido que Animated API)
    const scaleAnim   = useSharedValue(0);  // Escala del modal (0=invisible, 1=tamaño completo)
    const opacityAnim = useSharedValue(0);  // Opacidad del fondo oscuro


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: handlePublish
    // Valida los campos y crea el post en Firestore.
    // El post expira en 24 horas (expiresAt = ahora + 24h en ms).
    // ─────────────────────────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!title.trim() || !body.trim()) {
            Alert.alert("Error", "Por favor completa el título y el contenido.");
            return;
        }

        setIsPublishing(true);
        try {
            // Calcular timestamp de expiración (24 horas desde ahora)
            const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

            // Crear el documento en Firestore
            await addDoc(collection(db, "posts"), {
                title:     title.trim(),
                body:      body.trim(),
                createdAt: serverTimestamp(), // Timestamp del servidor (no del cliente)
                expiresAt: expiresAt,
                author:    "Anónimo"          // TODO: Usar nombre real del usuario
            });

            Alert.alert("Éxito", "Post publicado con éxito (durará 24h)");
            // Limpiar formulario y cerrar modal
            setTitle('');
            setBody('');
            onClose();
        } catch (error: any) {
            console.error("Error publicando post:", error);
            // Mensajes de error descriptivos según el tipo de error
            let errorMessage = "Hubo un problema al publicar tu post.";
            if (error.code === 'permission-denied')
                errorMessage = "Permiso denegado. Revisa las reglas de seguridad de Firestore.";
            else if (error.code === 'not-found')
                errorMessage = "No se encontró la base de datos o la colección.";
            else if (error.message)
                errorMessage = `Error: ${error.message}`;
            Alert.alert("Error de Publicación", errorMessage);
        } finally {
            setIsPublishing(false);
        }
    };


    // ─────────────────────────────────────────────────────────────────────
    // EFECTO: Animación de entrada/salida del modal
    // Cuando isVisible cambia a true → animar aparición
    // Cuando isVisible cambia a false → animar desaparición y desmontar
    //
    // runOnJS → llama a funciones de React (setState) desde el hilo de animación
    // ─────────────────────────────────────────────────────────────────────
    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        if (isVisible) {
            setIsMounted(true); // Montar primero, luego animar
            scaleAnim.value   = withTiming(1, { duration: 300 });
            opacityAnim.value = withTiming(1, { duration: 300 });
        } else {
            // Animar salida, luego desmontar cuando termine
            scaleAnim.value   = withTiming(0, { duration: 200 });
            opacityAnim.value = withTiming(0, { duration: 200 }, (finished) => {
                if (finished) {
                    runOnJS(setIsMounted)(false); // Desmontar DESPUÉS de que termina la animación
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
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Nuevo Post</Text>
                    {/* Botón publicar (o spinner si está publicando) */}
                    <TouchableOpacity
                        style={[styles.postButton, isPublishing && styles.postButtonDisabled]}
                        onPress={handlePublish}
                        disabled={isPublishing}
                    >
                        {isPublishing ? (
                            <ActivityIndicator size="small" color="black" />
                        ) : (
                            <Text style={styles.postButtonText}>Publicar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Formulario ────────────────────────────────────── */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.form}
                >
                    {/* Campo: Título */}
                    <View>
                        <TextInput
                            placeholder="Título de tu noticia"
                            placeholderTextColor="#666"
                            style={styles.titleInput}
                            value={title}
                            onChangeText={setTitle}
                            editable={!isPublishing}
                            maxLength={50} // Límite de caracteres del título
                        />
                        {/* Contador de caracteres (se pone rojo al acercarse al límite) */}
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
                            placeholder="¿Qué está pasando?"
                            placeholderTextColor="#666"
                            style={styles.bodyInput}
                            multiline // Permite múltiples líneas
                            value={body}
                            onChangeText={setBody}
                            editable={!isPublishing}
                            maxLength={200} // Límite de caracteres del cuerpo
                        />
                        <Text style={[
                            styles.charCount,
                            body.length >= 190 ? styles.charCountWarning : null
                        ]}>
                            {body.length} / 200
                        </Text>
                    </View>

                    {/* Sección multimedia (TODO: implementar carga de fotos/videos) */}
                    <View style={styles.mediaSection}>
                        <TouchableOpacity style={styles.mediaButton}>
                            <Ionicons name="images-outline" size={24} color="#FFF" />
                            <Text style={styles.mediaButtonText}>Agregar Foto o Video</Text>
                        </TouchableOpacity>
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
