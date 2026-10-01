'use client';

import React from 'react';
import { DownloadCloud, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-violet-500/25">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950/40 backdrop-blur-sm">
              <DownloadCloud className="h-6 w-6 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-slate-950 border border-emerald-500/50 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-violet-600 dark:from-white dark:via-slate-100 dark:to-violet-300 bg-clip-text text-xl font-black tracking-tight text-transparent font-['Plus_Jakarta_Sans']">
                QubarStream
              </span>
              <span className="rounded bg-violet-500/10 border border-violet-500/30 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>by</span>
              <span className="text-violet-600 dark:text-violet-400 font-bold tracking-wide hover:underline cursor-pointer">
                qubartech
              </span>
              <span>•</span>
              <span className="text-slate-400 dark:text-slate-500">Cloud Media Engine</span>
            </div>
          </div>
        </div>

        {/* Navigation links & Enterprise status */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#platforms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Supported Platforms
            </a>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Engine Specs
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Documentation
            </a>
          </nav>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden lg:block" />

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex items-center gap-2 py-1.5 px-3 text-xs border-slate-200 bg-slate-100/90 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="font-mono text-[11px]">Qubar Engine v2.4</span>
            </Badge>

            <a
              href="https://qubartech.com"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 transition-all hover:bg-violet-500/20 hover:border-violet-500/40"
            >
              <span>qubartech.com</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            {/* Dark / Light Theme Switcher */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
