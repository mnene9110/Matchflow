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
 * Fixed 'InvalidStateError' by moving ServiceWorker registration into a standard 
 * client-side useEffect hook that respects the document's ready state.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Robust ServiceWorker registration logic
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('Service Worker registered successfully with scope:', reg.scope);
          })
          .catch((err) => {
            // Log non-state errors only to prevent console noise during navigation
            if (err.name !== 'InvalidStateError') {
              console.error('Service Worker registration failed:', err);
            }
          });
      };

      // Ensure registration only happens when document is stable
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Pacifico&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MatchFlow" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className="font-body antialiased">
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
