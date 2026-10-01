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
  ShieldCheck,
  Zap,
  Gauge,
  Film,
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
      const saved = localStorage.getItem('qubar_download_history');
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
        localStorage.setItem('qubar_download_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('qubar_download_history');
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

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 flex-1">
        {/* Hero Section */}
        <section className="pt-12 sm:pt-18 pb-10 text-center">
          {/* Company & Product Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-pink-600/10 dark:from-violet-600/15 dark:via-indigo-600/15 dark:to-pink-600/15 px-4 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 shadow-md shadow-violet-500/5 dark:shadow-violet-500/10 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span>QubarStream by Qubartech</span>
            <span className="text-slate-400 dark:text-white/30">•</span>
            <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">Lossless 4K & MP3 Suite</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-5 leading-[1.15] font-['Plus_Jakarta_Sans']">
            Download Any Video in <br />
            <span className="bg-gradient-to-r from-violet-600 via-pink-600 to-sky-600 dark:from-violet-400 dark:via-pink-400 dark:to-sky-400 bg-clip-text text-transparent">
              Stunning 4K & Lossless Audio
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Engineered by <strong className="text-slate-900 dark:text-white font-semibold">Qubartech</strong>.{' '}
            Extract original quality video and audio from <strong className="text-red-600 dark:text-red-400">YouTube (4K, Shorts)</strong>,{' '}
            <strong className="text-pink-600 dark:text-pink-400">Instagram (Reels)</strong>,{' '}
            <strong className="text-blue-600 dark:text-blue-400">Facebook (Watch)</strong>, and{' '}
            <strong className="text-sky-600 dark:text-sky-400">Telegram</strong> with zero compression loss.
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
          <div className="mx-auto max-w-3xl mb-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.12] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-2.5 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-violet-500/10 focus-within:border-violet-500/60 focus-within:shadow-violet-500/25 transition-all">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl bg-slate-50/90 dark:bg-slate-950/90 border border-slate-200/60 dark:border-white/5 p-2 sm:pl-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Search className="h-5 w-5 text-violet-500 dark:text-violet-400 shrink-0" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={platformMeta.placeholder}
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none truncate font-medium"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 justify-end">
                {url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUrl('');
                      setError(null);
                    }}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                    className="h-9 text-xs font-semibold gap-1.5 border-slate-200 dark:border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-200"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Paste</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="h-10 px-5 font-bold shadow-md shadow-violet-500/25"
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-8">
            <span className="font-semibold text-slate-500 mr-1">Quick Test:</span>
            <button
              type="button"
              onClick={() => handleSelectSample('https://www.youtube.com/watch?v=aqz-KE-bpKQ')}
              className="rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-1 text-slate-700 dark:text-slate-300 hover:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer font-medium shadow-sm dark:shadow-none"
            >
              🎬 YouTube 4K (Big Buck Bunny)
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample('https://t.me/durov/532')}
              className="rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-1 text-slate-700 dark:text-slate-300 hover:border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer font-medium shadow-sm dark:shadow-none"
            >
              ✈️ Telegram (Durov Post)
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample('https://www.youtube.com/watch?v=nYvwY9yLNSA')}
              className="rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-1 text-slate-700 dark:text-slate-300 hover:border-pink-500/30 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer font-medium shadow-sm dark:shadow-none"
            >
              🎵 Asim Azhar (1080p OST)
            </button>
          </div>

          {/* Performance Stats Bar */}
          <div className="mx-auto max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/60 dark:bg-white/[0.02] border border-slate-200/50 dark:border-transparent shadow-sm dark:shadow-none">
              <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">4K UHD</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Up to 2160p 60fps</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/60 dark:bg-white/[0.02] border border-slate-200/50 dark:border-transparent shadow-sm dark:shadow-none">
              <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">&lt; 0.8s</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Stream Processing</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/60 dark:bg-white/[0.02] border border-slate-200/50 dark:border-transparent shadow-sm dark:shadow-none">
              <span className="font-mono text-base font-extrabold text-violet-600 dark:text-violet-400">320 kbps</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Lossless MP3 Audio</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-white/60 dark:bg-white/[0.02] border border-slate-200/50 dark:border-transparent shadow-sm dark:shadow-none">
              <span className="font-mono text-base font-extrabold text-pink-600 dark:text-pink-400">100% Free</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Zero Watermarks</span>
            </div>
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300 flex items-start gap-3 shadow-lg shadow-red-500/5">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
            <div>
              <strong className="font-semibold">Extraction Notice:</strong> {error}
            </div>
          </div>
        )}

        {/* Loading Card */}
        {loading && (
          <div className="mx-auto mb-10 max-w-3xl rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/70 backdrop-blur-2xl p-10 text-center shadow-xl dark:shadow-2xl">
            <Loader2 className="mx-auto h-11 w-11 text-violet-600 dark:text-violet-400 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 font-['Plus_Jakarta_Sans']">
              Analyzing Media Manifest...
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              QubarStream engine is parsing DASH video streams, audio bitrates, and resolving 4K/HD formats.
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
