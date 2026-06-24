// src/config/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';

import {
  initializeFirestore,
  getFirestore,
  Firestore,
} from 'firebase/firestore';

import {
  getAuth,
  Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'TU_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'tu-proyecto.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'tu-proyecto',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'tu-proyecto.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID ?? '000000000000',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:xxxxxxxx',
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

let _db: Firestore;

try {
  _db = initializeFirestore(firebaseApp, {
    localCache: {
      kind: 'persistent',
    } as any,
  });
} catch {
  _db = getFirestore(firebaseApp);
}

export const db = _db;

export const auth: Auth = getAuth(firebaseApp);