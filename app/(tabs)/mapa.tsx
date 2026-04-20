import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/ThemeProvider';
import { useSafeWalk } from '@/lib/SafeWalkContext';
import { useTranslation } from '@/lib/LanguageContext';
import { ms, fs, scale, verticalScale } from '@/lib/responsive';
import NewAlert from '@/components/forms/newAlert';

const ALERT_ICONS: Record<string, { icon: any, color: string }> = {
  robo: { icon: 'hand-right', color: '#FF3B30' },
  accidente: { icon: 'car-sport', color: '#FF9500' },
  arroyo: { icon: 'water', color: '#007AFF' },
  incendio: { icon: 'flame', color: '#FF453A' },
};

export default function MapaScreen() {
  const { isDark, toggleTheme, colors } = useAppTheme();
  const { location, isInactive, setLocation } = useSafeWalk();
  const { t } = useTranslation();
  const [isAlertModalVisible, setIsAlertModalVisible] = React.useState(false);
  const [selectedAlert, setSelectedAlert] = React.useState<any | null>(null);
  const [activeAlerts, setActiveAlerts] = React.useState<any[]>([]);
  const mapRef = useRef<MapView>(null);
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Persistent zoom state (deltas)
  const regionRef = useRef({
    latitudeDelta: 0.002,
    longitudeDelta: 0.002,
  });
  
  const isInteracting = useRef(false);

  // Always use active/colorful Voyager style for both modes as requested
  const tileUrl = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 5 },
        (loc) => {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    })();
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // Real-time listener for community alerts
  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      where("expiresAt", ">", Timestamp.now())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveAlerts(alerts);
    }, (error) => {
      console.error("Error fetching alerts:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location && mapRef.current && !isInteracting.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        ...regionRef.current,
      }, 1000);
    }
  }, [location?.latitude, location?.longitude]);

  const onRegionChangeComplete = (newRegion: any) => {
    regionRef.current = {
      latitudeDelta: newRegion.latitudeDelta,
      longitudeDelta: newRegion.longitudeDelta,
    };
    // Done interacting
    isInteracting.current = false;
  };

  const onPanDrag = () => {
    isInteracting.current = true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        key={isDark ? 'dark-map' : 'light-map'}
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 4.6097,
          longitude: location?.longitude || -74.0817,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }}
        mapType="none"
        onRegionChangeComplete={onRegionChangeComplete}
        onPanDrag={onPanDrag}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        <UrlTile 
          key={tileUrl} // Forces tile reload
          urlTemplate={tileUrl}
          zIndex={1}
          shouldReplaceMapContent={true}
          maximumZ={19}
        />
        
        {location && (
          <>
            {isInactive && (
              <Circle
                center={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                radius={100}
                fillColor="rgba(255, 0, 0, 0.2)"
                strokeColor="rgba(255, 0, 0, 0.5)"
                strokeWidth={2}
                zIndex={11}
              />
            )}
            
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={12}
            >
              <View style={styles.markerContainer}>
                <View style={styles.markerOutline}>
                  <Ionicons name="person" size={ms(12)} color="#000" />
                </View>
              </View>
            </Marker>
          </>
        )}

        {/* Community Alerts */}
        {activeAlerts.map((alert) => {
          const config = ALERT_ICONS[alert.type] || { icon: 'warning', color: '#666' };
          return (
            <Marker
              key={alert.id}
              coordinate={{
                latitude: alert.latitude,
                longitude: alert.longitude,
              }}
              onPress={() => setSelectedAlert(alert)}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={10}
            >
              <View style={[styles.alertMarkerContainer, { borderColor: config.color }]}>
                <View style={[styles.alertMarkerInner, { backgroundColor: config.color }]}>
                  <Ionicons name={config.icon} size={ms(16)} color="white" />
                </View>
                {alert.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={ms(12)} color="#34C759" />
                  </View>
                )}
                <View style={[styles.markerPointer, { borderTopColor: config.color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Action Button for Alerts */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setIsAlertModalVisible(true)}
      >
        <Ionicons name="warning-outline" size={ms(28)} color="white" />
      </TouchableOpacity>

      {/* Modal Form for New Alert */}
      <NewAlert 
        isVisible={isAlertModalVisible} 
        onClose={() => setIsAlertModalVisible(false)} 
      />

      {/* Detail Card for Community Alerts */}
      {selectedAlert && (
        <View style={styles.detailOverlay}>
          <TouchableOpacity 
            style={styles.detailBackground} 
            activeOpacity={1} 
            onPress={() => setSelectedAlert(null)}
          />
          <View style={styles.detailCard}>
            <View style={[styles.detailIconContainer, { backgroundColor: (ALERT_ICONS[selectedAlert.type] || {color: '#666'}).color }]}>
              <Ionicons 
                name={(ALERT_ICONS[selectedAlert.type] || {icon: 'warning'}).icon} 
                size={ms(32)} 
                color="white" 
              />
            </View>
            
            <Text style={styles.detailTitle}>{selectedAlert.typeName}</Text>
            
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: selectedAlert.verified ? '#34C759' : '#FF9500' }]}>
                {selectedAlert.verified ? t('common.verified') : t('common.unverified')}
              </Text>
            </View>

            <Text style={styles.timeText}>
              {t('common.reportedAt')} {selectedAlert.createdAt?.toDate ? 
                selectedAlert.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                '--:--'}
            </Text>

            <Text style={styles.detailDescription}>{selectedAlert.description}</Text>
            
            <TouchableOpacity 
              style={[styles.detailCloseButton, { backgroundColor: (ALERT_ICONS[selectedAlert.type] || {color: '#666'}).color }]}
              onPress={() => setSelectedAlert(null)}
            >
              <Text style={styles.detailCloseText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Basic overlay if no location yet */}
      {!location && (
        <View style={styles.overlay}>
          <Ionicons name="location-outline" size={ms(40)} color={colors.textSecondary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: verticalScale(110),
    right: scale(20),
    backgroundColor: '#FF3B30', // Apple/Emergency Red
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 100,
  },
  alertMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: ms(2),
    backgroundColor: 'white',
    borderRadius: ms(24),
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
  },
  alertMarkerInner: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: ms(8),
    borderRightWidth: ms(8),
    borderTopWidth: ms(12),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: ms(-13),
  },
  markerContainer: {
    padding: ms(10),
  },
  markerOutline: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.3,
    shadowRadius: ms(4),
    elevation: 5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  detailBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  detailCard: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: ms(28),
    padding: ms(25),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: ms(20),
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: verticalScale(15),
  },
  statusText: {
    fontSize: fs(12),
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verifiedBadge: {
    position: 'absolute',
    top: ms(-4),
    right: ms(-4),
    backgroundColor: 'white',
    borderRadius: ms(8),
    width: ms(16),
    height: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  detailIconContainer: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  detailTitle: {
    fontSize: fs(24),
    fontWeight: '900',
    color: colors.text,
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  timeText: {
    fontSize: fs(14),
    color: colors.textSecondary,
    marginBottom: verticalScale(15),
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: fs(16),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fs(22),
    marginBottom: verticalScale(25),
  },
  detailCloseButton: {
    width: '100%',
    paddingVertical: verticalScale(16),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseText: {
    color: 'white',
    fontSize: fs(18),
    fontWeight: 'bold',
  },
});
