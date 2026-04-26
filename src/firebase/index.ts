
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

  // Initialize Realtime Database only if configuration allows
  let database = null;
  try {
    // Database requires a URL or inferred project ID
    if (firebaseConfig.databaseURL || firebaseConfig.projectId) {
      database = getDatabase(firebaseApp);
    }
  } catch (e) {
    console.warn("Firebase Realtime Database could not be initialized. Typing indicators will be disabled.");
  }

  return { firebaseApp, auth, firestore, database, storage };
};
