
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

  // 1. Centralized Auth Listener - Runs only once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsInitialized(true);
    });
    return () => unsubscribe();
  }, [auth]);

  // 2. Route Guard - Responds to path or auth changes without unmounting the whole tree
  useEffect(() => {
    if (!isInitialized) return;

    const publicRoutes = ['/', '/welcome', '/login', '/onboarding/fast', '/onboarding/full', '/settings/privacy', '/settings/terms'];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && !isPublicRoute) {
      router.replace('/welcome');
    }
  }, [user, isInitialized, pathname, router]);

  // 3. Prevent flickering: Only show the global loader on the very first boot
  if (!isInitialized) {
    return <div className="h-svh w-full bg-[#3BC1A8]" />;
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
            console.log('MatchFlow SW registered:', registration.scope);
          })
          .catch((err) => {
            console.error('MatchFlow SW registration failed:', err);
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
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
      </head>
      <body className="font-body antialiased selection:bg-none">
        <FirebaseClientProvider>
          <NavigationGuard>
            <OfflineDetector>
              <PresenceManager />
              <div className="app-container">
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
