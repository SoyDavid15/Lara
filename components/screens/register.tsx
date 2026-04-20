import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAppTheme } from '@/lib/ThemeProvider';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

interface RegisterProps {
    onSwitchToLogin?: () => void;
}

const Register = ({ onSwitchToLogin }: RegisterProps) => {
    const [birthDate, setBirthDate] = useState('');
    const [username, setUsername] = useState('');
    const [city, setCity] = useState('');
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [activePicker, setActivePicker] = useState<'city' | 'gender' | null>(null);

    const genderOptions = ['Femenino', 'Masculino', 'Otro', 'Prefiero no decirlo'];
    const cityOptions = [
        'Barranquilla', 'Buenaventura', 'Cartagena', 'Ciénaga', 'Coveñas', 
        'Guapi', 'Lorica', 'Maicao', 'Malambo', 'Montería', 
        'Nuquí', 'Puerto Colombia', 'Quibdó', 'Riohacha', 'Santa Marta', 
        'Sincelejo', 'Soledad', 'Tolú', 'Tumaco', 'Uribia', 
        'Valledupar', 'Otra'
    ];

    const handleBirthDateChange = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length >= 3 && cleaned.length <= 4) {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        } else if (cleaned.length > 4) {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
        }
        setBirthDate(formatted);
    };
    
    // Estos campos son necesarios para la creación de la cuenta en Firebase
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    
    const { colors, isDark } = useAppTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const handleNextStep = () => {
        setStep(2);
    };

    const handlePrevStep = () => {
        setStep(1);
    };

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Por favor ingresa un correo y contraseña para el registro.");
            return;
        }
        // Validar que se hayan llenado los datos del paso 1
        if (!birthDate || !username || !city || !fullName || !gender) {
            Alert.alert("Datos incompletos", "Por favor, vuelve al paso anterior y llena todos tus datos personales.");
            return;
        }
        
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            // Guardar el perfil en Firestore
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                email: email.trim(),
                birthDate,
                username,
                city,
                fullName,
                gender,
                createdAt: serverTimestamp(),
            });

            Alert.alert("Éxito", "Cuenta creada correctamente.");
            // Firebase inicia sesión automáticamente al crear cuenta, por lo que serás redirigido al inicio.
        } catch (error: any) {
            let message = "No se pudo crear la cuenta.";
            if (error.code === 'auth/email-already-in-use') message = "Este correo ya está registrado.";
            if (error.code === 'auth/weak-password') message = "La contraseña debe tener al menos 6 caracteres.";
            Alert.alert("Error de Registro", message);
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
                    {/* Header Section */}
                    <View style={styles.headerContainer}>
                        <Text style={styles.headerText}>CREAR CUENTA</Text>
                        <Text style={styles.subtitleText}>
                            ÚNETE A LA REVOLUCIÓN DE LARA
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.form}>
                        {step === 1 ? (
                            <View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>FECHA DE NACIMIENTO</Text>
                                    <TextInput 
                                        placeholder="DD/MM/AAAA"
                                        placeholderTextColor={colors.textSecondary}
                                        style={styles.input}
                                        value={birthDate}
                                        onChangeText={handleBirthDateChange}
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>NOMBRE DE USUARIO</Text>
                                    <TextInput 
                                        placeholder="ej. lara_user99"
                                        placeholderTextColor={colors.textSecondary}
                                        style={styles.input}
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>CIUDAD DE RESIDENCIA</Text>
                                    <TouchableOpacity 
                                        onPress={() => setActivePicker('city')}
                                    >
                                        <Text style={[styles.input, { color: city ? colors.text : colors.textSecondary }]}>
                                            {city || 'Selecciona tu ciudad'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>NOMBRE COMPLETO</Text>
                                    <TextInput 
                                        placeholder="ej. Laura García"
                                        placeholderTextColor={colors.textSecondary}
                                        style={styles.input}
                                        value={fullName}
                                        onChangeText={setFullName}
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>SEXO</Text>
                                    <TouchableOpacity 
                                        onPress={() => setActivePicker('gender')}
                                    >
                                        <Text style={[styles.input, { color: gender ? colors.text : colors.textSecondary }]}>
                                            {gender || 'Selecciona tu sexo'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Next Button */}
                                <TouchableOpacity 
                                    style={styles.mainButton} 
                                    onPress={handleNextStep}
                                >
                                    <Text style={styles.mainButtonText}>SIGUIENTE</Text>
                                </TouchableOpacity>

                                {/* Back Button */}
                                <TouchableOpacity 
                                    style={styles.secondaryButton} 
                                    onPress={onSwitchToLogin}
                                >
                                    <Text style={styles.secondaryButtonText}>VOLVER AL LOGIN</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                {/* Campos de acceso */}
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

                                {/* Register Button */}
                                <TouchableOpacity 
                                    style={styles.mainButton} 
                                    onPress={handleRegister}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={isDark ? "black" : "white"} />
                                    ) : (
                                        <Text style={styles.mainButtonText}>CREAR MI CUENTA</Text>
                                    )}
                                </TouchableOpacity>

                                {/* Back to Step 1 Button */}
                                <TouchableOpacity 
                                    style={styles.secondaryButton} 
                                    onPress={handlePrevStep}
                                    disabled={loading}
                                >
                                    <Text style={styles.secondaryButtonText}>VOLVER AL PASO ANTERIOR</Text>
                                </TouchableOpacity>

                                {/* Back to Login Button */}
                                <TouchableOpacity 
                                    style={[styles.secondaryButton, { marginTop: -10, borderWidth: 0 }]} 
                                    onPress={onSwitchToLogin}
                                    disabled={loading}
                                >
                                    <Text style={styles.secondaryButtonText}>CANCELAR REGISTRO</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={activePicker !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActivePicker(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {activePicker === 'city' ? 'Selecciona tu ciudad' : 'Selecciona tu sexo'}
                            </Text>
                            <TouchableOpacity onPress={() => setActivePicker(null)}>
                                <Text style={styles.modalCloseText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={activePicker === 'city' ? cityOptions : genderOptions}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.modalOption}
                                    onPress={() => {
                                        if (activePicker === 'city') setCity(item);
                                        else setGender(item);
                                        setActivePicker(null);
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

export default Register;

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: verticalScale(50),
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(40),
    },
    headerContainer: {
        alignItems: 'flex-start',
        marginBottom: verticalScale(40),
    },
    headerText: {
        color: colors.text,
        fontSize: fs(32),
        fontWeight: '900',
        letterSpacing: scale(-1),
        marginBottom: verticalScale(10),
    },
    subtitleText: {
        color: colors.textSecondary,
        fontSize: fs(10),
        fontWeight: '600',
        letterSpacing: scale(2),
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: verticalScale(25),
    },
    label: {
        color: colors.textSecondary,
        fontSize: fs(10),
        fontWeight: 'bold',
        letterSpacing: scale(1.5),
        marginBottom: verticalScale(5),
        textTransform: 'uppercase',
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
        marginTop: verticalScale(30),
        marginBottom: verticalScale(20),
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
        marginTop: verticalScale(5),
        marginBottom: verticalScale(20),
    },
    secondaryButtonText: {
        color: colors.textSecondary,
        fontSize: fs(14),
        fontWeight: 'bold',
        letterSpacing: scale(1.5),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: ms(20),
        borderTopRightRadius: ms(20),
        maxHeight: '60%',
        paddingBottom: verticalScale(20),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: ms(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        color: colors.text,
        fontSize: fs(16),
        fontWeight: 'bold',
    },
    modalCloseText: {
        color: colors.text,
        fontSize: fs(14),
    },
    modalOption: {
        padding: ms(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalOptionText: {
        color: colors.text,
        fontSize: fs(16),
    }
});
