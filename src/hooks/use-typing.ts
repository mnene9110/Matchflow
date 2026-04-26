'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to manage real-time typing status in a specific chat.
 * Migrated from Firebase to Supabase Realtime Broadcast.
 */
export function useTyping(chatId: string | null, userId: string | null, otherUserId: string | null) {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // 1. Listen for other user typing status via Broadcast
  useEffect(() => {
    if (!chatId || !userId || !supabase) return;

    const channel = supabase.channel(`typing:${chatId}`);

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === otherUserId) {
          setIsOtherUserTyping(payload.isTyping);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [chatId, userId, otherUserId]);

  // 2. Broadcast current user typing status
  const setTyping = (isTyping: boolean) => {
    if (!channelRef.current || !userId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping },
    });

    if (isTyping) {
      // Auto-clear typing status after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  };

  return { isOtherUserTyping, setTyping };
}
