/**
 * Configuration validation for Supabase.
 * Firebase keys are removed to prioritize Supabase fully.
 */
export const firebaseConfig = {};

/**
 * Validates if the required Supabase configuration is present.
 */
export const isSupabaseConfigValid = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export const isFirebaseConfigValid = () => false;
