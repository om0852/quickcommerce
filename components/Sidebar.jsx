'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, BarChart3, Bell } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Search', icon: Search },
    { href: '/categories', label: 'Categories', icon: BarChart3 },
    { href: '/alerts', label: 'Alerts', icon: Bell }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">QuickCommerce</h1>
        <p className="sidebar-subtitle">Price Tracker</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p className="footer-text">© 2025 QuickCommerce</p>
      </div>
    </aside>
  );
}
