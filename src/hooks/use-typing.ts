
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { ref, onValue, set } from 'firebase/database';

/**
 * Hook to manage real-time typing status in a specific chat.
 * Uses Realtime Database for high-frequency updates.
 */
export function useTyping(chatId: string | null, userId: string | null, otherUserId: string | null) {
  const { database } = useFirebase();
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Listen for other user typing status
  useEffect(() => {
    if (!database || !chatId || !otherUserId) {
      setIsOtherUserTyping(false);
      return;
    }

    const typingRef = ref(database, `/typing/${chatId}/${otherUserId}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      setIsOtherUserTyping(!!snapshot.val());
    });

    return () => unsubscribe();
  }, [database, chatId, otherUserId]);

  // 2. Broadcast current user typing status
  const setTyping = (isTyping: boolean) => {
    if (!database || !chatId || !userId) return;

    const myTypingRef = ref(database, `/typing/${chatId}/${userId}`);
    
    // Only update if needed to save bandwidth
    set(myTypingRef, isTyping);

    if (isTyping) {
      // Auto-clear typing status after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        set(myTypingRef, false);
      }, 3000);
    }
  };

  // Clean up: ensure typing status is false when leaving
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (database && chatId && userId) {
        const myTypingRef = ref(database, `/typing/${chatId}/${userId}`);
        set(myTypingRef, false);
      }
    };
  }, [database, chatId, userId]);

  return { isOtherUserTyping, setTyping };
}
