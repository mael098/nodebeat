import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { daysAllowed, status } = body;

    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    // If confirming payment, activate subscription
    if (status === 'confirmed') {
      const days = daysAllowed || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionStatus: 'active',
          subscriptionEndsAt: expiresAt,
        },
      });

      // Create or update UserAccess
      await prisma.userAccess.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          daysAllowed: days,
          expiresAt,
          downloadEnabled: true,
        },
        update: {
          daysAllowed: days,
          expiresAt,
          downloadEnabled: true,
        },
      });

      // Mark payment as confirmed
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'confirmed' },
        include: {
          user: { select: { email: true, subscriptionStatus: true, subscriptionEndsAt: true } },
        },
      });

      return NextResponse.json(updatedPayment);
    }

    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Error al actualizar pago' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    return NextResponse.json({ message: 'Pago eliminado' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: 'Error al eliminar pago' }, { status: 500 });
  }
}
