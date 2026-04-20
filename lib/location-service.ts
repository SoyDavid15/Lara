import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Alert, Linking } from 'react-native';

const LAST_LOCATION_KEY = 'safewalk_last_location';
const LAST_MOVE_TIME_KEY = 'safewalk_last_move_time';
const LAST_FB_LOCATION_KEY = 'safewalk_fb_location';
const IDLE_TIMEOUT_MS = 60000;
const FIREBASE_UPDATE_DISTANCE = 50;

export function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

export const requestPermissions = async () => {
    try {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            Alert.alert(
                "Permiso de Ubicación Necesario",
                "Lara necesita saber dónde estás para protegerte durante tu caminata. Por favor, activa el permiso en los ajustes de tu teléfono.",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Abrir Ajustes", onPress: () => Linking.openSettings() }
                ]
            );
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error requesting permissions:", error);
        return false;
    }
};

export const startLocationTracking = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;
    
    await AsyncStorage.removeItem(LAST_LOCATION_KEY);
    await AsyncStorage.removeItem(LAST_MOVE_TIME_KEY);
    await AsyncStorage.removeItem(LAST_FB_LOCATION_KEY);

    await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 0 },
        async (location) => {
            const { latitude, longitude } = location.coords;
            const user = auth.currentUser;
            if (!user) return;

            try {
                const lastLocStr = await AsyncStorage.getItem(LAST_LOCATION_KEY);
                const prevFbLocStr = await AsyncStorage.getItem(LAST_FB_LOCATION_KEY);
                
                if (prevFbLocStr) {
                    const prevFbLoc = JSON.parse(prevFbLocStr);
                    const distFromFb = getDistanceFromLatLonInMeters(
                        prevFbLoc.lat, prevFbLoc.lon,
                        latitude, longitude
                    );

                    if (distFromFb >= FIREBASE_UPDATE_DISTANCE) {
                        const userRef = doc(db, 'users', user.uid);
                        await setDoc(userRef, {
                            location: {
                                latitude,
                                longitude,
                                lastUpdated: serverTimestamp(),
                            }
                        }, { merge: true });
                        await AsyncStorage.setItem(LAST_FB_LOCATION_KEY, JSON.stringify({ lat: latitude, lon: longitude }));
                    }
                } else {
                    await AsyncStorage.setItem(LAST_FB_LOCATION_KEY, JSON.stringify({ lat: latitude, lon: longitude }));
                }

                await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ lat: latitude, lon: longitude }));
                await AsyncStorage.setItem(LAST_MOVE_TIME_KEY, Date.now().toString());
            } catch (err) {
                console.error('[Location Tracking] Error:', err);
            }
        }
    );
    console.log('[Location Service] Tracking started');
};

export const stopLocationTracking = async () => {
    console.log('[Location Service] Tracking stopped');
};