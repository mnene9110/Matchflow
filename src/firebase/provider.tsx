'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { isSupabaseConfigValid } from '@/firebase/config';
import { ShieldAlert, Terminal } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface FirebaseContextState {
  areServicesAvailable: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * GUTTED PROVIDER: No longer initializes Firebase.
 * Acts as a simple config check for Supabase.
 */
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const areServicesAvailable = isSupabaseConfigValid();

  const contextValue = useMemo(() => ({
    areServicesAvailable,
  }), [areServicesAvailable]);

  if (!areServicesAvailable) {
    return (
      <div className="min-h-svh bg-zinc-950 flex items-center justify-center p-6 text-white font-body">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20">
              <ShieldAlert className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black font-headline tracking-tight">Supabase Config Required</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Please add your Supabase credentials to your environment variables.
            </p>
          </div>

          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 rounded-2xl p-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle className="font-black uppercase tracking-widest text-[10px] mb-2">Required Keys</AlertTitle>
            <AlertDescription className="text-xs font-mono break-all opacity-80">
              NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
