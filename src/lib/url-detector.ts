import { SupportedPlatform } from './types';

export function detectPlatform(rawUrl: string): SupportedPlatform {
  if (!rawUrl) return 'generic';
  const url = rawUrl.toLowerCase().trim();

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('instagram.com') || url.includes('instagr.am')) {
    return 'instagram';
  }
  if (
    url.includes('facebook.com') ||
    url.includes('fb.watch') ||
    url.includes('fb.com') ||
    url.includes('facebook.com/reel')
  ) {
    return 'facebook';
  }
  if (
    url.includes('t.me') ||
    url.includes('telegram.me') ||
    url.includes('telegram.dog')
  ) {
    return 'telegram';
  }

  return 'generic';
}

export function getPlatformMeta(platform: SupportedPlatform) {
  switch (platform) {
    case 'youtube':
      return {
        name: 'YouTube',
        color: '#ff0033',
        gradient: 'linear-gradient(135deg, #ff0033, #cc0000)',
        textColor: '#ffffff',
        badgeBg: 'rgba(255, 0, 51, 0.15)',
        badgeBorder: 'rgba(255, 0, 51, 0.4)',
        placeholder: 'Paste YouTube video, Shorts, or Music URL (e.g., https://youtube.com/watch?v=...)',
        sampleUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        sampleTitle: 'Big Buck Bunny (YouTube Test)',
      };
    case 'instagram':
      return {
        name: 'Instagram',
        color: '#e1306c',
        gradient: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
        textColor: '#ffffff',
        badgeBg: 'rgba(225, 48, 108, 0.15)',
        badgeBorder: 'rgba(225, 48, 108, 0.4)',
        placeholder: 'Paste Instagram Reel, Video, or Post URL (e.g., https://www.instagram.com/reel/...)',
        sampleUrl: 'https://www.instagram.com/reel/C-pL68_v2aH/',
        sampleTitle: 'Sample Instagram Reel',
      };
    case 'facebook':
      return {
        name: 'Facebook',
        color: '#1877f2',
        gradient: 'linear-gradient(135deg, #1877f2, #0e5aae)',
        textColor: '#ffffff',
        badgeBg: 'rgba(24, 119, 242, 0.15)',
        badgeBorder: 'rgba(24, 119, 242, 0.4)',
        placeholder: 'Paste Facebook Video, Reel, or Watch URL (e.g., https://fb.watch/... or facebook.com/...)',
        sampleUrl: 'https://fb.watch/sampleVideo/',
        sampleTitle: 'Sample Facebook Video',
      };
    case 'telegram':
      return {
        name: 'Telegram',
        color: '#229ed9',
        gradient: 'linear-gradient(135deg, #2aabee, #229ed9)',
        textColor: '#ffffff',
        badgeBg: 'rgba(34, 158, 217, 0.15)',
        badgeBorder: 'rgba(34, 158, 217, 0.4)',
        placeholder: 'Paste Telegram channel video post (e.g., https://t.me/durov/532)',
        sampleUrl: 'https://t.me/durov/532',
        sampleTitle: 'Pavel Durov Channel Video (Telegram Test)',
      };
    default:
      return {
        name: 'Media Downloader',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        textColor: '#ffffff',
        badgeBg: 'rgba(139, 92, 246, 0.15)',
        badgeBorder: 'rgba(139, 92, 246, 0.4)',
        placeholder: 'Paste video link from YouTube, Instagram, Facebook, or Telegram...',
        sampleUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        sampleTitle: 'Big Buck Bunny (YouTube Test)',
      };
  }
}

export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}
