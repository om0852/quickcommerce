'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, BarChart3, Bell, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
    { href: '/', label: 'Search', icon: Search },
    { href: '/categories', label: 'Categories', icon: BarChart3 },
    { href: '/alerts', label: 'Alerts', icon: Bell }
  ];

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">QuickCommerce</h1>
        <p className="sidebar-subtitle">Price Tracker</p>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon className="nav-icon" size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* --- LOGOUT BUTTON ABOVE THE LINE --- */}
      <div style={{ padding: '0 1rem' }}>
        <button
          onClick={handleLogout}
          className="nav-item" 
          style={{
            width: '100%',
            border: 'none', 
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            marginBottom: '0.5rem',
            color: 'inherit' 
          }}
        >
          <LogOut className="nav-icon" size={20} />
          <span>Logout</span>
        </button>
      </div>

      {/* --- FOOTER WITH TOP BORDER (THE WHITE LINE) --- */}
      <div className="sidebar-footer" style={{ 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
        padding: '2rem 1rem' 
      }}>
        <p className="footer-text" style={{ textAlign: 'center', fontSize: '15px', color: '#737373', margin: 0 }}>
          © 2025 QuickCommerce
        </p>
      </div>
    </aside>
  );
}