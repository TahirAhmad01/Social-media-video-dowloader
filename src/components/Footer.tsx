'use client';

import React from 'react';
import { DownloadCloud, ExternalLink, Globe, Code2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.08] mt-20 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-white/[0.08]">
          {/* Company Brand Column */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 shadow-md shadow-violet-500/30">
                <DownloadCloud className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white font-['Plus_Jakarta_Sans']">
                QubarStream
              </span>
              <span className="rounded bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                by qubartech
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Professional media extraction and stream processing suite engineered by{' '}
              <strong className="text-violet-300 font-semibold">Qubartech</strong>. Designed for creators, researchers, and enterprises worldwide.
            </p>
          </div>

          {/* Links Column */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-400">
            <a
              href="https://qubartech.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>qubartech.com</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a href="#platforms" className="hover:text-white transition-colors">
              Supported Platforms
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Engine Features
            </a>
            <a
              href="https://github.com/TahirAhmad01/Social-media-video-dowloader"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Code2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Source Repository</span>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>© {new Date().getFullYear()}</span>
            <a
              href="https://qubartech.com"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-slate-400 hover:text-violet-300 transition-colors"
            >
              Qubartech
            </a>
            <span>• All rights reserved.</span>
          </div>

          <p className="text-[11px] text-slate-600 text-center sm:text-right max-w-md leading-relaxed">
            Legal: QubarStream is intended strictly for personal archiving and educational research.
            Users are solely responsible for complying with the Terms of Service of each content provider.
          </p>
        </div>
      </div>
    </footer>
  );
}
