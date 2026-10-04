import { spawn, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MediaMetadata, VideoFormat } from './types';
import { detectPlatform, formatBytes, formatDuration } from './url-detector';
import { scrapeTelegramPost } from './telegram-scraper';

let cachedFfmpegPath: string | null = null;
let cachedYtDlpPath: string | null = null;
let downloadPromise: Promise<string> | null = null;

export function getFfmpegPath(): string | null {
  if (cachedFfmpegPath && fs.existsSync(cachedFfmpegPath)) {
    return cachedFfmpegPath;
  }

  // 1. Try ffmpeg-static npm package
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      try {
        fs.chmodSync(ffmpegStatic, 0o755);
      } catch {
        // ignore
      }
      cachedFfmpegPath = ffmpegStatic;
      return ffmpegStatic;
    }
  } catch {
    // ignore
  }

  // 2. Check local node_modules
  const localModuleFfmpeg = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (fs.existsSync(localModuleFfmpeg)) {
    try {
      fs.chmodSync(localModuleFfmpeg, 0o755);
    } catch {
      // ignore
    }
    cachedFfmpegPath = localModuleFfmpeg;
    return localModuleFfmpeg;
  }

  // 3. Check common system paths
  const systemPaths = [
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ];

  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      cachedFfmpegPath = p;
      return p;
    }
  }

  return null;
}

export async function getYtDlpPath(): Promise<string> {
  if (cachedYtDlpPath && fs.existsSync(cachedYtDlpPath)) {
    return cachedYtDlpPath;
  }

  // 1. Explicit env var
  if (process.env.YT_DLP_PATH && fs.existsSync(process.env.YT_DLP_PATH)) {
    cachedYtDlpPath = process.env.YT_DLP_PATH;
    return cachedYtDlpPath;
  }

  // 2. Bundled bin directory (e.g. from pre-build step or repo)
  const bundledCandidates = [
    path.join(process.cwd(), 'bin', 'yt-dlp'),
    path.join(process.cwd(), 'bin', 'yt-dlp_linux'),
    path.join(process.cwd(), 'bin', 'yt-dlp.exe'),
  ];
  for (const p of bundledCandidates) {
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, 0o755);
      } catch {
        // ignore
      }
      cachedYtDlpPath = p;
      return p;
    }
  }

  // 3. Cached binary in os.tmpdir() (lambda instances)
  const tmpDest = path.join(os.tmpdir(), process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  if (fs.existsSync(tmpDest)) {
    try {
      const stats = fs.statSync(tmpDest);
      if (stats.size > 10000000) {
        fs.chmodSync(tmpDest, 0o755);
        cachedYtDlpPath = tmpDest;
        return tmpDest;
      }
    } catch {
      // ignore
    }
  }

  // 4. Local system candidate paths
  const candidatePaths = [
    '/Users/tahirahmad/.pyenv/shims/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/bin/yt-dlp',
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      cachedYtDlpPath = p;
      return p;
    }
  }

  // 5. System PATH check
  try {
    const whichCmd = process.platform === 'win32' ? 'where yt-dlp' : 'which yt-dlp';
    const foundPath = execSync(whichCmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim().split('\n')[0].trim();
    if (foundPath && fs.existsSync(foundPath)) {
      cachedYtDlpPath = foundPath;
      return foundPath;
    }
  } catch {
    // ignore
  }

  // 6. Cloud / Serverless auto-download fallback
  if (downloadPromise) {
    return downloadPromise;
  }

  downloadPromise = (async () => {
    const binaryName =
      process.platform === 'win32'
        ? 'yt-dlp.exe'
        : process.platform === 'darwin'
        ? 'yt-dlp_macos'
        : 'yt-dlp_linux';

    const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;
    console.log(`[downloader] yt-dlp not found locally. Auto-downloading standalone ${binaryName} from ${downloadUrl}...`);

    const tempFile = `${tmpDest}.download.${Date.now()}`;
    const res = await fetch(downloadUrl, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(
        `Failed to auto-download yt-dlp standalone binary: HTTP ${res.status} ${res.statusText}. Please ensure yt-dlp is installed or set YT_DLP_PATH.`
      );
    }

    const arrayBuf = await res.arrayBuffer();
    fs.writeFileSync(tempFile, Buffer.from(arrayBuf));
    fs.chmodSync(tempFile, 0o755);
    fs.renameSync(tempFile, tmpDest);

    console.log(`[downloader] Successfully downloaded and cached yt-dlp at: ${tmpDest}`);
    cachedYtDlpPath = tmpDest;
    return tmpDest;
  })().finally(() => {
    downloadPromise = null;
  });

  return downloadPromise;
}

export function getYtDlpBaseArgs(): string[] {
  const args = [
    '--no-warnings',
    '--no-playlist',
    '--no-check-certificates',
    '--js-runtimes',
    'node',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    '--extractor-args',
    'youtube:player_client=visionos,ios_creator,android_vr',
  ];

  if (process.env.YOUTUBE_PO_TOKEN) {
    args.push('--extractor-args', `youtube:po_token=${process.env.YOUTUBE_PO_TOKEN}`);
  }

  if (process.env.YOUTUBE_COOKIES) {
    const cookiePath = path.join(os.tmpdir(), 'yt_cookies.txt');
    try {
      fs.writeFileSync(cookiePath, process.env.YOUTUBE_COOKIES, 'utf-8');
      args.push('--cookies', cookiePath);
    } catch {
      // ignore
    }
  } else if (process.env.COOKIES_PATH && fs.existsSync(process.env.COOKIES_PATH)) {
    args.push('--cookies', process.env.COOKIES_PATH);
  } else if (fs.existsSync(path.join(process.cwd(), 'cookies.txt'))) {
    args.push('--cookies', path.join(process.cwd(), 'cookies.txt'));
  }

  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    args.push('--proxy', (process.env.HTTP_PROXY || process.env.HTTPS_PROXY)!);
  }

  const ffmpeg = getFfmpegPath();
  if (ffmpeg) {
    args.push('--ffmpeg-location', ffmpeg);
  }

  return args;
}

interface RawYtDlpFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  width?: number;
  height?: number;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  format_note?: string;
  tbr?: number;
  vbr?: number;
  abr?: number;
  url?: string;
  protocol?: string;
}

interface RawYtDlpOutput {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  uploader_url?: string;
  view_count?: number;
  like_count?: number;
  extractor_key?: string;
  webpage_url?: string;
  formats?: RawYtDlpFormat[];
  url?: string;
  ext?: string;
}

async function runYtDlpJson(ytDlp: string, args: string[]): Promise<RawYtDlpOutput> {
  return new Promise<RawYtDlpOutput>((resolve, reject) => {
    const proc = spawn(ytDlp, args);
    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0 || !stdoutData.trim()) {
        const errMsg = stderrData || `yt-dlp exited with code ${code}`;
        return reject(new Error(errMsg));
      }

      try {
        const raw: RawYtDlpOutput = JSON.parse(stdoutData);
        resolve(raw);
      } catch (err) {
        reject(new Error(`Failed to parse media metadata: ${(err as Error).message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`yt-dlp process execution failed: ${err.message}`));
    });
  });
}

export async function fetchMediaInfo(targetUrl: string): Promise<MediaMetadata> {
  const platform = detectPlatform(targetUrl);

  // If it's a telegram link, try Telegram direct scraper first (ultra-fast & direct CDN MP4)
  if (platform === 'telegram') {
    const tgData = await scrapeTelegramPost(targetUrl);
    if (tgData && tgData.directUrl) {
      return tgData;
    }
  }

  const ytDlp = await getYtDlpPath();
  const baseArgs = getYtDlpBaseArgs();

  let rawOutput: RawYtDlpOutput | null = null;
  let lastError: Error | null = null;

  if (platform === 'youtube') {
    // Robust multi-client fallback pipeline that avoids bot checks without needing cookies
    const clientStrategies = [
      ['--extractor-args', 'youtube:player_client=visionos,ios_creator,android_vr'],
      ['--extractor-args', 'youtube:player_client=ios_creator,visionos'],
      ['--extractor-args', 'youtube:player_client=android_vr'],
      [], // Default client
    ];

    const baseWithoutExtractor = baseArgs.filter(
      (a, idx, arr) => a !== '--extractor-args' && arr[idx - 1] !== '--extractor-args'
    );

    for (const strat of clientStrategies) {
      try {
        const attemptArgs = [...baseWithoutExtractor, ...strat, '-J', targetUrl];
        rawOutput = await runYtDlpJson(ytDlp, attemptArgs);
        if (rawOutput && rawOutput.title) {
          lastError = null;
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[downloader] YouTube strategy ${strat.join(' ') || 'default'} failed:`, lastError.message);
      }
    }
  } else {
    try {
      rawOutput = await runYtDlpJson(ytDlp, [...baseArgs, '-J', targetUrl]);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!rawOutput) {
    // If yt-dlp failed on telegram, fallback to telegram scraper
    if (platform === 'telegram') {
      const fallback = await scrapeTelegramPost(targetUrl);
      if (fallback) return fallback;
    }

    throw lastError || new Error('Failed to extract media information');
  }

  return processRawMetadata(rawOutput, targetUrl, platform);
}

function processRawMetadata(
  raw: RawYtDlpOutput,
  targetUrl: string,
  detectedPlatform: ReturnType<typeof detectPlatform>
): MediaMetadata {
  const rawFormats = raw.formats || [];

  // Group formats into practical, user-friendly options
  const formats: VideoFormat[] = [];

  // 1. Audio only options
  const audioFormats = rawFormats.filter(
    (f) => f.vcodec === 'none' && f.acodec && f.acodec !== 'none'
  );
  if (audioFormats.length > 0) {
    // Best audio
    const bestAudio = audioFormats.reduce((prev, curr) =>
      (curr.abr || 0) > (prev.abr || 0) ? curr : prev
    );
    const size = bestAudio.filesize || bestAudio.filesize_approx;
    formats.push({
      id: 'best-audio-mp3',
      label: 'MP3 Audio (High Quality)',
      ext: 'mp3',
      resolution: 'Audio 320kbps',
      filesize: size,
      filesizeText: formatBytes(size),
      formatNote: `${Math.round(bestAudio.abr || 128)} kbps`,
      hasVideo: false,
      hasAudio: true,
      isAudioOnly: true,
      qualityBadge: 'MP3',
    });
  }

  // 2. Video resolutions: 4K UHD (2160p), 2K QHD (1440p), 1080p, 720p, 480p, 360p, 240p, 144p
  const resolutionTargets = [
    { label: '4K Ultra HD (2160p)', height: 2160, badge: '4K UHD' },
    { label: '2K Quad HD (1440p)', height: 1440, badge: '2K QHD' },
    { label: '1080p Full HD', height: 1080, badge: '1080p' },
    { label: '720p HD', height: 720, badge: '720p' },
    { label: '480p Standard', height: 480, badge: '480p' },
    { label: '360p Medium', height: 360, badge: '360p' },
    { label: '240p Compact', height: 240, badge: '240p' },
    { label: '144p Mobile', height: 144, badge: '144p' },
  ];

  // Progressive streams (already has video + audio)
  const progressiveFormats = rawFormats.filter(
    (f) =>
      f.vcodec &&
      f.vcodec !== 'none' &&
      f.acodec &&
      f.acodec !== 'none' &&
      f.ext === 'mp4'
  );

  // Video streams (separate or progressive with video codec)
  const videoStreams = rawFormats.filter(
    (f) => f.vcodec && f.vcodec !== 'none' && f.height
  );

  if (videoStreams.length > 0) {
    const seenHeights = new Set<number>();

    // Check predefined target resolutions first
    for (const target of resolutionTargets) {
      const match = videoStreams.find(
        (f) => f.height && Math.abs(f.height - target.height) <= 35
      );

      if (match && !seenHeights.has(match.height || target.height)) {
        seenHeights.add(match.height || target.height);
        let size = match.filesize || match.filesize_approx;
        // Estimate size if missing and duration is present
        if (!size && (match.tbr || match.vbr) && raw.duration) {
          const bitrate = (match.tbr || ((match.vbr || 0) + 128)) * 1024;
          size = Math.round((bitrate * raw.duration) / 8);
        }

        formats.push({
          id: `video-${target.height}`,
          label: target.label,
          ext: 'mp4',
          resolution: `${target.height}p`,
          height: target.height,
          filesize: size,
          filesizeText: formatBytes(size),
          formatNote: `${match.fps ? match.fps + 'fps ' : ''}MP4`,
          hasVideo: true,
          hasAudio: true,
          isAudioOnly: false,
          qualityBadge: target.badge,
        });
      }
    }

    // Also include any other unique heights found in videoStreams that weren't captured
    const allAvailableHeights = [...new Set(videoStreams.map((f) => f.height).filter(Boolean) as number[])].sort(
      (a, b) => b - a
    );

    for (const h of allAvailableHeights) {
      if (!seenHeights.has(h)) {
        const match = videoStreams.find((f) => f.height === h);
        if (match) {
          seenHeights.add(h);
          let size = match.filesize || match.filesize_approx;
          if (!size && (match.tbr || match.vbr) && raw.duration) {
            const bitrate = (match.tbr || ((match.vbr || 0) + 128)) * 1024;
            size = Math.round((bitrate * raw.duration) / 8);
          }

          const badge = h >= 2160 ? '4K' : h >= 1440 ? '2K' : `${h}p`;
          formats.push({
            id: `video-${h}`,
            label: `${h}p Quality`,
            ext: 'mp4',
            resolution: `${h}p`,
            height: h,
            filesize: size,
            filesizeText: formatBytes(size),
            formatNote: `${match.fps ? match.fps + 'fps ' : ''}MP4`,
            hasVideo: true,
            hasAudio: true,
            isAudioOnly: false,
            qualityBadge: badge,
          });
        }
      }
    }

    // Ensure formats are sorted descending by height (highest quality first)
    formats.sort((a, b) => {
      if (a.isAudioOnly) return 1;
      if (b.isAudioOnly) return -1;
      return (b.height || 0) - (a.height || 0);
    });

    // Always ensure at least "Best Quality (Default)" exists
    if (!formats.some((f) => f.hasVideo)) {
      formats.unshift({
        id: 'best-video',
        label: 'Best Available Quality',
        ext: 'mp4',
        resolution: 'Highest Resolution',
        hasVideo: true,
        hasAudio: true,
        isAudioOnly: false,
        qualityBadge: 'BEST',
      });
    }
  } else if (progressiveFormats.length > 0) {
    for (const prog of progressiveFormats) {
      const size = prog.filesize || prog.filesize_approx;
      formats.push({
        id: prog.format_id,
        label: `${prog.height ? prog.height + 'p' : 'Standard'} (MP4)`,
        ext: 'mp4',
        resolution: prog.resolution || `${prog.height || 720}p`,
        filesize: size,
        filesizeText: formatBytes(size),
        hasVideo: true,
        hasAudio: true,
        isAudioOnly: false,
        url: prog.url,
        qualityBadge: prog.height ? `${prog.height}p` : 'HD',
      });
    }
  } else {
    // Generic fallback format
    formats.push({
      id: 'best',
      label: 'Standard Quality (MP4)',
      ext: 'mp4',
      resolution: 'Original',
      hasVideo: true,
      hasAudio: true,
      isAudioOnly: false,
      qualityBadge: 'MP4',
    });
  }

  // Look for direct URL if it's already a direct mp4 (e.g. Instagram/Telegram/Facebook)
  let directUrl: string | undefined = undefined;
  if (raw.url && raw.url.startsWith('http')) {
    directUrl = raw.url;
  } else if (progressiveFormats.length > 0 && progressiveFormats[0].url) {
    directUrl = progressiveFormats[0].url;
  }

  let finalPlatform = detectedPlatform;
  if (finalPlatform === 'generic' && raw.extractor_key) {
    const key = raw.extractor_key.toLowerCase();
    if (key.includes('youtube')) finalPlatform = 'youtube';
    else if (key.includes('instagram')) finalPlatform = 'instagram';
    else if (key.includes('facebook')) finalPlatform = 'facebook';
    else if (key.includes('telegram')) finalPlatform = 'telegram';
  }

  const durationFormatted = raw.duration ? formatDuration(raw.duration) : undefined;

  return {
    id: raw.id || 'video',
    url: targetUrl,
    title: raw.title || 'Downloaded Media',
    description: raw.description,
    platform: finalPlatform,
    platformName:
      finalPlatform === 'youtube'
        ? 'YouTube'
        : finalPlatform === 'instagram'
        ? 'Instagram'
        : finalPlatform === 'facebook'
        ? 'Facebook'
        : finalPlatform === 'telegram'
        ? 'Telegram'
        : raw.extractor_key || 'Media',
    thumbnail: raw.thumbnail,
    duration: raw.duration,
    durationFormatted,
    uploader: raw.uploader,
    uploaderUrl: raw.uploader_url,
    viewCount: raw.view_count,
    likeCount: raw.like_count,
    formats,
    directUrl,
    mediaType: 'video',
  };
}
