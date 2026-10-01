'use client';

import React from 'react';
import {
  Zap,
  ShieldCheck,
  Download,
  Smartphone,
  Cpu,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon, FacebookIcon, TelegramIcon } from './BrandIcons';

export default function FeaturesGuide() {
  const platforms = [
    {
      platform: 'YouTube Engine',
      badge: '4K UHD & Shorts',
      icon: YoutubeIcon,
      iconBg: 'bg-red-500/15 text-red-500',
      description:
        'Supports standard videos, YouTube Shorts, Music videos, and 60fps streams. Extract pristine MP3 audio or 4K, 2K, and 1080p Full HD video with merged sound.',
    },
    {
      platform: 'Instagram Suite',
      badge: 'Reels & Carousels',
      icon: InstagramIcon,
      iconBg: 'bg-pink-500/15 text-pink-500',
      description:
        'Download high-definition Instagram Reels, Video posts, IGTV, and carousels directly without watermarks or quality degradation.',
    },
    {
      platform: 'Facebook Watch',
      badge: 'Public & Reels',
      icon: FacebookIcon,
      iconBg: 'bg-blue-500/15 text-blue-500',
      description:
        'Save Facebook public watch videos, Reels, live recordings, and shared video clips in crisp HD and SD quality MP4 format.',
    },
    {
      platform: 'Telegram Cloud',
      badge: 'Direct CDN',
      icon: TelegramIcon,
      iconBg: 'bg-sky-500/15 text-sky-400',
      description:
        'Ultra-fast direct media extraction from public Telegram channels and post messages without requiring any account login.',
    },
  ];

  const enterpriseFeatures = [
    {
      icon: Cpu,
      title: 'Qubartech Smart Muxer',
      desc: 'Seamlessly merges adaptive video and audio DASH streams on-the-fly into universally playable MP4 containers.',
    },
    {
      icon: Zap,
      title: 'Sub-Second Latency',
      desc: 'Optimized server pipeline delivers media manifest analysis and instant download streaming in under 0.8 seconds.',
    },
    {
      icon: Lock,
      title: 'Privacy Guaranteed',
      desc: 'No logs, zero tracking, and no persistent media storage. Temporary files are destroyed immediately after streaming.',
    },
    {
      icon: Layers,
      title: 'Lossless Audio Extraction',
      desc: 'Studio-grade MP3/M4A sound extraction up to 320 kbps with accurate ID3 title and metadata tagging.',
    },
  ];

  return (
    <section id="features" className="my-16 w-full scroll-mt-20">
      {/* Platforms Grid */}
      <div id="platforms" className="text-center mb-10 scroll-mt-20">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <span>Multi-Network Architecture</span>
        </div>
        <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          Engineered for All Major Platforms
        </h3>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Built on Qubartech&apos;s high-throughput video pipeline, delivering clean, watermark-free media at maximum server speeds.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {platforms.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="group relative rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 transition-all duration-300 hover:border-violet-500/40 hover:-translate-y-1.5 hover:shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-violet-500/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} transition-transform group-hover:scale-110`}>
                  <Icon size={24} />
                </div>
                <span className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                  {item.badge}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">{item.platform}</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>

      {/* Enterprise Architecture Highlights */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-900/80 dark:via-slate-950/80 dark:to-slate-900/80 p-8 sm:p-10 mb-14 shadow-xl dark:shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Technology Stack
            </span>
            <h4 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Why Professionals Choose QubarStream by Qubartech
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Powered by Qubartech Cloud Infrastructure
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {enterpriseFeatures.map((feat, i) => {
            const FeatIcon = feat.icon;
            return (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10 dark:bg-violet-600/15 border border-violet-500/25 text-violet-600 dark:text-violet-300 mb-1">
                  <FeatIcon className="h-5 w-5" />
                </div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">{feat.title}</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-violet-700 dark:text-violet-300">
          <Zap className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">Zero Wait Queue</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">100% Free & No Ads</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
          <Download className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">No Install Required</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-pink-700 dark:text-pink-300">
          <Smartphone className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">Mobile & Desktop</span>
        </div>
      </div>
    </section>
  );
}
