"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "./Sidebar";
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';
    const { isSidebarOpen, closeSidebar } = useSidebar();

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col xl:flex-row">
            {!isLoginPage && (
                <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            )}
            <main className={cn(
                "flex-1 min-h-screen transition-all duration-300",
                !isLoginPage ? (isSidebarOpen ? "xl:ml-64" : "xl:ml-0") : "w-full"
            )}>
                {children}
            </main>
        </div>
    );
}
