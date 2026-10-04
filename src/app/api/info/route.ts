import { NextRequest, NextResponse } from 'next/server';
import { fetchMediaInfo, getYouTubeFallbackInfo } from '@/lib/downloader';
import { cleanVideoUrl } from '@/lib/url-detector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let trimmedUrl = '';
  try {
    const body = await req.json();
    const url = body.url;

    if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
      return NextResponse.json(
        { error: 'Please enter a valid video URL starting with http:// or https://' },
        { status: 400 }
      );
    }

    trimmedUrl = cleanVideoUrl(url.trim());
    const info = await fetchMediaInfo(trimmedUrl);

    return NextResponse.json({ success: true, data: info });
  } catch (error: unknown) {
    console.error('Info API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch video information';

    // Bulletproof native fallback for YouTube on cloud/datacenter serverless instances
    if (trimmedUrl && (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be'))) {
      try {
        const fallback = await getYouTubeFallbackInfo(trimmedUrl);
        return NextResponse.json({ success: true, data: fallback });
      } catch (fbErr) {
        console.warn('Emergency native YouTube fallback error:', fbErr);
      }
    }

    // Provide user-friendly hints if private or restricted
    let hint = message;
    if (message.includes('Sign in to confirm you’re not a bot') || message.includes("Sign in to confirm you're not a bot")) {
      hint = 'YouTube security challenged this cloud request. Please try again in a few moments.';
    } else if (message.includes('Private video') || message.includes('Sign in')) {
      hint = 'This video appears to be private or requires user login.';
    } else if (message.includes('404') || message.includes('not found')) {
      hint = 'Video not found. Please verify the URL is correct and publicly accessible.';
    } else if (message.includes('bot') || message.includes('HTTP Error 429')) {
      hint = 'Platform temporarily rate-limited. Please retry in a few moments.';
    }

    return NextResponse.json(
      { error: hint, rawError: message },
      { status: 500 }
    );
  }
}
