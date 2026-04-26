export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForInitialization",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "matchflow-27524298-12d64.firebaseapp.com",
  projectId: "matchflow-27524298-12d64",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "matchflow-27524298-12d64.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://matchflow-27524298-12d64-default-rtdb.firebaseio.com",
};

export const isFirebaseConfigValid = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    firebaseConfig.projectId
  );
};
