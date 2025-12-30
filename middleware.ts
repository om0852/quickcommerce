import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public paths
    const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth');

    const authSession = request.cookies.get('auth_session')?.value;

    let isValid = false;
    if (authSession) {
        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_keep_it_safe');
            await jwtVerify(authSession, secret);
            isValid = true;
        } catch (error) {
            console.error('JWT verification failed:', error);
            isValid = false;
        }
    }

    if (!isPublicPath && !isValid) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (pathname === '/login' && isValid) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
