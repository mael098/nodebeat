import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Configurar timeout máximo para esta ruta
export const maxDuration = 600; // 10 minutos en Vercel, ignorado en dev

export async function POST(request: NextRequest) {
    try {
        const { url, type } = await request.json();

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

        // Crear nombre único
        const timestamp = Date.now();
        const outputFormat = type === 'audio' ? 'mp3' : 'mp4';
        const tempDir = '/tmp/nodebeat';

        // Crear carpeta si no existe
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const basePath = path.join(tempDir, timestamp.toString());

        try {
            // Construir comando
            let command = '';
            if (type === 'audio') {
                command = `yt-dlp --no-playlist -x --audio-format mp3 -o "${basePath}" "${url}"`;
            } else {
                command = `yt-dlp --no-playlist -f "best" -o "${basePath}" "${url}"`;
            }

            console.log('Iniciando descarga:', timestamp);

            // Ejecutar comando de forma asincrónica con timeout
            await execAsync(command, {
                timeout: 600000, // 10 minutos
                maxBuffer: 1024 * 1024 * 100 // 100MB buffer
            });

            // Buscar el archivo descargado (yt-dlp agrega extensión automáticamente)
            let finalFile: string | null = null;
            const files = fs.readdirSync(tempDir);

            for (const file of files) {
                if (file.startsWith(timestamp.toString())) {
                    finalFile = path.join(tempDir, file);
                    break;
                }
            }

            if (!finalFile) {
                throw new Error('El archivo no se encontró después de descargar');
            }

            console.log('Archivo descargado:', finalFile);

            // Leer el archivo
            const fileBuffer = fs.readFileSync(finalFile);

            // Limpiar archivo temporal después de 1 minuto
            setTimeout(() => {
                try {
                    fs.unlinkSync(finalFile!);
                    console.log('Archivo temporal eliminado:', finalFile);
                } catch (e) {
                    console.log('Error al eliminar archivo temporal');
                }
            }, 60000);

            // Retornar el archivo
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Disposition': `attachment; filename="descarga.${outputFormat}"`,
                    'Content-Type': type === 'audio' ? 'audio/mpeg' : 'video/mp4',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
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