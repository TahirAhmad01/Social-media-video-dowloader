import { NextRequest, NextResponse } from 'next/server';
import { fetchMediaInfo } from '@/lib/downloader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url;

    if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
      return NextResponse.json(
        { error: 'Please enter a valid video URL starting with http:// or https://' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    const info = await fetchMediaInfo(trimmedUrl);

    return NextResponse.json({ success: true, data: info });
  } catch (error: unknown) {
    console.error('Info API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch video information';
    
    // Provide user-friendly hints if private or restricted
    let hint = message;
    if (message.includes('Private video') || message.includes('Sign in')) {
      hint = 'This video appears to be private or requires user login.';
    } else if (message.includes('404') || message.includes('not found')) {
      hint = 'Video not found. Please verify the URL is correct and publicly accessible.';
    } else if (message.includes('bot')) {
      hint = 'Platform temporarily limited requests. Please try again in a few moments.';
    }

    return NextResponse.json(
      { error: hint, rawError: message },
      { status: 500 }
    );
  }
}
