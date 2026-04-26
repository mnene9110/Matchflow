"use client"

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { OfflineDetector } from "@/components/OfflineDetector"
import { Navbar } from "@/components/Navbar"
import { InstallPWA } from "@/components/InstallPWA"
import { NotificationRequest } from "@/components/NotificationRequest"
import { supabase } from '@/lib/supabase';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Comprehensive check for client-side and supabase availability
    if (typeof window === 'undefined') return;

    // Use a robust way to check for auth methods presence before invocation
    const auth = supabase?.auth;
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      console.warn("Supabase auth module is not yet ready.");
      // We wait for the next render or effect cycle
      const retryTimer = setTimeout(() => setIsReady(prev => prev), 100);
      return () => clearTimeout(retryTimer);
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await auth.getSession();
        
        const publicRoutes = ['/', '/welcome', '/login', '/onboarding/fast', '/onboarding/full', '/settings/privacy', '/settings/terms'];
        const isPublicRoute = publicRoutes.includes(pathname);

        if (!session && !isPublicRoute) {
          window.location.replace('/welcome');
        } else {
          setIsReady(true);
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        setIsReady(true);
      }
    };

    checkAuth();

    // Standard Supabase v2 listener pattern
    const { data: { subscription } } = auth.onAuthStateChanged((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace('/welcome');
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [pathname]);

  // Use a consistent loading state to prevent flickering
  if (!isReady) return <div className="h-svh w-full bg-[#3BC1A8]" />;

  return <>{children}</>;
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
        <NavigationGuard>
          <OfflineDetector>
            <div className="app-container">
              {children}
              <Navbar />
              <InstallPWA />
              <NotificationRequest />
            </div>
          </OfflineDetector>
        </NavigationGuard>
        <Toaster />
      </body>
    </html>
  );
}
