"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  ShieldCheck, 
  BarChart3, 
  Settings, 
  Radio,
  HelpCircle,
  Network,
  LogOut,
  CreditCard
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { nomeProvedor } = useSettings();
  const { operador, logout } = useAuth();
  
  // Estado de expansão da barra lateral (Hover)
  const [open, setOpen] = useState(false);

  // Pega o nome real atualizado e o cargo direto do AuthContext
  const nomeUsuario = operador?.nome || 'Usuário';
  const userRole = (operador?.role || 'atendente').toLowerCase();

  const menuPrincipal = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard, roles: ['gerente', 'superadmin'] },
    { name: 'Leads', href: '/dashboard/leads', icon: Users, roles: ['gerente', 'atendente', 'superadmin'] },
    { name: 'Viabilidade', href: '/dashboard/viabilidade', icon: MapPin, roles: ['gerente', 'atendente', 'superadmin'] },
    { name: 'Caixas CTO', href: '/dashboard/caixa-cto', icon: Network, roles: ['gerente', 'superadmin'] },
    { name: 'Equipe', href: '/dashboard/equipe', icon: ShieldCheck, roles: ['gerente', 'superadmin'] },
    { name: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3, roles: ['gerente', 'superadmin'] },
    // 🚀 Atalho exclusivo da Central Master para o dono do SaaS
    { name: 'Root Master', href: '/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'] },
  ];

  const menuInferior = [
    { name: 'Configurações', href: '/dashboard/config', icon: Settings, roles: ['gerente', 'atendente', 'superadmin'] },
    { name: 'Faturas & Pagamentos', href: '/dashboard/faturas', icon: CreditCard, roles: ['gerente', 'superadmin'] },
    { name: 'Help...', href: '/dashboard/help', icon: HelpCircle, roles: ['gerente', 'atendente', 'superadmin'] },
  ];

  const menusVisiveis = menuPrincipal.filter(item => item.roles.includes(userRole));
  const inferiorVisiveis = menuInferior.filter(item => item.roles.includes(userRole));

  // Extrai a inicial real do nome do usuário para o avatar
  const inicialUsuario = (nomeUsuario && nomeUsuario !== 'Usuário') ? nomeUsuario[0].toUpperCase() : 'U';

  // Se a rota for a do técnico, a Sidebar DESAPARECE
  if (pathname === '/dashboard/tecnico') {
    return null;
  }

  return (
    <motion.aside 
      className="bg-zinc-950 border-r border-zinc-900 flex flex-col p-3 select-none shrink-0 font-sans text-zinc-50 h-screen sticky top-0 justify-between z-50 overflow-hidden"
      animate={{
        width: open ? "260px" : "80px",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div>
        {/* LOGO E NOME DO PROVEDOR */}
        <div className="flex items-center gap-3 px-2 py-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
            <Radio className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <motion.div 
            className="flex flex-col whitespace-nowrap overflow-hidden"
            animate={{ opacity: open ? 1 : 0, display: open ? "flex" : "none" }}
            transition={{ duration: 0.2 }}
          >
            <span className="font-black tracking-wider text-sm font-mono text-white truncate max-w-[150px]">
              {nomeProvedor || 'V5 Fibra'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Enterprise SaaS</span>
          </motion.div>
        </div>

        {/* CARD DE PERFIL DO USUÁRIO */}
        <motion.div 
          className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 mb-6 space-y-2 shadow-inner overflow-hidden"
          animate={{ opacity: open ? 1 : 0.8 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/40 shadow-md bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-mono font-bold shrink-0">
              {inicialUsuario}
            </div>
            <motion.div 
              className="flex flex-col whitespace-nowrap overflow-hidden"
              animate={{ opacity: open ? 1 : 0, display: open ? "flex" : "none" }}
            >
              <h2 className="font-bold text-xs tracking-tight text-white truncate max-w-[130px]">
                {nomeUsuario}
              </h2>
              <span className="text-[9px] px-1.5 py-0.5 mt-0.5 bg-emerald-500/20 text-emerald-400 rounded uppercase tracking-wider font-bold w-fit">
                {userRole}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* LINKS DE NAVEGAÇÃO PRINCIPAL */}
        <nav className="space-y-1.5">
          {menusVisiveis.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                title={item.name}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <motion.span 
                  className="whitespace-nowrap overflow-hidden"
                  animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
                  transition={{ duration: 0.15 }}
                >
                  {item.name}
                </motion.span>
              </Link>
            );
          })}

          <div className="pt-3 pb-2"><div className="border-t border-zinc-900/80 mx-2" /></div>

          {inferiorVisiveis.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                title={item.name}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <motion.span 
                  className="whitespace-nowrap overflow-hidden"
                  animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
                  transition={{ duration: 0.15 }}
                >
                  {item.name}
                </motion.span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* RODAPÉ (SAIR E STATUS) */}
      <div className="pt-4 border-t border-zinc-900 space-y-3">
        <button
          onClick={logout}
          title="Sair da Conta"
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-xs font-bold uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.1)]"
        >
          <LogOut className="w-4 h-4 shrink-0" /> 
          <motion.span 
            className="whitespace-nowrap overflow-hidden"
            animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
            transition={{ duration: 0.15 }}
          >
            Sair
          </motion.span>
        </button>

        <div className="flex items-center justify-between px-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-white font-mono shrink-0">V</div>
            <motion.span 
              className="text-xs font-mono text-zinc-500 whitespace-nowrap"
              animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
            >
              V5 Enterprise
            </motion.span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
        </div>
      </div>

    </motion.aside>
  );
}