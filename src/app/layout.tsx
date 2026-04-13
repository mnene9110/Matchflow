
"use client"

import { useEffect } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase"
import { OfflineDetector } from "@/components/OfflineDetector"
import { Navbar } from "@/components/Navbar"
import { GlobalCallOverlay } from "@/components/GlobalCallOverlay"

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
        <meta name="theme-color" content="#3BC1A8" />
        <meta name="msapplication-TileColor" content="#3BC1A8" />
        <meta name="apple-mobile-web-app-title" content="MatchFlow" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className="font-body antialiased selection:bg-none bg-[#3BC1A8]">
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
