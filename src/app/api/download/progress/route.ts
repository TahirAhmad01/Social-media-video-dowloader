import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://p.savenow.to/api/progress?id=${encodeURIComponent(id)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, ready: false, error: `Upstream error ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Check if finished
    if (data.success === 1 && data.download_url) {
      return NextResponse.json({
        success: true,
        ready: true,
        progress: 100,
        downloadUrl: data.download_url,
        text: 'Download ready!',
      });
    }

    // In progress
    if (data.success === 0) {
      return NextResponse.json({
        success: true,
        ready: false,
        progress: data.progress ? Math.round(data.progress / 10) : 50,
        text: data.text || 'Converting stream...',
      });
    }

    // Error from upstream
    return NextResponse.json({
      success: false,
      ready: false,
      error: data.text || 'Upstream conversion failed',
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    console.warn('[progress] Polling error:', err);
    return NextResponse.json({
      success: false,
      ready: false,
      error: 'Polling timeout or connection issue',
    });
  }
}
