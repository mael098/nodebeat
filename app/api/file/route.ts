import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { downloadAudioStream } from "@/lib/youtube-downloader";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Path requerido" }, { status: 400 });
    }

    const download = await prisma.download.findUnique({
      where: { filePath },
      select: { userId: true },
    });

    if (!download || download.userId !== currentUser.userId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 404 });
    }

    // Si es una referencia a YouTube (ytid:<videoId>), streamear desde YouTube
    if (filePath.startsWith("ytid:")) {
      const videoId = filePath.slice(5);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const { stream, contentType, contentLength } = await downloadAudioStream(videoUrl);

      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      };
      if (contentLength) {
        headers["Content-Length"] = String(contentLength);
      }

      return new NextResponse(stream as ReadableStream<Uint8Array>, {
        status: 200,
        headers,
      });
    }

    // Archivo local (solo en desarrollo local con yt-dlp)
    const downloadsDir = process.env.DOWNLOADS_DIR || path.join(os.homedir(), "NodeBeat_Downloads");
    const normalizedPath = path.normalize(filePath);
    const normalizedDir = path.normalize(downloadsDir) + path.sep;

    if (!normalizedPath.startsWith(normalizedDir) && normalizedPath !== path.normalize(downloadsDir)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".wav") contentType = "audio/wav";
    else if (ext === ".webm") contentType = "audio/webm";
    else if (ext === ".ogg") contentType = "audio/ogg";

    const stat = fs.statSync(normalizedPath);
    const fileSize = stat.size;
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (!match) {
        return new NextResponse("Invalid Range", { status: 416 });
      }

      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(normalizedPath, { start, end });
      const webStream = stream as unknown as ReadableStream<Uint8Array>;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const stream = fs.createReadStream(normalizedPath);
    const webStream = stream as unknown as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(fileSize),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Error al servir archivo" },
      { status: 500 },
    );
  }
}
