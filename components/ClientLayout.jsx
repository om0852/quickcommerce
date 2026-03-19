"use client"
import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from "./Sidebar";
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';

// Sub-component to handle search params in a Suspense boundary
function AdminStateSync({ setIsAdmin }) {
    const searchParams = useSearchParams();
    
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        // Clear old localStorage flag
        localStorage.removeItem('isAdmin');
        
        // Persist admin flag from URL to sessionStorage
        if (searchParams?.get('admin') === 'true') {
            sessionStorage.setItem('isAdmin', 'true');
        }
        
        const isCurrentlyAdmin = sessionStorage.getItem('isAdmin') === 'true';
        setIsAdmin(isCurrentlyAdmin);
    }, [searchParams, setIsAdmin]);

    return null;
}

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';
    const { isSidebarOpen, closeSidebar } = useSidebar();
    const [isAdmin, setIsAdmin] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col xl:flex-row">
            <Suspense fallback={null}>
                <AdminStateSync setIsAdmin={setIsAdmin} />
            </Suspense>
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
