import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

const execAsync = promisify(exec);

// Configurar timeout máximo para esta ruta
export const maxDuration = 600; // 10 minutos en Vercel, ignorado en dev

function sanitizeFileName(value: string): string {
    return value
        .replace(/[\\/:*?"<>|;\r\n]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function toAsciiFileName(value: string): string {
    const normalized = sanitizeFileName(value)
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized || 'descarga';
}

function encodeRFC5987ValueChars(value: string): string {
    return encodeURIComponent(value).replace(/['()*]/g, (character) => {
        return `%${character.charCodeAt(0).toString(16).toUpperCase()}`;
    });
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getAuthenticatedUser(request);

        if (!currentUser) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { url, type, title, channel, duration, thumbnail } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL requerida' },
                { status: 400 }
            );
        }

        // Validar que sea URL de YouTube
        if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
            return NextResponse.json(
                { error: 'URL de YouTube inválida' },
                { status: 400 }
            );
        }

        // Limpiar URL para forzar descarga de un solo video (sin playlist)
        let cleanUrl = url;
        try {
            const parsed = new URL(url);
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
            cleanUrl = url;
        }

        // Crear nombre único
        const timestamp = Date.now();
        const downloadsDir = path.join(os.homedir(), 'NodeBeat_Downloads');

        // Crear carpeta si no existe
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        const basePath = path.join(downloadsDir, timestamp.toString());

        try {
            // Construir comando
            let command = '';
            if (type === 'audio') {
                command = `yt-dlp --no-playlist -x --audio-format mp3 -o "${basePath}" "${cleanUrl}"`;
            } else {
                command = `yt-dlp --no-playlist -f "best" -o "${basePath}" "${cleanUrl}"`;
            }

            console.log('Iniciando descarga:', timestamp);

            // Ejecutar comando de forma asincrónica con timeout
            await execAsync(command, {
                timeout: 600000, // 10 minutos
                maxBuffer: 1024 * 1024 * 100 // 100MB buffer
            });

            // Buscar el archivo descargado (yt-dlp agrega extensión automáticamente)
            let finalFile: string | null = null;
            const files = fs.readdirSync(downloadsDir);

            for (const file of files) {
                if (file.startsWith(timestamp.toString())) {
                    finalFile = path.join(downloadsDir, file);
                    break;
                }
            }

            if (!finalFile) {
                throw new Error('El archivo no se encontró después de descargar');
            }

            console.log('Archivo descargado:', finalFile);

            // Leer el archivo
            const fileBuffer = fs.readFileSync(finalFile);

            // Guardar en BD
            try {
                const normalizedTitle =
                    typeof title === 'string' && title.trim().length > 0
                        ? title.trim()
                        : finalFile
                            ? path.basename(finalFile).replace(/\.[^/.]+$/, '')
                            : 'Sin titulo';

                const duplicateWindowStart = new Date(Date.now() - 60 * 1000);
                const recentDuplicate = await prisma.$queryRaw<Array<{ id: number }>>`
                    SELECT id
                    FROM Download
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
                // Continuar incluso si falla guardar en BD
            }

            const extension = type === 'audio' ? 'mp3' : 'mp4';
            const rawTitle =
                typeof title === 'string' && title.trim().length > 0
                    ? sanitizeFileName(title)
                    : 'descarga';
            const asciiTitle = toAsciiFileName(rawTitle);
            const fileNameAscii = `${asciiTitle}.${extension}`;
            const fileNameUtf8 = `${rawTitle || 'descarga'}.${extension}`;
            const contentDisposition =
                `attachment; filename="${fileNameAscii}"; ` +
                `filename*=UTF-8''${encodeRFC5987ValueChars(fileNameUtf8)}`;

            // Retornar el archivo
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Disposition': contentDisposition,
                    'Content-Type': type === 'audio' ? 'audio/mpeg' : 'video/mp4',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'X-File-Path': finalFile || '',
                },
            });
        } catch (error) {
            console.error('Error en descarga:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Error al procesar la descarga',
            },
            { status: 500 }
        );
    }
}