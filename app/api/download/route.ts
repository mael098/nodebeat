import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkUserAccess } from '@/lib/admin';
import { downloadAudioStream } from '@/lib/youtube-downloader';

const execAsync = promisify(exec);

export const maxDuration = 600;

function sanitizeFileName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|;\r\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const hasAccess = await checkUserAccess(currentUser.userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a descargas. Contacta al administrador.' },
        { status: 403 },
      );
    }

    const userAccess = await prisma.userAccess.findUnique({
      where: { userId: currentUser.userId },
      select: { downloadEnabled: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { _count: { select: { downloads: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!userAccess?.downloadEnabled && user._count.downloads >= 2) {
      return NextResponse.json(
        {
          error: 'Has alcanzado el límite de 2 descargas gratuitas. Contacta al administrador para pagar y descargar sin límite.',
        },
        { status: 403 },
      );
    }

    const { url, type, title, channel, duration, thumbnail } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return NextResponse.json({ error: 'URL de YouTube inválida' }, { status: 400 });
    }

    let cleanUrl = url;
    let videoId: string | null = null;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com')) {
        videoId = parsed.searchParams.get('v');
        if (videoId) {
          cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
      } else if (parsed.hostname.includes('youtu.be')) {
        videoId = parsed.pathname.replace('/', '').trim();
        if (videoId) {
          cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
    } catch {
      cleanUrl = url;
    }

    const normalizedTitle =
      typeof title === 'string' && title.trim().length > 0
        ? title.trim()
        : 'Sin titulo';

    if (type === 'audio') {
      const { stream, contentType } = await downloadAudioStream(cleanUrl);

      const dbPath = videoId ? `ytid:${videoId}` : cleanUrl;

      try {
        const duplicateWindowStart = new Date(Date.now() - 60 * 1000);
        const recentDuplicate = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM Download
          WHERE title = ${normalizedTitle}
            AND type = ${'audio'}
            AND channel = ${typeof channel === 'string' ? channel : ''}
            AND userId = ${currentUser.userId}
            AND createdAt >= ${duplicateWindowStart}
          LIMIT 1
        `;

        if (recentDuplicate.length === 0) {
          await prisma.$executeRaw`
            INSERT INTO Download (title, filePath, type, channel, duration, thumbnail, userId, createdAt)
            VALUES (
              ${normalizedTitle},
              ${dbPath},
              ${'audio'},
              ${typeof channel === 'string' ? channel : ''},
              ${typeof duration === 'string' ? duration : ''},
              ${typeof thumbnail === 'string' ? thumbnail : null},
              ${currentUser.userId},
              ${new Date()}
            )
          `;
        }
      } catch (dbError) {
        console.error('Error guardando en BD:', dbError);
      }

      const rawTitle = typeof title === 'string' && title.trim().length > 0
        ? sanitizeFileName(title)
        : 'descarga';
      const asciiTitle = rawTitle.replace(/[^\x20-\x7E]/g, '') || 'descarga';
      const fileNameAscii = `${asciiTitle}.webm`;
      const fileNameUtf8 = `${rawTitle || 'descarga'}.webm`;

      return new NextResponse(stream as ReadableStream<Uint8Array>, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${encodeURIComponent(fileNameUtf8)}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const timestamp = Date.now();
    const downloadsDir = process.env.DOWNLOADS_DIR || path.join(os.homedir(), 'NodeBeat_Downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const outputTemplate = path.join(downloadsDir, `${timestamp}.%(ext)s`);

    const command = `yt-dlp --no-playlist -o "${outputTemplate}" "${cleanUrl}"`;
    console.log('Iniciando descarga de video:', timestamp);

    const { stderr } = await execAsync(command, {
      timeout: 600000,
      maxBuffer: 1024 * 1024 * 100,
    });
    if (stderr) {
      console.log('yt-dlp stderr:', stderr);
    }

    let finalFile: string | null = null;
    const prefix = `${timestamp}.`;
    const files = fs.readdirSync(downloadsDir);
    for (const file of files) {
      if (file.startsWith(prefix)) {
        finalFile = path.join(downloadsDir, file);
        break;
      }
    }

    if (!finalFile || !fs.existsSync(finalFile)) {
      throw new Error('El archivo no se encontró después de descargar');
    }

    const ext = path.extname(finalFile).toLowerCase();
    const mimeType = ext === '.webm' ? 'video/webm' : ext === '.mkv' ? 'video/x-matroska' : 'video/mp4';

    const duplicateWindowStart = new Date(Date.now() - 60 * 1000);
    try {
      const recentDuplicate = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM Download
        WHERE title = ${normalizedTitle}
          AND type = ${type}
          AND channel = ${typeof channel === 'string' ? channel : ''}
          AND userId = ${currentUser.userId}
          AND createdAt >= ${duplicateWindowStart}
        LIMIT 1
      `;

      if (recentDuplicate.length === 0) {
        await prisma.$executeRaw`
          INSERT INTO Download (title, filePath, type, channel, duration, thumbnail, userId, createdAt)
          VALUES (
            ${normalizedTitle},
            ${finalFile},
            ${type},
            ${typeof channel === 'string' ? channel : ''},
            ${typeof duration === 'string' ? duration : ''},
            ${typeof thumbnail === 'string' ? thumbnail : null},
            ${currentUser.userId},
            ${new Date()}
          )
        `;
      }
    } catch (dbError) {
      console.error('Error guardando en BD:', dbError);
    }

    const rawTitle =
      typeof title === 'string' && title.trim().length > 0
        ? sanitizeFileName(title)
        : 'descarga';
    const asciiTitle = rawTitle.replace(/[^\x20-\x7E]/g, '') || 'descarga';
    const fileExt = ext || '.mp4';
    const contentDisposition =
      `attachment; filename="${asciiTitle}${fileExt}"; ` +
      `filename*=UTF-8''${encodeURIComponent(rawTitle + fileExt)}`;

    const stat = fs.statSync(finalFile);
    const fileStream = fs.createReadStream(finalFile);

    return new NextResponse(fileStream as unknown as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Disposition': contentDisposition,
        'Content-Type': mimeType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al procesar la descarga',
      },
      { status: 500 },
    );
  }
}
