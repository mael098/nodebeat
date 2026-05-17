import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const downloads = await prisma.download.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const download = await prisma.download.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true, download });
  } catch (error) {
    console.error('Error deleting download:', error);
    return NextResponse.json(
      { error: 'Error al eliminar descarga' },
      { status: 500 }
    );
  }
}
