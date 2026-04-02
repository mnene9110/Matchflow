
"use client"

import { useEffect } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase"
import { OfflineDetector } from "@/components/OfflineDetector"
import { Navbar } from "@/components/Navbar"
import { GlobalCallOverlay } from "@/components/GlobalCallOverlay"
import Script from 'next/script';

/**
 * @fileOverview Root layout component.
 * Added ExitGuard to prevent accidental app exits, with bypass for payments.
 */

function ExitGuard() {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if we have explicitly allowed the exit (e.g. for payments)
      if ((window as any).__bypassExitGuard) {
        return;
      }
      
      // Standard way to trigger the browser's "Are you sure you want to leave?" popup
      e.preventDefault();
      e.returnValue = ''; 
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              <ExitGuard />
              {children}
              <Navbar />
              <GlobalCallOverlay />
            </div>
          </OfflineDetector>
        </FirebaseClientProvider>
        <Toaster />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('Service Worker registration successful');
                  },
                  function(err) {
                    console.error('Service Worker registration failed: ', err);
                  }
                ).catch(function(e) {
                   console.error('SW Error:', e);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
