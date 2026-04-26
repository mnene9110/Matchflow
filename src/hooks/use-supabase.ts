'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Hook to manage Supabase Auth state and Profile data.
 * Optimized to handle background/foreground transitions without infinite loading.
 */
export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = useRef(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Better for handling missing profiles during transitions
      
      if (!error && data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      // 1. Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
      
      setIsLoading(false);
      isInitialMount.current = false;
    };

    initAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    // 3. Handle visibility change (coming back to app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Just refresh the session in background
        supabase.auth.getSession();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { user, profile, isLoading };
}