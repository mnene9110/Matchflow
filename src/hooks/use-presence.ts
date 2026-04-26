
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Hook to get real-time presence information for a specific user.
 * Uses Firestore snapshots for presence detection.
 */
export function usePresence(userId: string | null | undefined) {
  const { firestore } = useFirebase();
  const [presence, setPresence] = useState<{ isOnline: boolean; lastActiveAt: any }>({
    isOnline: false,
    lastActiveAt: null
  });

  useEffect(() => {
    if (!userId) {
      setPresence({ isOnline: false, lastActiveAt: null });
      return;
    }

    const profileRef = doc(firestore, 'userProfiles', userId);
    const unsubscribe = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPresence({
          isOnline: !!data.isOnline,
          lastActiveAt: data.lastActiveAt
        });
      }
    });

    return () => unsubscribe();
  }, [userId, firestore]);

  return { isOnline: presence.isOnline, lastActiveAt: presence.lastActiveAt };
}
