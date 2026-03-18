"use client"
import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Sidebar from "./Sidebar";
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isLoginPage = pathname === '/login';
    const { isSidebarOpen, closeSidebar } = useSidebar();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Clear any old localStorage flag (migration cleanup)
        localStorage.removeItem('isAdmin');
        // Persist admin flag from URL to sessionStorage (resets when tab closes)
        if (searchParams?.get('admin') === 'true') {
            sessionStorage.setItem('isAdmin', 'true');
        }
        setIsAdmin(sessionStorage.getItem('isAdmin') === 'true');
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col xl:flex-row">
            {!isLoginPage && (
                <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} isAdmin={isAdmin} />
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
