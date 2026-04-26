"use client"

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase"
import { OfflineDetector } from "@/components/OfflineDetector"
import { Navbar } from "@/components/Navbar"
import { GlobalCallOverlay } from "@/components/GlobalCallOverlay"
import { InstallPWA } from "@/components/InstallPWA"
import { NotificationRequest } from "@/components/NotificationRequest"
import { supabase } from '@/lib/supabase';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // If Supabase isn't initialized yet (due to missing keys), let the provider show the error
    if (!supabase) return;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const publicRoutes = ['/', '/welcome', '/login', '/onboarding/fast', '/onboarding/full', '/settings/privacy', '/settings/terms'];
      const isPublicRoute = publicRoutes.includes(pathname);

      if (!session && !isPublicRoute) {
        window.location.replace('/welcome');
      } else {
        setIsReady(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChanged((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace('/welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (!isReady) return <div className="h-svh w-full bg-[#3BC1A8]" />;

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    window.onbeforeunload = null;
    const preventConfirm = (e: BeforeUnloadEvent) => {
      delete e['returnValue'];
    };
    window.addEventListener('beforeunload', preventConfirm);

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
    
    return () => window.removeEventListener('beforeunload', preventConfirm);
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
              <div className="app-container">
                {children}
                <Navbar />
                <GlobalCallOverlay />
                <InstallPWA />
                <NotificationRequest />
              </div>
            </OfflineDetector>
          </NavigationGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
