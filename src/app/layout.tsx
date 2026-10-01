import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QubarStream - Universal HD & 4K Media Downloader | by Qubartech',
  description:
    'Enterprise-grade video and audio extraction engine by Qubartech. Seamlessly save 4K, 1080p, and MP3 media from YouTube, Instagram, Facebook, and Telegram with zero latency.',
  keywords: [
    'Qubartech',
    'QubarStream',
    'video downloader',
    'youtube 4k downloader',
    'instagram reels downloader',
    'facebook video download',
    'telegram media download',
    'mp4 converter',
    'mp3 extraction',
  ],
  authors: [{ name: 'Qubartech', url: 'https://qubartech.com' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-violet-500/30 selection:text-violet-200">
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
