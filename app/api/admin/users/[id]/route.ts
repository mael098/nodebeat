import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUser } from '@/lib/admin';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const params = await props.params;
    const userId = Number(params.id);

    const body = await request.json().catch(() => ({})) as {
      daysAllowed?: number;
      downloadEnabled?: boolean;
    };

    const { daysAllowed, downloadEnabled } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData: { daysAllowed?: number; expiresAt?: Date; downloadEnabled?: boolean } = {};

    if (typeof daysAllowed === 'number' && daysAllowed > 0) {
      updateData.daysAllowed = daysAllowed;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysAllowed);
      updateData.expiresAt = expiresAt;
    }

    if (typeof downloadEnabled === 'boolean') {
      updateData.downloadEnabled = downloadEnabled;
    }

    const userAccess = await prisma.userAccess.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        daysAllowed: daysAllowed || 30,
        expiresAt: (() => {
          const date = new Date();
          date.setDate(date.getDate() + (daysAllowed || 30));
          return date;
        })(),
        downloadEnabled: downloadEnabled !== undefined ? downloadEnabled : true,
      },
    });

    return NextResponse.json({
      message: 'Acceso actualizado correctamente',
      userAccess,
    });
  } catch (error) {
    console.error('Error updating user access:', error);
    return NextResponse.json({ error: 'Error al actualizar acceso' }, { status: 500 });
  }
}
