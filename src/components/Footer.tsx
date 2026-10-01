'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 mt-16 py-10 text-center text-xs sm:text-sm text-slate-500">
      <div className="mx-auto max-w-5xl px-4">
        <div className="font-semibold text-slate-400">OmniStream DL • Next.js Universal Video Downloader</div>
        <p className="mt-2 text-[11px] text-slate-600 max-w-lg mx-auto leading-relaxed">
          Disclaimer: This application is for personal, educational, and backup purposes only.
          Please respect intellectual property rights and the Terms of Service of respective content platforms.
        </p>
      </div>
    </footer>
  );
}
