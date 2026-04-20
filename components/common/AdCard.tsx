import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ms, scale, verticalScale, fs } from '@/lib/responsive';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AdCard = () => {
    const { colors, isDark } = useAppTheme();

    return (
        <View style={[styles.container, { borderColor: isDark ? '#333' : '#E0E0E0', backgroundColor: colors.card }]}>
            <View style={styles.placeholderHeader}>
                <Ionicons name="megaphone-outline" size={ms(20)} color={colors.primary} />
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>Espacio Publicitario</Text>
            </View>
            <View style={styles.placeholderBody}>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                    Este es un ejemplo de cómo se verá tu publicidad.
                </Text>
                <View style={[styles.dummyAdBox, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                    <Ionicons name="image-outline" size={ms(40)} color={isDark ? '#333' : '#CCC'} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: ms(20),
        marginHorizontal: scale(15),
        marginBottom: verticalScale(15),
        overflow: 'hidden',
    },
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