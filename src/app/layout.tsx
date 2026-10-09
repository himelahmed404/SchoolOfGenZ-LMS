import type { Metadata, Viewport } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';
import { ApiProvider } from '@/lib/api/provider';
import { StoreProvider } from '@/lib/store';
import { THEME_SCRIPT } from '@/lib/theme';
import { Celebrations } from '@/components/Penguin';
import { DevBar } from '@/components/DevBar';

export const metadata: Metadata = {
  title: 'School of GenZ',
  description: 'পলিটেকনিক আর স্কিল কোর্সের জন্য বাংলায় শেখার প্ল্যাটফর্ম',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

/** The demo sign-in and screen switcher. Development only; NEXT_PUBLIC_DEV_BAR=0 hides it there too. */
const DEV_BAR = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_BAR !== '0';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600;700&family=Baloo+Da+2:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Tiro+Bangla&display=swap"
        />
        {/* display=block on purpose: with swap the icon names would flash as text. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0&display=block"
        />
      </head>
      <body className={DEV_BAR ? 'has-devbar' : undefined}>
        <ApiProvider>
          <StoreProvider>
            {DEV_BAR ? <DevBar /> : null}
            {children}
            <Celebrations />
          </StoreProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
