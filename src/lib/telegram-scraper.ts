import { MediaMetadata, VideoFormat } from './types';

export async function scrapeTelegramPost(url: string): Promise<MediaMetadata | null> {
  try {
    // Standardize URL to embed endpoint
    // e.g. https://t.me/durov/532 -> https://t.me/durov/532?embed=1
    let embedUrl = url;
    if (!embedUrl.includes('?embed=1')) {
      embedUrl = embedUrl.split('?')[0] + '?embed=1';
    }

    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();

    // Extract video src
    // <video src="https://cdn4.telesco.pe/file/..." ...>
    const videoMatch = html.match(/<video[^>]*src=["']([^"']+)["']/i);
    if (!videoMatch || !videoMatch[1]) {
      return null;
    }

    const videoUrl = videoMatch[1].replace(/&amp;/g, '&');

    // Extract thumbnail
    // style="background-image:url('https://cdn4.telesco.pe/...')"
    const thumbMatch = html.match(/style=["'][^"']*background-image:url\(['"]?([^'"\)]+)['"]?\)/i);
    const thumbnail = thumbMatch ? thumbMatch[1] : undefined;

    // Extract message text / caption
    const textMatch = html.match(/<div class=["']tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    let title = 'Telegram Video';
    if (textMatch && textMatch[1]) {
      // Strip html tags
      const cleanText = textMatch[1].replace(/<[^>]*>/g, '').trim();
      if (cleanText) {
        title = cleanText.slice(0, 100);
      }
    }

    // Extract author / channel title
    const authorMatch = html.match(/<div class=["']tgme_widget_message_owner_name[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    let uploader = 'Telegram Channel';
    if (authorMatch && authorMatch[1]) {
      uploader = authorMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    const formats: VideoFormat[] = [
      {
        id: 'direct-video',
        label: 'Original Quality (MP4)',
        ext: 'mp4',
        resolution: 'Best Available',
        hasVideo: true,
        hasAudio: true,
        isAudioOnly: false,
        url: videoUrl,
        qualityBadge: 'HD',
      },
    ];

    return {
      id: url.replace(/[^a-zA-Z0-9]/g, '_'),
      url,
      title,
      platform: 'telegram',
      platformName: 'Telegram',
      thumbnail,
      uploader,
      formats,
      directUrl: videoUrl,
      mediaType: 'video',
    };
  } catch (err) {
    console.error('Error scraping Telegram post:', err);
    return null;
  }
}
