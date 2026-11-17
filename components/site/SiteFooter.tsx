// components/site/SiteFooter.tsx
// Rodapé do site público. Usado nas 3 páginas.
import React from 'react';
import Link from 'next/link';
import { Wifi } from 'lucide-react';
import { WHATSAPP_DEMO } from './links';

export default function SiteFooter() {
  return (
    <footer className="bg-black border-t border-[#1e3b29] relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-bold tracking-wider text-white">V5 CLOUD</span>
          </div>
          <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
            Sistema de gestão para provedores de internet. Feito por quem tem provedor.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-300">Produto</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><Link href="/funcionalidades" className="hover:text-white">Funcionalidades</Link></li>
            <li><Link href="/precos" className="hover:text-white">Preços</Link></li>
            <li><a href={WHATSAPP_DEMO} target="_blank" rel="noreferrer" className="hover:text-white">Agendar demonstração</a></li>
            <li><Link href="/login" className="hover:text-white">Entrar</Link></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-300">Legal</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
            <li><Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#1e3b29]">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-zinc-500 font-mono">
          © {new Date().getFullYear()} V5 Cloud. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}