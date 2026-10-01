'use client';

import React from 'react';
import { Zap, ShieldCheck, Download, Smartphone } from 'lucide-react';
import { YoutubeIcon, InstagramIcon, FacebookIcon, TelegramIcon } from './BrandIcons';

export default function FeaturesGuide() {
  const features = [
    {
      platform: 'YouTube Downloader',
      icon: YoutubeIcon,
      iconBg: 'bg-red-500/15 text-red-500',
      description:
        'Supports standard videos, YouTube Shorts, Music videos, and 60fps streams. Extract pristine MP3 audio or 4K, 2K, and 1080p Full HD video with merged sound.',
    },
    {
      platform: 'Instagram Reels & Posts',
      icon: InstagramIcon,
      iconBg: 'bg-pink-500/15 text-pink-500',
      description:
        'Download high-definition Instagram Reels, Video posts, IGTV, and carousels directly without watermarks or quality degradation.',
    },
    {
      platform: 'Facebook Videos & Watch',
      icon: FacebookIcon,
      iconBg: 'bg-blue-500/15 text-blue-500',
      description:
        'Save Facebook public watch videos, Reels, live recordings, and shared video clips in crisp HD and SD quality MP4 format.',
    },
    {
      platform: 'Telegram Channel Media',
      icon: TelegramIcon,
      iconBg: 'bg-sky-500/15 text-sky-400',
      description:
        'Ultra-fast direct media extraction from public Telegram channels and post messages without requiring any account login.',
    },
  ];

  return (
    <section className="my-14 w-full">
      <div className="text-center mb-9">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          All-In-One High Speed Video Engine
        </h3>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Engineered for pristine downloads across all top social platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {features.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 transition-all hover:border-white/20 hover:-translate-y-1 hover:shadow-xl shadow-black/40"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${item.iconBg}`}>
                <Icon size={22} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">{item.platform}</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          );
        })}
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-violet-300">
          <Zap className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">Zero Wait Queue</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">100% Free & No Ads</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-blue-300">
          <Download className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">No Install Required</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-pink-300">
          <Smartphone className="h-4 w-4" />
          <span className="text-xs sm:text-sm font-semibold">Mobile & Desktop</span>
        </div>
      </div>
    </section>
  );
}
