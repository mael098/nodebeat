import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUser } from '@/lib/admin';
import { scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isAdmin: true,
        userAccess: {
          select: {
            daysAllowed: true,
            expiresAt: true,
            downloadEnabled: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Error al listar usuarios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request);

    if (!adminUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as {
      email?: string;
      password?: string;
      daysAllowed?: number;
    };

    const { email, password, daysAllowed = 30 } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 },
      );
    }

    const salt = crypto.getRandomValues(new Uint8Array(16)).toString();
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const hashedPassword = `${salt}:${derivedKey.toString('hex')}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysAllowed);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        userAccess: {
          create: {
            daysAllowed,
            expiresAt,
            downloadEnabled: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        userAccess: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Usuario creado correctamente',
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
