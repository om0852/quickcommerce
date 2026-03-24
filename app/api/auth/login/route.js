import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

export async function POST(request) {
    try {
        const { username, password } = await request.json();

        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const userUsername = process.env.USER_USERNAME || 'user';
        const userPassword = process.env.USER_PASSWORD || 'user';

        let role = null;

        console.log("LOGIN ATTEMPT:", {
            reqUsername: username,
            reqPassword: password,
            envAdminUser: adminUsername,
            envAdminPass: adminPassword,
            envUserUser: userUsername,
            envUserPass: userPassword,
            adminPassMatch: password === adminPassword,
            userPassMatch: password === userPassword
        });

        if (username === adminUsername && password === adminPassword) {
            role = 'admin';
        } else if (username === userUsername && password === userPassword) {
            role = 'user';
        }

        if (role) {
            // Sign JWT
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_keep_it_safe');
            const token = await new SignJWT({ username, role })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('7d')
                .sign(secret);

            const response = NextResponse.json(
                { message: 'Login successful', role },
                { status: 200 }
            );

            // Set cookie for 7 days
            (await cookies()).set('auth_session', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            });

            return response;
        }

        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: 'An error occurred during login' },
            { status: 500 }
        );
    }
}
