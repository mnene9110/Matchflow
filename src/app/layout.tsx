
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
import { supabase } from '@/lib/supabase';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
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

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace('/welcome');
      }
    });

    return () => {
      if (listener?.subscription) {
        listener.subscription.unsubscribe();
      }
    };
  }, [pathname]);

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
              <GlobalCallOverlay />
            </div>
          </OfflineDetector>
        </NavigationGuard>
        <Toaster />
      </body>
    </html>
  );
}
