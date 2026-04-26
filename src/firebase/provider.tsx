'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { isSupabaseConfigValid } from '@/firebase/config';

interface FirebaseContextState {
  areServicesAvailable: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Simple context provider to manage service availability state.
 * Supabase keys are hardcoded, so areServicesAvailable is essentially always true.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const areServicesAvailable = isSupabaseConfigValid();

  const contextValue = useMemo(() => ({
    areServicesAvailable,
  }), [areServicesAvailable]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider.');
  return context;
};
