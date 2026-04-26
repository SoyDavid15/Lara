/**
 * register.tsx — Pantalla de Registro de Usuario
 *
 * Se muestra desde _layout.tsx cuando el usuario pulsa "Registrarse" en el Login.
 *
 * ¿Qué hace?
 *   Guía al usuario por un proceso de 2 pasos para crear su cuenta:
 *
 *   PASO 1 — Datos personales:
 *     - Fecha de nacimiento (con formato automático DD/MM/AAAA)
 *     - Nombre de usuario (@username)
 *     - Ciudad (selector modal con lista de ciudades costeras colombianas)
 *     - Nombre completo
 *     - Sexo (selector modal)
 *
 *   PASO 2 — Credenciales de acceso:
 *     - Correo electrónico
 *     - Contraseña
 *     - Botón "Crear mi cuenta"
 *
 * ¿Qué hace al registrar?
 *   1. Crea el usuario en Firebase Authentication (email + contraseña)
 *   2. Guarda el perfil completo en Firestore 'users/{uid}'
 *   3. Firebase inicia sesión automáticamente → _layout.tsx navega al Drawer
 *
 * Props:
 *   onSwitchToLogin → función para volver a la pantalla de Login
 */

import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Modal, FlatList
} from 'react-native';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAppTheme } from '@/lib/ThemeProvider';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

interface RegisterProps {
    onSwitchToLogin?: () => void; // Callback para volver al Login
}

const Register = ({ onSwitchToLogin }: RegisterProps) => {

    // ── Estados del formulario (Paso 1: datos personales) ────────────────
    const [birthDate, setBirthDate] = useState('');
    const [username, setUsername]   = useState('');
    const [city, setCity]           = useState('');
    const [fullName, setFullName]   = useState('');
    const [gender, setGender]       = useState('');

    // Controla qué selector modal está abierto: 'city' | 'gender' | null (cerrado)
    const [activePicker, setActivePicker] = useState<'city' | 'gender' | null>(null);

    // ── Opciones de los selectores modales ───────────────────────────────
    const genderOptions = ['Femenino', 'Masculino', 'Otro', 'Prefiero no decirlo'];

    // Ciudades costeras colombianas ordenadas alfabéticamente
    const cityOptions = [
        'Barranquilla', 'Buenaventura', 'Cartagena', 'Ciénaga', 'Coveñas',
        'Guapi', 'Lorica', 'Maicao', 'Malambo', 'Montería',
        'Nuquí', 'Puerto Colombia', 'Quibdó', 'Riohacha', 'Santa Marta',
        'Sincelejo', 'Soledad', 'Tolú', 'Tumaco', 'Uribia',
        'Valledupar', 'Otra'
    ];

    // ── Estados del formulario (Paso 2: credenciales) ────────────────────
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading]   = useState(false);

    // Controla el paso actual: 1 (datos personales) o 2 (credenciales)
    const [step, setStep] = useState(1);

    const { colors, isDark } = useAppTheme();
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: handleBirthDateChange
    // Formatea automáticamente la fecha mientras el usuario escribe.
    // Ejemplo: "21041990" → "21/04/1990"
    // Solo permite dígitos numéricos.
    // ─────────────────────────────────────────────────────────────────────
    const handleBirthDateChange = (text: string) => {
        // Eliminar todo lo que no sea número
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;

        // Agregar las barras según la longitud de dígitos ingresados
        if (cleaned.length >= 3 && cleaned.length <= 4) {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        } else if (cleaned.length > 4) {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
        }
        setBirthDate(formatted);
    };

    // Avanzar al paso 2
    const handleNextStep = () => { setStep(2); };
    // Volver al paso 1
    const handlePrevStep = () => { setStep(1); };


    // ─────────────────────────────────────────────────────────────────────
    // FUNCIÓN: handleRegister
    // Valida todos los campos y crea la cuenta en Firebase.
    //
    // Flujo:
    //   1. Validar que los campos de ambos pasos estén completos
    //   2. Crear usuario en Firebase Authentication
    //   3. Guardar el perfil completo en Firestore
    //   4. Firebase inicia sesión automáticamente → la app navega al Drawer
    // ─────────────────────────────────────────────────────────────────────
    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Por favor ingresa un correo y contraseña para el registro.");
            return;
        }
        // Validar datos del paso 1 también
        if (!birthDate || !username || !city || !fullName || !gender) {
            Alert.alert("Datos incompletos", "Por favor, vuelve al paso anterior y llena todos tus datos personales.");
            return;
        }

        setLoading(true);
        try {
            // Paso A: Crear el usuario en Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            // Paso B: Guardar el perfil completo en Firestore
            // El documento se crea en 'users/{uid}' donde uid es el ID del usuario en Auth
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                email: email.trim(),
                birthDate,
                username,
                city,
                fullName,
                gender,
                createdAt: serverTimestamp(), // Timestamp del servidor de Firebase
            });

            Alert.alert("Éxito", "Cuenta creada correctamente.");
            // Firebase inicia sesión automáticamente al crear la cuenta.
            // onAuthStateChanged en _layout.tsx detecta esto y navega al Drawer.
        } catch (error: any) {
            // Traducir errores de Firebase a mensajes en español
            let message = "No se pudo crear la cuenta.";
            if (error.code === 'auth/email-already-in-use')
                message = "Este correo ya está registrado.";
            if (error.code === 'auth/weak-password')
                message = "La contraseña debe tener al menos 6 caracteres.";
            Alert.alert("Error de Registro", message);
        } finally {
            setLoading(false);
        }
    };


    // ─────────────────────────────────────────────────────────────────────
    // RENDER
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
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>

                    {/* ── Encabezado ───────────────────────────────────── */}
                    <View style={styles.headerContainer}>
                        <Text style={styles.headerText}>CREAR CUENTA</Text>
                        <Text style={styles.subtitleText}>ÚNETE A LA REVOLUCIÓN DE LARA</Text>
                    </View>

                    {/* ── Formulario: cambia entre paso 1 y paso 2 ─────── */}
                    <View style={styles.form}>

                        {step === 1 ? (
                            // ── PASO 1: Datos personales ──────────────────
                            <View>
                                {/* Campo: Fecha de nacimiento (autoformateada) */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>FECHA DE NACIMIENTO</Text>
                                    <TextInput
                                        placeholder="DD/MM/AAAA"
                                        placeholderTextColor={colors.textSecondary}
                                        style={styles.input}
                                        value={birthDate}
                                        onChangeText={handleBirthDateChange}
                                        keyboardType="numeric" // Solo teclado numérico
                                        maxLength={10}         // DD/MM/AAAA = 10 caracteres
                                    />
                                </View>

                                {/* Campo: Nombre de usuario */}
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

                                {/* Campo: Ciudad (abre modal al tocar) */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>CIUDAD DE RESIDENCIA</Text>
                                    <TouchableOpacity onPress={() => setActivePicker('city')}>
                                        <Text style={[styles.input, { color: city ? colors.text : colors.textSecondary }]}>
                                            {city || 'Selecciona tu ciudad'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Campo: Nombre completo */}
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

                                {/* Campo: Sexo (abre modal al tocar) */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>SEXO</Text>
                                    <TouchableOpacity onPress={() => setActivePicker('gender')}>
                                        <Text style={[styles.input, { color: gender ? colors.text : colors.textSecondary }]}>
                                            {gender || 'Selecciona tu sexo'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Botón Siguiente → ir al paso 2 */}
                                <TouchableOpacity style={styles.mainButton} onPress={handleNextStep}>
                                    <Text style={styles.mainButtonText}>SIGUIENTE</Text>
                                </TouchableOpacity>

                                {/* Botón volver al Login */}
                                <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchToLogin}>
                                    <Text style={styles.secondaryButtonText}>VOLVER AL LOGIN</Text>
                                </TouchableOpacity>
                            </View>

                        ) : (
                            // ── PASO 2: Credenciales de acceso ────────────
                            <View>
                                {/* Campo: Correo electrónico */}
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

                                {/* Campo: Contraseña */}
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

                                {/* Botón principal: crear cuenta */}
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

                                {/* Volver al paso 1 */}
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={handlePrevStep}
                                    disabled={loading}
                                >
                                    <Text style={styles.secondaryButtonText}>VOLVER AL PASO ANTERIOR</Text>
                                </TouchableOpacity>

                                {/* Cancelar registro y volver al Login */}
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

            {/* ── MODAL: Selector de ciudad / sexo ──────────────────────── */}
            {/* Se muestra sobre el formulario cuando activePicker !== null */}
            <Modal
                visible={activePicker !== null}
                animationType="slide"       // Aparece deslizándose desde abajo
                transparent={true}          // El fondo queda semitransparente
                onRequestClose={() => setActivePicker(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Encabezado del modal */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {activePicker === 'city' ? 'Selecciona tu ciudad' : 'Selecciona tu sexo'}
                            </Text>
                            <TouchableOpacity onPress={() => setActivePicker(null)}>
                                <Text style={styles.modalCloseText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Lista de opciones (ciudad o sexo según activePicker) */}
                        <FlatList
                            data={activePicker === 'city' ? cityOptions : genderOptions}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => {
                                        // Guardar la selección en el estado correspondiente
                                        if (activePicker === 'city') setCity(item);
                                        else setGender(item);
                                        setActivePicker(null); // Cerrar el modal
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


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    form: { width: '100%' },
    inputGroup: { marginBottom: verticalScale(25) },
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
    // Fondo semitransparente del modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end', // El modal aparece desde abajo
    },
    // Contenedor blanco del modal
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: ms(20),
        borderTopRightRadius: ms(20),
        maxHeight: '60%',           // No puede ocupar más del 60% de la pantalla
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
