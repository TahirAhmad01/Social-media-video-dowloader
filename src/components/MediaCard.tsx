'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Music,
  Video,
  Clock,
  User,
  Eye,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Play,
  Sparkles,
} from 'lucide-react';
import { MediaMetadata, VideoFormat, DownloadHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MediaCardProps {
  media: MediaMetadata;
  onRecordDownload?: (item: DownloadHistoryItem) => void;
}

export default function MediaCard({ media, onRecordDownload }: MediaCardProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio'>('all');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  useEffect(() => {
    if (media.formats.length > 0) {
      const defaultFmt = media.formats.find((f) => f.hasVideo) || media.formats[0];
      setSelectedFormatId(defaultFmt.id);
    }
  }, [media]);

  const getPlatformBadge = () => {
    switch (media.platform) {
      case 'youtube':
        return <Badge className="bg-red-600/90 text-white border-0 shadow-md">YouTube</Badge>;
      case 'instagram':
        return (
          <Badge className="bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white border-0 shadow-md">
            Instagram
          </Badge>
        );
      case 'facebook':
        return <Badge className="bg-blue-600/90 text-white border-0 shadow-md">Facebook</Badge>;
      case 'telegram':
        return <Badge className="bg-sky-500/90 text-white border-0 shadow-md">Telegram</Badge>;
      default:
        return <Badge className="bg-violet-600/90 text-white border-0 shadow-md">Media</Badge>;
    }
  };

  const getFormatBadgeVariant = (badgeText?: string, isAudio?: boolean) => {
    if (isAudio) return 'audio';
    if (!badgeText) return 'default';
    if (badgeText.includes('4K')) return 'uhd';
    if (badgeText.includes('2K')) return 'qhd';
    if (badgeText.includes('1080')) return 'fhd';
    if (badgeText.includes('720')) return 'hd';
    return 'default';
  };

  const handleDownload = async (format: VideoFormat) => {
    setDownloadingId(format.id);
    setDownloadSuccessId(null);

    try {
      const params = new URLSearchParams();
      params.set('url', media.url);
      params.set('format_id', format.id);
      params.set('title', media.title);
      if (format.isAudioOnly) {
        params.set('audio', '1');
      }
      if (format.url) {
        params.set('direct_url', format.url);
      }

      const downloadUrl = `/api/download?${params.toString()}`;

      const a = document.createElement('a');
      a.href = downloadUrl;
      const cleanTitle = media.title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80);
      a.download = `${cleanTitle}.${format.ext || 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (onRecordDownload) {
        onRecordDownload({
          id: `${media.id}_${format.id}_${Date.now()}`,
          title: media.title,
          platform: media.platform,
          thumbnail: media.thumbnail,
          formatLabel: format.label,
          downloadDate: Date.now(),
          url: media.url,
          filesizeText: format.filesizeText,
        });
      }

      setDownloadSuccessId(format.id);
      setTimeout(() => {
        setDownloadSuccessId(null);
      }, 4000);
    } catch (err) {
      console.error('Download trigger error:', err);
    } finally {
      setTimeout(() => {
        setDownloadingId(null);
      }, 1500);
    }
  };

  const proxiedThumbnail = media.thumbnail
    ? `/api/stream?url=${encodeURIComponent(media.thumbnail)}`
    : undefined;

  const previewSource = media.directUrl
    ? `/api/stream?url=${encodeURIComponent(media.directUrl)}`
    : undefined;

  const filteredFormats = media.formats.filter((fmt) => {
    if (filterType === 'video') return fmt.hasVideo;
    if (filterType === 'audio') return fmt.isAudioOnly;
    return true;
  });

  const selectedFormatObj = media.formats.find((f) => f.id === selectedFormatId) || media.formats[0];

  return (
    <div className="mx-auto mb-12 w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/70 backdrop-blur-xl shadow-xl dark:shadow-2xl overflow-hidden transition-all duration-300">
      <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] w-full">
        {/* Left Column: Preview & Thumbnail */}
        <div className="relative flex min-h-[260px] flex-col justify-center items-center bg-black overflow-hidden w-full">
          {isPlayingPreview && previewSource ? (
            <video
              src={previewSource}
              controls
              autoPlay
              playsInline
              className="h-full w-full max-h-[380px] bg-black"
            />
          ) : (
            <>
              {media.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxiedThumbnail || media.thumbnail}
                  alt={media.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = media.thumbnail || '';
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500">
                  <Video size={48} />
                </div>
              )}

              {previewSource && (
                <button
                  type="button"
                  onClick={() => setIsPlayingPreview(true)}
                  className="absolute inset-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/70 bg-black/75 text-white shadow-2xl transition-all duration-200 hover:scale-110 hover:bg-black/90 cursor-pointer"
                  title="Play video preview"
                >
                  <Play className="ml-1 h-6 w-6" />
                </button>
              )}
            </>
          )}

          {/* Platform badge */}
          <div className="absolute top-3 left-3 z-10">
            {getPlatformBadge()}
          </div>

          {/* Duration badge */}
          {media.durationFormatted && (
            <div className="absolute bottom-3 right-3 z-10 rounded-md border border-white/20 bg-black/85 px-2 py-0.5 font-mono text-xs font-bold text-white">
              {media.durationFormatted}
            </div>
          )}
        </div>

        {/* Right Column: Metadata, Quality Selector and Format list */}
        <div className="flex min-w-0 w-full flex-col p-5 sm:p-7 overflow-hidden">
          {/* Header & Title */}
          <div className="mb-4 min-w-0 w-full">
            <h2
              className={cn(
                'text-lg sm:text-xl font-bold leading-snug text-slate-900 dark:text-white break-words',
                !isTitleExpanded && 'line-clamp-3'
              )}
              title={media.title}
            >
              {media.title}
            </h2>

            {media.title.length > 80 && (
              <button
                type="button"
                onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                className="mt-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors cursor-pointer"
              >
                {isTitleExpanded ? '▲ Show less' : '▼ Show full title'}
              </button>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              {media.uploader && (
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <User className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
                  <span className="truncate">{media.uploader}</span>
                </div>
              )}
              {media.durationFormatted && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Clock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                  <span>{media.durationFormatted}</span>
                </div>
              )}
              {media.viewCount !== undefined && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Eye className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>{media.viewCount.toLocaleString()} views</span>
                </div>
              )}
              <a
                href={media.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 shrink-0 ml-auto font-medium"
              >
                <span>Original Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Quick Quality Selector Box */}
          {selectedFormatObj && (
            <div className="mb-5 rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/70 dark:bg-gradient-to-br dark:from-violet-950/40 dark:via-purple-900/20 dark:to-slate-900/60 p-4 shadow-sm dark:shadow-lg">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-amber-400">
                <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-amber-400" />
                <span>Select Desired Quality:</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                <select
                  value={selectedFormatId}
                  onChange={(e) => setSelectedFormatId(e.target.value)}
                  className="flex-1 min-w-0 truncate rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer shadow-sm"
                >
                  {media.formats.map((fmt) => (
                    <option key={fmt.id} value={fmt.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">
                      {fmt.label} {fmt.filesizeText ? `(${fmt.filesizeText})` : ''}
                    </option>
                  ))}
                </select>

                <Button
                  variant="success"
                  disabled={downloadingId === selectedFormatObj.id}
                  onClick={() => handleDownload(selectedFormatObj)}
                  className="shrink-0 h-10 px-5 font-bold shadow-md shadow-emerald-600/25"
                >
                  {downloadingId === selectedFormatObj.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : downloadSuccessId === selectedFormatObj.id ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download Now</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* All Available Formats List with Filter Tabs */}
          <div className="mt-auto min-w-0 w-full">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                All Available Formats ({media.formats.length})
              </span>
              <div className="flex rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-0.5">
                {(['all', 'video', 'audio'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-bold capitalize transition-all cursor-pointer',
                      filterType === type
                        ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
              {filteredFormats.map((fmt) => {
                const isDownloading = downloadingId === fmt.id;
                const isSuccess = downloadSuccessId === fmt.id;
                const badgeVariant = getFormatBadgeVariant(fmt.qualityBadge, fmt.isAudioOnly);

                return (
                  <div
                    key={fmt.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] p-2.5 transition-colors hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100/80 dark:hover:bg-white/[0.07] min-w-0 w-full"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Badge variant={badgeVariant} className="shrink-0 px-2 py-0.5 text-[11px]">
                        {fmt.qualityBadge || (fmt.isAudioOnly ? 'MP3' : 'MP4')}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {fmt.label}
                        </div>
                        {fmt.filesizeText && (
                          <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {fmt.filesizeText}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={fmt.isAudioOnly ? 'pink' : 'success'}
                      disabled={isDownloading}
                      onClick={() => handleDownload(fmt)}
                      className="shrink-0 font-bold"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Starting...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          {fmt.isAudioOnly ? <Music className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                          <span>Download</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
