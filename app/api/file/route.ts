import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Path requerido" }, { status: 400 });
    }

    // Seguridad: solo permitir archivos de la carpeta NodeBeat_Downloads
    const downloadsDir = path.join(os.homedir(), "NodeBeat_Downloads");
    const normalizedPath = path.normalize(filePath);
    const normalizedDir = path.normalize(downloadsDir) + path.sep;

    if (!normalizedPath.startsWith(normalizedDir) && normalizedPath !== path.normalize(downloadsDir)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 },
      );
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

    // Support HTTP Range requests — required for audio/video on mobile browsers
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

    // Full file response
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
