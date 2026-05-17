import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const downloads = await prisma.$queryRaw<Array<{
      id: number;
      title: string;
      filePath: string;
      type: string;
      channel: string | null;
      duration: string | null;
      thumbnail: string | null;
      userId: number | null;
      createdAt: Date;
    }>>`
      SELECT id, title, filePath, type, channel, duration, thumbnail, userId, createdAt
      FROM Download
      WHERE userId = ${currentUser.userId}
      ORDER BY createdAt DESC
    `;

    return NextResponse.json(downloads);
  } catch (error) {
    console.error('Error fetching downloads:', error);
    return NextResponse.json(
      { error: 'Error al obtener descargas' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const numericId = parseInt(id);

    const download = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM Download
      WHERE id = ${numericId} AND userId = ${currentUser.userId}
      LIMIT 1
    `;

    if (download.length === 0) {
      return NextResponse.json({ error: 'Descarga no encontrada' }, { status: 404 });
    }

    await prisma.$executeRaw`
      DELETE FROM Download
      WHERE id = ${numericId} AND userId = ${currentUser.userId}
    `;

    return NextResponse.json({ success: true, download: download[0] });
  } catch (error) {
    console.error('Error deleting download:', error);
    return NextResponse.json(
      { error: 'Error al eliminar descarga' },
      { status: 500 }
    );
  }
}
