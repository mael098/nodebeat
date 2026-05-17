import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const maxDuration = 60;

function normalizeYouTubeUrl(input: string): string {
  let cleanUrl = input;
  try {
    const parsed = new URL(input);
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) {
        cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    } else if (parsed.hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.replace('/', '').trim();
      if (videoId) {
        cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
  } catch {
    cleanUrl = input;
  }

  return cleanUrl;
}

function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds || Number.isNaN(totalSeconds)) {
    return 'N/A';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return NextResponse.json({ error: 'URL de YouTube invalida' }, { status: 400 });
    }

    const cleanUrl = normalizeYouTubeUrl(url);

    const { stdout } = await execFileAsync(
      'yt-dlp',
      ['--no-playlist', '--dump-single-json', '--skip-download', cleanUrl],
      {
        timeout: 45000,
        maxBuffer: 1024 * 1024 * 8,
      }
    );

    const data = JSON.parse(stdout);

    return NextResponse.json({
      title: data.title ?? 'Sin titulo',
      channel: data.uploader ?? data.channel ?? 'Canal desconocido',
      duration: formatDuration(data.duration),
      thumbnail: data.thumbnail ?? null,
      cleanUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudo analizar el video',
      },
      { status: 500 }
    );
  }
}
