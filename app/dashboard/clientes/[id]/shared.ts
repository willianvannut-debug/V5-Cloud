// ================================================================================
// SHARED - Utilitarios, estilos e helpers compartilhados
// app/dashboard/clientes/[id]/shared.ts
// ================================================================================

import { createClient } from '@supabase/supabase-js';

// ==========================
// SUPABASE CLIENT
// ==========================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ==========================
// MASCARAS
// ==========================
export function mascaraCPF(v: string) {
  return v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})/,'$1-$2').replace(/(-\d{2})\d+?$/,'$1');
}
export function mascaraCNPJ(v: string) {
  return v.replace(/\D/g,'').replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2').replace(/(-\d{2})\d+?$/,'$1');
}
export function mascaraTelefone(v: string) {
  return v.replace(/\D/g,'').replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2').replace(/(-\d{4})\d+?$/,'$1');
}
export function mascaraCEP(v: string) {
  return v.replace(/\D/g,'').replace(/^(\d{5})(\d)/,'$1-$2').replace(/(-\d{3})\d+?$/,'$1');
}

// ==========================
// ESTILOS
// ==========================
export const estiloInput = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all";
export const estiloLabel = "text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block";
export const estiloSelect = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all appearance-none";
export const estiloValor = "text-xs font-mono text-zinc-200";
export const estiloRotulo = "text-[10px] font-mono uppercase text-zinc-500";

// ==========================
// STATUS HELPERS
// ==========================
export function corStatus(status: string) {
  switch(status) {
    case 'ativo': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'inadimplente': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'bloqueado': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'suspenso': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'cancelado': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    case 'em_instalacao': case 'instalacao': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

export function labelStatus(status: string) {
  switch(status) {
    case 'ativo': return 'ATIVO';
    case 'inadimplente': return 'INADIMPLENTE';
    case 'bloqueado': return 'BLOQUEADO';
    case 'suspenso': return 'SUSPENSO';
    case 'cancelado': return 'CANCELADO';
    case 'em_instalacao': case 'instalacao': return 'EM INSTALACAO';
    default: return status?.toUpperCase() || '';
  }
}