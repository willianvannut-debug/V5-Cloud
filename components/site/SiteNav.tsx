// components/site/SiteNav.tsx
// Menu do site público (Início, Funcionalidades, Preços). Usado nas 3 páginas.
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X } from 'lucide-react';
import Image from 'next/image';
import { WHATSAPP_DEMO } from './links';

const LINKS = [
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/precos', label: 'Preços' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-[#021708]/85 backdrop-blur-md border-b border-[#1e3b29] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0" onClick={() => setAberto(false)}>
          <Image src="/v5-logo-transparent.png" alt="V5 Cloud" width={80} height={60} className="rounded-lg" />
          <span className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-jakarta), system-ui" }}>V5 Cloud</span>
        </Link>

        {/* Abas (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => {
            const ativo = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ativo ? 'text-white bg-emerald-500/10 border border-emerald-500/25' : 'text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <a
            href={WHATSAPP_DEMO}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Demonstração
          </a>
        </div>

        {/* Ações (desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Já tenho conta
          </Link>
          <Link
            href="/cadastro"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold tracking-wide rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2"
          >
            Criar Conta <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Botão do menu (celular) */}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900/60"
        >
          {aberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Menu aberto (celular) */}
      {aberto && (
        <div className="md:hidden border-t border-[#1e3b29] bg-[#021708]/95 backdrop-blur-md px-4 py-4 flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className={`px-3 py-3 rounded-lg text-base font-medium ${pathname === l.href ? 'text-white bg-emerald-500/10' : 'text-zinc-300'}`}
            >
              {l.label}
            </Link>
          ))}
          <a href={WHATSAPP_DEMO} target="_blank" rel="noreferrer" className="px-3 py-3 rounded-lg text-base font-medium text-zinc-300">
            Demonstração
          </a>
          <Link href="/login" onClick={() => setAberto(false)} className="px-3 py-3 rounded-lg text-base font-medium text-zinc-300">
            Já tenho conta
          </Link>
          <Link
            href="/cadastro"
            onClick={() => setAberto(false)}
            className="mt-2 px-6 py-3 bg-emerald-500 text-black text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            Criar Conta <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </nav>
  );
}