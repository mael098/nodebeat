import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuthToken } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        const hashedPassword = await hashPassword(password);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'Ya existe una cuenta con ese correo' },
                { status: 409 }
            );
        }

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                createdAt: true,
            },
        });

        const accessToken = await createAuthToken({
            userId: user.id,
            email: user.email,
        });

        const response = NextResponse.json(
            {
                message: 'Usuario registrado correctamente',
                user,
                accessToken,
            },
            { status: 201 }
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
        console.error('Error registering user:', error);

        return NextResponse.json(
            { message: 'Error al procesar la solicitud' },
            { status: 500 }
        );
    }
}

export function DELETE() {
    const response = NextResponse.json({ message: 'Sesión cerrada' }, { status: 200 });
    response.cookies.set('auth_token', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return response;
}