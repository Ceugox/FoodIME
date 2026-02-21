'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Usuarios' },
  { href: '/transactions', label: 'Transacoes' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#1e293b',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '0 20px', marginBottom: 32 }}>
        <h1 style={{ color: '#f97316', fontSize: 22, fontWeight: 800 }}>FoodIME</h1>
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Admin Panel</p>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '10px 20px',
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? 'rgba(249,115,22,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #f97316' : '3px solid transparent',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', padding: '0 20px' }}>
        <button
          onClick={() => {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
          }}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            color: '#94a3b8',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
