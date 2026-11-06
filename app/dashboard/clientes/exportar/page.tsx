// ================================================================================
// EXPORTAR CLIENTES - V5 FIBRA
// app/dashboard/clientes/exportar/page.tsx
// ================================================================================

"use client"
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Link from 'next/link';
import {
  Download,
  ArrowLeft,
  FileText,
  CheckCircle,
  RefreshCw,
  Filter,
  Table,
  FileSpreadsheet,
  Users,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function ExportarClientesPage() {
  const { empresa } = useAuth();
  const { nomeProvedor } = useSettings();

  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [formato, setFormato] = useState('csv');
  const [exportando, setExportando] = useState(false);
  const [resultado, setResultado] = useState('');

  const exportarClientes = async () => {
    if (!supabase || !empresa?.id) return;
    setExportando(true);
    setResultado('');

    try {
      let query = supabase
        .from('clientes')
        .select('nome, cpf, cnpj, tipo_pessoa, email, telefone, whatsapp, cep, logradouro, numero, complemento, bairro, cidade, uf, status, dia_vencimento, forma_pagamento, observacoes, created_at')
        .eq('empresa_id', empresa.id)
        .order('nome');

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;

      if (error || !data) {
        setResultado('Erro ao buscar clientes');
        return;
      }

      if (data.length === 0) {
        setResultado('Nenhum cliente encontrado com os filtros selecionados');
        return;
      }

      // Gerar CSV
      const cabecalho = 'Nome;CPF;CNPJ;Tipo;Email;Telefone;WhatsApp;CEP;Logradouro;Numero;Complemento;Bairro;Cidade;UF;Status;Vencimento;Pagamento;Observacoes;Cadastrado Em';
      const linhas = data.map(c =>
        [c.nome, c.cpf, c.cnpj, c.tipo_pessoa, c.email, c.telefone, c.whatsapp, c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf, c.status, c.dia_vencimento, c.forma_pagamento, c.observacoes, c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '']
          .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
          .join(';')
      );

      const conteudo = [cabecalho, ...linhas].join('\n');
      const bom = '﻿'; // BOM para Excel reconhecer acentos
      const blob = new Blob([bom + conteudo], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dataHora = new Date().toISOString().split('T')[0];
      a.download = `clientes_${nomeProvedor || 'v5fibra'}_${dataHora}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setResultado(`${data.length} cliente${data.length > 1 ? 's' : ''} exportado${data.length > 1 ? 's' : ''} com sucesso!`);
    } catch (e) {
      setResultado('Erro durante a exportacao');
    } finally {
      setExportando(false);
    }
  };

  const estiloSelect = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all appearance-none";

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/clientes" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Download className="w-6 h-6 text-purple-400" />
            Exportar Clientes
          </h1>
        </div>
        <p className="text-zinc-400 text-sm mt-0.5 ml-12">
          Exporte a base de clientes para CSV (relatorios, contabilidade)
        </p>
      </div>

      {/* FILTROS */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            Filtros de Exportacao
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Filtrar por Status</label>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={estiloSelect}>
                <option value="todos">Todos os Status</option>
                <option value="ativo">Ativos</option>
                <option value="inadimplente">Inadimplentes</option>
                <option value="bloqueado">Bloqueados</option>
                <option value="suspenso">Suspensos</option>
                <option value="cancelado">Cancelados</option>
                <option value="em_instalacao">Em Instalacao</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Formato</label>
              <select value={formato} onChange={(e) => setFormato(e.target.value)} className={estiloSelect}>
                <option value="csv">CSV (Excel / Google Sheets)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
            <p className="text-[10px] font-mono text-zinc-500">
              O arquivo sera gerado com codificacao UTF-8 e separador ponto-e-virgula, compativel com Excel e Google Sheets.
            </p>
            <button
              onClick={exportarClientes}
              disabled={exportando}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-bold uppercase text-xs font-mono tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.3)]"
            >
              {exportando ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> EXPORTANDO...</>
              ) : (
                <><Download className="w-4 h-4" /> EXPORTAR</>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* RESULTADO */}
      {resultado && (
        <div className={`rounded-xl px-4 py-3 text-xs font-mono flex items-center gap-2 ${
          resultado.includes('sucesso')
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          {resultado}
        </div>
      )}

      {/* SICI/ANATEL */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-orange-400" />
            Exportacao SICI / Anatel
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
            <FileText className="w-8 h-8 text-orange-400 shrink-0" />
            <div>
              <p className="text-xs font-mono font-bold text-orange-400 uppercase">Em breve</p>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                A exportacao no formato SICI (Sistema Integrado de Coleta de Informacoes) exigido pela Anatel sera disponibilizada em uma atualizacao futura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}