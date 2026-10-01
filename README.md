# OmniStream DL - Universal Video Downloader

A high-performance Next.js application designed to download videos and audio from **YouTube**, **Instagram**, **Facebook**, and **Telegram**.

## 🌟 Key Features

- **Multi-Platform Support**:
  - **YouTube**: Standard videos, Shorts, Music videos, 1080p Full HD, 720p HD, and MP3 audio extraction.
  - **Instagram**: Reels, Post videos, IGTV, and carousels.
  - **Facebook**: Public watch videos, Reels, and shared video clips (HD/SD MP4).
  - **Telegram**: Public channel videos and media posts.
- **Pristine Quality & Codec Merging**: Bundled `ffmpeg` with audio and video stream merging for uncompressed playback.
- **In-Browser Video Preview**: Play videos directly before saving.
- **One-Click Clipboard Paste**: Instant paste and URL platform detection.
- **Local Download History**: Keeps track of recent downloads in browser storage.
- **Sleek Glassmorphic Dark UI**: Built with responsive Vanilla CSS and custom SVG branding.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3 with `yt-dlp` installed (`yt-dlp` is already present on this system)

### Run the App

```bash
# Start development server
npm run dev

# Or build for production
npm run build
npm start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.
