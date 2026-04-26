
'use client';
import React, { createContext, useContext, ReactNode } from 'react';
// Context gutted as Supabase is used directly via lib/supabase.ts
export const FirebaseContext = createContext<any>(undefined);
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
export const useFirebase = () => ({});
