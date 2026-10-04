'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { PersistentTask } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

interface BackgroundTasksContextType {
  tasks: PersistentTask[];
  startTask: (params: {
    url: string;
    title: string;
    formatId: string;
    formatLabel: string;
    isAudioOnly: boolean;
    directUrl?: string;
    expectedFilesize?: number;
  }) => Promise<PersistentTask>;
  cancelTaskById: (id: string) => Promise<void>;
  dismissTask: (id: string) => void;
  activeCount: number;
}

const BackgroundTasksContext = createContext<BackgroundTasksContextType | null>(null);

const STORAGE_KEY = 'qubar_saved_task_ids';

export function BackgroundTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<PersistentTask[]>([]);
  const trackedTaskIds = useRef<Set<string>>(new Set());
  const notifiedTasks = useRef<Set<string>>(new Set());

  // Load tracked task IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        ids.forEach((id) => trackedTaskIds.current.add(id));
      }
    } catch {
      // ignore
    }

    // Request notification permission if available
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const saveTrackedIds = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(trackedTaskIds.current)));
    } catch {
      // ignore
    }
  };

  // Poll server for updates on active tasks
  const fetchTaskUpdates = useCallback(async () => {
    if (trackedTaskIds.current.size === 0) {
      setTasks([]);
      return;
    }

    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.tasks)) return;

      const serverTasks: PersistentTask[] = data.tasks;
      // Filter tasks to only those the user originated/tracked
      const userTasks = serverTasks.filter((t) => trackedTaskIds.current.has(t.id));

      setTasks(userTasks);

      // Check for newly completed tasks to notify user
      userTasks.forEach((t) => {
        if (t.status === 'ready' && !notifiedTasks.current.has(t.id)) {
          notifiedTasks.current.add(t.id);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Download Complete! 🎉', {
                body: `${t.title} (${t.formatLabel}) is ready for download.`,
                icon: '/favicon.ico',
              });
            } catch {
              // ignore
            }
          }
        }
      });
    } catch {
      // ignore polling errors
    }
  }, []);

  // Poll periodically: every 1.5s if there are active tasks, or every 5s if idle
  useEffect(() => {
    fetchTaskUpdates();
    const hasActive = tasks.some((t) => t.status === 'downloading' || t.status === 'queued' || t.status === 'processing');
    const interval = setInterval(fetchTaskUpdates, hasActive ? 1500 : 5000);
    return () => clearInterval(interval);
  }, [fetchTaskUpdates, tasks]);

  const startTask = async (params: {
    url: string;
    title: string;
    formatId: string;
    formatLabel: string;
    isAudioOnly: boolean;
    directUrl?: string;
    expectedFilesize?: number;
  }): Promise<PersistentTask> => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start background download');
    }

    const data = await res.json();
    const newTask: PersistentTask = data.task;

    trackedTaskIds.current.add(newTask.id);
    saveTrackedIds();

    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
    return newTask;
  };

  const cancelTaskById = async (id: string) => {
    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' as const } : t))
    );
  };

  const dismissTask = (id: string) => {
    trackedTaskIds.current.delete(id);
    saveTrackedIds();
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const activeCount = tasks.filter(
    (t) => t.status === 'queued' || t.status === 'downloading' || t.status === 'processing'
  ).length;

  return (
    <BackgroundTasksContext.Provider
      value={{
        tasks,
        startTask,
        cancelTaskById,
        dismissTask,
        activeCount,
      }}
    >
      {children}
    </BackgroundTasksContext.Provider>
  );
}

export function useBackgroundTasks() {
  const ctx = useContext(BackgroundTasksContext);
  if (!ctx) {
    throw new Error('useBackgroundTasks must be used within BackgroundTasksProvider');
  }
  return ctx;
}
