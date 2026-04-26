'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Compatibility Hook: Previously useSupabaseUser, now provides Firebase user and profile data.
 * This maintains compatibility with components during the transition.
 */
export function useSupabaseUser() {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const profileRef = doc(firestore, 'userProfiles', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Provide camelCase and snake_case for UI compatibility
            setProfile({
              ...data,
              id: currentUser.uid,
              coin_balance: data.coinBalance ?? 0,
              diamond_balance: data.diamondBalance ?? 0,
              is_admin: data.isAdmin,
              is_verified: data.isVerified,
              is_coinseller: data.isCoinseller,
              is_support: data.isSupport,
              is_agent: data.isAgent,
              is_party_admin: data.isPartyAdmin,
              check_in_streak: data.checkInStreak ?? 0,
              last_check_in_date: data.lastCheckInDate ?? "",
              agency_id: data.agencyId,
              member_of_agency_id: data.memberOfAgencyId,
              agency_join_status: data.agencyJoinStatus
            });
          } else {
            setProfile(null);
          }
          setIsLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, firestore]);

  return { 
    user: user ? { ...user, id: user.uid } : null, 
    profile, 
    isLoading 
  };
}
