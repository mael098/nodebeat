import { Innertube } from 'youtubei.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let innertubeInstance: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create({
      retrieve_player: false,
      enable_session_cache: true,
    });
  }
  return innertubeInstance;
}

export interface VideoInfoResult {
  title: string;
  channel: string;
  duration: string;
  thumbnail: string | null;
  cleanUrl: string;
  videoId: string;
}

export function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds || Number.isNaN(totalSeconds)) {
    return 'N/A';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').trim() || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getVideoInfo(url: string): Promise<VideoInfoResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('No se pudo extraer el ID del video de la URL');
  }

  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);

  const thumbnails = info.basic_info.thumbnail;
  const candidate =
    thumbnails && thumbnails.length > 0
      ? thumbnails[thumbnails.length - 1].url
      : null;

  let thumbnail = candidate;
  if (thumbnail && thumbnail.includes('maxresdefault')) {
    thumbnail = thumbnail.replace('maxresdefault', 'hqdefault');
  }
  if (!thumbnail) {
    thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  return {
    title: info.basic_info.title ?? 'Sin título',
    channel: info.basic_info.author ?? info.basic_info.channel?.name ?? 'Canal desconocido',
    duration: formatDuration(info.basic_info.duration),
    thumbnail,
    cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
  };
}

export async function downloadAudioStream(
  url: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; contentLength: number | null }> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('No se pudo extraer el ID del video de la URL');
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const { stdout } = await execAsync(
    `yt-dlp --no-playlist -f "bestaudio[ext=m4a]/bestaudio" --get-url "${cleanUrl}"`,
    { timeout: 30000, maxBuffer: 1024 * 1024 },
  );

  const downloadUrl = stdout.trim();
  if (!downloadUrl) {
    throw new Error('No se pudo obtener la URL del stream de audio');
  }

  const fetchStreamUrl = async (url: string) =>
    fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/',
        'Range': 'bytes=0-',
      },
    });

  let resp = await fetchStreamUrl(downloadUrl);

  if (!resp.ok && resp.status === 403) {
    const retryUrl = (await execAsync(
      `yt-dlp --no-playlist -f "bestaudio[ext=m4a]/bestaudio" --get-url "${cleanUrl}"`,
      { timeout: 30000, maxBuffer: 1024 * 1024 },
    )).stdout.trim();
    if (retryUrl && retryUrl !== downloadUrl) {
      resp = await fetchStreamUrl(retryUrl);
    }
  }

  if (!resp.ok) {
    throw new Error(`Error al descargar: ${resp.status}`);
  }

  return {
    stream: resp.body as ReadableStream<Uint8Array>,
    contentType: 'audio/mp4',
    contentLength: null,
  };
}
