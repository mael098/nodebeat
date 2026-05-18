import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const adminUser = await getAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: { id: true, email: true, subscriptionStatus: true, subscriptionEndsAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(pendingPayments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Error al cargar pagos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await getAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { userId, amount, currency, note } = body;

    if (!userId || !amount) {
      return NextResponse.json({ error: 'userId y amount son requeridos' }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: parseFloat(amount),
        currency: currency || 'ARS',
        note: note || undefined,
        status: 'pending',
      },
      include: {
        user: { select: { email: true } },
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Error al crear pago' }, { status: 500 });
  }
}
