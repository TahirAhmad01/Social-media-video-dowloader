import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#08090d' },
  ],
};

export const metadata: Metadata = {
  title: 'QStream Downloader - Universal 8K, 4K & HD Video Downloader',
  description:
    'High-speed 8K, 4K, 1080p video and audio downloader for YouTube, Instagram, Facebook, and Telegram with real-time stream processing.',
  keywords: [
    'QStream',
    'QStream Downloader',
    'video downloader',
    'youtube 4k downloader',
    'youtube 8k downloader',
    'instagram reels downloader',
    'facebook video download',
    'telegram media download',
    'mp4 converter',
    'mp3 extraction',
  ],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  authors: [{ name: 'QStream', url: 'https://qubartech.com' }],
};

import { BackgroundTasksProvider } from '@/components/tasks/BackgroundTasksContext';
import BackgroundTaskWidget from '@/components/tasks/BackgroundTaskWidget';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#08090d] dark:text-slate-100 antialiased selection:bg-violet-500/30 selection:text-violet-200 transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <BackgroundTasksProvider>
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))]" />
            <div className="relative z-10 flex min-h-screen w-full max-w-full flex-col overflow-x-hidden">
              {children}
            </div>
            <BackgroundTaskWidget />
          </BackgroundTasksProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
