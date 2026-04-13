'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

export interface FirebaseSdks {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  database: Database;
}

// Keep a reference to the initialized SDKs to prevent multiple instances
let cachedSdks: FirebaseSdks | null = null;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(): FirebaseSdks {
  if (cachedSdks) return cachedSdks;

  const apps = getApps();
  let firebaseApp: FirebaseApp;

  if (!apps.length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Firebase initialization failed.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = apps[0];
  }

  cachedSdks = getSdks(firebaseApp);
  return cachedSdks;
}

export function getSdks(firebaseApp: FirebaseApp): FirebaseSdks {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    database: getDatabase(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
