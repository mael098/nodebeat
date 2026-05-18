"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname === '/dashboard';
  const isBiblioteca = pathname.startsWith('/dashboard/biblioteca');
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.email) setEmail(data.email as string); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const avatar = email ? email[0].toUpperCase() : '?';

  return (
    <nav className="sticky top-3 z-30 mx-auto mb-6 w-full max-w-5xl rounded-2xl border border-[#253459]/80 bg-[#101a31]/85 px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#1a3b8a] text-xs font-bold text-white">
            NB
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b82b8]">Workspace</p>
            <p className="text-sm font-extrabold text-[#e8efff]">NodeBeat</p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-[#253459] bg-[#0d1528] p-1 text-sm font-semibold">
          <Link
            href="/dashboard"
            className={`rounded-lg px-4 py-1.5 transition ${
              isDashboard
                ? 'bg-[#1a3b8a] text-white shadow-[0_2px_10px_rgba(26,59,138,0.4)]'
                : 'text-[#8fa8d8] hover:bg-[#152040] hover:text-[#c7d8ff]'
            }`}
          >
            Descargar
          </Link>
          <Link
            href="/dashboard/biblioteca"
            className={`rounded-lg px-4 py-1.5 transition ${
              isBiblioteca
                ? 'bg-[#1a3b8a] text-white shadow-[0_2px_10px_rgba(26,59,138,0.4)]'
                : 'text-[#8fa8d8] hover:bg-[#152040] hover:text-[#c7d8ff]'
            }`}
          >
            Biblioteca
          </Link>
        </div>

        {/* Profile dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-[#2d3f6b] bg-[#0d1528] px-3 py-1.5 transition hover:border-[#4a5f94]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1a3b8a] text-xs font-bold text-white">
              {avatar}
            </span>
            <svg
              className={`h-3.5 w-3.5 text-[#6b82b8] transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[#2a3b64] bg-[#0f182d] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
              {email && (
                <div className="mb-2 rounded-xl bg-[#0c1528] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b82b8]">Sesión activa</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#c0cfee]">{email}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#e07070] transition hover:bg-[#1a0d0d]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
