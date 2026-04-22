'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { ref, onValue } from 'firebase/database';

/**
 * Hook to get real-time presence information for a specific user.
 * Rapid updates are fetched from Realtime Database to save Firestore costs.
 */
export function usePresence(userId: string | null | undefined) {
  const { database } = useFirebase();
  const [presence, setPresence] = useState<{ isOnline: boolean; lastActiveAt: number | null }>({
    isOnline: false,
    lastActiveAt: null
  });

  useEffect(() => {
    if (!database || !userId) {
      setPresence({ isOnline: false, lastActiveAt: null });
      return;
    }

    const presenceRef = ref(database, `/status/${userId}`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setPresence({
          isOnline: !!val.isOnline,
          lastActiveAt: val.lastActiveAt || null
        });
      } else {
        setPresence({ isOnline: false, lastActiveAt: null });
      }
    });

    return () => unsubscribe();
  }, [database, userId]);

  return presence;
}
