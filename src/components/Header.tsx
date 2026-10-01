'use client';

import React from 'react';
import { DownloadCloud, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 shadow-lg shadow-violet-500/30">
            <DownloadCloud className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="bg-gradient-to-r from-white via-slate-100 to-violet-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
              OmniStream DL
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Universal HD Video Downloader
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3.5 text-xs text-slate-300 border-white/10 bg-white/5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="hidden sm:inline font-medium">High Speed Engine</span>
            <span className="sm:hidden font-medium">Ready</span>
          </Badge>
          <Badge variant="default" className="hidden md:flex items-center gap-1.5 py-1.5 px-3">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span>4K & 1080p Ready</span>
          </Badge>
        </div>
      </div>
    </header>
  );
}
