import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    const response = NextResponse.json(
        { message: 'Logout successful' },
        { status: 200 }
    );

    // Clear the auth_session cookie
    (await cookies()).set('auth_session', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });

    return response;
}
