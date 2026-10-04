import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getYtDlpPath, getYtDlpBaseArgs } from '@/lib/downloader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\s]+/g, ' ')
    .trim()
    .slice(0, 100);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  const formatId = searchParams.get('format_id') || 'best';
  const rawTitle = searchParams.get('title') || 'video';
  const directMediaUrl = searchParams.get('direct_url');

  if (!targetUrl && !directMediaUrl) {
    return NextResponse.json(
      { error: 'Missing target URL parameter' },
      { status: 400 }
    );
  }

  const cleanTitle = sanitizeFilename(rawTitle) || 'video';
  const isAudioOnly = formatId === 'best-audio-mp3' || formatId === 'audio';
  const ext = isAudioOnly ? 'mp3' : 'mp4';
  const filename = `${cleanTitle}.${ext}`;

  // If a direct URL was provided and it's from a trusted CDN (e.g., Telegram telesco.pe or direct mp4)
  if (directMediaUrl && directMediaUrl.startsWith('http') && !isAudioOnly) {
    try {
      const upstreamRes = await fetch(directMediaUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
      });

      if (upstreamRes.ok && upstreamRes.body) {
        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        headers.set('Content-Type', upstreamRes.headers.get('content-type') || 'video/mp4');
        const cl = upstreamRes.headers.get('content-length');
        if (cl) headers.set('Content-Length', cl);

        return new NextResponse(upstreamRes.body as unknown as ReadableStream, {
          headers,
        });
      }
    } catch (e) {
      console.warn('Direct stream fetch failed, falling back to yt-dlp:', e);
    }
  }

  // Use yt-dlp to download and convert/merge directly on the server
  const ytDlp = await getYtDlpPath();
  const baseArgs = getYtDlpBaseArgs();

  // Create unique temp file path
  const tempId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempFilePath = path.join(os.tmpdir(), `${tempId}.${ext}`);

  const downloadArgs = [...baseArgs];

  if (isAudioOnly) {
    downloadArgs.push(
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '-o',
      tempFilePath,
      targetUrl!
    );
  } else if (formatId.startsWith('video-')) {
    const height = formatId.replace('video-', '');
    downloadArgs.push(
      '-f',
      `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
      '--merge-output-format',
      'mp4',
      '-o',
      tempFilePath,
      targetUrl!
    );
  } else if (formatId === 'best' || formatId === 'best-video') {
    downloadArgs.push(
      '-f',
      'bestvideo+bestaudio/best',
      '--merge-output-format',
      'mp4',
      '-o',
      tempFilePath,
      targetUrl!
    );
  } else {
    // Exact format code or fallback
    downloadArgs.push(
      '-f',
      `${formatId}+bestaudio/bestvideo[format_id=${formatId}]+bestaudio/${formatId}/best`,
      '--merge-output-format',
      'mp4',
      '-o',
      tempFilePath,
      targetUrl!
    );
  }

  try {
    const executeDownload = (args: string[]) =>
      new Promise<void>((resolve, reject) => {
        const proc = spawn(ytDlp, args);
        let errorOut = '';

        proc.stderr.on('data', (d) => {
          errorOut += d.toString();
        });

        proc.on('close', (code) => {
          if (code === 0 && fs.existsSync(tempFilePath)) {
            resolve();
          } else {
            // Check if file exists with slightly different ext (e.g. mkv or webm)
            const possibleFiles = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith(tempId));
            if (possibleFiles.length > 0) {
              resolve();
            } else {
              reject(new Error(errorOut || `yt-dlp exited with code ${code}`));
            }
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      });

    try {
      await executeDownload(downloadArgs);
    } catch (firstErr) {
      console.warn('[download] Primary download attempt failed, trying fallback stream:', firstErr);
      const fallbackArgs = [
        ...baseArgs,
        '-f',
        isAudioOnly ? 'ba/b' : 'bestvideo+bestaudio/best[ext=mp4]/best',
        '-o',
        tempFilePath,
        targetUrl!,
      ];
      await executeDownload(fallbackArgs);
    }

    // Locate the actual output file (in case yt-dlp appended an extension)
    let actualFilePath = tempFilePath;
    if (!fs.existsSync(actualFilePath)) {
      const matched = fs
        .readdirSync(os.tmpdir())
        .filter((f) => f.startsWith(tempId))
        .map((f) => path.join(os.tmpdir(), f))[0];
      if (matched) actualFilePath = matched;
    }

    if (!fs.existsSync(actualFilePath)) {
      throw new Error('Downloaded file was not found on server');
    }

    const fileStat = fs.statSync(actualFilePath);
    const nodeStream = fs.createReadStream(actualFilePath);

    // Clean up temporary file after streaming finishes
    nodeStream.on('close', () => {
      try {
        if (fs.existsSync(actualFilePath)) {
          fs.unlinkSync(actualFilePath);
        }
      } catch {
        // ignore
      }
    });

    // Convert Node ReadStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
        try {
          if (fs.existsSync(actualFilePath)) {
            fs.unlinkSync(actualFilePath);
          }
        } catch {
          // ignore
        }
      },
    });

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', isAudioOnly ? 'audio/mpeg' : 'video/mp4');
    headers.set('Content-Length', fileStat.size.toString());
    headers.set('Cache-Control', 'no-cache, no-store');

    return new NextResponse(webStream, { headers });
  } catch (err: unknown) {
    console.error('Download error:', err);
    // Cleanup if partially written
    try {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    } catch {
      // ignore
    }

    const message = err instanceof Error ? err.message : 'Download failed';
    return NextResponse.json(
      { error: `Download failed: ${message}` },
      { status: 500 }
    );
  }
}
