'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PlatformTabs from '@/components/PlatformTabs';
import MediaCard from '@/components/MediaCard';
import DownloadHistory from '@/components/DownloadHistory';
import FeaturesGuide from '@/components/FeaturesGuide';
import Footer from '@/components/Footer';
import {
  Search,
  ClipboardPaste,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SupportedPlatform, MediaMetadata, DownloadHistoryItem } from '@/lib/types';
import { detectPlatform, getPlatformMeta } from '@/lib/url-detector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [url, setUrl] = useState('');
  const [selectedTab, setSelectedTab] = useState<SupportedPlatform | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaData, setMediaData] = useState<MediaMetadata | null>(null);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);

  const detectedPlatform = detectPlatform(url);
  const effectivePlatform = selectedTab !== 'all' ? selectedTab : detectedPlatform;
  const platformMeta = getPlatformMeta(effectivePlatform);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('omni_download_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRecordDownload = (item: DownloadHistoryItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((i) => i.url !== item.url || i.formatLabel !== item.formatLabel);
      const updated = [item, ...filtered].slice(0, 12);
      try {
        localStorage.setItem('omni_download_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('omni_download_history');
    } catch {
      // ignore
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setError(null);
      }
    } catch {
      // ignore
    }
  };

  const handleFetch = async (targetUrl?: string) => {
    const toFetch = (targetUrl || url).trim();
    if (!toFetch) {
      setError('Please paste or enter a valid video link.');
      return;
    }

    if (!toFetch.startsWith('http://') && !toFetch.startsWith('https://')) {
      setError('Please include http:// or https:// in your URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setMediaData(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: toFetch }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect media URL.');
      }

      setMediaData(data.data);
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve video.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetch();
  };

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setError(null);
    handleFetch(sampleUrl);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 flex-1">
        {/* Hero Section */}
        <section className="pt-12 sm:pt-16 pb-8 text-center">
          <Badge
            variant="default"
            className="mb-5 inline-flex items-center gap-1.5 py-1.5 px-4 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span>Universal Social Media Downloader</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Download Any Video in <br />
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-sky-400 bg-clip-text text-transparent">
              Stunning High Definition
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-lg text-slate-300 mb-8 leading-relaxed">
            Instantly download videos, reels, stories, and audio from{' '}
            <strong className="text-red-400">YouTube</strong>,{' '}
            <strong className="text-pink-400">Instagram</strong>,{' '}
            <strong className="text-blue-400">Facebook</strong>, and{' '}
            <strong className="text-sky-400">Telegram</strong>. Fast, free, and watermark-free.
          </p>

          {/* Platform Switcher Tabs */}
          <PlatformTabs
            activePlatform={selectedTab}
            onSelectPlatform={(p) => {
              setSelectedTab(p);
              setError(null);
            }}
          />

          {/* Search/URL Form Card */}
          <div className="mx-auto max-w-3xl mb-4 rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-2xl p-2.5 shadow-2xl shadow-violet-500/10 focus-within:border-violet-500/50 focus-within:shadow-violet-500/20 transition-all">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl bg-slate-950/80 border border-white/5 p-2 sm:pl-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className="h-5 w-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={platformMeta.placeholder}
                  className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 outline-none truncate"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0 justify-end">
                {url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUrl('');
                      setError(null);
                    }}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                    title="Clear input"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePaste}
                    className="h-9 text-xs"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    <span>Paste</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="h-10 px-5 font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Video</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Quick test chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-500 mr-1">Quick Test:</span>
            <button
              type="button"
              onClick={() => handleSelectSample('https://www.youtube.com/watch?v=aqz-KE-bpKQ')}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              🎬 YouTube 4K (Big Buck Bunny)
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample('https://t.me/durov/532')}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              ✈️ Telegram (Durov Video)
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample('https://www.youtube.com/watch?v=nYvwY9yLNSA')}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              🎵 Asim Azhar (1080p OST)
            </button>
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Extraction Notice:</strong> {error}
            </div>
          </div>
        )}

        {/* Loading Card */}
        {loading && (
          <div className="mx-auto mb-10 max-w-3xl rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-10 text-center shadow-xl">
            <Loader2 className="mx-auto h-10 w-10 text-violet-400 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Analyzing Media Link...</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Retrieving video stream details, audio streams, and all available 4K/HD resolutions.
            </p>
          </div>
        )}

        {/* Media Details & Format Selection Card */}
        {mediaData && !loading && (
          <MediaCard
            media={mediaData}
            onRecordDownload={handleRecordDownload}
          />
        )}

        {/* Download History Section */}
        <DownloadHistory
          history={history}
          onClearHistory={handleClearHistory}
          onSelectUrl={(selectedUrl) => {
            setUrl(selectedUrl);
            handleFetch(selectedUrl);
          }}
        />

        {/* Features Guide Grid */}
        <FeaturesGuide />
      </main>

      <Footer />
    </div>
  );
}
