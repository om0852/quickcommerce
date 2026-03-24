import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { SidebarProvider } from "@/components/SidebarContext";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "QuickCommerce Tracker",
  description: "Compare prices across Zepto, Blinkit, JioMart, and DMart",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authSession = (await cookies()).get('auth_session')?.value;
  let isAdmin = false;

  if (authSession) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_keep_it_safe');
      const { payload } = await jwtVerify(authSession, secret);
      isAdmin = payload.role === 'admin';
    } catch (error) {
      console.error('JWT verification failed in layout:', error);
    }
  }

  return (
    <html lang="en">
      <body>
        <AuthProvider isAdmin={isAdmin}>
          <SidebarProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
