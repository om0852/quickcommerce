"use client"
import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "./Sidebar";

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    return (
        <div className="app-container">
            {!isLoginPage && <Sidebar />}
            <main className={`main-content ${isLoginPage ? 'full-width' : ''}`}>
                {children}
            </main>
        </div>
    );
}
