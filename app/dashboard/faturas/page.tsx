"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Calendar,
  DollarSign,
  Loader2,
  Rocket
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { PLANOS, obterLimitesDaEmpresa } from '@/lib/planLimites';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface FaturaItemSupabase {
  id: string;
  mes: string;
  data: string;
  plano: string;
  valor: string;
  status: 'PAGO' | 'PENDENTE' | 'ATRASADO';
  metodo: string;
}

export default function FaturasPage() {
  const settings = useSettings();
  const { operador, empresa } = useAuth();
  
  const [planoAtual, setPlanoAtual] = useState<string>('essencial');
  const [faturas, setFaturas] = useState<FaturaItemSupabase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  // 🚀 Sincroniza o plano real direto da empresa logada
  useEffect(() => {
    async function sincronizarDadosReais() {
      const planoDoContexto = empresa?.plano || operador?.empresa?.plano;
      const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;

      if (planoDoContexto) {
        setPlanoAtual(String(planoDoContexto).toLowerCase().trim());
      }

      if (!supabase || !idDaEmpresa) {
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        // Busca faturas reais da tabela 'faturas' no Supabase vinculadas a esta empresa
        const { data, error } = await supabase
          .from('faturas')
          .select('*')
          .eq('empresa_id', idDaEmpresa)
          .order('data', { ascending: false });

        if (!error && data) {
          setFaturas(data);
        } else {
          setFaturas([]); // Sem faturas fakes se o banco estiver vazio
        }
      } catch (err) {
        console.error("Erro ao buscar faturas no Supabase:", err);
        setFaturas([]);
      } finally {
        setCarregando(false);
      }
    }

    sincronizarDadosReais();
  }, [operador, empresa]);

  const configPlano = obterLimitesDaEmpresa(planoAtual);
  const nomeEmpresa = empresa?.nomeEmpresa || operador?.empresa?.nome_empresa || 'Minha Empresa';

  const handleBaixarRecibo = (fatura: FaturaItemSupabase) => {
    setBaixandoId(fatura.id);
    setTimeout(() => {
      const conteudoRecibo = `=== COMPROVANTE DE PAGAMENTO V5 TELECOM ===\nFatura: ${fatura.id}\nEmpresa: ${nomeEmpresa}\nPlano: ${fatura.plano}\nPeríodo: ${fatura.mes}\nData do Pagamento: ${fatura.data}\nValor: ${fat.valor}\nMétodo: ${fatura.metodo}\nStatus: ${fatura.status}\n===========================================`;
      const blob = new Blob([conteudoRecibo], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Recibo_${fatura.id}_V5.txt`;
      a.click();
      setBaixandoId(null);
    }, 800);
  };

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" /> Faturas & Histórico de Pagamentos
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Extrato financeiro da sua assinatura e comprovantes oficiais guardados com segurança.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Assinatura Ativa
          </span>
        </div>
      </div>

      {/* RESUMO DA ASSINATURA ATUAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Plano Atual</span>
            <div className="text-2xl font-black font-mono text-white uppercase">{configPlano.nome}</div>
            <p className="text-xs text-zinc-400 font-mono">Recorrência mensal com franquia de {configPlano.max_leads} leads.</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Status da Conta</span>
            <div className="text-2xl font-black font-mono text-emerald-400">Regularizado</div>
            <p className="text-xs text-zinc-400 font-mono">Nenhuma pendência financeira em aberto.</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Retenção Legal (LGPD / Fisco)</span>
            <div className="text-2xl font-black font-mono text-white">5 Anos</div>
            <p className="text-xs text-zinc-500 font-mono">Histórico armazenado com segurança em nuvem.</p>
          </CardContent>
        </Card>

      </div>

      {/* TABELA DE HISTÓRICO DE FATURAS REAIS */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Histórico de Recibos & Faturas Emitidas
          </CardTitle>
          <span className="text-[11px] font-mono text-zinc-500">Armazenamento conforme exigência legal</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
                  <th className="p-4">Identificador</th>
                  <th className="p-4">Período Referência</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Método de Pagamento</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {carregando ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-emerald-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando faturas do banco de dados...
                    </td>
                  </tr>
                ) : faturas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-500">
                      Nenhuma fatura registrada no momento. Assim que os pagamentos forem processados pelo sistema, eles aparecerão aqui automaticamente.
                    </td>
                  </tr>
                ) : (
                  faturas.map((fat) => (
                    <tr key={fat.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 font-bold text-white">
                        {fat.id}
                      </td>
                      <td className="p-4 text-zinc-300 flex items-center gap-1.5 pt-5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-600" /> {fat.mes}
                      </td>
                      <td className="p-4 uppercase text-emerald-400 font-bold">
                        {fat.plano}
                      </td>
                      <td className="p-4 text-white font-bold">
                        {fat.valor}
                      </td>
                      <td className="p-4 text-zinc-400">
                        {fat.metodo}
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] uppercase font-bold">
                          ✓ {fat.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleBaixarRecibo(fat)}
                          disabled={baixandoId === fat.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                        >
                          {baixandoId === fat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />} Baixar Comprovante
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}