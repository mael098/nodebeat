import { ReactNode } from 'react';
import DashboardNavbar from './_components/dashboard-navbar';

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800 md:p-8">
      <DashboardNavbar />
      <main className="mx-auto w-full max-w-6xl">{children}</main>
    </div>
  );
}
