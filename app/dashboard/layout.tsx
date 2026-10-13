// ================================================================================
// 🗂️ LAYOUT GLOBAL DO DASHBOARD - V5 CLOUD (COM ESCUTA GLOBAL DE LEADS E SOM)
// app/dashboard/layout.tsx
// ================================================================================

"use client"
import React, { useEffect } from 'react';
import { Sidebar } from "@/components/Sidebar";
import { AppProvider } from "@/context/AppContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { playSound } from '@/lib/sound';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Hook para escutar novos leads em tempo real de forma global em qualquer página
function useGlobalLeadListener() {
  useEffect(() => {
    if (!supabase) return;

    // Escuta globalmente qualquer novo registo (INSERT) na tabela leads
    const canalGlobal = supabase
      .channel('global-leads-notification-layout')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          // Toca o som de celular independentemente da página onde o atendente estiver!
          playSound('celular', 0.25);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalGlobal);
    };
  }, []);
}

function GlobalListenerWrapper({ children }: { children: React.ReactNode }) {
  useGlobalLeadListener();
  return <>{children}</>;
}

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
        <GlobalListenerWrapper>
          <div className="min-h-screen flex font-sans bg-[#0a0a0a] text-zinc-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </GlobalListenerWrapper>
      </AppProvider>
    </SettingsProvider>
  );
}