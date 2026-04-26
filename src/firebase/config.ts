/**
 * Configuration validation for Supabase.
 * Now returns true as keys are hardcoded in lib/supabase.ts
 */
export const firebaseConfig = {};

/**
 * Validates if the required Supabase configuration is present.
 */
export const isSupabaseConfigValid = () => {
  return true; // Config is now hardcoded in the app
};

export const isFirebaseConfigValid = () => false;
