// ================================================================================
// CONVERTER LEAD EM CLIENTE - V5 FIBRA
// app/dashboard/clientes/converter-lead/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Link from 'next/link';
import {
  ArrowRightLeft,
  ArrowLeft,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  UserPlus,
  Building2,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Mascaras
function mascaraCPF(valor: string): string {
  return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
}
function mascaraCNPJ(valor: string): string {
  return valor.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
}
function mascaraTelefone(valor: string): string {
  return valor.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
}
function mascaraCEP(valor: string): string {
  return valor.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
}

export default function ConverterLeadPage() {
  const { operador, empresa } = useAuth();
  const { nomeProvedor } = useSettings();

  const [leads, setLeads] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [leadSelecionado, setLeadSelecionado] = useState<any>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Dados extras para completar o cadastro do cliente
  const [dadosExtras, setDadosExtras] = useState({
    cpf: '',
    rg: '',
    data_nascimento: '',
    sexo: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    referencia: '',
    dia_vencimento: '10',
    forma_pagamento: 'boleto',
    observacoes: '',
  });

  // Carregar leads aprovados (que podem virar clientes)
  const carregarLeads = useCallback(async () => {
    if (!supabase || !empresa?.id) return;
    setCarregando(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('empresa_id', empresa.id)
        .in('status', ['aprovado', 'qualificado', 'novo'])
        .order('created_at', { ascending: false });

      if (busca) {
        query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`);
      }

      const { data, error } = await query.limit(50);
      if (!error && data) {
        setLeads(data);
      }
    } catch (e) {
      console.error('Erro ao carregar leads:', e);
    } finally {
      setCarregando(false);
    }
  }, [empresa?.id, busca]);

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  // Abrir modal de conversao
  const abrirConversao = (lead: any) => {
    setLeadSelecionado(lead);
    setErro('');
    setSucesso('');
    setDadosExtras({
      cpf: '',
      rg: '',
      data_nascimento: '',
      sexo: '',
      cep: lead.cep || '',
      logradouro: lead.endereco || '',
      numero: lead.numero || '',
      complemento: lead.complemento || '',
      bairro: lead.bairro || '',
      cidade: lead.cidade || '',
      uf: lead.uf || '',
      referencia: '',
      dia_vencimento: '10',
      forma_pagamento: 'boleto',
      observacoes: `Convertido do lead #${lead.id?.substring(0, 8) || ''}`,
    });
    setModalAberto(true);
  };

  // Buscar CEP
  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (!data.erro) {
          setDadosExtras(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
          }));
        }
      }
    } catch (e) {
      console.error('Erro ao buscar CEP:', e);
    }
  };

  const atualizarCampo = (campo: string, valor: string) => {
    let v = valor;
    if (campo === 'cpf') v = mascaraCPF(valor);
    if (campo === 'telefone') v = mascaraTelefone(valor);
    if (campo === 'cep') {
      v = mascaraCEP(valor);
      if (v.replace(/\D/g, '').length === 8) buscarCEP(v);
    }
    setDadosExtras(prev => ({ ...prev, [campo]: v }));
  };

  // Converter lead em cliente
  const converterLead = async () => {
    if (!leadSelecionado || !empresa?.id) return;
    setErro('');
    setSucesso('');

    if (!dadosExtras.cpf.trim()) {
      setErro('Preencha o CPF do cliente');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tipo_pessoa: 'PF',
          nome: leadSelecionado.nome,
          cpf: dadosExtras.cpf,
          rg: dadosExtras.rg,
          data_nascimento: dadosExtras.data_nascimento,
          sexo: dadosExtras.sexo,
          email: leadSelecionado.email || '',
          telefone: leadSelecionado.telefone || '',
          whatsapp: leadSelecionado.whatsapp || leadSelecionado.telefone || '',
          cep: dadosExtras.cep,
          logradouro: dadosExtras.logradouro,
          numero: dadosExtras.numero,
          complemento: dadosExtras.complemento,
          bairro: dadosExtras.bairro,
          cidade: dadosExtras.cidade,
          uf: dadosExtras.uf,
          referencia: dadosExtras.referencia,
          dia_vencimento: dadosExtras.dia_vencimento,
          forma_pagamento: dadosExtras.forma_pagamento,
          observacoes: dadosExtras.observacoes,
          empresa_id: empresa.id,
          lead_origem_id: leadSelecionado.id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Atualizar status do lead para "convertido"
        if (supabase) {
          await supabase
            .from('leads')
            .update({ status: 'convertido' })
            .eq('id', leadSelecionado.id);
        }

        setSucesso(`Cliente "${leadSelecionado.nome}" cadastrado com sucesso!`);
        setTimeout(() => {
          setModalAberto(false);
          carregarLeads();
        }, 2000);
      } else {
        setErro(data.error || 'Erro ao converter lead');
      }
    } catch (e) {
      setErro('Erro de conexao. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const estiloInput = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all";
  const estiloLabel = "text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block";
  const estiloSelect = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all appearance-none";

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard/clientes"
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-blue-400" />
              Converter Lead
            </h1>
          </div>
          <p className="text-zinc-400 text-sm mt-0.5 ml-12">
            Transforme leads aprovados em clientes do {nomeProvedor || 'provedor'}
          </p>
        </div>
      </div>

      {/* BUSCA */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Buscar lead por nome, telefone ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
              />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={carregarLeads}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border border-zinc-700"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              ATUALIZAR
            </button>
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE LEADS PARA CONVERTER */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            Leads Disponiveis para Conversao ({leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
              <span className="ml-3 text-xs text-zinc-500 font-mono">Carregando leads...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <ArrowRightLeft className="w-12 h-12 mb-3" />
              <p className="text-xs font-mono">Nenhum lead disponivel para conversao</p>
              <p className="text-[10px] font-mono mt-1">Leads com status "aprovado", "qualificado" ou "novo" aparecem aqui</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900/50">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between px-4 py-4 hover:bg-zinc-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs font-mono">{lead.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {lead.telefone && (
                          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {lead.telefone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {lead.email}
                          </span>
                        )}
                        {lead.cidade && (
                          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {lead.cidade}/{lead.uf}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirConversao(lead)}
                    className="px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border border-blue-500/30"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    CONVERTER
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE CONVERSAO */}
      {modalAberto && leadSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl mx-4 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-mono text-white">Converter Lead em Cliente</h2>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {leadSelecionado.nome} — Complete os dados abaixo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Mensagens */}
              {erro && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
                </div>
              )}
              {sucesso && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs text-emerald-400 font-mono flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" /> {sucesso}
                </div>
              )}

              {/* Dados do lead (somente leitura) */}
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase text-blue-400 tracking-widest border-b border-zinc-900 pb-2">
                  Dados do Lead (automatico)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-900">
                    <p className="text-[10px] font-mono uppercase text-zinc-500">Nome</p>
                    <p className="text-xs font-mono text-white mt-1">{leadSelecionado.nome}</p>
                  </div>
                  <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-900">
                    <p className="text-[10px] font-mono uppercase text-zinc-500">Telefone</p>
                    <p className="text-xs font-mono text-white mt-1">{leadSelecionado.telefone || '-'}</p>
                  </div>
                  <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-900">
                    <p className="text-[10px] font-mono uppercase text-zinc-500">Email</p>
                    <p className="text-xs font-mono text-white mt-1">{leadSelecionado.email || '-'}</p>
                  </div>
                  <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-900">
                    <p className="text-[10px] font-mono uppercase text-zinc-500">Cidade</p>
                    <p className="text-xs font-mono text-white mt-1">{leadSelecionado.cidade ? `${leadSelecionado.cidade}/${leadSelecionado.uf}` : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Dados obrigatorios do cliente */}
              <div className="space-y-4">
                <p className="text-xs font-mono uppercase text-emerald-400 tracking-widest border-b border-zinc-900 pb-2">
                  Dados do Cliente (preencher)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={estiloLabel}>CPF *</label>
                    <input type="text" placeholder="000.000.000-00" value={dadosExtras.cpf} onChange={(e) => atualizarCampo('cpf', e.target.value)} maxLength={14} className={estiloInput} />
                  </div>
                  <div>
                    <label className={estiloLabel}>RG</label>
                    <input type="text" placeholder="Numero do RG" value={dadosExtras.rg} onChange={(e) => atualizarCampo('rg', e.target.value)} className={estiloInput} />
                  </div>
                  <div>
                    <label className={estiloLabel}>Data de Nascimento</label>
                    <input type="date" value={dadosExtras.data_nascimento} onChange={(e) => atualizarCampo('data_nascimento', e.target.value)} className={estiloInput} />
                  </div>
                  <div>
                    <label className={estiloLabel}>Sexo</label>
                    <select value={dadosExtras.sexo} onChange={(e) => atualizarCampo('sexo', e.target.value)} className={estiloSelect}>
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Endereco */}
              <div className="space-y-4">
                <p className="text-xs font-mono uppercase text-emerald-400 tracking-widest border-b border-zinc-900 pb-2">
                  Endereco de Instalacao
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={estiloLabel}>CEP</label>
                    <input type="text" placeholder="00000-000" value={dadosExtras.cep} onChange={(e) => atualizarCampo('cep', e.target.value)} maxLength={9} className={estiloInput} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={estiloLabel}>Logradouro</label>
                    <input type="text" placeholder="Rua, Avenida..." value={dadosExtras.logradouro} onChange={(e) => atualizarCampo('logradouro', e.target.value)} className={estiloInput} />
                  </div>
                  <div>
                    <label className={estiloLabel}>Numero</label>
                    <input type="text" placeholder="123" value={dadosExtras.numero} onChange={(e) => atualizarCampo('numero', e.target.value)} className={estiloInput} />
                  </div>
                  <div>
                    <label className={estiloLabel}>Bairro</label>
                    <input type="text" placeholder="Bairro" value={dadosExtras.bairro} onChange={(e) => atualizarCampo('bairro', e.target.value)} className={estiloInput} />
                  </div>
                  <div>
                    <label className={estiloLabel}>Cidade</label>
                    <input type="text" placeholder="Cidade" value={dadosExtras.cidade} onChange={(e) => atualizarCampo('cidade', e.target.value)} className={estiloInput} />
                  </div>
                  <div>
                    <label className={estiloLabel}>UF</label>
                    <select value={dadosExtras.uf} onChange={(e) => atualizarCampo('uf', e.target.value)} className={estiloSelect}>
                      <option value="">UF</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Financeiro */}
              <div className="space-y-4">
                <p className="text-xs font-mono uppercase text-emerald-400 tracking-widest border-b border-zinc-900 pb-2">
                  Financeiro
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={estiloLabel}>Dia de Vencimento</label>
                    <select value={dadosExtras.dia_vencimento} onChange={(e) => atualizarCampo('dia_vencimento', e.target.value)} className={estiloSelect}>
                      {[5, 10, 15, 20, 25].map(dia => (<option key={dia} value={String(dia)}>Dia {dia}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={estiloLabel}>Forma de Pagamento</label>
                    <select value={dadosExtras.forma_pagamento} onChange={(e) => atualizarCampo('forma_pagamento', e.target.value)} className={estiloSelect}>
                      <option value="boleto">Boleto</option>
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartao de Credito</option>
                      <option value="debito_automatico">Debito Automatico</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observacoes */}
              <div>
                <label className={estiloLabel}>Observacoes</label>
                <textarea
                  placeholder="Observacoes sobre o cliente..."
                  value={dadosExtras.observacoes}
                  onChange={(e) => atualizarCampo('observacoes', e.target.value)}
                  rows={3}
                  className={`${estiloInput} resize-none`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-900">
              <button
                onClick={() => setModalAberto(false)}
                className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-mono font-bold uppercase transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={converterLead}
                disabled={salvando}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-bold uppercase text-xs font-mono tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                {salvando ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> CONVERTENDO...</>
                ) : (
                  <><ArrowRightLeft className="w-4 h-4" /> CONVERTER EM CLIENTE</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}