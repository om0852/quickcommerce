import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { SidebarProvider } from "@/components/SidebarContext";

export const metadata: Metadata = {
  title: "QuickCommerce Tracker",
  description: "Compare prices across Zepto, Blinkit, JioMart, and DMart",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </SidebarProvider>
      </body>
    </html>
  );
}
