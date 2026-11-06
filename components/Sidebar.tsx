//app/components/Sidebar.tsx

"use client"
import React, { useState, useEffect } from 'react';
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
  CreditCard,
  LifeBuoy,
  UserCheck,
  ChevronDown,
  Repeat2,
  Upload,
  Download,
  StickyNote,
  History,
  Wifi,
  // Contratos e Planos
  FileText,
  FilePlus,
  FileSignature,
  FileCheck,
  Layers,
  CalendarClock,
  ArrowUpDown,
  Bell,
  Pause,
  Tag,
  Globe,
  PackagePlus,
  Archive,
  FileUp,
  // Financeiro
  DollarSign,
  Receipt,
  QrCode,
  Landmark,
  Banknote,
  Calculator,
  Send,
  Timer,
  AlertTriangle,
  Scale,
  FileSpreadsheet,
  TrendingUp,
  Wallet,
  PiggyBank,
  // MikroTik / Rede
  Server,
  Terminal,
  Shield,
  Gauge,
  Lock,
  Unlock,
  Monitor,
  Activity,
  ScrollText,
  HardDrive,
  Code,
  Flame,
  Cpu,
  // Automacao
  BellRing,
  Clock,
  BellOff,
  XCircle,
  Bot,
  MessageSquare,
  Mail,
  Cog,
  Webhook,
  // Suporte
  Headphones,
  Ticket,
  Flag,
  FolderOpen,
  UserCog,
  MessageCircle,
  Hash,
  Star,
  BookOpen,
  ClipboardList,
  // Ordens de Servico
  Wrench,
  CalendarDays,
  UserPlus,
  CheckCircle,
  Camera,
  Map,
  ListChecks,
  Link2,
  DatabaseZap,
  BadgeCheck,
  BarChart2,
  // Permissoes
  KeyRound,
  Eye,
  ScrollText as LogIcon,
  Building2,
  MapPinned,
  Fingerprint,
  Smartphone,
  // BI e Relatorios
  PieChart,
  LineChart,
  Percent,
  Flame as ChurnIcon,
  LayoutGrid,
  Thermometer,
  GitCompare,
  FileDown,
  MailPlus,
  Puzzle,
  // Comercial
  Briefcase,
  // Equipe
  UsersRound,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

// =============================================
// TIPO PARA ITEM COM SUBMENU
// =============================================
type SubMenuItem = {
  name: string;
  href: string;
  icon: any;
  cor: string;
};

type MenuItem = {
  name: string;
  href: string;
  icon: any;
  roles: string[];
  subMenu?: SubMenuItem[];
};

export function Sidebar() {
  const pathname = usePathname();
  const { nomeProvedor } = useSettings();
  const { operador, logout } = useAuth();

  const [open, setOpen] = useState(false);

  const nomeUsuario = operador?.nome || 'Usuário';
  const userRole = (operador?.role || 'atendente').toLowerCase();

  // =============================================
  // MENU PRINCIPAL COM TODOS OS MODULOS DO MAPA
  // =============================================
  const menuPrincipal: MenuItem[] = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard, roles: ['gerente', 'superadmin'] },

    // 0. COMERCIAL (Leads + Viabilidade + Converter Lead)
    // O href '/dashboard/comercial' é só a "chave" do grupo no menu.
    // As páginas continuam nos endereços de sempre.
    {
      name: 'Comercial', href: '/dashboard/comercial', icon: Briefcase, roles: ['gerente', 'atendente', 'superadmin'],
      subMenu: [
        { name: 'Leads', href: '/dashboard/leads', icon: Users, cor: 'text-emerald-400' },
        { name: 'Viabilidade', href: '/dashboard/viabilidade', icon: MapPin, cor: 'text-cyan-400' },
        { name: 'Converter Lead', href: '/dashboard/clientes/converter-lead', icon: Repeat2, cor: 'text-blue-400' },
      ],
    },

    // 1. CADASTRO DE CLIENTES
    {
      name: 'Clientes', href: '/dashboard/clientes', icon: UserCheck, roles: ['gerente', 'atendente', 'superadmin'],
      subMenu: [
        { name: 'Todos Clientes', href: '/dashboard/clientes', icon: UserCheck, cor: 'text-emerald-400' },
        { name: 'Importar Base', href: '/dashboard/clientes/importar', icon: Upload, cor: 'text-cyan-400' },
        { name: 'Exportar', href: '/dashboard/clientes/exportar', icon: Download, cor: 'text-purple-400' },
        { name: 'Observacoes', href: '/dashboard/clientes/observacoes', icon: StickyNote, cor: 'text-yellow-400' },
        { name: 'Historico', href: '/dashboard/clientes/historico', icon: History, cor: 'text-orange-400' },
        { name: 'Acesso / PPPoE', href: '/dashboard/clientes/acesso-rede', icon: Wifi, cor: 'text-emerald-400' },
      ],
    },

    // 2. CONTRATOS (GESTÃO DE DOCUMENTOS)
    {
      name: 'Contratos', href: '/dashboard/contratos', icon: FileText, roles: ['gerente', 'atendente', 'superadmin'],
      subMenu: [
        { name: 'Todos Contratos', href: '/dashboard/contratos', icon: FileText, cor: 'text-emerald-400' },
        { name: 'Novo Contrato', href: '/dashboard/contratos/novo', icon: FilePlus, cor: 'text-blue-400' },
        { name: 'Importar', href: '/dashboard/contratos/importar', icon: FileUp, cor: 'text-cyan-400' },
        { name: 'Modelos', href: '/dashboard/contratos/modelos', icon: Layers, cor: 'text-purple-400' },
      ],
    },

    // 3. FINANCEIRO / COBRANCA (LIMPO - sem duplicatas)
    {
      name: 'Financeiro', href: '/dashboard/financeiro', icon: DollarSign, roles: ['gerente', 'superadmin'],
      subMenu: [
        { name: 'Painel Financeiro', href: '/dashboard/financeiro', icon: DollarSign, cor: 'text-emerald-400' },
        { name: 'Faturas', href: '/dashboard/financeiro/faturas', icon: Receipt, cor: 'text-emerald-400' },
        { name: 'Gateway', href: '/dashboard/financeiro/gateway', icon: Landmark, cor: 'text-purple-400' },
        { name: 'Regua Cobranca', href: '/dashboard/financeiro/regua', icon: Timer, cor: 'text-pink-400' },
        { name: 'Fluxo de Caixa', href: '/dashboard/financeiro/fluxo', icon: Wallet, cor: 'text-green-400' },
        { name: 'Contas a Pagar', href: '/dashboard/financeiro/contas', icon: PiggyBank, cor: 'text-amber-400' },
      ],
    },

    // 4. INTEGRACAO MIKROTIK / REDE
    {
      name: 'MikroTik', href: '/dashboard/mikrotik', icon: Server, roles: ['gerente', 'superadmin'],
      subMenu: [
        { name: 'Painel MikroTik', href: '/dashboard/mikrotik', icon: Server, cor: 'text-emerald-400' },
        { name: 'Servidores', href: '/dashboard/mikrotik/servidores', icon: Server, cor: 'text-blue-400' },
        { name: 'Planos PPPoE', href: '/dashboard/mikrotik/planos', icon: Gauge, cor: 'text-cyan-400' },
        { name: 'Pools de IP', href: '/dashboard/mikrotik/pools', icon: Globe, cor: 'text-teal-400' },
        { name: 'Bloqueio Auto', href: '/dashboard/mikrotik/bloqueio', icon: Lock, cor: 'text-red-400' },
        { name: 'Desbloqueio Auto', href: '/dashboard/mikrotik/desbloqueio', icon: Unlock, cor: 'text-green-400' },
        { name: 'Monitor Online', href: '/dashboard/mikrotik/monitor', icon: Monitor, cor: 'text-emerald-500' },
        { name: 'Backup MikroTik', href: '/dashboard/mikrotik/backup', icon: HardDrive, cor: 'text-zinc-400' },
      ],
    },

    // 5. AUTOMACAO E NOTIFICACOES — ESCONDIDO NO LANÇAMENTO (voltar no futuro)
    // Para reativar: apague o "/*" da linha abaixo e o "*/" do final do bloco.
    /*
    {
      name: 'Automacao', href: '/dashboard/automacao', icon: Cog, roles: ['gerente', 'superadmin'],
      subMenu: [
        { name: 'Boas-vindas', href: '/dashboard/automacao/boas-vindas', icon: Send, cor: 'text-emerald-400' },
        { name: 'Aviso Vencimento', href: '/dashboard/automacao/vencimento', icon: BellRing, cor: 'text-yellow-400' },
        { name: 'Aviso Bloqueio', href: '/dashboard/automacao/bloqueio', icon: AlertTriangle, cor: 'text-red-400' },
        { name: 'Cancelamento Auto', href: '/dashboard/automacao/cancelamento', icon: XCircle, cor: 'text-red-500' },
        { name: 'Bot Atendimento', href: '/dashboard/automacao/bot', icon: Bot, cor: 'text-purple-400' },
        { name: 'WhatsApp API', href: '/dashboard/automacao/whatsapp', icon: MessageSquare, cor: 'text-green-400' },
        { name: 'SMS', href: '/dashboard/automacao/sms', icon: Smartphone, cor: 'text-blue-400' },
        { name: 'E-mail Templates', href: '/dashboard/automacao/email', icon: Mail, cor: 'text-cyan-400' },
        { name: 'Cron Jobs', href: '/dashboard/automacao/cron', icon: Clock, cor: 'text-orange-400' },
        { name: 'Webhooks', href: '/dashboard/automacao/webhooks', icon: Webhook, cor: 'text-pink-400' },
      ],
    },
    */

    // 6. SUPORTE / ATENDIMENTO
    {
      name: 'Suporte', href: '/dashboard/suporte', icon: Headphones, roles: ['gerente', 'atendente', 'superadmin'],
      subMenu: [
        { name: 'Tickets', href: '/dashboard/suporte/tickets', icon: Ticket, cor: 'text-emerald-400' },
        { name: 'Prioridades/SLA', href: '/dashboard/suporte/sla', icon: Flag, cor: 'text-amber-400' },
        { name: 'Categorias', href: '/dashboard/suporte/categorias', icon: Tag, cor: 'text-blue-400' },
      ],
    },

    // 7. ORDENS DE SERVICO
    {
      name: 'Ordens Servico', href: '/dashboard/ordens', icon: Wrench, roles: ['gerente', 'atendente', 'superadmin'],
      subMenu: [
        { name: 'Criar OS', href: '/dashboard/ordens/criar', icon: FilePlus, cor: 'text-emerald-400' },
        { name: 'Status OS', href: '/dashboard/ordens/status', icon: CheckCircle, cor: 'text-yellow-400' },
        { name: 'Tecnicos', href: '/dashboard/ordens/tecnicos', icon: BadgeCheck, cor: 'text-blue-500' },
      ],
    },

    { name: 'Caixas CTO', href: '/dashboard/caixa-cto', icon: Network, roles: ['gerente', 'superadmin'] },

    // 8. EQUIPE (vendedores, atendentes e técnicos, código de convite, metas)
    { name: 'Equipe', href: '/dashboard/equipe', icon: UsersRound, roles: ['gerente', 'superadmin'] },

    // 9. PERMISSOES E MULTI-USUARIO — ESCONDIDO NO LANÇAMENTO (voltar no futuro)
    // Para reativar: apague o "/*" da linha abaixo e o "*/" do final do bloco.
    /*
    {
      name: 'Permissoes', href: '/dashboard/permissoes', icon: KeyRound, roles: ['gerente', 'superadmin'],
      subMenu: [
        { name: 'Perfis de Acesso', href: '/dashboard/permissoes/perfis', icon: ShieldCheck, cor: 'text-emerald-400' },
        { name: 'Por Modulo', href: '/dashboard/permissoes/modulos', icon: Eye, cor: 'text-blue-400' },
        { name: 'Log de Acoes', href: '/dashboard/permissoes/log', icon: ScrollText, cor: 'text-orange-400' },
        { name: 'Multi-empresa', href: '/dashboard/permissoes/multi-empresa', icon: Building2, cor: 'text-purple-400' },
        { name: 'Escritorios', href: '/dashboard/permissoes/escritorios', icon: MapPinned, cor: 'text-cyan-400' },
        { name: 'Login 2FA', href: '/dashboard/permissoes/2fa', icon: Fingerprint, cor: 'text-red-400' },
        { name: 'Sessoes Ativas', href: '/dashboard/permissoes/sessoes', icon: Monitor, cor: 'text-yellow-400' },
      ],
    },
    */

    // 10. BI E RELATORIOS
    {
      name: 'Relatorios', href: '/dashboard/relatorios', icon: BarChart3, roles: ['gerente', 'superadmin'],
      subMenu: [
        { name: 'Dashboard Geral', href: '/dashboard/relatorios/dashboard', icon: LayoutGrid, cor: 'text-emerald-400' },
        { name: 'Por Status', href: '/dashboard/relatorios/status', icon: PieChart, cor: 'text-blue-400' },
        { name: 'Inadimplencia', href: '/dashboard/relatorios/inadimplencia', icon: AlertTriangle, cor: 'text-red-400' },
        { name: 'Churn', href: '/dashboard/relatorios/churn', icon: TrendingUp, cor: 'text-orange-400' },
        { name: 'Receita', href: '/dashboard/relatorios/receita', icon: DollarSign, cor: 'text-green-400' },
        { name: 'Mapa de Calor', href: '/dashboard/relatorios/mapa-calor', icon: Thermometer, cor: 'text-yellow-400' },
        { name: 'Comparativo', href: '/dashboard/relatorios/comparativo', icon: GitCompare, cor: 'text-cyan-400' },
        { name: 'SICI / Anatel', href: '/dashboard/relatorios/sici', icon: FileSpreadsheet, cor: 'text-purple-400' },
        { name: 'Agendar Envio', href: '/dashboard/relatorios/agendar', icon: MailPlus, cor: 'text-pink-400' },
        { name: 'BI Custom', href: '/dashboard/relatorios/bi', icon: Puzzle, cor: 'text-teal-400' },
      ],
    },

    // FATURAS & PAGAMENTOS (area do cliente - historico de pagamentos)
    { name: 'Faturas & Pagamentos', href: '/dashboard/faturas', icon: CreditCard, roles: ['gerente', 'atendente', 'superadmin'] },

    { name: 'Tickets Admin', href: '/dashboard/superadmin/tickets', icon: LifeBuoy, roles: ['superadmin'] },
    { name: 'Root Master', href: '/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'] },
  ];

  const menuInferior: MenuItem[] = [
    { name: 'Configurações', href: '/dashboard/config', icon: Settings, roles: ['gerente', 'atendente', 'superadmin'] },
    { name: 'Help...', href: '/dashboard/help', icon: HelpCircle, roles: ['gerente', 'atendente', 'superadmin'] },
  ];

  const menusVisiveis = menuPrincipal.filter(item => item.roles.includes(userRole));
  const inferiorVisiveis = menuInferior.filter(item => item.roles.includes(userRole));

  // =============================================
  // GRUPO ATIVO
  // Descobre qual grupo "dono" da página atual, pelo link de submenu
  // mais específico. Ex.: /dashboard/clientes/converter-lead pertence a
  // COMERCIAL (e não a CLIENTES), mesmo começando com /dashboard/clientes.
  // =============================================
  const bate = (href: string) => !!pathname && (pathname === href || pathname.startsWith(href + '/'));

  let grupoAtivo: string | null = null;
  let subAtivo: string | null = null;
  for (const item of menuPrincipal) {
    for (const sub of item.subMenu || []) {
      if (bate(sub.href) && (!subAtivo || sub.href.length > subAtivo.length)) {
        subAtivo = sub.href;
        grupoAtivo = item.href;
      }
    }
  }
  if (!grupoAtivo) {
    const grupo = menuPrincipal.find(item => item.subMenu && bate(item.href));
    if (grupo) grupoAtivo = grupo.href;
  }

  // Estado de submenus abertos (por href do grupo)
  const [subMenusAbertos, setSubMenusAbertos] = useState<Record<string, boolean>>(() =>
    grupoAtivo ? { [grupoAtivo]: true } : {}
  );

  // Ao navegar para outra seção, abre o submenu dela
  useEffect(() => {
    if (grupoAtivo) setSubMenusAbertos(prev => ({ ...prev, [grupoAtivo as string]: true }));
  }, [grupoAtivo]);

  const toggleSubMenu = (href: string) => {
    setSubMenusAbertos(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const inicialUsuario = (nomeUsuario && nomeUsuario !== 'Usuário') ? nomeUsuario[0].toUpperCase() : 'U';

  if (pathname === '/dashboard/tecnico') {
    return null;
  }

  // =============================================
  // COMPONENTE DE ITEM DO MENU (COM OU SEM SUBMENU)
  // =============================================
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const hasSubMenu = item.subMenu && item.subMenu.length > 0;
    const isSection = item.href === grupoAtivo;
    const isExactActive = pathname === item.href;
    const isAberto = subMenusAbertos[item.href] || false;

    if (hasSubMenu) {
      return (
        <div key={item.href}>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => toggleSubMenu(item.href)}
              title={item.name}
              className={`w-full flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${isSection ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isSection ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <motion.span
                className="whitespace-nowrap overflow-hidden flex-1 text-left"
                animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
                transition={{ duration: 0.15 }}
              >
                {item.name}
              </motion.span>
              <motion.span
                className="p-0.5"
                animate={{ opacity: open ? 1 : 0, display: open ? "inline-flex" : "none", rotate: isAberto ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.span>
            </button>
          </div>

          <motion.div
            className="overflow-hidden ml-4 border-l border-zinc-800/60 pl-2 space-y-0.5"
            animate={{
              height: isAberto && open ? 'auto' : 0,
              opacity: isAberto && open ? 1 : 0,
              marginTop: isAberto && open ? 4 : 0,
              marginBottom: isAberto && open ? 4 : 0,
            }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {item.subMenu!.map((sub) => {
              const SubIcon = sub.icon;
              const subActive = sub.href === subAtivo;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  title={sub.name}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition-all ${subActive ? 'bg-zinc-800/80 text-white border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40 border border-transparent'}`}
                >
                  <SubIcon className={`w-3.5 h-3.5 shrink-0 ${subActive ? sub.cor : 'text-zinc-600'}`} />
                  <span className="whitespace-nowrap overflow-hidden truncate">{sub.name}</span>
                </Link>
              );
            })}
          </motion.div>
        </div>
      );
    }

    // Item normal sem submenu
    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.name}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all ${isExactActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${isExactActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
        <motion.span
          className="whitespace-nowrap overflow-hidden"
          animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
          transition={{ duration: 0.15 }}
        >
          {item.name}
        </motion.span>
      </Link>
    );
  };

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
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
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
          className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 mb-5 space-y-2 shadow-inner overflow-hidden"
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
        <nav className="space-y-1">
          {menusVisiveis.map((item) => renderMenuItem(item))}

          <div className="pt-3 pb-2"><div className="border-t border-zinc-900/80 mx-2" /></div>

          {inferiorVisiveis.map((item) => renderMenuItem(item))}
        </nav>
      </div>

      {/* RODAPÉ (SAIR E STATUS) */}
      <div className="pt-4 border-t border-zinc-900 space-y-3 shrink-0">
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