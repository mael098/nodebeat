import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

export type AuthTokenPayload = {
    userId: number;
    email: string;
};

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET no esta configurado en produccion');
        }

        return new TextEncoder().encode('dev-insecure-secret-change-me');
    }

    return new TextEncoder().encode(secret);
}

export async function createAuthToken(payload: AuthTokenPayload): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());

        if (typeof payload.userId !== 'number' || typeof payload.email !== 'string') {
            return null;
        }

        return {
            userId: payload.userId,
            email: payload.email,
        };
    } catch {
        return null;
    }
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthTokenPayload | null> {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        return null;
    }

    return verifyAuthToken(token);
}