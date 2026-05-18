import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PUBLIC_PAGE_ROUTES = ['/', '/login', '/register'];
const PUBLIC_API_PREFIXES = ['/api/auth'];
const ADMIN_ROUTES = ['/admin'];
const ADMIN_API_PREFIXES = ['/api/admin'];

function isPublicPage(pathname: string): boolean {
    return PUBLIC_PAGE_ROUTES.includes(pathname);
}

function isPublicApi(pathname: string): boolean {
    return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminPage(pathname: string): boolean {
    return ADMIN_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminApi(pathname: string): boolean {
    return ADMIN_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('auth_token')?.value;
    const session = token ? await verifyAuthToken(token) : null;
    const isApiRoute = pathname.startsWith('/api');

    if (isApiRoute) {
        if (isPublicApi(pathname)) {
            return NextResponse.next();
        }

        if (isAdminApi(pathname)) {
            if (!session) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { isAdmin: true },
            });

            if (!user?.isAdmin) {
                return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
            }

            return NextResponse.next();
        }

        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        return NextResponse.next();
    }

    if (isAdminPage(pathname)) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isAdmin: true },
        });

        if (!user?.isAdmin) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        return NextResponse.next();
    }

    if (isPublicPage(pathname) && session) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (!isPublicPage(pathname) && !session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};