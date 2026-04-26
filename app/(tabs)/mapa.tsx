import MapAlertModal from '@/components/forms/MapAlertModal';
import { fs, ms, scale, verticalScale } from '@/lib/responsive';
import { useSafeWalk } from '@/lib/SafeWalkContext';
import { useAppTheme } from '@/lib/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import type MapViewType from 'react-native-maps';

// Conditionally import react-native-maps
let MapView: any, Marker: any, PROVIDER_GOOGLE: any, UrlTile: any, Callout: any;
if (Platform.OS !== 'web') {
  const MapComponents = require('react-native-maps');
  MapView = MapComponents.default || MapComponents;
  Marker = MapComponents.Marker;
  UrlTile = MapComponents.UrlTile;
  Callout = MapComponents.Callout;
  PROVIDER_GOOGLE = MapComponents.PROVIDER_GOOGLE;
}

// Coordenadas por defecto (Barranquilla, Colombia)
const DEFAULT_REGION = {
  latitude: 10.9685,
  longitude: -74.7813,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const CATEGORY_ICONS: Record<string, { icon: any, color: string }> = {
  arroyo: { icon: 'water', color: '#007AFF' },
  accidente: { icon: 'car-sport', color: '#FF9500' },
  incendio: { icon: 'flame', color: '#FF3B30' },
  robo: { icon: 'hand-right', color: '#FF3B30' },
};

export default function MapaScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const { location } = useSafeWalk();
  const mapRef = useRef<MapViewType>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Suscribirse a las alertas activas (últimas 3 horas)
  useEffect(() => {
    const now = Timestamp.now();
    const q = query(
      collection(db, "posts"),
      where("expiresAt", ">", now)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeAlerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((alert: any) => alert.location && alert.location.latitude && alert.location.longitude);
      console.log(`Fetched ${activeAlerts.length} active alerts`);
      setAlerts(activeAlerts);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Centrar el mapa cuando la ubicación esté disponible
  useEffect(() => {
    if (location && isMapReady && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [location, isMapReady]);

  const centerOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {(Platform.OS as any) !== 'web' && MapView ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={location ? {
              ...location,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            } : DEFAULT_REGION}
            onMapReady={() => setIsMapReady(true)}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            customMapStyle={mapStyle}
          >
            <UrlTile
              urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
              zIndex={-1}
            />

            {/* Marcadores de Alertas */}
            {(Platform.OS as any) !== 'web' && Marker && Callout && alerts.map((alert) => {
              const catInfo = CATEGORY_ICONS[alert.category] || { icon: 'warning', color: '#666' };
              const lat = Number(alert.location?.latitude);
              const lng = Number(alert.location?.longitude);

              if (isNaN(lat) || isNaN(lng)) return null;

              return (
                <Marker
                  key={alert.id}
                  coordinate={{ latitude: lat, longitude: lng }}
                  zIndex={999}
                  flat={true}
                  onPress={() => setSelectedAlert(alert)}
                >
                  <View style={[styles.markerIcon, { backgroundColor: catInfo.color }]}>
                    <Ionicons name={catInfo.icon} size={16} color="white" />
                    {alert.verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={ms(14)} color="#4CAF50" />
                      </View>
                    )}
                  </View>
                </Marker>
              );
            })}

            {location && (
              <Marker
                coordinate={location}
                title="Tu ubicación"
                pinColor={colors.primary}
              />
            )}
          </MapView>
        ) : (
          <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#111' : '#EEE' }]}>
            <Ionicons name="map-outline" size={ms(64)} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 20, fontSize: fs(16), textAlign: 'center', paddingHorizontal: 40 }}>
              El mapa interactivo completo está disponible en la versión móvil (iOS/Android)
            </Text>
          </View>
        )}

        {/* Detalle de Alerta Seleccionada */}
        {selectedAlert && (
          <View style={styles.detailContainer}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIcon, { backgroundColor: CATEGORY_ICONS[selectedAlert.category]?.color }]}>
                  <Ionicons name={CATEGORY_ICONS[selectedAlert.category]?.icon} size={24} color="white" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailTitle}>{selectedAlert.title}</Text>
                  <View style={styles.verificationRow}>
                    <Ionicons 
                      name={selectedAlert.verified ? "checkmark-circle" : "warning"} 
                      size={14} 
                      color={selectedAlert.verified ? "#4CAF50" : "#FF9500"} 
                    />
                    <Text style={[styles.verificationText, { color: selectedAlert.verified ? "#4CAF50" : "#FF9500" }]}>
                      {selectedAlert.verified ? 'Verificada por la comunidad' : 'Sin verificar todavía'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedAlert(null)} style={styles.detailClose}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {selectedAlert.body ? (
                <Text style={styles.detailBody}>{selectedAlert.body}</Text>
              ) : (
                <Text style={[styles.detailBody, { fontStyle: 'italic', opacity: 0.6 }]}>Sin descripción adicional</Text>
              )}

              <View style={styles.detailFooter}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailTime}>Expira en 3 horas desde su publicación</Text>
              </View>
            </View>
          </View>
        )}

        {!isMapReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Cargando mapa...</Text>
          </View>
        )}

        {/* Floating Action Buttons */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#FF3B30' }]}
            onPress={() => setIsAlertModalVisible(true)}
          >
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.card }]}
            onPress={centerOnUser}
          >
            <Ionicons name="locate" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal para crear alerta rápida */}
      <MapAlertModal
        isVisible={isAlertModalVisible}
        onClose={() => setIsAlertModalVisible(false)}
        userLocation={location}
      />
    </View>
  );
}

const mapStyle = [
  {
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "water",
    "stylers": [{ "visibility": "off" }]
  }
];

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeHeader: {
    backgroundColor: colors.background,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(10),
  },
  headerTitle: {
    fontSize: fs(20),
    fontWeight: '800',
    color: colors.text,
    letterSpacing: scale(-0.5),
  },
  menuButton: {
    padding: ms(5),
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: fs(16),
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: verticalScale(30),
    right: scale(20),
    gap: verticalScale(15),
  },
  fab: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -ms(5),
    right: -ms(5),
    backgroundColor: 'white',
    borderRadius: ms(10),
    width: ms(18),
    height: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  detailContainer: {
    position: 'absolute',
    bottom: verticalScale(100),
    left: scale(20),
    right: scale(20),
    zIndex: 1000,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: ms(24),
    padding: ms(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  detailIcon: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
    marginLeft: scale(15),
  },
  detailTitle: {
    fontSize: fs(20),
    fontWeight: '900',
    color: colors.text,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verificationText: {
    fontSize: fs(12),
    fontWeight: '700',
    marginLeft: 4,
  },
  detailClose: {
    padding: 5,
  },
  detailBody: {
    fontSize: fs(15),
    color: colors.text,
    lineHeight: fs(22),
    marginBottom: verticalScale(20),
    opacity: 0.9,
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: verticalScale(12),
  },
  detailTime: {
    fontSize: fs(12),
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
});
