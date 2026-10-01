import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OmniStream DL - Instagram, Telegram, Facebook & YouTube Video Downloader',
  description:
    'Free high-speed video downloader for YouTube, Instagram Reels, Facebook Videos, and Telegram media. Download in 1080p, 720p MP4 or high-quality MP3 audio.',
  keywords: [
    'video downloader',
    'youtube downloader',
    'instagram reels downloader',
    'facebook video download',
    'telegram video download',
    'mp4 download',
    'mp3 converter',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body>
        <div className="ambient-glow" />
        {children}
      </body>
    </html>
  );
}
