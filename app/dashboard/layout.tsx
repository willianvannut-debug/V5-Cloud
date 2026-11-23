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
import { playSound } from '@/lib/sound';
import { painelApi } from '@/lib/painel-api';
import { ThemeProvider } from '@/context/ThemeContext';


// Hook para escutar novos leads em tempo real de forma global em qualquer página
function useGlobalLeadListener() {
  useEffect(() => {
    let ultimo: string | null = null;
    let primeira = true;
    const checar = async () => {
      try {
        const r = await painelApi<{ ultimo_created_at: string | null }>('leads-resumo');
        // Toca o som quando chega um lead novo (não na primeira checagem)
        if (!primeira && r.ultimo_created_at && r.ultimo_created_at !== ultimo) {
          playSound('celular', 0.25);
        }
        ultimo = r.ultimo_created_at;
        primeira = false;
      } catch { /* silencioso */ }
    };
    checar();
    const t = setInterval(checar, 25000);
    return () => clearInterval(t);
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
    <ThemeProvider>
    <SettingsProvider>
      <AppProvider>
        <GlobalListenerWrapper>
          <div className="min-h-screen flex font-sans text-zinc-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </GlobalListenerWrapper>
      </AppProvider>
    </SettingsProvider>
    </ThemeProvider>
  );
}