// src/app/dashboard/layout.tsx
import { Suspense } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Loader from '../../components/Loader';

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader className="h-8 w-8" /></div>}>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}