'use client';

import { firebaseConfig, isFirebaseConfigValid } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

export interface FirebaseSdks {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  database: Database | null;
}

// Keep a reference to the initialized SDKs to prevent multiple instances
let cachedSdks: FirebaseSdks | null = null;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(): FirebaseSdks {
  if (cachedSdks) return cachedSdks;

  if (!isFirebaseConfigValid()) {
    console.warn('Firebase configuration is missing or invalid. Check your environment variables.');
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
      database: null
    };
  }

  const apps = getApps();
  let firebaseApp: FirebaseApp;

  try {
    if (!apps.length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = apps[0];
    }

    cachedSdks = {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp),
      database: getDatabase(firebaseApp)
    };
  } catch (error) {
    console.error('Failed to initialize Firebase SDKs:', error);
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
      database: null
    };
  }

  return cachedSdks;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
