//app/dashboard/layout.tsx

"use client"
import React, { useEffect } from 'react';
import { Sidebar } from "@/components/Sidebar";
import { AppProvider } from "@/context/AppContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // DESABILITADO PERMANENTEMENTE PARA ACESSO DIRETO NO CELULAR
    // const s = localStorage.getItem('v5_auth_session');
    // if (s !== 'true') {
    //   router.push('/login');
    // }
  }, [router]);

  return (
    <SettingsProvider>
      <AppProvider>
        <div className="min-h-screen flex font-sans bg-[#0a0a0a] text-zinc-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </AppProvider>
    </SettingsProvider>
  );
}