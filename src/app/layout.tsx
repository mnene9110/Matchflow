
"use client"

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { OfflineDetector } from "@/components/OfflineDetector"
import { Navbar } from "@/components/Navbar"
import { InstallPWA } from "@/components/InstallPWA"
import { NotificationRequest } from "@/components/NotificationRequest"
import { GlobalCallOverlay } from "@/components/GlobalCallOverlay"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useFirebase } from '@/firebase/provider';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth } = useFirebase();
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // 1. Initial Mount Check
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Unified Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsInitialized(true);
    });
    return () => unsubscribe();
  }, [auth]);

  // 3. Route Protection Logic
  useEffect(() => {
    if (!isInitialized || !mounted) return;

    const publicRoutes = ['/', '/welcome', '/login', '/onboarding/fast', '/onboarding/full', '/settings/privacy', '/settings/terms'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // If no user and trying to access private route, redirect to welcome
    if (!user && !isPublicRoute) {
      router.replace('/welcome');
    }
  }, [user, isInitialized, mounted, pathname, router]);

  // 4. Stable rendering to prevent hydration mismatch
  // We render the splash if we aren't initialized OR if the client hasn't mounted yet
  // This ensures the Server and the First Client Render are identical
  if (!mounted || !isInitialized) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#3BC1A8] z-[9999]">
        <div className="flex flex-col items-center gap-6 animate-pulse">
           <svg viewBox="0 0 24 24" className="w-16 h-16 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
             <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
           </svg>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function PresenceManager() {
  const { auth, firestore } = useFirebase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const updatePresence = async (isOnline: boolean) => {
        try {
          await updateDoc(doc(firestore, 'userProfiles', user.uid), {
            isOnline,
            lastActiveAt: serverTimestamp()
          });
        } catch (e) {}
      };

      updatePresence(true);

      const handleVisibilityChange = () => {
        updatePresence(document.visibilityState === 'visible');
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        updatePresence(false);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('MatchFlow SW registered');
          })
          .catch((err) => {
            console.error('MatchFlow SW failed', err);
          });
      });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Pacifico&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#3BC1A8" />
      </head>
      <body className="font-body antialiased selection:bg-none bg-[#3BC1A8]">
        <FirebaseClientProvider>
          <NavigationGuard>
            <OfflineDetector>
              <PresenceManager />
              <div className="app-container bg-white min-h-svh">
                {children}
                <Navbar />
                <InstallPWA />
                <NotificationRequest />
                <GlobalCallOverlay />
              </div>
            </OfflineDetector>
          </NavigationGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
