import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigValid } from '@/firebase/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Standard Supabase client for Client-side usage.
 * Safely initialized to prevent module evaluation crashes if keys are missing.
 */
export const supabase: SupabaseClient = (isSupabaseConfigValid()) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null as unknown as SupabaseClient;

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
