"use client"

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider, useUser } from "@/firebase"
import { OfflineDetector } from "@/components/OfflineDetector"
import { Navbar } from "@/components/Navbar"
import { GlobalCallOverlay } from "@/components/GlobalCallOverlay"
import { InstallPWA } from "@/components/InstallPWA"

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    const publicRoutes = ['/', '/welcome', '/login', '/onboarding/fast', '/onboarding/full', '/settings/privacy', '/settings/terms'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // If not logged in and trying to access private route, force replace to welcome
    if (!user && !isPublicRoute) {
      window.location.replace('/welcome');
    }
  }, [user, isUserLoading, pathname]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Disable browser back button functionality by replacing history state
    window.onbeforeunload = null;
    const preventConfirm = (e: BeforeUnloadEvent) => {
      delete e['returnValue'];
    };
    window.addEventListener('beforeunload', preventConfirm);

    // Register Service Worker for PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
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
        <meta name="msapplication-TileColor" content="#3BC1A8" />
        <meta name="apple-mobile-web-app-title" content="MatchFlow" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
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
              </div>
            </OfflineDetector>
          </NavigationGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
