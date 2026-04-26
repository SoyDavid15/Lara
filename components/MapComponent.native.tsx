import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { ms } from '@/lib/responsive';

interface MapComponentProps {
  location: { latitude: number; longitude: number };
  isEmergency?: boolean;
  colors: any;
  isDark: boolean;
}

const mapStyle = [
  { "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "stylers": [{ "visibility": "off" }] }
];

const MapComponent = ({ location, isEmergency, colors, isDark }: MapComponentProps) => {
  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      customMapStyle={mapStyle}
    >
      <UrlTile
        urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        maximumZ={19}
        zIndex={-1}
      />
      <Marker
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
      >
        <View style={styles.markerContainer}>
          <View style={[styles.markerPulse, { backgroundColor: colors.primary }]} />
          <View style={[styles.markerDot, { backgroundColor: isEmergency ? '#FF3B30' : colors.primary }]} />
        </View>
      </Marker>
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: ms(30),
    height: ms(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    opacity: 0.2,
  },
  markerDot: {
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default MapComponent;
