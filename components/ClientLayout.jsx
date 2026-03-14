"use client"
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "./Sidebar";
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col xl:flex-row">
            {!isLoginPage && (
                <>
                    {/* Mobile Header with Hamburger */}
                    <div className="xl:hidden flex items-center justify-between p-4 bg-white border-b border-neutral-200 sticky top-0 z-30">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold tracking-tight">QuickCommerce</h1>
                        </div>
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                    </div>

                    <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
                </>
            )}
            <main className={cn(
                "flex-1 min-h-screen transition-all duration-300",
                !isLoginPage ? "xl:ml-64" : "w-full"
            )}>
                {children}
            </main>
        </div>
    );
}
