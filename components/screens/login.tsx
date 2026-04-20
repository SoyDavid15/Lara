import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAppTheme } from '@/lib/ThemeProvider';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

interface LoginProps {
    onSwitchToRegister?: () => void;
}

const Login = ({ onSwitchToRegister }: LoginProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { colors, isDark } = useAppTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Por favor ingresa tu correo y contraseña.");
            return;
        }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (error: any) {
            let message = "Hubo un error al intentar acceder.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = "Credenciales incorrectas.";
            if (error.code === 'auth/user-not-found') message = "El usuario no existe.";
            Alert.alert("Error de Acceso", message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText} adjustsFontSizeToFit numberOfLines={1}>LARA</Text>
                        <Text style={styles.subtitleText}>
                            APLICACIÓN DE ALERTAS{"\n"}Y REPORTES LOCALES
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                            <TextInput 
                                placeholder="nombre@ejemplo.com"
                                placeholderTextColor={colors.textSecondary}
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CONTRASEÑA</Text>
                            <TextInput 
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary}
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity 
                            style={styles.mainButton} 
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={isDark ? "black" : "white"} />
                            ) : (
                                <Text style={styles.mainButtonText}>INICIAR SESIÓN</Text>
                            )}
                        </TouchableOpacity>

                        {/* Register Button */}
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

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
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
        letterSpacing: scale(-5),
    },
    subtitleText: {
        color: colors.textSecondary,
        fontSize: fs(12),
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: scale(4),
        lineHeight: fs(18),
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: verticalScale(35),
    },
    label: {
        color: colors.textSecondary,
        fontSize: fs(10),
        fontWeight: 'bold',
        letterSpacing: scale(1.5),
        marginBottom: verticalScale(5),
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        color: colors.text,
        fontSize: fs(16),
        paddingVertical: verticalScale(10),
    },
    mainButton: {
        backgroundColor: colors.text,
        height: verticalScale(55),
        borderRadius: ms(4),
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: verticalScale(20),
    },
    mainButtonText: {
        color: colors.background,
        fontSize: fs(14),
        fontWeight: 'bold',
        letterSpacing: scale(1.5),
    },
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
