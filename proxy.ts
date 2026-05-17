import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';

const PUBLIC_PAGE_ROUTES = ['/login', '/register'];
const PUBLIC_API_PREFIXES = ['/api/auth'];

function isPublicPage(pathname: string): boolean {
    return PUBLIC_PAGE_ROUTES.includes(pathname);
}

function isPublicApi(pathname: string): boolean {
    return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

        if (!session) {
            return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
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