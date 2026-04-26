/**
 * Configuration validation for Supabase.
 * Firebase keys are retained here temporarily but the app now prioritizes Supabase.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Validates if the required Supabase configuration is present.
 */
export const isSupabaseConfigValid = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export const isFirebaseConfigValid = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};
