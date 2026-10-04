'use client';

import React from 'react';
import { History, Trash2, ArrowUpRight, Film } from 'lucide-react';
import { DownloadHistoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface DownloadHistoryProps {
  history: DownloadHistoryItem[];
  onClearHistory: () => void;
  onSelectUrl: (url: string) => void;
}

export default function DownloadHistory({
  history,
  onClearHistory,
  onSelectUrl,
}: DownloadHistoryProps) {
  if (history.length === 0) return null;

  return (
    <section className="mx-auto mb-10 sm:mb-14 w-full max-w-5xl">
      <div className="mb-3.5 sm:mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          <History className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 dark:text-violet-400 shrink-0" />
          <span>Recent Downloads</span>
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearHistory}
          className="text-xs text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/30 h-8 px-2.5 sm:px-3"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <span>Clear History</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2.5 sm:gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 backdrop-blur-md p-3 sm:p-3.5 transition-all hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-1 hover:shadow-xl shadow-slate-200/50 dark:shadow-black/40 min-w-0"
          >
            <div className="relative aspect-video w-full rounded-lg bg-black overflow-hidden">
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/stream?url=${encodeURIComponent(item.thumbnail)}`}
                  alt={item.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = item.thumbnail || '';
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500">
                  <Film size={32} />
                </div>
              )}
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug break-words" title={item.title}>
              {item.title}
            </div>

            <div className="mt-auto flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 gap-2">
              <span className="capitalize text-violet-700 dark:text-violet-300 font-medium truncate text-[11px] sm:text-xs">
                {item.platform} • {item.formatLabel}
              </span>
              <button
                type="button"
                onClick={() => onSelectUrl(item.url)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <span>Re-fetch</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
