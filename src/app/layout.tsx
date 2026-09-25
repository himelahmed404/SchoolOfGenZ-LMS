import type { Metadata, Viewport } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import { Celebrations } from '@/components/Penguin';

export const metadata: Metadata = {
  title: 'School of GenZ',
  description: 'পলিটেকনিক আর স্কিল কোর্সের জন্য বাংলায় শেখার প্ল্যাটফর্ম',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@400;600&family=Tiro+Bangla&display=swap"
        />
      </head>
      <body>
        <StoreProvider>
          {children}
          <Celebrations />
        </StoreProvider>
      </body>
    </html>
  );
}
