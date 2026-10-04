export type SupportedPlatform = 'youtube' | 'instagram' | 'facebook' | 'telegram' | 'generic';

export interface VideoFormat {
  id: string;
  label: string;
  ext: string;
  resolution?: string;
  height?: number;
  filesize?: number; // bytes
  filesizeText?: string;
  formatNote?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  isAudioOnly: boolean;
  url?: string;
  qualityBadge?: string;
}

export interface MediaMetadata {
  id: string;
  url: string;
  title: string;
  description?: string;
  platform: SupportedPlatform;
  platformName: string;
  thumbnail?: string;
  duration?: number; // seconds
  durationFormatted?: string;
  uploader?: string;
  uploaderUrl?: string;
  viewCount?: number;
  likeCount?: number;
  formats: VideoFormat[];
  directUrl?: string;
  mediaType: 'video' | 'audio' | 'image' | 'carousel';
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  platform: SupportedPlatform;
  thumbnail?: string;
  formatLabel: string;
  downloadDate: number;
  url: string;
  filesizeText?: string;
}

