import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-Loyalty – digitale Stempelkarten',
  description: 'Digitale Stempelkarten für lokale Geschäfte – ohne App, ohne Registrierung.',
};

export const viewport: Viewport = { themeColor: '#14532d', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body className="min-h-dvh bg-stone-50 text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">{children}</body>
    </html>
  );
}
