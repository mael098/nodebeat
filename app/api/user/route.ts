import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userAccess = await prisma.userAccess.findUnique({
      where: { userId: currentUser.userId },
      select: { downloadEnabled: true },
    });

    return NextResponse.json({
      email: currentUser.email,
      downloadEnabled: userAccess?.downloadEnabled ?? false,
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    return NextResponse.json({ error: 'Error al obtener estado del usuario' }, { status: 500 });
  }
}
