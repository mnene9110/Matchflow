import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MatchFlow',
    short_name: 'MatchFlow',
    description: 'Connect with Heart',
    start_url: '/',
    display: 'standalone',
    background_color: '#FF3737', // Updated to brand color for splash screen
    theme_color: '#FF3737',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
