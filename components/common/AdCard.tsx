/**
 * AdCard.tsx — Tarjeta de Anuncio Publicitario
 *
 * Componente placeholder que representa un espacio publicitario en el feed.
 * Se inyecta automáticamente cada 3 publicaciones en news.tsx.
 *
 * Estado actual: PLACEHOLDER (simulación visual)
 * TODO futuro: Integrar con Google AdMob cuando se haga un build nativo.
 *   Para integrar AdMob real:
 *   1. Instalar: expo install react-native-google-mobile-ads
 *   2. Configurar en app.json con el Ad Unit ID
 *   3. Reemplazar este componente por <BannerAd /> de la librería
 *
 * Props: Ninguna (es un componente visual estático por ahora)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ms, scale, verticalScale, fs } from '@/lib/responsive';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

const AdCard = () => {
    // Usar colores del tema para adaptarse al modo claro/oscuro
    const { colors, isDark } = useAppTheme();

    return (
        <View style={[styles.container, {
            borderColor: isDark ? '#333' : '#E0E0E0',
            backgroundColor: colors.card
        }]}>

            {/* ── Encabezado de la tarjeta ────────────────────────────── */}
            <View style={styles.placeholderHeader}>
                {/* Icono de megáfono en el color primario de la app */}
                <Ionicons name="megaphone-outline" size={ms(20)} color={colors.primary} />
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                    Espacio Publicitario
                </Text>
            </View>

            {/* ── Cuerpo de la tarjeta ─────────────────────────────────── */}
            <View style={styles.placeholderBody}>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                    Este es un ejemplo de cómo se verá tu publicidad.
                </Text>
                {/* Caja gris que simula dónde iría la imagen del anuncio */}
                <View style={[styles.dummyAdBox, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                    <Ionicons name="image-outline" size={ms(40)} color={isDark ? '#333' : '#CCC'} />
                </View>
            </View>

        </View>
    );
};


// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Contenedor principal de la tarjeta (igual que los post cards en el feed)
    container: {
        borderWidth: 1,
        borderRadius: ms(20),
        marginHorizontal: scale(15),
        marginBottom: verticalScale(15),
        overflow: 'hidden',
    },
    // Encabezado con icono + etiqueta "Espacio Publicitario"
    placeholderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: ms(15),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    placeholderTitle: {
        fontSize: fs(14),
        fontWeight: 'bold',
        marginLeft: scale(10),
    },
    placeholderBody: {
        padding: ms(15),
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: fs(12),
        textAlign: 'center',
        lineHeight: fs(18),
        marginBottom: verticalScale(15),
    },
    // Rectángulo gris que simula el espacio de la imagen del anuncio
    dummyAdBox: {
        width: '100%',
        height: verticalScale(150),
        borderRadius: ms(12),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    }
});

export default AdCard;