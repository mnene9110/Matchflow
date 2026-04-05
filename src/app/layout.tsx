"use client"

import { useEffect } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase"
import { OfflineDetector } from "@/components/OfflineDetector"
import { Navbar } from "@/components/Navbar"
import { GlobalCallOverlay } from "@/components/GlobalCallOverlay"

/**
 * @fileOverview Root layout component.
 * Optimized to remove browser artifacts like navigation prompts and scroll bounce.
 * Disabled zooming for native-app feel.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // 1. Prevent "Leave Site" browser prompts completely
    window.onbeforeunload = null;
    const preventConfirm = (e: BeforeUnloadEvent) => {
      delete e['returnValue'];
    };
    window.addEventListener('beforeunload', preventConfirm);

    // 2. Robust ServiceWorker registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('Service Worker registered');
          })
          .catch((err) => {
            if (err.name !== 'InvalidStateError') {
              console.error('SW registration failed:', err);
            }
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => {
          window.removeEventListener('load', registerSW);
          window.removeEventListener('beforeunload', preventConfirm);
        };
      }
    }
    
    return () => window.removeEventListener('beforeunload', preventConfirm);
  }, []);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Pacifico&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MatchFlow" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className="font-body antialiased selection:bg-none">
        <FirebaseClientProvider>
          <OfflineDetector>
            <div className="app-container">
              {children}
              <Navbar />
              <GlobalCallOverlay />
            </div>
          </OfflineDetector>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
