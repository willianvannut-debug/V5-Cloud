// ================================================================================
// IMPORTAR CLIENTES EM MASSA - V5 FIBRA
// app/dashboard/clientes/importar/page.tsx
// ================================================================================

"use client"
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Link from 'next/link';
import {
  Upload,
  ArrowLeft,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  X,
  Table,
  AlertTriangle,
  Users,
} from 'lucide-react';

export default function ImportarClientesPage() {
  const { operador, empresa } = useAuth();
  const { nomeProvedor } = useSettings();

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: number; erros: number; detalhes: string[] } | null>(null);
  const [erro, setErro] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Mapeamento de colunas
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});

  const colunasCliente = [
    { value: '', label: 'Ignorar coluna' },
    { value: 'nome', label: 'Nome' },
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'rg', label: 'RG' },
    { value: 'email', label: 'Email' },
    { value: 'telefone', label: 'Telefone' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'cep', label: 'CEP' },
    { value: 'logradouro', label: 'Logradouro' },
    { value: 'numero', label: 'Numero' },
    { value: 'complemento', label: 'Complemento' },
    { value: 'bairro', label: 'Bairro' },
    { value: 'cidade', label: 'Cidade' },
    { value: 'uf', label: 'UF' },
    { value: 'dia_vencimento', label: 'Dia Vencimento' },
    { value: 'forma_pagamento', label: 'Forma Pagamento' },
    { value: 'observacoes', label: 'Observacoes' },
  ];

  // Ler arquivo CSV
  const lerArquivo = async (file: File) => {
    setErro('');
    setResultado(null);

    if (!file.name.endsWith('.csv')) {
      setErro('Apenas arquivos CSV sao aceitos. Salve sua planilha como CSV (separado por ponto e virgula ou virgula).');
      return;
    }

    try {
      const texto = await file.text();
      const linhas = texto.split('\n').filter(l => l.trim());

      if (linhas.length < 2) {
        setErro('Arquivo vazio ou sem dados. Precisa ter pelo menos o cabecalho e uma linha.');
        return;
      }

      // Detectar separador (virgula ou ponto-e-virgula)
      const separador = linhas[0].includes(';') ? ';' : ',';

      const cabecalho = linhas[0].split(separador).map(c => c.trim().replace(/"/g, ''));
      setColunas(cabecalho);

      // Pré-mapear colunas automaticamente
      const mapaAuto: Record<string, string> = {};
      cabecalho.forEach((col, i) => {
        const colLower = col.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (colLower.includes('nome')) mapaAuto[String(i)] = 'nome';
        else if (colLower.includes('cpf')) mapaAuto[String(i)] = 'cpf';
        else if (colLower.includes('cnpj')) mapaAuto[String(i)] = 'cnpj';
        else if (colLower.includes('email')) mapaAuto[String(i)] = 'email';
        else if (colLower.includes('telefone') || colLower.includes('fone') || colLower.includes('celular')) mapaAuto[String(i)] = 'telefone';
        else if (colLower.includes('whatsapp') || colLower.includes('whats')) mapaAuto[String(i)] = 'whatsapp';
        else if (colLower.includes('cep')) mapaAuto[String(i)] = 'cep';
        else if (colLower.includes('logradouro') || colLower.includes('endereco') || colLower.includes('rua')) mapaAuto[String(i)] = 'logradouro';
        else if (colLower.includes('numero') || colLower === 'num' || colLower === 'nro') mapaAuto[String(i)] = 'numero';
        else if (colLower.includes('bairro')) mapaAuto[String(i)] = 'bairro';
        else if (colLower.includes('cidade') || colLower.includes('municipio')) mapaAuto[String(i)] = 'cidade';
        else if (colLower === 'uf' || colLower === 'estado') mapaAuto[String(i)] = 'uf';
        else if (colLower.includes('observ')) mapaAuto[String(i)] = 'observacoes';
      });
      setMapeamento(mapaAuto);

      // Preview (primeiras 5 linhas)
      const dados = linhas.slice(1, 6).map(linha =>
        linha.split(separador).map(c => c.trim().replace(/"/g, ''))
      );
      setPreview(dados);
      setArquivo(file);

    } catch (e) {
      setErro('Erro ao ler o arquivo. Verifique o formato.');
    }
  };

  // Importar clientes
  const importarClientes = async () => {
    if (!arquivo || !empresa?.id) return;
    setImportando(true);
    setErro('');
    setResultado(null);

    try {
      const texto = await arquivo.text();
      const linhas = texto.split('\n').filter(l => l.trim());
      const separador = linhas[0].includes(';') ? ';' : ',';

      let sucesso = 0;
      let erros = 0;
      const detalhes: string[] = [];

      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(separador).map(c => c.trim().replace(/"/g, ''));
        const cliente: Record<string, string> = {};

        // Aplicar mapeamento
        Object.entries(mapeamento).forEach(([indice, campo]) => {
          if (campo && valores[Number(indice)]) {
            cliente[campo] = valores[Number(indice)];
          }
        });

        if (!cliente.nome) {
          detalhes.push(`Linha ${i + 1}: Nome vazio, ignorada`);
          erros++;
          continue;
        }

        try {
          const res = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tipo_pessoa: cliente.cnpj ? 'PJ' : 'PF',
              empresa_id: empresa.id,
              dia_vencimento: cliente.dia_vencimento || '10',
              forma_pagamento: cliente.forma_pagamento || 'boleto',
              ...cliente,
            }),
          });

          if (res.ok) {
            sucesso++;
          } else {
            const data = await res.json();
            detalhes.push(`Linha ${i + 1} (${cliente.nome}): ${data.error || 'Erro'}`);
            erros++;
          }
        } catch (e) {
          detalhes.push(`Linha ${i + 1} (${cliente.nome}): Erro de conexao`);
          erros++;
        }
      }

      setResultado({ sucesso, erros, detalhes });
    } catch (e) {
      setErro('Erro durante a importacao');
    } finally {
      setImportando(false);
    }
  };

  // Baixar modelo CSV
  const baixarModelo = () => {
    const cabecalho = 'nome;cpf;email;telefone;whatsapp;cep;logradouro;numero;bairro;cidade;uf;observacoes';
    const exemplo = 'Joao da Silva;123.456.789-00;joao@email.com;(11) 99999-0000;(11) 99999-0000;01000-000;Rua Exemplo;123;Centro;Sao Paulo;SP;Cliente antigo';
    const blob = new Blob([`${cabecalho}\n${exemplo}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_clientes_v5.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const estiloSelect = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all appearance-none";

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/clientes" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
              <Upload className="w-6 h-6 text-cyan-400" />
              Importar Base
            </h1>
          </div>
          <p className="text-zinc-400 text-sm mt-0.5 ml-12">
            Migre clientes de outro sistema via arquivo CSV
          </p>
        </div>
        <button
          onClick={baixarModelo}
          className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border border-zinc-700"
        >
          <Download className="w-4 h-4" />
          BAIXAR MODELO CSV
        </button>
      </div>

      {/* INSTRUCOES */}
      <Card className="border border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-bold text-emerald-400 uppercase">Como importar</p>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                1. Baixe o modelo CSV clicando no botao acima • 2. Preencha com os dados dos seus clientes •
                3. Salve como CSV (separado por ponto-e-virgula) • 4. Envie o arquivo abaixo •
                5. Confira o mapeamento das colunas • 6. Clique em importar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UPLOAD */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Enviar Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files?.[0]) lerArquivo(e.target.files[0]);
            }}
            className="hidden"
          />

          {!arquivo ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
            >
              <Upload className="w-12 h-12 text-zinc-700 mb-3" />
              <p className="text-xs font-mono text-zinc-400">Clique aqui para selecionar o arquivo CSV</p>
              <p className="text-[10px] font-mono text-zinc-600 mt-1">Apenas arquivos .csv sao aceitos</p>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-zinc-900/60 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-cyan-400" />
                <div>
                  <p className="text-xs font-mono text-white font-bold">{arquivo.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">{(arquivo.size / 1024).toFixed(1)} KB • {preview.length} linhas de preview</p>
                </div>
              </div>
              <button
                onClick={() => { setArquivo(null); setPreview([]); setColunas([]); setMapeamento({}); setResultado(null); }}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ERRO */}
      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
        </div>
      )}

      {/* MAPEAMENTO E PREVIEW */}
      {colunas.length > 0 && (
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <Table className="w-4 h-4 text-cyan-400" />
              Mapeamento de Colunas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-[10px] font-mono text-zinc-500 mb-4">
              Associe cada coluna do seu arquivo com o campo correspondente no sistema. Colunas nao mapeadas serao ignoradas.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {colunas.map((col, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] font-mono uppercase text-zinc-500 truncate" title={col}>
                    {col}
                  </p>
                  <select
                    value={mapeamento[String(i)] || ''}
                    onChange={(e) => setMapeamento(prev => ({ ...prev, [String(i)]: e.target.value }))}
                    className={estiloSelect}
                  >
                    {colunasCliente.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview da tabela */}
            {preview.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] font-mono uppercase text-zinc-500 mb-2">Preview (primeiras 5 linhas)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {colunas.map((col, i) => (
                          <th key={i} className="text-left px-3 py-2 text-[10px] font-mono uppercase text-zinc-600 whitespace-nowrap">
                            {mapeamento[String(i)] || col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((linha, i) => (
                        <tr key={i} className="border-b border-zinc-900/30">
                          {linha.map((val: string, j: number) => (
                            <td key={j} className="px-3 py-2 text-zinc-400 whitespace-nowrap max-w-[150px] truncate">
                              {val || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Botao importar */}
            <div className="flex justify-end mt-6">
              <button
                onClick={importarClientes}
                disabled={importando || !Object.values(mapeamento).includes('nome')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase text-xs font-mono tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                {importando ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> IMPORTANDO...</>
                ) : (
                  <><Upload className="w-4 h-4" /> IMPORTAR CLIENTES</>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RESULTADO */}
      {resultado && (
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Resultado da Importacao
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <p className="text-[10px] font-mono uppercase text-emerald-400">Importados</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">{resultado.sucesso}</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <p className="text-[10px] font-mono uppercase text-red-400">Erros</p>
                <p className="text-2xl font-black text-red-400 mt-1">{resultado.erros}</p>
              </div>
            </div>
            {resultado.detalhes.length > 0 && (
              <div className="bg-black/30 rounded-xl p-3 border border-zinc-800 max-h-[200px] overflow-y-auto">
                {resultado.detalhes.map((d, i) => (
                  <p key={i} className="text-[10px] font-mono text-zinc-500 py-0.5">{d}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}