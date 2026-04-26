/**
 * options.tsx — Pantalla de Configuración
 *
 * Accesible desde el menú lateral → "Opciones".
 *
 * ¿Qué permite hacer?
 *   - Cambiar entre modo claro/oscuro con un switch
 *   - Cambiar el idioma de la app (Español / Inglés)
 *   - Ver la versión de la app
 *   - Cerrar sesión
 *   - Eliminar cuenta permanentemente
 */

import { auth } from '@/lib/firebase';
import { useAppTheme } from '@/lib/ThemeProvider';
import { useTranslation } from '@/lib/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { deleteUser, signOut } from 'firebase/auth';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, ms, fs } from '@/lib/responsive';

export default function OptionsScreen() {
  const navigation = useNavigation();
  const { isDark, toggleTheme, colors } = useAppTheme();
  const { locale, setLocale, t } = useTranslation();

  // Controla si el panel de selección de idioma está abierto o cerrado
  const [isLanguageExpanded, setIsLanguageExpanded] = React.useState(false);

  // Recalcular estilos solo cuando cambia el tema
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);


  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: handleLogout
  // Cierra la sesión del usuario con Firebase.
  // Cuando signOut() termina, onAuthStateChanged en _layout.tsx detecta el
  // cambio y muestra automáticamente la pantalla de Login.
  // ─────────────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // La redirección al login ocurre automáticamente vía onAuthStateChanged en _layout.tsx
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert(t('common.error'), t('options.logoutError'));
    }
  };


  // ─────────────────────────────────────────────────────────────────────────
  // COMPONENTE: LanguageItem
  // Renderiza una opción de idioma dentro del panel expandible.
  // Muestra una marca ✓ si ese idioma está activo.
  //
  // Props:
  //   label → Nombre del idioma ("Español", "English")
  //   code  → Código del idioma ("es", "en")
  //   icon  → Emoji de la bandera ("🇪🇸", "🇺🇸")
  // ─────────────────────────────────────────────────────────────────────────
  const LanguageItem = ({ label, code, icon }: { label: string, code: string, icon: string }) => {
    const isSelected = locale === code; // ¿Es este el idioma activo?
    return (
      <TouchableOpacity
        style={[styles.languageOption, isSelected && styles.selectedLanguage]}
        onPress={() => {
          setLocale(code as any); // Cambiar idioma globalmente
        }}
      >
        {/* Bandera del idioma */}
        <View style={styles.languageIconWrap}>
          <Text style={{ fontSize: ms(16) }}>{icon}</Text>
        </View>

        {/* Nombre del idioma (negrita si está seleccionado) */}
        <Text style={[styles.languageText, isSelected && { fontWeight: '700', color: colors.primary }]}>
          {label}
        </Text>

        {/* Check mark si está seleccionado */}
        {isSelected && (
          <Ionicons name="checkmark" size={ms(18)} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };


  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIÓN: handleDeleteAccount
  // Elimina permanentemente la cuenta del usuario de Firebase Auth.
  //
  // Firebase requiere que el usuario haya iniciado sesión recientemente
  // (auth/requires-recent-login). Si no, hay que pedirle que haga login de nuevo.
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    // Mostrar diálogo de confirmación antes de proceder
    Alert.alert(
      t('options.deleteAccount'),
      t('options.deleteConfirmation'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('options.deleteAccount'),
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                await deleteUser(user);
                // Al eliminar, onAuthStateChanged detecta que no hay usuario
                // y muestra el Login automáticamente
              }
            } catch (error: any) {
              console.error("Error deleting account:", error);
              if (error.code === 'auth/requires-recent-login') {
                // Firebase requiere autenticación reciente para operaciones críticas
                Alert.alert(
                  t('options.securityError'),
                  t('options.reloginRequired')
                );
              } else {
                Alert.alert(t('common.error'), t('options.deleteError'));
              }
            }
          }
        }
      ]
    );
  };


  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Botón menú hamburguesa: abre el drawer lateral */}
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuButton}
        >
          <Ionicons name="menu-outline" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('options.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── SECCIÓN: Configuración de la app ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('options.appSection')}</Text>

          {/* ── Switch: Modo oscuro ────────────────────────────────────── */}
          <View style={styles.optionItem}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
              {/* El icono cambia entre luna (oscuro) y sol (claro) */}
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={22} color={colors.text} />
            </View>
            <Text style={styles.optionText}>{t('options.darkMode')}</Text>
            {/* Switch que llama a toggleTheme() del ThemeProvider */}
            <Switch
              trackColor={{ false: "#ccc", true: colors.primary }}
              thumbColor={"#fff"}
              onValueChange={toggleTheme}
              value={isDark}
            />
          </View>

          {/* ── Selector de idioma (expandible) ───────────────────────── */}
          <View style={styles.collapsibleContainer}>
            {/* Fila clickeable que expande/colapsa la lista de idiomas */}
            <TouchableOpacity
              style={[styles.optionItem, { marginBottom: 0, borderBottomWidth: isLanguageExpanded ? 0 : 1 }]}
              onPress={() => setIsLanguageExpanded(!isLanguageExpanded)}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
                <Ionicons name="language-outline" size={22} color={colors.text} />
              </View>
              <Text style={styles.optionText}>{t('options.language')}</Text>
              {/* Muestra el idioma activo */}
              <Text style={styles.optionValue}>
                {locale === 'es' ? t('options.spanish') : t('options.english')}
              </Text>
              {/* Flecha que rota según si está expandido o no */}
              <Ionicons
                name={isLanguageExpanded ? "chevron-up" : "chevron-down"}
                size={ms(20)}
                color="#666"
              />
            </TouchableOpacity>

            {/* Lista de idiomas (solo visible si isLanguageExpanded = true) */}
            {isLanguageExpanded && (
              <View style={styles.languageList}>
                <LanguageItem label={t('options.spanish')} code="es" icon="🇪🇸" />
                <LanguageItem label={t('options.english')} code="en" icon="🇺🇸" />
              </View>
            )}
          </View>

          {/* ── Versión de la app ──────────────────────────────────────── */}
          <View style={styles.optionItem}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
              <Ionicons name="information-circle-outline" size={22} color={colors.text} />
            </View>
            <Text style={styles.optionText}>{t('options.version')} 1.0.0</Text>
          </View>

          {/* ── SECCIÓN: Gestión de cuenta ──────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('options.accountSection')}</Text>

            {/* ── Cerrar sesión ─────────────────────────────────────────── */}
            <TouchableOpacity style={styles.optionItem} onPress={handleLogout}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
                <Ionicons name="log-out-outline" size={22} color={colors.text} />
              </View>
              <Text style={styles.optionText}>{t('options.logout')}</Text>
              <Ionicons name="chevron-forward" size={ms(20)} color="#666" />
            </TouchableOpacity>

            {/* ── Eliminar cuenta (acción destructiva → fondo rojo) ──────── */}
            <TouchableOpacity style={styles.optionItem} onPress={handleDeleteAccount}>
              <View style={[styles.iconContainer, { backgroundColor: colors.danger }]}>
                <Ionicons name="trash-outline" size={ms(22)} color="#fff" />
              </View>
              <Text style={[styles.optionText, { color: colors.danger }]}>
                {t('options.deleteAccount')}
              </Text>
              <Ionicons name="chevron-forward" size={ms(20)} color="#666" />
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(20),
  },
  headerTitle: {
    fontSize: fs(34),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: scale(-1),
  },
  menuButton: {
    marginBottom: verticalScale(10),
    marginLeft: scale(-5),
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
  },
  section: { marginBottom: verticalScale(35) },
  sectionTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: scale(1.5),
    marginBottom: verticalScale(15),
    paddingLeft: scale(5),
  },
  // Fila de cada opción (icono + texto + control)
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(15),
    borderRadius: ms(16),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Cuadrado de fondo del icono de cada opción
  iconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },
  optionText: {
    flex: 1, // Ocupa el espacio restante empujando el control a la derecha
    fontSize: fs(17),
    fontWeight: '500',
    color: colors.text,
  },
  optionValue: {
    fontSize: fs(15),
    color: colors.textSecondary,
    marginRight: scale(8),
  },
  // Contenedor del selector de idioma (para que border-radius funcione con el panel expandible)
  collapsibleContainer: {
    backgroundColor: colors.card,
    borderRadius: ms(16),
    marginBottom: verticalScale(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageList: {
    paddingBottom: verticalScale(10),
    paddingHorizontal: scale(10),
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: ms(12),
    marginTop: verticalScale(2),
  },
  // Fondo de acento cuando el idioma está seleccionado
  selectedLanguage: {
    backgroundColor: colors.primary + '10', // Color primario con 10% de opacidad
  },
  languageIconWrap: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    backgroundColor: isDark ? '#222' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },
  languageText: {
    flex: 1,
    fontSize: fs(16),
    color: colors.text,
  },
});
