import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'E-Loyalty Stempelkarte',
    short_name: 'Stempelkarte',
    lang: 'de-CH',
    start_url: '/',
    display: 'standalone',
    theme_color: '#14532d',
    background_color: '#f7f5ef',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
