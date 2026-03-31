import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase"
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'MatchFlow - Genuine Connections',
  description: 'Find your perfect match with video calls and AI icebreakers.',
  manifest: '/manifest.json',
  themeColor: '#800000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MatchFlow',
  },
};

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased bg-white min-h-svh flex flex-col items-center">
        <FirebaseClientProvider>
          <div className="w-full max-w-md min-h-svh flex flex-col bg-white shadow-2xl relative overflow-hidden">
            {children}
          </div>
        </FirebaseClientProvider>
        <Toaster />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.worker.register('/sw.js').then(
                  function(registration) {
                    console.log('Service Worker registration successful with scope: ', registration.scope);
                  },
                  function(err) {
                    console.log('Service Worker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}