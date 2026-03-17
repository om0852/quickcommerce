'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, BarChart3, Bell, LogOut, LayoutDashboard, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import FeedbackModal from './FeedbackModal';
import { SidebarCloseIcon } from './SidebarIcons';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navItems = [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/categories', label: 'Categories', icon: BarChart3 },
    // { href: '/clean-check', label: 'Clean Check', icon: BarChart3 },
    { href: '/alerts', label: 'Alerts', icon: Bell }
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-[150] transition-opacity duration-300 xl:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-64 bg-neutral-900 text-white flex flex-col border-r border-neutral-800 z-[160] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* HEADER */}
        <div className="px-6 py-3 border-b border-neutral-800 flex items-center justify-between min-h-[64px]">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">QuickCommerce</h1>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close Sidebar"
          >
            <SidebarCloseIcon size={24} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1280 && onClose) onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Feedback Button */}
          <button
            onClick={() => {
              if (window.innerWidth < 1280 && onClose) onClose();
              setFeedbackOpen(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all duration-200 text-left"
          >
            <MessageSquare size={20} />
            <span>Review & Feedback</span>
          </button>
        </nav>

        {/* LOGOUT */}
        <div className="px-4 pb-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all duration-200 text-left"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-neutral-800">
          <p className="text-center text-xs text-neutral-500">
            © 2025 QuickCommerce
          </p>
        </div>
      </aside>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
}