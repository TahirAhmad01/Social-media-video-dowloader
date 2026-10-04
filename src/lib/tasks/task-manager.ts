import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { getYtDlpPath, getYtDlpBaseArgs } from '@/lib/downloader';
import { cleanVideoUrl } from '@/lib/url-detector';

export type TaskStatus = 'queued' | 'downloading' | 'processing' | 'ready' | 'failed' | 'cancelled';

export interface BackgroundTask {
  id: string;
  url: string;
  title: string;
  formatId: string;
  formatLabel: string;
  isAudioOnly: boolean;
  ext: string;
  status: TaskStatus;
  progressPercent: number | null;
  receivedBytes: number;
  totalBytes: number | null;
  speed: string;
  error?: string;
  filePath?: string;
  filename: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

// Global in-memory storage for active tasks (survives hot reloads via globalThis)
const globalTasks = globalThis as unknown as {
  __qubar_background_tasks__?: Map<string, BackgroundTask>;
  __qubar_background_processes__?: Map<string, { abort: () => void }>;
  __qubar_cleanup_interval__?: NodeJS.Timeout;
};

if (!globalTasks.__qubar_background_tasks__) {
  globalTasks.__qubar_background_tasks__ = new Map<string, BackgroundTask>();
}
if (!globalTasks.__qubar_background_processes__) {
  globalTasks.__qubar_background_processes__ = new Map<string, { abort: () => void }>();
}

const taskStore = globalTasks.__qubar_background_tasks__;
const processStore = globalTasks.__qubar_background_processes__;

// Helper to sanitize filenames safely
export function sanitizeDownloadFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\s]+/g, ' ')
    .trim()
    .slice(0, 100) || 'media';
}

// Get the designated directory for prepared download files
export function getStorageDirectory(): string {
  const dir = path.join(os.tmpdir(), 'qubar_downloads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Periodic cleanup of finished files older than 6 hours
if (!globalTasks.__qubar_cleanup_interval__) {
  globalTasks.__qubar_cleanup_interval__ = setInterval(() => {
    const now = Date.now();
    const expiry = 6 * 60 * 60 * 1000; // 6 hours

    taskStore.forEach((task, id) => {
      if ((task.status === 'ready' || task.status === 'failed' || task.status === 'cancelled') && now - task.updatedAt > expiry) {
        if (task.filePath && fs.existsSync(task.filePath)) {
          try {
            fs.unlinkSync(task.filePath);
          } catch {
            // ignore
          }
        }
        taskStore.delete(id);
        processStore.delete(id);
      }
    });
  }, 10 * 60 * 1000); // Check every 10 min
}

export function getTask(id: string): BackgroundTask | null {
  return taskStore.get(id) || null;
}

export function getAllTasks(): BackgroundTask[] {
  return Array.from(taskStore.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function cancelTask(id: string): boolean {
  const task = taskStore.get(id);
  if (!task) return false;

  const proc = processStore.get(id);
  if (proc) {
    try {
      proc.abort();
    } catch {
      // ignore
    }
    processStore.delete(id);
  }

  task.status = 'cancelled';
  task.updatedAt = Date.now();
  if (task.filePath && fs.existsSync(task.filePath)) {
    try {
      fs.unlinkSync(task.filePath);
    } catch {
      // ignore
    }
  }
  return true;
}

// Savenow cloud stream resolver for ultra-fast direct streaming when available
async function resolveCloudUrl(targetUrl: string, formatId: string): Promise<string | null> {
  const isAudioOnly = formatId === 'best-audio-mp3' || formatId === 'audio';
  let primaryResolution = '1080';
  if (isAudioOnly) {
    primaryResolution = 'mp3';
  } else if (formatId === 'video-4320' || formatId === 'video-8k' || formatId === '8k') {
    primaryResolution = '8k';
  } else if (formatId === 'video-2160' || formatId === 'video-4k' || formatId === '4k') {
    primaryResolution = '4k';
  } else if (formatId === 'video-1440' || formatId === '1440') {
    primaryResolution = '1440';
  } else {
    primaryResolution = formatId.replace('video-', '') || '1080';
  }

  const resolutionsToTry = [primaryResolution];
  if (!isAudioOnly) {
    if (primaryResolution === '8k') resolutionsToTry.push('4k', '1440', '1080');
    else if (primaryResolution === '4k') resolutionsToTry.push('1440', '1080');
    else if (primaryResolution === '1440') resolutionsToTry.push('1080', '720');
  }

  for (const resolution of resolutionsToTry) {
    try {
      const res = await fetch(
        `https://p.savenow.to/ajax/download.php?copyright=0&format=${resolution}&url=${encodeURIComponent(targetUrl)}&api=dfcb6d76f2f6a9894gjkege8a4ab88b398`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          },
        }
      );

      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      if (!data || !data.id) continue;

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const pRes = await fetch(`https://p.savenow.to/api/progress?id=${data.id}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          },
        });
        if (pRes.ok) {
          const pData = await pRes.json().catch(() => ({}));
          if (pData.download_url) {
            return pData.download_url;
          }
          if (pData.success === -1 || (pData.text && pData.text.toLowerCase().includes('error'))) {
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function createBackgroundTask(params: {
  url: string;
  title: string;
  formatId: string;
  formatLabel: string;
  isAudioOnly: boolean;
  directUrl?: string;
  expectedFilesize?: number;
}): BackgroundTask {
  const cleanUrl = cleanVideoUrl(params.url);
  const ext = params.isAudioOnly ? 'mp3' : 'mp4';
  const cleanTitle = sanitizeDownloadFilename(params.title);
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const filename = `${cleanTitle}.${ext}`;

  const task: BackgroundTask = {
    id: taskId,
    url: cleanUrl,
    title: params.title,
    formatId: params.formatId,
    formatLabel: params.formatLabel,
    isAudioOnly: params.isAudioOnly,
    ext,
    status: 'queued',
    progressPercent: 0,
    receivedBytes: 0,
    totalBytes: params.expectedFilesize || null,
    speed: '',
    filename,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  taskStore.set(taskId, task);

  // Trigger processing asynchronously in background — decoupled from any HTTP request/browser session!
  executeTaskInBackground(task, params.directUrl).catch((err) => {
    console.error(`[background-task:${taskId}] execution failed:`, err);
    task.status = 'failed';
    task.error = err instanceof Error ? err.message : 'Download failed';
    task.updatedAt = Date.now();
  });

  return task;
}

async function executeTaskInBackground(task: BackgroundTask, directUrl?: string) {
  task.status = 'downloading';
  task.updatedAt = Date.now();

  const storageDir = getStorageDirectory();
  const targetFilePath = path.join(storageDir, `${task.id}.${task.ext}`);
  const abortCtrl = new AbortController();

  let cancelled = false;
  processStore.set(task.id, {
    abort: () => {
      cancelled = true;
      abortCtrl.abort();
    },
  });

  try {
    // 1. Check if direct URL is available (e.g. Telegram or direct CDN)
    if (directUrl && directUrl.startsWith('http') && !task.isAudioOnly) {
      try {
        await streamToFile(directUrl, targetFilePath, task, abortCtrl.signal);
        if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).size > 1024) {
          finishTask(task, targetFilePath);
          return;
        }
      } catch (e) {
        console.warn(`[background-task:${task.id}] directUrl stream failed, falling back:`, e);
      }
    }

    // 2. Check if cloud resolver works (YouTube)
    const isYouTube = task.url.includes('youtube.com') || task.url.includes('youtu.be');
    if (isYouTube) {
      const cloudUrl = await resolveCloudUrl(task.url, task.formatId);
      if (cloudUrl) {
        try {
          await streamToFile(cloudUrl, targetFilePath, task, abortCtrl.signal);
          if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).size > 1024) {
            finishTask(task, targetFilePath);
            return;
          }
        } catch (e) {
          console.warn(`[background-task:${task.id}] cloudUrl stream failed, falling back:`, e);
        }
      }
    }

    if (cancelled) return;

    // 3. Fallback to local yt-dlp execution
    task.status = 'processing';
    task.updatedAt = Date.now();

    const ytDlp = await getYtDlpPath();
    const baseArgs = getYtDlpBaseArgs();
    const downloadArgs = [...baseArgs];

    if (task.isAudioOnly) {
      downloadArgs.push(
        '-x',
        '--audio-format',
        'mp3',
        '--audio-quality',
        '0',
        '-o',
        targetFilePath,
        task.url
      );
    } else if (task.formatId.startsWith('video-')) {
      const raw = task.formatId.replace('video-', '');
      const height = raw === '8k' ? '4320' : raw === '4k' ? '2160' : raw;
      downloadArgs.push(
        '-f',
        `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
        '--merge-output-format',
        'mp4',
        '-o',
        targetFilePath,
        task.url
      );
    } else if (task.formatId === 'best' || task.formatId === 'best-video') {
      downloadArgs.push(
        '-f',
        'bestvideo+bestaudio/best',
        '--merge-output-format',
        'mp4',
        '-o',
        targetFilePath,
        task.url
      );
    } else {
      downloadArgs.push(
        '-f',
        `${task.formatId}+bestaudio/bestvideo[format_id=${task.formatId}]+bestaudio/${task.formatId}/best`,
        '--merge-output-format',
        'mp4',
        '-o',
        targetFilePath,
        task.url
      );
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn(ytDlp, downloadArgs);
      let stderr = '';

      processStore.set(task.id, {
        abort: () => {
          cancelled = true;
          child.kill('SIGTERM');
        },
      });

      child.stdout.on('data', (data) => {
        const text = data.toString();
        // Parse [download] 45.2% of ~ 12.34MiB at 2.45MiB/s ETA 00:03
        const percentMatch = text.match(/(\d+\.?\d*)%/);
        const speedMatch = text.match(/at\s+([\d.]+\w+\/s)/);
        if (percentMatch) {
          task.progressPercent = Math.min(99, Math.round(parseFloat(percentMatch[1])));
        }
        if (speedMatch) {
          task.speed = speedMatch[1];
        }
        task.updatedAt = Date.now();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (cancelled) return;
        if (code === 0) {
          resolve();
        } else {
          // Check if output exists despite non-zero code
          const baseName = task.id;
          const files = fs.readdirSync(storageDir).filter((f) => f.startsWith(baseName));
          if (files.length > 0) {
            resolve();
          } else {
            reject(new Error(stderr || `yt-dlp exited with code ${code}`));
          }
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    if (cancelled) return;

    // Detect actual output file
    let finalPath = targetFilePath;
    if (!fs.existsSync(finalPath)) {
      const matched = fs
        .readdirSync(storageDir)
        .filter((f) => f.startsWith(task.id))
        .map((f) => path.join(storageDir, f))[0];
      if (matched) finalPath = matched;
    }

    if (!fs.existsSync(finalPath)) {
      throw new Error('Downloaded file not found on server disk');
    }

    finishTask(task, finalPath);
  } catch (err: unknown) {
    if (cancelled) return;
    task.status = 'failed';
    task.error = err instanceof Error ? err.message : 'Background download failed';
    task.updatedAt = Date.now();
  } finally {
    processStore.delete(task.id);
  }
}

async function streamToFile(
  streamUrl: string,
  destPath: string,
  task: BackgroundTask,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch(streamUrl, {
    signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stream fetch failed: HTTP ${res.status}`);
  }

  const cl = res.headers.get('content-length');
  if (cl) {
    const parsed = parseInt(cl, 10);
    if (!isNaN(parsed) && parsed > 0) task.totalBytes = parsed;
  }

  const fileStream = fs.createWriteStream(destPath);
  const reader = res.body.getReader();
  let received = 0;
  let lastUpdate = Date.now();
  let lastBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        fileStream.write(Buffer.from(value));
        received += value.length;
        task.receivedBytes = received;

        const now = Date.now();
        if (now - lastUpdate >= 500) {
          const deltaSec = (now - lastUpdate) / 1000;
          const bytesSec = (received - lastBytes) / deltaSec;
          task.speed = `${(bytesSec / (1024 * 1024)).toFixed(2)} MB/s`;
          if (task.totalBytes && task.totalBytes > 0) {
            task.progressPercent = Math.min(99, Math.round((received / task.totalBytes) * 100));
          }
          task.updatedAt = now;
          lastUpdate = now;
          lastBytes = received;
        }
      }
    }
  } finally {
    fileStream.end();
    await new Promise<void>((resolve) => fileStream.on('finish', () => resolve()));
  }
}

function finishTask(task: BackgroundTask, filePath: string) {
  const stat = fs.statSync(filePath);
  task.status = 'ready';
  task.filePath = filePath;
  task.receivedBytes = stat.size;
  task.totalBytes = stat.size;
  task.progressPercent = 100;
  task.completedAt = Date.now();
  task.updatedAt = Date.now();
}
