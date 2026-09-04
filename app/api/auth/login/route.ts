import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuthToken } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Credenciales invalidas' },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, user.password);

    if (!validPassword) {
      return NextResponse.json(
        { message: 'Credenciales invalidas' },
        { status: 401 }
      );
    }

    const accessToken = await createAuthToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json(
      {
        message: 'Sesion iniciada correctamente',
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        accessToken,
      },
      { status: 200 }
    );

    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Error logging in user:', error);

    return NextResponse.json(
      { message: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
