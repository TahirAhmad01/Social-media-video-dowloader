import { spawn, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MediaMetadata, VideoFormat } from './types';
import { detectPlatform, formatBytes, formatDuration, cleanVideoUrl } from './url-detector';
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
    '--js-runtimes',
    `node:${process.execPath || 'node'}`,
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    '--extractor-args',
    'youtube:player_client=android,ios,web',
  ];

  const ffmpeg = getFfmpegPath();
  if (ffmpeg) {
    args.push('--ffmpeg-location', ffmpeg);
  }

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

  return args;
}

export function buildYtDlpDownloadArgs(formatId: string, targetUrl: string, tempFilePath: string): string[] {
  const baseArgs = getYtDlpBaseArgs();
  const isAudioOnly = formatId === 'best-audio-mp3' || formatId === 'audio';

  if (isAudioOnly) {
    return [
      ...baseArgs,
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '-o',
      tempFilePath,
      targetUrl,
    ];
  }

  // Parse requested resolution height
  let reqHeight = 1080;
  if (formatId.startsWith('video-')) {
    const raw = formatId.replace('video-', '');
    reqHeight = raw === '8k' ? 4320 : raw === '4k' ? 2160 : raw === '1440' ? 1440 : parseInt(raw, 10) || 1080;
  }

  // In portrait reels (e.g. 720x1280, 1080x1920, 1440x2560), the longer dimension is height in yt-dlp
  // 720p corresponds to 1280 maxDim, 1080p to 1920 maxDim, 1440p to 2560 maxDim
  const maxDim = reqHeight <= 720 ? 1280 : reqHeight <= 1080 ? 1920 : reqHeight <= 1440 ? 2560 : 4320;

  // Format selection priority:
  // 1. Highest quality H.264 (avc1) video + AAC audio up to maxDim
  // 2. High compatibility progressive MP4 formats (hd, 1, 2, 3)
  // 3. Any H.264 video + audio
  // 4. Any video stream matching height + best audio
  // 5. Fallback to best overall
  const formatCandidates = [
    `bestvideo[vcodec^=avc][height<=${maxDim}]+bestaudio[acodec^=mp4a]`,
    `bestvideo[vcodec^=h264][height<=${maxDim}]+bestaudio[acodec^=mp4a]`,
    `bestvideo[vcodec^=avc][height<=${maxDim}]+bestaudio`,
    `bestvideo[vcodec^=h264][height<=${maxDim}]+bestaudio`,
    `hd`,
    `1`,
    `2`,
    `3`,
    `bestvideo[vcodec^=avc]+bestaudio`,
    `bestvideo[vcodec^=h264]+bestaudio`,
    `best[vcodec^=avc]`,
    `best[vcodec^=h264]`,
    `bestvideo[height<=${maxDim}]+bestaudio`,
    `best[height<=${maxDim}]`,
    `bestvideo+bestaudio`,
    `best`,
  ];

  if (formatId !== 'best' && formatId !== 'best-video' && !formatId.startsWith('video-')) {
    formatCandidates.unshift(
      `${formatId}+bestaudio`,
      `bestvideo[format_id=${formatId}]+bestaudio`,
      formatId
    );
  }

  return [
    ...baseArgs,
    '-f',
    formatCandidates.join('/'),
    '--merge-output-format',
    'mp4',
    '-o',
    tempFilePath,
    targetUrl,
  ];
}

export async function ensureUniversalVideoCompatibility(filePath: string): Promise<void> {
  const ffmpeg = getFfmpegPath();
  if (!ffmpeg || !fs.existsSync(filePath)) return;

  // 1. Probe the file to check video codec
  const probeInfo = await new Promise<{ videoCodec: string | null; hasAudio: boolean }>((resolve) => {
    const child = spawn(ffmpeg, ['-i', filePath]);
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', () => {
      const vMatch = stderr.match(/Stream #\d+:\d+.*?: Video: ([^,\n]+)/);
      const aMatch = stderr.match(/Stream #\d+:\d+.*?: Audio: ([^,\n]+)/);
      resolve({
        videoCodec: vMatch ? vMatch[1].toLowerCase() : null,
        hasAudio: !!aMatch,
      });
    });
    child.on('error', () => {
      resolve({ videoCodec: null, hasAudio: false });
    });
  });

  if (!probeInfo.videoCodec) {
    // Audio-only file or unprobed, no video track to fix
    return;
  }

  // Compatible codecs that standard OS/browser players (QuickTime, Safari, Windows, Android) support out of the box
  const isCompatibleCodec =
    probeInfo.videoCodec.includes('h264') ||
    probeInfo.videoCodec.includes('avc1') ||
    probeInfo.videoCodec.includes('mp4v');

  if (isCompatibleCodec) {
    return;
  }

  // Video codec is av01 (AV1), vp9, vp09, or hevc which causes "audio only, no video" in QuickTime and default players
  console.log(`[downloader] Transcoding incompatible video codec "${probeInfo.videoCodec}" to universal H.264 for: ${filePath}`);

  const tempTranscodePath = `${filePath}.transcoded.mp4`;
  await new Promise<void>((resolve) => {
    const transcodeArgs = [
      '-y',
      '-i',
      filePath,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      tempTranscodePath,
    ];

    const child = spawn(ffmpeg, transcodeArgs);
    let transcodeErr = '';
    child.stderr.on('data', (d) => {
      transcodeErr += d.toString();
    });
    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(tempTranscodePath)) {
        try {
          fs.unlinkSync(filePath);
          fs.renameSync(tempTranscodePath, filePath);
          console.log(`[downloader] Successfully transcoded to universal H.264: ${filePath}`);
          resolve();
        } catch {
          resolve();
        }
      } else {
        if (fs.existsSync(tempTranscodePath)) {
          try { fs.unlinkSync(tempTranscodePath); } catch { }
        }
        console.warn(`[downloader] Video transcode warning (${code}): ${transcodeErr.slice(0, 200)}`);
        resolve();
      }
    });
    child.on('error', (err) => {
      console.warn('[downloader] Failed to spawn ffmpeg for video transcode:', err);
      resolve();
    });
  });
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
  video_ext?: string;
  audio_ext?: string;
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

export async function getYouTubeFallbackInfo(targetUrl: string): Promise<MediaMetadata> {
  const videoIdMatch = targetUrl.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/v\/|\/e\/|watch\?.*v=)([^#&?]*)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  if (!videoId) {
    throw new Error('Could not extract valid YouTube video ID from URL');
  }

  // 1. Fetch official YouTube oEmbed API (guaranteed to work from any cloud/datacenter IP)
  let title = 'YouTube Video';
  let authorName: string | undefined = undefined;
  let authorUrl: string | undefined = undefined;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) authorName = oembed.author_name;
      if (oembed.author_url) authorUrl = oembed.author_url;
    }
  } catch (err) {
    console.warn('[downloader] oEmbed fetch error:', err);
  }

  // 2. Fetch page HTML for duration, viewCount, and description
  let duration: number | undefined = undefined;
  let viewCount: number | undefined = undefined;
  let description: string | undefined = undefined;

  let rawAdaptiveFormats: Array<{ height?: number; contentLength?: string; mimeType?: string }> = [];

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (match) {
        const player = JSON.parse(match[1]);
        if (player.videoDetails) {
          if (!authorName && player.videoDetails.author) authorName = player.videoDetails.author;
          if (title === 'YouTube Video' && player.videoDetails.title) title = player.videoDetails.title;
          if (player.videoDetails.lengthSeconds) {
            duration = parseInt(player.videoDetails.lengthSeconds, 10);
          }
          if (player.videoDetails.viewCount) {
            viewCount = parseInt(player.videoDetails.viewCount, 10);
          }
          if (player.videoDetails.shortDescription) {
            description = player.videoDetails.shortDescription;
          }
        }

        if (Array.isArray(player.streamingData?.adaptiveFormats)) {
          rawAdaptiveFormats = player.streamingData.adaptiveFormats;
        }
      }
    }
  } catch (err) {
    console.warn('[downloader] Page HTML scrape error:', err);
  }

  // Extract available video heights and content lengths
  let availableHeights: number[] = [];
  const sizeMap = new Map<number, number>();

  for (const af of rawAdaptiveFormats) {
    if (af.height && typeof af.height === 'number' && af.height > 0) {
      availableHeights.push(af.height);
      if (af.contentLength) {
        const sz = parseInt(af.contentLength, 10);
        if (sz && (!sizeMap.has(af.height) || sz > (sizeMap.get(af.height) || 0))) {
          sizeMap.set(af.height, sz);
        }
      }
    }
  }

  availableHeights = [...new Set(availableHeights)].sort((a, b) => b - a);

  // If YouTube HTML was scraped without player data or blocked, ONLY offer 4K/8K if explicitly in title
  if (availableHeights.length === 0) {
    const titleUpper = title.toUpperCase();
    if (titleUpper.includes('8K') || titleUpper.includes('4320')) {
      availableHeights = [4320, 2160, 1440, 1080, 720, 480, 360];
    } else if (titleUpper.includes('4K') || titleUpper.includes('2160') || titleUpper.includes('UHD')) {
      availableHeights = [2160, 1440, 1080, 720, 480, 360];
    } else if (titleUpper.includes('2K') || titleUpper.includes('1440')) {
      availableHeights = [1440, 1080, 720, 480, 360];
    } else {
      // Dynamic standard max resolution: normal videos default up to 1080p (never fake 4K/2K)
      availableHeights = [1080, 720, 480, 360, 240, 144];
    }
  }

  const resolutionConfig: Record<number, { id: string; label: string; badge: string; note: string }> = {
    4320: { id: 'video-8k', label: '8K Ultra HD (4320p)', badge: '8K UHD', note: '8K Ultra HD MP4' },
    2160: { id: 'video-4k', label: '4K Ultra HD (2160p)', badge: '4K UHD', note: '4K Ultra HD MP4' },
    1440: { id: 'video-1440', label: '2K Quad HD (1440p)', badge: '2K QHD', note: '2K Quad HD MP4' },
    1080: { id: 'video-1080', label: '1080p Full HD', badge: '1080p', note: 'Full HD MP4' },
    720: { id: 'video-720', label: '720p HD', badge: '720p', note: 'HD MP4' },
    480: { id: 'video-480', label: '480p Standard', badge: '480p', note: 'Standard MP4' },
    360: { id: 'video-360', label: '360p Medium', badge: '360p', note: 'Medium MP4' },
    240: { id: 'video-240', label: '240p Compact', badge: '240p', note: 'Compact MP4' },
    144: { id: 'video-144', label: '144p Mobile', badge: '144p', note: 'Mobile MP4' },
  };

  const durationFormatted = duration ? formatDuration(duration) : undefined;
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const formats: VideoFormat[] = [];

  for (const h of availableHeights) {
    const cfg = resolutionConfig[h];
    if (cfg) {
      const size = sizeMap.get(h);
      formats.push({
        id: cfg.id,
        label: cfg.label,
        ext: 'mp4',
        resolution: `${h}p`,
        height: h,
        filesize: size,
        filesizeText: size ? formatBytes(size) : undefined,
        hasVideo: true,
        hasAudio: true,
        isAudioOnly: false,
        qualityBadge: cfg.badge,
        formatNote: cfg.note,
      });
    }
  }

  // Audio format
  formats.push({
    id: 'best-audio-mp3',
    label: 'MP3 Audio (High Quality)',
    ext: 'mp3',
    resolution: 'Audio 320kbps',
    hasVideo: false,
    hasAudio: true,
    isAudioOnly: true,
    qualityBadge: 'MP3',
    formatNote: '320 kbps High Quality Audio',
  });

  return {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    description,
    platform: 'youtube',
    platformName: 'YouTube',
    thumbnail,
    duration,
    durationFormatted,
    uploader: authorName || 'YouTube Creator',
    uploaderUrl: authorUrl,
    viewCount,
    formats,
    mediaType: 'video',
  };
}

export async function fetchMediaInfo(targetUrl: string): Promise<MediaMetadata> {
  const cleanUrl = cleanVideoUrl(targetUrl);
  const platform = detectPlatform(cleanUrl);

  // If it's a telegram link, try Telegram direct scraper first (ultra-fast & direct CDN MP4)
  if (platform === 'telegram') {
    const tgData = await scrapeTelegramPost(cleanUrl);
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
        const attemptArgs = [...baseWithoutExtractor, ...strat, '-J', cleanUrl];
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
      rawOutput = await runYtDlpJson(ytDlp, [...baseArgs, '-J', cleanUrl]);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!rawOutput) {
    // If yt-dlp failed on telegram, fallback to telegram scraper
    if (platform === 'telegram') {
      const fallback = await scrapeTelegramPost(cleanUrl);
      if (fallback) return fallback;
    }

    // If yt-dlp failed on YouTube due to cloud bot challenge, fallback to native YouTube extractor
    if (platform === 'youtube') {
      try {
        console.log('[downloader] Falling back to native YouTube extractor for:', cleanUrl);
        return await getYouTubeFallbackInfo(cleanUrl);
      } catch (fbErr) {
        console.warn('[downloader] YouTube native fallback also failed:', fbErr);
      }
    }

    throw lastError || new Error('Failed to extract media information');
  }

  return processRawMetadata(rawOutput, cleanUrl, platform);
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

  // 2. Video resolutions: 8K UHD (4320p), 4K UHD (2160p), 2K QHD (1440p), 1080p, 720p, 480p, 360p, 240p, 144p
  const resolutionTargets = [
    { label: '8K Ultra HD (4320p)', height: 4320, badge: '8K UHD' },
    { label: '4K Ultra HD (2160p)', height: 2160, badge: '4K UHD' },
    { label: '2K Quad HD (1440p)', height: 1440, badge: '2K QHD' },
    { label: '1080p Full HD', height: 1080, badge: '1080p' },
    { label: '720p HD', height: 720, badge: '720p' },
    { label: '480p Standard', height: 480, badge: '480p' },
    { label: '360p Medium', height: 360, badge: '360p' },
    { label: '240p Compact', height: 240, badge: '240p' },
    { label: '144p Mobile', height: 144, badge: '144p' },
  ];

  // Helper to determine standard resolution height (accounting for portrait reels like 720x1280, 1080x1920)
  const getStandardHeight = (f: RawYtDlpFormat): number => {
    if (f.height && f.width && f.height > f.width && f.width >= 240) {
      return f.width; // In vertical reels, width represents the standard resolution (720, 1080, 1440)
    }
    if (f.height && f.height > 0) {
      return f.height;
    }
    if (f.format_id === 'hd' || f.format_id === '1' || f.format_id === '2' || f.format_id === '3') {
      return 720;
    }
    if (f.format_id === 'sd') {
      return 360;
    }
    return 0;
  };

  const isVideoFormat = (f: RawYtDlpFormat): boolean => {
    if (f.vcodec === 'none' || f.vcodec === 'images') return false;
    if (f.ext === 'mhtml' || f.protocol === 'mhtml' || f.format_id?.startsWith('sb')) return false;
    if (f.height && f.height > 0) return true;
    if (f.ext === 'mp4' && (['hd', 'sd', '1', '2', '3'].includes(f.format_id) || f.video_ext === 'mp4')) return true;
    return false;
  };

  const videoStreams = rawFormats.filter(isVideoFormat);
  const maxVideoHeight = videoStreams.reduce((max, f) => Math.max(max, getStandardHeight(f)), 0);

  if (videoStreams.length > 0) {
    const seenHeights = new Set<number>();

    for (const target of resolutionTargets) {
      if (target.height > maxVideoHeight + 35) {
        continue;
      }

      const match = videoStreams.find(
        (f) => Math.abs(getStandardHeight(f) - target.height) <= 35
      );

      if (match && !seenHeights.has(target.height)) {
        seenHeights.add(target.height);
        let size = match.filesize || match.filesize_approx;
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

    // Ensure formats are sorted descending by height (highest quality first)
    formats.sort((a, b) => {
      if (a.isAudioOnly) return 1;
      if (b.isAudioOnly) return -1;
      return (b.height || 0) - (a.height || 0);
    });

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
  } else {
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
  } else {
    const directProg = rawFormats.find((f) => f.ext === 'mp4' && f.url && f.url.startsWith('http') && !f.format_id?.endsWith('a'));
    if (directProg) {
      directUrl = directProg.url;
    }
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
