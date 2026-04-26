
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase services.
 * Wrapped in a safe initializer to prevent fatal crashes if config is missing.
 */
export const initializeFirebase = () => {
  const firebaseApp =
    getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);

  // Initialize Realtime Database with the provided URL
  let database = null;
  try {
    database = getDatabase(firebaseApp, firebaseConfig.databaseURL);
  } catch (e) {
    console.warn("Firebase Realtime Database could not be initialized.");
  }

  return { firebaseApp, auth, firestore, database, storage };
};
