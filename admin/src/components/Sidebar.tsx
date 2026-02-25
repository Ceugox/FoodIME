'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Usuários' },
  { href: '/transactions', label: 'Transações' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] min-h-screen bg-sidebar flex flex-col py-6">
      <div className="px-5 mb-8">
        <h1 className="font-serif text-primary text-[22px]">FoodIME</h1>
        <p className="text-slate-400 text-xs mt-0.5">Admin Panel</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-5 py-2.5 text-sm border-l-[3px] transition-colors ${
                isActive
                  ? 'text-white bg-primary/15 border-primary font-semibold'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5">
        <button
          onClick={() => {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
          }}
          className="w-full py-2 bg-white/10 text-slate-400 rounded-lg text-[13px] hover:bg-white/15 transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
