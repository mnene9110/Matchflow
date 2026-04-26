
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase/provider';
import { ref, onValue, set, onDisconnect } from 'firebase/database';

/**
 * Hook to manage real-time typing status in a specific chat using Firebase Realtime Database.
 */
export function useTyping(chatId: string | null, userId: string | null, otherUserId: string | null) {
  const { database } = useFirebase();
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!chatId || !otherUserId || !database) return;

    const typingRef = ref(database, `typing/${chatId}/${otherUserId}`);
    
    const unsubscribe = onValue(typingRef, (snapshot) => {
      setIsOtherUserTyping(!!snapshot.val());
    });

    return () => unsubscribe();
  }, [chatId, otherUserId, database]);

  const setTyping = (isTyping: boolean) => {
    if (!chatId || !userId || !database) return;

    const myTypingRef = ref(database, `typing/${chatId}/${userId}`);
    set(myTypingRef, isTyping);

    if (isTyping) {
      // Auto-clear typing status after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        set(myTypingRef, false);
      }, 3000);
      
      // Clear on disconnect
      onDisconnect(myTypingRef).set(false);
    }
  };

  return { isOtherUserTyping, setTyping };
}
