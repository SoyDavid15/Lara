/**
 * FriendEmergencyModal.tsx
 *
 * Modal de alta prioridad que se muestra cuando un amigo entra en estado de EMERGENCIA (ALERT).
 */

import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/ThemeProvider';
import { fs, ms, scale, verticalScale } from '@/lib/responsive';
import { router } from 'expo-router';
import { useTranslation } from '@/lib/LanguageContext';

interface FriendEmergencyModalProps {
  isVisible: boolean;
  friendName: string;
  friendUid: string;
  onClose: () => void;
}

export default function FriendEmergencyModal({ 
  isVisible, 
  friendName, 
  friendUid, 
  onClose 
}: FriendEmergencyModalProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const handleGoToProfile = () => {
    onClose();
    router.push({ pathname: '/friendProfile', params: { uid: friendUid } });
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={ms(60)} color="#FF3B30" />
          </View>
          
          <Text style={styles.alertTitle}>{t('emergencyModal.title')}</Text>
          
          <Text style={styles.friendText}>
            {t('emergencyModal.body').replace('{name}', friendName)}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={handleGoToProfile}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={ms(20)} color="white" />
              <Text style={styles.profileButtonText}>{t('emergencyModal.viewProfile')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>{t('emergencyModal.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: ms(20),
  },
  alertBox: {
    width: '100%',
    backgroundColor: isDark ? '#1A0000' : '#FFF0F0',
    borderRadius: ms(24),
    padding: ms(30),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: ms(15),
    elevation: 20,
  },
  iconContainer: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    backgroundColor: '#FF3B3022',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  alertTitle: {
    fontSize: fs(24),
    fontWeight: '900',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: verticalScale(15),
    letterSpacing: 1,
  },
  friendText: {
    fontSize: fs(16),
    color: colors.text,
    textAlign: 'center',
    lineHeight: fs(24),
    marginBottom: verticalScale(30),
  },
  buttonContainer: {
    width: '100%',
    gap: verticalScale(15),
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: verticalScale(18),
    borderRadius: ms(18),
    gap: scale(10),
  },
  profileButtonText: {
    color: 'white',
    fontSize: fs(16),
    fontWeight: 'bold',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: verticalScale(10),
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: fs(14),
    fontWeight: '600',
  },
});
