'use client';

import React, { useState } from 'react';
import { useBackgroundTasks } from './BackgroundTasksContext';
import {
  DownloadCloud,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { formatBytes, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function BackgroundTaskWidget() {
  const { tasks, cancelTaskById, dismissTask, activeCount } = useBackgroundTasks();
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <aside
      aria-label="Active Background Downloads"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl border border-slate-300/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
        {/* Floating Header */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          className="flex items-center justify-between p-3 sm:p-3.5 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-teal-600/10 dark:from-violet-950/40 dark:via-indigo-950/40 dark:to-teal-950/40 cursor-pointer select-none border-b border-slate-200/80 dark:border-white/10"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
              {activeCount > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              )}
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900">
                  {activeCount}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>Background Downloads</span>
                {activeCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Running in background
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeCount > 0
                  ? `${activeCount} task${activeCount > 1 ? 's' : ''} continuing even if you close this tab`
                  : 'All background downloads completed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </div>

        {/* Task List (collapsible or always open if expanded or active) */}
        {isExpanded && (
          <div className="max-h-80 overflow-y-auto p-2.5 sm:p-3 divide-y divide-slate-100 dark:divide-white/5 space-y-2">
            {tasks.map((task) => {
              const isFinished = task.status === 'ready';
              const isRunning = task.status === 'downloading' || task.status === 'queued' || task.status === 'processing';
              const isFailed = task.status === 'failed';
              const isCancelled = task.status === 'cancelled';

              return (
                <div key={task.id} className="pt-2 first:pt-0">
                  <div className="flex items-start justify-between gap-2.5 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={task.title}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="rounded bg-slate-100 dark:bg-white/10 px-1 py-0.2 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {task.formatLabel}
                        </span>
                        {task.speed && isRunning && (
                          <span className="text-teal-600 dark:text-teal-400 font-semibold font-mono">
                            ⚡ {task.speed}
                          </span>
                        )}
                        {isRunning && (
                          <span className="text-slate-400">
                            {formatBytes(task.receivedBytes)}
                            {task.totalBytes ? ` / ${formatBytes(task.totalBytes)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isFinished && (
                        <a
                          href={`/api/tasks/file?id=${encodeURIComponent(task.id)}`}
                          download={task.filename}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>Save</span>
                        </a>
                      )}

                      {isRunning && (
                        <button
                          type="button"
                          onClick={() => cancelTaskById(task.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Cancel background task"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {(isFinished || isFailed || isCancelled) && (
                        <button
                          type="button"
                          onClick={() => dismissTask(task.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isRunning && (
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      {task.progressPercent !== null && task.progressPercent > 0 ? (
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-teal-400 transition-all duration-300"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      ) : (
                        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-teal-400 animate-indeterminate" />
                      )}
                    </div>
                  )}

                  {/* Status Note */}
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>
                      {task.status === 'queued' && 'Queued for background download...'}
                      {task.status === 'downloading' && (task.progressPercent ? `${task.progressPercent}% downloaded` : 'Downloading stream...')}
                      {task.status === 'processing' && 'Encoding & merging formats...'}
                      {task.status === 'ready' && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Ready for instant save</span>}
                      {task.status === 'failed' && <span className="text-red-500">Failed: {task.error}</span>}
                      {task.status === 'cancelled' && <span className="text-slate-400">Cancelled</span>}
                    </span>

                    {isRunning && (
                      <span className="text-[9px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-bold">
                        Cloud task
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
