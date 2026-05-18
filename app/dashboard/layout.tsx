import { ReactNode } from 'react';
import DashboardNavbar from './_components/dashboard-navbar';

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#090f1f] p-4 md:p-8">
      <DashboardNavbar />
      <main className="mx-auto w-full max-w-5xl">{children}</main>
    </div>
  );
}
