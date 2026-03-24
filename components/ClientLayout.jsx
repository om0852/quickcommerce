"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from "./Sidebar";
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';
import { useAuth } from './AuthProvider';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';
    const { isSidebarOpen, closeSidebar } = useSidebar();
    const { isAdmin } = useAuth(); // Retrieve global auth state

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col xl:flex-row">
            {!isLoginPage && (
                <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} isAdmin={isAdmin} />
            )}
            <main className={cn(
                "flex-1 min-h-screen transition-all duration-300 overflow-x-hidden",
                !isLoginPage ? (isSidebarOpen ? "xl:pl-64" : "xl:pl-0") : "w-full"
            )}>
                {children}
            </main>
        </div>
    );
}
