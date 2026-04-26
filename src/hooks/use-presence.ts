'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to get real-time presence information for a specific user.
 * Now using Supabase Realtime Postgres Changes.
 */
export function usePresence(userId: string | null | undefined) {
  const [presence, setPresence] = useState<{ isOnline: boolean; lastActiveAt: string | null }>({
    isOnline: false,
    lastActiveAt: null
  });

  useEffect(() => {
    if (!userId || !supabase) {
      setPresence({ isOnline: false, lastActiveAt: null });
      return;
    }

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_online, last_active_at')
        .eq('id', userId)
        .single();
      
      if (data) {
        setPresence({
          isOnline: !!data.is_online,
          lastActiveAt: data.last_active_at
        });
      }
    };

    fetchStatus();

    const channel = supabase
      .channel(`user_presence:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload) => {
        setPresence({
          isOnline: !!payload.new.is_online,
          lastActiveAt: payload.new.last_active_at
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isOnline: presence.isOnline, lastActiveAt: presence.lastActiveAt };
}
