import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mediaUrl = searchParams.get('url');

  if (!mediaUrl || !mediaUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
  }

  try {
    const upstreamRes = await fetch(mediaUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Referer: new URL(mediaUrl).origin,
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return NextResponse.json(
        { error: `Upstream responded with status ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const headers = new Headers();
    const ct = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    headers.set('Content-Type', ct);
    const cl = upstreamRes.headers.get('content-length');
    if (cl) headers.set('Content-Length', cl);
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(upstreamRes.body as unknown as ReadableStream, {
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
