import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public paths
    const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth');

    const authSession = request.cookies.get('auth_session');

    if (!isPublicPath && !authSession) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (pathname === '/login' && authSession) {
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
