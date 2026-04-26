import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Hardcoded Supabase configuration as requested
const supabaseUrl = 'https://rxugxvlezkfomsijhkqa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWd4dmxlemtmb21zaWpoa3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTM5NTAsImV4cCI6MjA5Mjc2OTk1MH0.YqUgdHBGNMbo4Ir0uyROXj2j7QOBlFGQlNgB9Kni70g';

/**
 * Standard Supabase client for Client-side usage.
 * Initialized with hardcoded keys provided in the app code.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Helper to fetch a profile
 */
export async function getProfile(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

/**
 * Helper to update profile
 */
export async function updateProfile(userId: string, updates: any) {
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  
  return { data, error };
}

/**
 * Presence Helpers for Supabase Realtime
 */
export async function trackUserPresence(userId: string, username: string) {
  if (!supabase) return;
  const channel = supabase.channel(`online-users`);
  
  channel
    .on('presence', { event: 'sync' }, () => {
      console.log('Online users sync');
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          username: username,
          online_at: new Date().toISOString(),
        });
      }
    });

  return channel;
}
