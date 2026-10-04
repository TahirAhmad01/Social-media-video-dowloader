'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { YoutubeIcon, InstagramIcon, FacebookIcon, TelegramIcon } from './BrandIcons';
import { SupportedPlatform } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PlatformTabsProps {
  activePlatform: SupportedPlatform | 'all';
  onSelectPlatform: (platform: SupportedPlatform | 'all') => void;
}

export default function PlatformTabs({
  activePlatform,
  onSelectPlatform,
}: PlatformTabsProps) {
  const tabs = [
    {
      id: 'all',
      label: 'All Platforms',
      icon: Layers,
      activeClass: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 border-transparent',
    },
    {
      id: 'youtube',
      label: 'YouTube',
      icon: YoutubeIcon,
      activeClass: 'bg-red-600 text-white shadow-lg shadow-red-600/40 border-transparent',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      icon: InstagramIcon,
      activeClass: 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/40 border-transparent',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: FacebookIcon,
      activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 border-transparent',
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: TelegramIcon,
      activeClass: 'bg-sky-500 text-white shadow-lg shadow-sky-500/40 border-transparent',
    },
  ];

  return (
    <div className="w-full max-w-full overflow-x-auto no-scrollbar flex items-center justify-start sm:justify-center gap-2 mb-6 sm:mb-8 px-1 py-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activePlatform === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectPlatform(tab.id as SupportedPlatform | 'all')}
            className={cn(
              'flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer border select-none shrink-0',
              isActive
                ? tab.activeClass
                : 'border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white hover:-translate-y-0.5 shadow-sm dark:shadow-none'
            )}
          >
            <Icon size={15} />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
