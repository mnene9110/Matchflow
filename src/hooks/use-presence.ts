
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { ref, onValue } from 'firebase/database';

/**
 * Hook to get real-time presence information for a specific user.
 * Uses Realtime Database for immediate detection.
 */
export function usePresence(userId: string | null | undefined) {
  const { database } = useFirebase();
  const [presence, setPresence] = useState<{ isOnline: boolean; lastActiveAt: any }>({
    isOnline: false,
    lastActiveAt: null
  });

  useEffect(() => {
    if (!userId || !database) {
      setPresence({ isOnline: false, lastActiveAt: null });
      return;
    }

    const userStatusRef = ref(database, `/status/${userId}`);
    
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPresence({
          isOnline: data.state === 'online',
          lastActiveAt: data.last_changed
        });
      }
    });

    return () => unsubscribe();
  }, [userId, database]);

  return { isOnline: presence.isOnline, lastActiveAt: presence.lastActiveAt };
}
