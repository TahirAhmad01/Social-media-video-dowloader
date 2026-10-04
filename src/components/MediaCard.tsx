'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  X,
  ArrowDownCircle,
} from 'lucide-react';
import { MediaMetadata, VideoFormat, DownloadHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatBytes } from '@/lib/utils';

export interface DownloadProgressInfo {
  percent: number | null;
  receivedBytes: number;
  totalBytes: number | null;
  speed: string;
  timeRemaining?: string;
}

interface MediaCardProps {
  media: MediaMetadata;
  onRecordDownload?: (item: DownloadHistoryItem) => void;
}

export default function MediaCard({ media, onRecordDownload }: MediaCardProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressInfo | null>(null);
  const [activeDownloadFormat, setActiveDownloadFormat] = useState<VideoFormat | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ id: string; message: string; mirrorUrl?: string } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio'>('all');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    if (badgeText.includes('8K')) return 'uhd';
    if (badgeText.includes('4K')) return 'uhd';
    if (badgeText.includes('2K') || badgeText.includes('1440')) return 'qhd';
    if (badgeText.includes('1080')) return 'fhd';
    if (badgeText.includes('720')) return 'hd';
    return 'default';
  };

  const triggerBlobDownload = (blob: Blob, format: VideoFormat) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const cleanTitle = media.title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'video';
    a.download = `${cleanTitle}.${format.ext || (format.isAudioOnly ? 'mp3' : 'mp4')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDownloadingId(null);
    setActiveDownloadFormat(null);
    setDownloadProgress(null);
    setDownloadStatus('');
  };

  const handleDownload = async (format: VideoFormat) => {
    if (downloadingId === format.id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setDownloadingId(format.id);
    setActiveDownloadFormat(format);
    setDownloadStatus('Starting download...');
    setDownloadSuccessId(null);
    setDownloadError(null);
    setDownloadProgress({
      percent: 0,
      receivedBytes: 0,
      totalBytes: null,
      speed: '',
    });

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

      // Fetch media directly from our in-house /api/download stream
      const res = await fetch(`/api/download?${params.toString()}`, {
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed (HTTP ${res.status})`);
      }

      // Determine total expected bytes from headers or media metadata
      const contentLengthHeader = res.headers.get('content-length');
      let totalBytes: number | null = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
      if (!totalBytes || isNaN(totalBytes) || totalBytes <= 0) {
        if (format.filesize && format.filesize > 0) {
          totalBytes = format.filesize;
        } else if (format.filesizeText) {
          const match = format.filesizeText.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            if (unit === 'GB') totalBytes = val * 1024 * 1024 * 1024;
            else if (unit === 'MB') totalBytes = val * 1024 * 1024;
            else if (unit === 'KB') totalBytes = val * 1024;
            else totalBytes = val;
          }
        } else if (media.duration && media.duration > 0) {
          const dur = media.duration;
          if (format.isAudioOnly) {
            totalBytes = Math.round(dur * 24 * 1024);
          } else if (format.height && format.height >= 4320) {
            totalBytes = Math.round(dur * 2000 * 1024);
          } else if (format.height && format.height >= 2160) {
            totalBytes = Math.round(dur * 900 * 1024);
          } else if (format.height && format.height >= 1440) {
            totalBytes = Math.round(dur * 450 * 1024);
          } else if (format.height && format.height >= 1080) {
            totalBytes = Math.round(dur * 280 * 1024);
          } else if (format.height && format.height >= 720) {
            totalBytes = Math.round(dur * 180 * 1024);
          } else if (format.height && format.height >= 480) {
            totalBytes = Math.round(dur * 100 * 1024);
          } else {
            totalBytes = Math.round(dur * 60 * 1024);
          }
        }
      }

      if (!res.body) {
        setDownloadStatus('Saving file...');
        const blob = await res.blob();
        triggerBlobDownload(blob, format);
        return;
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      const startTime = Date.now();
      let lastSpeedUpdate = startTime;
      let bytesSinceLastUpdate = 0;
      let currentSpeed = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          bytesSinceLastUpdate += value.length;

          const now = Date.now();
          const elapsed = (now - lastSpeedUpdate) / 1000;
          if (elapsed >= 0.3) {
            const bytesPerSec = bytesSinceLastUpdate / elapsed;
            currentSpeed = `${formatBytes(bytesPerSec)}/s`;
            bytesSinceLastUpdate = 0;
            lastSpeedUpdate = now;
          }

          let percent: number | null = null;
          let timeRemaining: string | undefined = undefined;

          if (totalBytes && totalBytes > 0) {
            percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
            const totalElapsed = (now - startTime) / 1000;
            if (totalElapsed > 1 && receivedBytes > 0) {
              const avgSpeed = receivedBytes / totalElapsed;
              const remainingBytes = Math.max(0, totalBytes - receivedBytes);
              const secLeft = Math.round(remainingBytes / avgSpeed);
              if (secLeft > 60) {
                timeRemaining = `${Math.floor(secLeft / 60)}m ${secLeft % 60}s left`;
              } else if (secLeft > 0) {
                timeRemaining = `${secLeft}s left`;
              } else {
                timeRemaining = 'Almost done...';
              }
            }
          }

          setDownloadProgress({
            percent,
            receivedBytes,
            totalBytes,
            speed: currentSpeed,
            timeRemaining,
          });

          if (percent !== null) {
            setDownloadStatus(`${percent}%`);
          } else {
            setDownloadStatus(formatBytes(receivedBytes));
          }
        }
      }

      // Stream completed successfully
      setDownloadProgress({
        percent: 100,
        receivedBytes,
        totalBytes: receivedBytes,
        speed: '',
        timeRemaining: 'Complete',
      });
      setDownloadStatus('Saving to device...');

      const contentType =
        res.headers.get('content-type') ||
        (format.isAudioOnly ? 'audio/mpeg' : 'video/mp4');
      const blob = new Blob(chunks as unknown as BlobPart[], { type: contentType });
      triggerBlobDownload(blob, format);

      if (onRecordDownload) {
        onRecordDownload({
          id: `${media.id}_${format.id}_${Date.now()}`,
          title: media.title,
          platform: media.platform,
          thumbnail: media.thumbnail,
          formatLabel: format.label,
          downloadDate: Date.now(),
          url: media.url,
          filesizeText: formatBytes(receivedBytes),
        });
      }

      setDownloadingId(null);
      setDownloadSuccessId(format.id);
      setDownloadStatus('Downloaded!');

      setTimeout(() => {
        setDownloadSuccessId(null);
        setActiveDownloadFormat(null);
        setDownloadProgress(null);
        setDownloadStatus('');
      }, 4000);
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        setDownloadingId(null);
        setActiveDownloadFormat(null);
        setDownloadProgress(null);
        setDownloadStatus('');
        return;
      }
      console.error('Download error:', err);
      const msg = err instanceof Error ? err.message : 'Download failed to start.';
      setDownloadError({
        id: format.id,
        message: msg,
      });
      setDownloadingId(null);
      setActiveDownloadFormat(null);
      setDownloadProgress(null);
      setDownloadStatus('');
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
              <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                <a
                  href={media.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium text-xs"
                >
                  <span>Original Link</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Download Error Banner */}
          {downloadError && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <div className="flex-1 font-medium">{downloadError.message}</div>
            </div>
          )}

          {/* Real-Time Download Progress Card */}
          {downloadProgress && activeDownloadFormat && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-slate-950/90 dark:bg-gradient-to-br dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-950/80 p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold shadow-md transition-colors',
                      downloadProgress.percent === 100
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 animate-pulse'
                    )}
                  >
                    {downloadProgress.percent === 100 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 animate-bounce" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                        {downloadProgress.percent === 100 ? 'Download Complete' : 'Downloading Media'}
                      </span>
                      <span className="rounded bg-emerald-200/80 dark:bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                        {activeDownloadFormat.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[240px] sm:max-w-md">
                      {media.title}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {downloadProgress.percent !== null ? (
                    <span className="font-mono text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                      {downloadProgress.percent}%
                    </span>
                  ) : (
                    <span className="font-mono text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 animate-pulse">
                      {formatBytes(downloadProgress.receivedBytes)}
                    </span>
                  )}
                  {downloadProgress.percent !== 100 && (
                    <button
                      type="button"
                      onClick={handleCancelDownload}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer shadow-sm"
                      title="Cancel download"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900/90 border border-slate-300 dark:border-emerald-500/20 shadow-inner">
                {downloadProgress.percent !== null ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-md shadow-emerald-500/50 transition-all duration-200 ease-out relative overflow-hidden"
                    style={{ width: `${Math.max(2, downloadProgress.percent)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer" />
                  </div>
                ) : (
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-md shadow-emerald-500/50 animate-indeterminate" />
                )}
              </div>

              {/* Progress Stats Footer */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {formatBytes(downloadProgress.receivedBytes)}
                  </span>
                  {downloadProgress.totalBytes ? (
                    <span>/ {formatBytes(downloadProgress.totalBytes)}</span>
                  ) : (
                    <span>downloaded</span>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  {downloadProgress.speed && downloadProgress.percent !== 100 && (
                    <span className="text-teal-700 dark:text-teal-400 font-semibold">
                      ⚡ {downloadProgress.speed}
                    </span>
                  )}
                  {downloadProgress.timeRemaining && downloadProgress.percent !== 100 && (
                    <span className="text-slate-500 dark:text-slate-400">
                      ⏳ {downloadProgress.timeRemaining}
                    </span>
                  )}
                  {downloadProgress.percent === 100 && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      ✓ Ready in downloads
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Quality Selector Box */}
          {selectedFormatObj && (() => {
            const isQualitySuccess = downloadSuccessId === selectedFormatObj.id;
            const isQualityDownloading = downloadingId === selectedFormatObj.id && !isQualitySuccess;

            return (
              <div className="mb-5 rounded-xl border border-violet-200/80 dark:border-white/10 bg-violet-50/80 dark:bg-slate-950/75 p-4 shadow-sm dark:shadow-inner">
                <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Select Desired Quality:</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                  <select
                    value={selectedFormatId}
                    onChange={(e) => setSelectedFormatId(e.target.value)}
                    className="flex-1 min-w-0 truncate rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer shadow-sm"
                  >
                    {media.formats.map((fmt) => (
                      <option key={fmt.id} value={fmt.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                        {fmt.label} {fmt.filesizeText ? `(${fmt.filesizeText})` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="success"
                      disabled={isQualityDownloading}
                      onClick={() => handleDownload(selectedFormatObj)}
                      className={cn(
                        "flex-1 sm:flex-none h-10 px-6 font-bold shadow-md min-w-[160px] transition-all",
                        isQualitySuccess
                          ? "bg-emerald-600 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-500 text-white shadow-emerald-600/30"
                          : isQualityDownloading
                          ? "shadow-emerald-600/25 opacity-90 cursor-wait"
                          : "shadow-emerald-600/25"
                      )}
                    >
                      {isQualitySuccess ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                          <span>{downloadStatus || 'Downloaded!'}</span>
                        </>
                      ) : isQualityDownloading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          <span className="truncate">
                            {downloadProgress?.percent !== null && downloadProgress?.percent !== undefined
                              ? `Downloading ${downloadProgress.percent}%`
                              : downloadStatus || 'Starting...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 shrink-0" />
                          <span>Download Now</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

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
                const isSuccess = downloadSuccessId === fmt.id;
                const isDownloading = downloadingId === fmt.id && !isSuccess;
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
                      className={cn(
                        "shrink-0 font-bold min-w-[110px] transition-all",
                        isSuccess && "bg-emerald-600 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-500 text-white shadow-emerald-600/30"
                      )}
                    >
                      {isSuccess ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                          <span>Saved!</span>
                        </>
                      ) : isDownloading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                          <span className="truncate">
                            {downloadProgress?.percent !== null && downloadProgress?.percent !== undefined
                              ? `${downloadProgress.percent}%`
                              : downloadStatus || 'Starting...'}
                          </span>
                        </>
                      ) : (
                        <>
                          {fmt.isAudioOnly ? (
                            <Music className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Download className="h-3.5 w-3.5 shrink-0" />
                          )}
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
