import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getVideoInfo } from '@/lib/youtube-downloader';

export const maxDuration = 60;

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const requestLog = new Map<number, number[]>();

function isRateLimited(userId: number): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(userId)?.filter((t) => now - t < RATE_LIMIT_WINDOW_MS) ?? [];
  if (timestamps.length >= RATE_LIMIT_MAX) {
    requestLog.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(userId, timestamps);
  if (requestLog.size > 5000) {
    for (const [key, value] of requestLog) {
      if (value[value.length - 1] < now - RATE_LIMIT_WINDOW_MS) {
        requestLog.delete(key);
      }
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (isRateLimited(currentUser.userId)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes, inténtalo más tarde' },
        { status: 429 },
      );
    }

    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return NextResponse.json({ error: 'URL de YouTube invalida' }, { status: 400 });
    }

    const info = await getVideoInfo(url);

    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudo analizar el video',
      },
      { status: 500 },
    );
  }
}
