import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rxugxvlezkfomsijhkqa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWd4dmxlemtmb21zaWpoa3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTM5NTAsImV4cCI6MjA5Mjc2OTk1MH0.YqUgdHBGNMbo4Ir0uyROXj2j7QOBlFGQlNgB9Kni70g';

/**
 * Standard Supabase client singleton.
 * Optimized to prevent the 'Lock broken by another request' error.
 */
let supabaseInstance: SupabaseClient | null = null;

export const supabase: SupabaseClient = (() => {
  if (supabaseInstance) return supabaseInstance;
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'matchflow-auth-lock', // Unique key to avoid collisions
      flowType: 'pkce'
    }
  });
  
  return supabaseInstance;
})();

/**
 * Helper to fetch a profile
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) return null;
  return data;
}

/**
 * Helper to update profile using snake_case
 */
export async function updateProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      ...updates, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  
  return { data, error };
}
