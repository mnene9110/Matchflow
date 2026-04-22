
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { Database } from 'firebase/database';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { ShieldAlert, Terminal } from "lucide-react"

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  database: Database | null;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  database: Database | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  database: Database;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  database,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: !!auth, 
    userError: null,
  });

  // Ref to track last update timestamp to prevent write spam
  const lastPresenceUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: null });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  // Firestore Presence tracking - Throttled for cost efficiency
  useEffect(() => {
    if (!userAuthState.user || !firestore) return;

    const userRef = doc(firestore, "userProfiles", userAuthState.user.uid);
    
    const updatePresence = (isOnline: boolean) => {
      const now = Date.now();
      // Optimization: Only update Firestore if it's been more than 5 minutes or it's a status flip
      // We force update on offline and on first load
      const timeSinceLastUpdate = now - lastPresenceUpdateRef.current;
      const isStatusFlip = (lastPresenceUpdateRef.current === 0) || !isOnline;

      if (!isStatusFlip && timeSinceLastUpdate < 300000) {
        // Skip update if less than 5 mins passed and we're just heartbeat-ing online
        return;
      }
      
      lastPresenceUpdateRef.current = now;
      updateDoc(userRef, { 
        isOnline, 
        lastActiveAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    };

    // Initial Online Set
    updatePresence(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
      } else {
        // When going background, we don't immediately set offline to avoid flickering
        // but we might update lastActiveAt
        updatePresence(true); 
      }
    };

    const handleBeforeUnload = () => {
      // Mark offline immediately on tab close
      updateDoc(userRef, { isOnline: false }).catch(() => {});
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateDoc(userRef, { isOnline: false }).catch(() => {});
    };
  }, [userAuthState.user, firestore]);

  const areServicesAvailable = !!(firebaseApp && firestore && auth && database);

  const contextValue = useMemo((): FirebaseContextState => {
    return {
      areServicesAvailable,
      firebaseApp,
      firestore,
      auth,
      database,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, database, userAuthState, areServicesAvailable]);

  if (!areServicesAvailable) {
    return (
      <div className="min-h-svh bg-zinc-950 flex items-center justify-center p-6 text-white font-body">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20">
              <ShieldAlert className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black font-headline tracking-tight">Configuration Required</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              MatchFlow needs your Firebase API keys to connect to the database and authentication services.
            </p>
          </div>

          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 rounded-2xl p-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle className="font-black uppercase tracking-widest text-[10px] mb-2">Technical Detail</AlertTitle>
            <AlertDescription className="text-xs font-mono break-all opacity-80">
              Missing: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] text-center">How to fix this</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <p className="text-[11px] text-zinc-300">Go to your project <b>Settings</b> in the Firebase Console.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <p className="text-[11px] text-zinc-300">Copy your Web App configuration object.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                <p className="text-[11px] text-zinc-300">Add the keys to your <b>Vercel Environment Variables</b> or local <b>.env</b> file.</p>
              </div>
            </div>
          </div>
          
          <p className="text-[9px] text-center text-zinc-600 font-bold uppercase tracking-widest">
            The app will reload automatically once keys are detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  if (!context.areServicesAvailable) {
    throw new Error('Firebase core services not available.');
  }

  return {
    firebaseApp: context.firebaseApp!,
    firestore: context.firestore!,
    auth: context.auth!,
    database: context.database!,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useDatabase = (): Database => useFirebase().database;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T & {__memo?: boolean} {
  const memoized = useMemo(factory, deps);
  if (typeof memoized === 'object' && memoized !== null) {
    (memoized as any).__memo = true;
  }
  return memoized as any;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
