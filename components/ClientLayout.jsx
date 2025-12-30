"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "./Sidebar";
import { cn } from '@/lib/utils';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    return (
        <div className="min-h-screen bg-neutral-50 flex">
            {!isLoginPage && <Sidebar />}
            <main className={cn(
                "flex-1 min-h-screen transition-all duration-300",
                !isLoginPage ? "ml-64" : "w-full"
            )}>
                {children}
            </main>
        </div>
    );
}
