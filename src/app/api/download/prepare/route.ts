import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[\s]+/g, ' ')
    .trim()
    .slice(0, 100);
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/v\/|\/e\/|watch\?.*v=)([^#&?]*)/
  );
  return match && match[1]?.length === 11 ? match[1] : null;
}

function mapToCloudFormat(formatId: string, isAudioOnly?: boolean): string {
  if (isAudioOnly || formatId.includes('audio') || formatId.includes('mp3')) {
    return 'mp3';
  }
  if (formatId.includes('1080')) return '1080';
  if (formatId.includes('720')) return '720';
  if (formatId.includes('480')) return '480';
  if (formatId.includes('360')) return '360';
  return '720';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, formatId = '720', isAudioOnly = false, title = 'video', directUrl } = body;

    if (!url && !directUrl) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    const cleanTitle = sanitizeFilename(title) || 'video';
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    const filename = `${cleanTitle}.${ext}`;

    // 1. If direct media URL is provided (e.g. from Telegram or direct CDN)
    if (directUrl && directUrl.startsWith('http') && !isAudioOnly) {
      return NextResponse.json({
        success: true,
        ready: true,
        downloadUrl: `/api/download?direct_url=${encodeURIComponent(directUrl)}&title=${encodeURIComponent(cleanTitle)}`,
        filename,
      });
    }

    const isYouTube = url && (url.includes('youtube.com') || url.includes('youtu.be'));
    const videoId = isYouTube ? extractYouTubeId(url) : null;

    if (isYouTube) {
      const cloudFormat = mapToCloudFormat(formatId, isAudioOnly);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      try {
        const cloudRes = await fetch(
          `https://p.savenow.to/ajax/download.php?url=${encodeURIComponent(url)}&format=${cloudFormat}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
              Accept: 'application/json, text/javascript, */*; q=0.01',
              Referer: 'https://loader.to/',
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (cloudRes.ok) {
          const data = await cloudRes.json();

          // If direct download URL is already available in the initial response
          if (data.download_url && typeof data.download_url === 'string') {
            return NextResponse.json({
              success: true,
              ready: true,
              downloadUrl: data.download_url,
              filename,
            });
          }

          // If a job ID was generated for polling
          if (data.id) {
            return NextResponse.json({
              success: true,
              ready: false,
              id: data.id,
              progress: 25,
              status: 'converting',
              filename,
            });
          }
        }
      } catch (cloudErr) {
        console.warn('[prepare] Cloud resolver request error:', cloudErr);
      } finally {
        clearTimeout(timeout);
      }

      // Fallback mirror if cloud resolver is unavailable
      return NextResponse.json({
        success: false,
        ready: false,
        error: 'Cloud conversion busy. Use Instant Mirror for instant download.',
        mirrorUrl: videoId ? `https://www.ssyoutube.com/watch?v=${videoId}` : undefined,
      });
    }

    // For non-YouTube platforms (e.g. Facebook, Instagram, Twitter)
    return NextResponse.json({
      success: true,
      ready: true,
      downloadUrl: `/api/download?url=${encodeURIComponent(url)}&format_id=${encodeURIComponent(formatId)}&title=${encodeURIComponent(cleanTitle)}${isAudioOnly ? '&audio=1' : ''}`,
      filename,
    });
  } catch (err: unknown) {
    console.error('[prepare] API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error preparing download' },
      { status: 500 }
    );
  }
}
