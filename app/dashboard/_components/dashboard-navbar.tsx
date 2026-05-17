"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardNavbar() {
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard';
  const isBiblioteca = pathname.startsWith('/dashboard/biblioteca');

  return (
    <nav className="sticky top-3 z-30 mx-auto mb-6 w-full max-w-6xl rounded-2xl border border-white/60 bg-white/85 px-4 py-3 shadow-lg shadow-blue-100/60 backdrop-blur-md dark:border-gray-700/70 dark:bg-gray-800/85 dark:shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
            Workspace
          </p>
          <p className="truncate text-lg font-extrabold text-gray-900 dark:text-gray-100">NodeBeat Dashboard</p>
        </div>

        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Link
            href="/dashboard"
            className={`rounded-lg px-3 py-1.5 transition ${
              isDashboard
                ? 'border border-blue-200 bg-blue-50 text-blue-800 dark:border-gray-600 dark:bg-gray-700 dark:text-blue-200'
                : 'text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-gray-700'
            }`}
          >
            Descargar
          </Link>
          <Link
            href="/dashboard/biblioteca"
            className={`rounded-lg px-3 py-1.5 transition ${
              isBiblioteca
                ? 'border border-blue-200 bg-blue-50 text-blue-800 dark:border-gray-600 dark:bg-gray-700 dark:text-blue-200'
                : 'text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-gray-700'
            }`}
          >
            Biblioteca
          </Link>
        </div>
      </div>
    </nav>
  );
}
