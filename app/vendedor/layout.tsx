import React from 'react';
import Link from 'next/link';
import { MapPin, PlusCircle, Users, DollarSign, Wifi } from 'lucide-react';

export default function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col max-w-md mx-auto border-x border-slate-800 relative">
      {/* Header Compacto de Status */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Wifi className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">
              V5 Cloud <span className="text-emerald-400">PAP</span>
            </h1>
            <span className="text-[11px] text-slate-400">Modo Campo Ativo</span>
          </div>
        </div>

        {/* Indicador de Conexão / Sincronização */}
        <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-slate-300">Online</span>
        </div>
      </header>

      {/* Conteúdo Principal (com espaço para o menu inferior) */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {children}
      </main>

      {/* Barra de Navegação Inferior (Thumb Zone) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-slate-900 border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        <Link
          href="/vendedor"
          className="flex flex-col items-center gap-1 p-2 text-slate-300 hover:text-emerald-400 transition-colors"
        >
          <MapPin className="h-5 w-5" />
          <span className="text-[11px] font-medium">Radar</span>
        </Link>

        <Link
          href="/vendedor/leads"
          className="flex flex-col items-center gap-1 p-2 text-slate-300 hover:text-emerald-400 transition-colors"
        >
          <Users className="h-5 w-5" />
          <span className="text-[11px] font-medium">Meus Leads</span>
        </Link>

        {/* Botão Principal Central de Ação Rápida */}
        <Link
          href="/vendedor/abordagem"
          className="flex flex-col items-center justify-center -mt-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-14 w-14 rounded-full shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
        >
          <PlusCircle className="h-7 w-7" />
        </Link>

        <Link
          href="/vendedor/vendas"
          className="flex flex-col items-center gap-1 p-2 text-slate-300 hover:text-emerald-400 transition-colors"
        >
          <DollarSign className="h-5 w-5" />
          <span className="text-[11px] font-medium">Vendas</span>
        </Link>
      </nav>
    </div>
  );
}