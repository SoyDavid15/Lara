import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCJMg9cxRiaM38sl44mm00N3uuIFPwlyQc",
  authDomain: "lara-58bb9.firebaseapp.com",
  projectId: "lara-58bb9",
  storageBucket: "lara-58bb9.firebasestorage.app",
  messagingSenderId: "163304458035",
  appId: "1:163304458035:android:1f40815b7bace994ed2046"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);

export default app;