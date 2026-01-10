import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyA8oDLSHBIFvMsadfzFSAZPv6Cb6csTiVs",
  authDomain: "networksolution-a9480.firebaseapp.com",
  projectId: "networksolution-a9480",
  storageBucket: "networksolution-a9480.firebasestorage.app",
  messagingSenderId: "354620308224",
  appId: "1:354620308224:web:0502ece183e2a9265951e5",
  measurementId: "G-92Q8JQZZ5J"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with persistence
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    auth = getAuth(app);
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
