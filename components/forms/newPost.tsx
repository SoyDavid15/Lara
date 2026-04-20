import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

const { width, height } = Dimensions.get('window');

interface NewPostProps {
    isVisible: boolean;
    onClose: () => void;
}

const NewPost = ({ isVisible, onClose }: NewPostProps) => {
    const [isMounted, setIsMounted] = useState(isVisible);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    const handlePublish = async () => {
        if (!title.trim() || !body.trim()) {
            Alert.alert("Error", "Por favor completa el título y el contenido.");
            return;
        }

        setIsPublishing(true);
        try {
            // Calculate expiration (24 hours from now)
            const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

            await addDoc(collection(db, "posts"), {
                title: title.trim(),
                body: body.trim(),
                createdAt: serverTimestamp(),
                expiresAt: expiresAt,
                author: "Anónimo"
            });

            Alert.alert("Éxito", "Post publicado con éxito (durará 24h)");
            setTitle('');
            setBody('');
            onClose();
        } catch (error: any) {
            console.error("Error publicando post:", error);
            // Better error diagnostic for the user
            let errorMessage = "Hubo un problema al publicar tu post.";
            if (error.code === 'permission-denied') {
                errorMessage = "Permiso denegado. Revisa las reglas de seguridad de Firestore.";
            } else if (error.code === 'not-found') {
                errorMessage = "No se encontró la base de datos o la colección.";
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            Alert.alert("Error de Publicación", errorMessage);
       } finally {
         setIsPublishing(false);
       }
     };

     /* eslint-disable react-hooks/exhaustive-deps */
     useEffect(() => {
         if (isVisible) {
             setIsMounted(true);
             scale.value = withTiming(1, { duration: 300 });
             opacity.value = withTiming(1, { duration: 300 });
         } else {
             scale.value = withTiming(0, { duration: 200 });
             opacity.value = withTiming(0, { duration: 200 }, (finished) => {
                 if (finished) {
                     runOnJS(setIsMounted)(false);
                 }
             });
         }
       }, [isVisible]);
     /* eslint-enable react-hooks/exhaustive-deps */

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    if (!isMounted) return null;

    return (
        <Animated.View style={[styles.overlay, overlayStyle]}>
            <Animated.View style={[styles.card, animatedStyle]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} disabled={isPublishing}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Nuevo Post</Text>
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

                {/* Form Fields */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.form}
                >
                    <View>
                        <TextInput 
                            placeholder="Título de tu noticia"
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
                    <View>
                        <TextInput 
                            placeholder="¿Qué está pasando?"
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

                    {/* Media Section */}
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

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    card: {
        width: width * 0.9,
        maxHeight: height * 0.8,
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
    postButton: {
        backgroundColor: 'white',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        borderRadius: ms(20),
        minWidth: scale(80),
        alignItems: 'center',
    },
    postButtonDisabled: {
        opacity: 0.5,
    },
    postButtonText: {
        color: 'black',
        fontWeight: 'bold',
    },
    form: {
        padding: ms(20),
    },
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
        textAlignVertical: 'top',
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
    charCount: {
        color: '#666',
        fontSize: fs(12),
        textAlign: 'right',
        marginTop: verticalScale(-15),
        marginBottom: verticalScale(10),
        fontWeight: '500',
    },
    charCountWarning: {
        color: '#FF3B30', // Apple-style red
    }
});
