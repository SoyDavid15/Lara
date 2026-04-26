/**
 * login.tsx — Pantalla de Inicio de Sesión
 *
 * Componente que se muestra cuando no hay sesión activa.
 * Se renderiza desde _layout.tsx cuando auth.currentUser === null.
 *
 * ¿Qué hace?
 *   - Muestra el logo LARA
 *   - Permite al usuario ingresar su correo y contraseña
 *   - Llama a Firebase para autenticar al usuario
 *   - Al autenticarse, onAuthStateChanged en _layout.tsx detecta el cambio
 *     y navega automáticamente al Drawer (sin navigator.navigate() explícito)
 *   - Botón para ir a la pantalla de Registro
 *
 * Props:
 *   onSwitchToRegister → función que le dice al padre (_layout.tsx) que
 *                        muestre el formulario de registro
 */

import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAppTheme } from '@/lib/ThemeProvider';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

interface LoginProps {
    onSwitchToRegister?: () => void; // Callback para cambiar a pantalla de registro
}

const Login = ({ onSwitchToRegister }: LoginProps) => {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading]   = useState(false);

    const { colors, isDark } = useAppTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: handleLogin
    // Valida los campos e intenta autenticar con Firebase Auth.
    // Firebase maneja la sesión automáticamente; al éxito, onAuthStateChanged
    // en _layout.tsx detecta el cambio y muestra el Drawer.
    // ─────────────────────────────────────────────────────────────────────
    const handleLogin = async () => {
        // Validación básica de campos vacíos
        if (!email || !password) {
            Alert.alert("Error", "Por favor ingresa tu correo y contraseña.");
            return;
        }

        setLoading(true); // Mostrar spinner en el botón
        try {
            // email.trim() → eliminar espacios accidentales al inicio/final
            await signInWithEmailAndPassword(auth, email.trim(), password);
            // Si llega aquí sin error, el login fue exitoso.
            // _layout.tsx detecta el cambio de estado y navega automáticamente.
        } catch (error: any) {
            // Traducir los códigos de error de Firebase a mensajes legibles
            let message = "Hubo un error al intentar acceder.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
                message = "Credenciales incorrectas.";
            if (error.code === 'auth/user-not-found')
                message = "El usuario no existe.";
            Alert.alert("Error de Acceso", message);
        } finally {
            setLoading(false); // Siempre ocultar el spinner al terminar
        }
    };


    // ─────────────────────────────────────────────────────────────────────
    // RENDER
    // KeyboardAvoidingView → empuja el contenido hacia arriba cuando aparece
    // el teclado virtual, evitando que tape los campos de texto.
    // ScrollView → permite desplazar si el contenido no cabe en pantalla.
    // ─────────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled" // Permite tocar botones sin cerrar el teclado
            >
                <View style={styles.content}>

                    {/* ── Logo ─────────────────────────────────────────── */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText} adjustsFontSizeToFit numberOfLines={1}>
                            LARA
                        </Text>
                        <Text style={styles.subtitleText}>
                            APLICACIÓN DE ALERTAS{"\n"}Y REPORTES LOCALES
                        </Text>
                    </View>

                    {/* ── Formulario ───────────────────────────────────── */}
                    <View style={styles.form}>

                        {/* Campo: Correo electrónico */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                            <TextInput
                                placeholder="nombre@ejemplo.com"
                                placeholderTextColor={colors.textSecondary}
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"      // No capitalizar automáticamente
                                keyboardType="email-address" // Teclado optimizado para email
                            />
                        </View>

                        {/* Campo: Contraseña */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CONTRASEÑA</Text>
                            <TextInput
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary}
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry // Ocultar el texto mientras se escribe
                            />
                        </View>

                        {/* Botón principal: Iniciar sesión
                            Muestra spinner mientras loading=true */}
                        <TouchableOpacity
                            style={styles.mainButton}
                            onPress={handleLogin}
                            disabled={loading} // Deshabilitar durante la petición
                        >
                            {loading ? (
                                <ActivityIndicator color={isDark ? "black" : "white"} />
                            ) : (
                                <Text style={styles.mainButtonText}>INICIAR SESIÓN</Text>
                            )}
                        </TouchableOpacity>

                        {/* Botón secundario: Ir a registro */}
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onSwitchToRegister}
                            disabled={loading}
                        >
                            <Text style={styles.secondaryButtonText}>REGISTRARSE</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default Login;


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
        flexGrow: 1,          // Permite que el scroll crezca para centrar el contenido
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(40),
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: verticalScale(80),
    },
    logoText: {
        color: colors.text,
        fontSize: fs(100),
        fontWeight: '900',
        letterSpacing: scale(-5), // Letras muy juntas para el logo
    },
    subtitleText: {
        color: colors.textSecondary,
        fontSize: fs(12),
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: scale(4),  // Letras espaciadas para el subtítulo
        lineHeight: fs(18),
    },
    form: { width: '100%' },
    inputGroup: { marginBottom: verticalScale(35) },
    label: {
        color: colors.textSecondary,
        fontSize: fs(10),
        fontWeight: 'bold',
        letterSpacing: scale(1.5),
        marginBottom: verticalScale(5),
    },
    // Input con solo borde inferior (estilo minimal)
    input: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        color: colors.text,
        fontSize: fs(16),
        paddingVertical: verticalScale(10),
    },
    // Botón principal (fondo del color del texto para contrastar)
    mainButton: {
        backgroundColor: colors.text,
        height: verticalScale(55),
        borderRadius: ms(4),
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: verticalScale(20),
    },
    mainButtonText: {
        color: colors.background,  // Invertido: texto del color del fondo
        fontSize: fs(14),
        fontWeight: 'bold',
        letterSpacing: scale(1.5),
    },
    // Botón secundario (transparente con borde)
    secondaryButton: {
        backgroundColor: 'transparent',
        height: verticalScale(55),
        borderRadius: ms(4),
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: verticalScale(15),
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: fs(14),
        fontWeight: 'bold',
        letterSpacing: scale(1.5),
    }
});
