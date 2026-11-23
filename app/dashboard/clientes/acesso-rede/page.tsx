// ================================================================================
// ACESSO A REDE / PPPoE - V5 FIBRA
// app/dashboard/clientes/acesso-rede/page.tsx
// NOVO: Ao salvar dados PPPoE, cria/atualiza Secret no MikroTik automaticamente
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { painelApi } from '@/lib/painel-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Link from 'next/link';
import {
  Wifi,
  ArrowLeft,
  Search,
  User,
  RefreshCw,
  Shield,
  Globe,
  Key,
  Router,
  Signal,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit3,
  Save,
  X,
  Monitor,
  CloudUpload,
  Loader2,
} from 'lucide-react';


export default function AcessoRedePage() {
  const { operador, empresa } = useAuth();
  const { nomeProvedor } = useSettings();

  const [clientes, setClientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [acessoRede, setAcessoRede] = useState<any>(null);
  const [editando, setEditando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [copiado, setCopiado] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Form
  const [form, setForm] = useState({
    login_pppoe: '',
    senha_pppoe: '',
    ip_fixo: '',
    mac_address: '',
    perfil_radius: '',
    vlan: '',
    porta_olt: '',
    cto_id: '',
    onu_serial: '',
  });

  const carregarClientes = useCallback(async () => {
    if (!empresa?.id) return;
    setCarregando(true);
    try {
      const params = new URLSearchParams({ view: 'lista', limite: '50' });
      if (busca) params.set('busca', busca);
      const { clientes: data } = await painelApi<{ clientes: any[] }>(`clientes?${params.toString()}`);
      if (data) setClientes(data);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setCarregando(false);
    }
  }, [empresa?.id, busca]);

  useEffect(() => { carregarClientes(); }, [carregarClientes]);

  const selecionarCliente = async (cliente: any) => {
    setClienteSelecionado(cliente);
    setEditando(false);
    setSenhaVisivel(false);
    setSyncMsg(null);

    // Buscar dados completos de acesso
    const { rede: data } = await painelApi<{ rede: any }>(`clientes/${cliente.id}/rede`).catch(() => ({ rede: null }));

    if (data) {
      setAcessoRede(data);
      setForm({
        login_pppoe: data.login_pppoe || '',
        senha_pppoe: data.senha_pppoe || '',
        ip_fixo: data.ip_fixo || '',
        mac_address: data.mac_address || '',
        perfil_radius: data.perfil_radius || '',
        vlan: data.vlan || '',
        porta_olt: data.porta_olt || '',
        cto_id: data.cto_id || '',
        onu_serial: data.onu_serial || '',
      });
    }
  };

  // ============================================================
  // SYNC SECRET NO MIKROTIK (AUTOMATICO AO SALVAR)
  // ============================================================
  const syncSecretNoMikroTik = async (
    loginPPPoE: string,
    senhaPPPoE: string,
    profile: string,
    ipFixo: string,
    nomeCliente: string,
    loginAnterior?: string
  ): Promise<boolean> => {
    if (!operador?.empresaId) return false

    try {
      const isEdicao = loginAnterior && loginAnterior !== loginPPPoE

      if (isEdicao) {
        // EDITAR secret existente (login mudou)
        const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_name: loginAnterior,
            client_name: loginPPPoE,
            client_password: senhaPPPoE,
            profile: profile || undefined,
            remote_address: ipFixo || undefined,
            comment: `V5 Fibra - ${nomeCliente}`,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          console.error('Erro ao editar secret no MikroTik:', data.error)
          // Se nao encontrou, tenta criar
          if (data.error && data.error.includes('nao encontrado')) {
            return await criarSecret(loginPPPoE, senhaPPPoE, profile, ipFixo, nomeCliente)
          }
          return false
        }
        return true
      } else if (loginAnterior) {
        // Login nao mudou, atualizar senha/profile/ip
        const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_name: loginPPPoE,
            client_password: senhaPPPoE,
            profile: profile || undefined,
            remote_address: ipFixo || undefined,
            comment: `V5 Fibra - ${nomeCliente}`,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          console.error('Erro ao atualizar secret no MikroTik:', data.error)
          // Se nao encontrou, tenta criar
          if (data.error && data.error.includes('nao encontrado')) {
            return await criarSecret(loginPPPoE, senhaPPPoE, profile, ipFixo, nomeCliente)
          }
          return false
        }
        return true
      } else {
        // Novo — criar secret
        return await criarSecret(loginPPPoE, senhaPPPoE, profile, ipFixo, nomeCliente)
      }
    } catch (err) {
      console.error('Erro sync MikroTik:', err)
      return false
    }
  }

  const criarSecret = async (
    loginPPPoE: string,
    senhaPPPoE: string,
    profile: string,
    ipFixo: string,
    nomeCliente: string
  ): Promise<boolean> => {
    if (!operador?.empresaId) return false
    try {
      const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/add&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: loginPPPoE,
          client_password: senhaPPPoE,
          profile: profile || 'default',
          remote_address: ipFixo || undefined,
          comment: `V5 Fibra - ${nomeCliente}`,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        // Se ja existe, tenta atualizar
        if (data.error && data.error.includes('already')) {
          const resSet = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              original_name: loginPPPoE,
              client_password: senhaPPPoE,
              profile: profile || undefined,
              remote_address: ipFixo || undefined,
              comment: `V5 Fibra - ${nomeCliente}`,
            }),
          })
          const dataSet = await resSet.json()
          return dataSet.success
        }
        console.error('Erro ao criar secret:', data.error)
        return false
      }
      return true
    } catch (err) {
      console.error('Erro criar secret:', err)
      return false
    }
  }

  // ============================================================
  // SALVAR ACESSO (COM SYNC AUTOMATICO AO MIKROTIK)
  // ============================================================
  const salvarAcesso = async () => {
    if (!clienteSelecionado) return;
    setSalvando(true);
    setSyncMsg(null);
    try {
      // 1. Salvar via API (filtrado pela empresa do operador)
      try {
        await painelApi(`clientes/${clienteSelecionado.id}/rede`, { method: 'PATCH', body: form });
      } catch {
        setSyncMsg({ tipo: 'erro', texto: 'Erro ao salvar no banco de dados' });
        setSalvando(false);
        return;
      }

      // 2. Se tem login e senha PPPoE, sincronizar com MikroTik
      if (form.login_pppoe && form.senha_pppoe) {
        const loginAnterior = acessoRede?.login_pppoe || null;
        const mkOk = await syncSecretNoMikroTik(
          form.login_pppoe,
          form.senha_pppoe,
          form.perfil_radius,
          form.ip_fixo,
          clienteSelecionado.nome,
          loginAnterior
        );

        if (mkOk) {
          setSyncMsg({
            tipo: 'ok',
            texto: loginAnterior
              ? `Dados salvos e PPPoE Secret "${form.login_pppoe}" atualizado no MikroTik!`
              : `Dados salvos e PPPoE Secret "${form.login_pppoe}" criado no MikroTik!`
          });
        } else {
          setSyncMsg({
            tipo: 'erro',
            texto: 'Dados salvos no sistema! (Aviso: nao foi possivel sincronizar com MikroTik)'
          });
        }
      } else {
        setSyncMsg({ tipo: 'ok', texto: 'Dados salvos com sucesso!' });
      }

      setAcessoRede({ ...form });
      setEditando(false);

      // Limpar mensagem apos 5 segundos
      setTimeout(() => setSyncMsg(null), 5000);
    } catch (e) {
      console.error('Erro:', e);
      setSyncMsg({ tipo: 'erro', texto: 'Erro ao salvar dados' });
    } finally {
      setSalvando(false);
    }
  };

  const copiar = (texto: string, campo: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(campo);
      setTimeout(() => setCopiado(''), 2000);
    }).catch(() => {});
  };

  const estiloInput = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all";
  const estiloLabel = "text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block";

  const CampoLeitura = ({ label, valor, campo, sensivel }: { label: string; valor: string; campo: string; sensivel?: boolean }) => (
    <div>
      <span className={estiloLabel}>{label}</span>
      <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 border border-zinc-800/50">
        <span className="text-xs font-mono text-white flex-1">
          {!valor ? (
            <span className="text-zinc-600">Nao configurado</span>
          ) : sensivel && !senhaVisivel ? (
            '••••••••'
          ) : (
            valor
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {sensivel && valor && (
            <button onClick={() => setSenhaVisivel(!senhaVisivel)} className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
              {senhaVisivel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          {valor && (
            <button onClick={() => copiar(valor, campo)} className="p-1 text-zinc-600 hover:text-emerald-400 transition-colors">
              {copiado === campo ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/clientes" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Wifi className="w-6 h-6 text-emerald-400" />
            Acesso a Rede
          </h1>
        </div>
        <p className="text-zinc-400 text-sm mt-0.5 ml-12">
          Configuracao PPPoE, IP fixo, MAC, VLAN e dados de fibra — <span className="text-emerald-400 font-bold">sincroniza automaticamente com o MikroTik</span>
        </p>
      </div>

      {/* MENSAGEM DE SYNC */}
      {syncMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono border ${
          syncMsg.tipo === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
        }`}>
          {syncMsg.tipo === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {syncMsg.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LISTA DE CLIENTES */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
            <CardContent className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou login..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {carregando ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                </div>
              ) : clientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                  <User className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-mono">Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900/50">
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selecionarCliente(c)}
                      className={`w-full text-left px-4 py-3 hover:bg-zinc-900/30 transition-colors flex items-center gap-3 ${
                        clienteSelecionado?.id === c.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        {c.login_pppoe ? (
                          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-white truncate">{c.nome}</p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {c.login_pppoe || 'Sem login PPPoE'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* DADOS DE ACESSO */}
        <div className="lg:col-span-2 space-y-4">
          {!clienteSelecionado ? (
            <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardContent className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <Router className="w-12 h-12 mb-3" />
                <p className="text-xs font-mono">Selecione um cliente para ver os dados de acesso a rede</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* PPPoE */}
              <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
                <CardHeader className="border-b border-zinc-900/85 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-400" />
                      Autenticacao PPPoE — {clienteSelecionado.nome}
                    </CardTitle>
                    {!editando ? (
                      <button
                        onClick={() => setEditando(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-mono uppercase transition-all"
                      >
                        <Edit3 className="w-3 h-3" /> EDITAR
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditando(false); setSyncMsg(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-mono uppercase transition-all"
                        >
                          <X className="w-3 h-3" /> CANCELAR
                        </button>
                        <button
                          onClick={salvarAcesso}
                          disabled={salvando}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase font-bold transition-all border border-emerald-500/30 disabled:opacity-50"
                        >
                          {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          {salvando ? 'SALVANDO...' : 'SALVAR'}
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {editando ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={estiloLabel}>Login PPPoE</label>
                          <input type="text" value={form.login_pppoe} onChange={(e) => setForm({ ...form, login_pppoe: e.target.value })} placeholder="usuario@provedor" className={estiloInput} />
                        </div>
                        <div>
                          <label className={estiloLabel}>Senha PPPoE</label>
                          <input type="text" value={form.senha_pppoe} onChange={(e) => setForm({ ...form, senha_pppoe: e.target.value })} placeholder="Senha de autenticacao" className={estiloInput} />
                        </div>
                        <div>
                          <label className={estiloLabel}>IP Fixo</label>
                          <input type="text" value={form.ip_fixo} onChange={(e) => setForm({ ...form, ip_fixo: e.target.value })} placeholder="Ex: 10.0.0.100" className={estiloInput} />
                        </div>
                        <div>
                          <label className={estiloLabel}>MAC Address</label>
                          <input type="text" value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" className={estiloInput} />
                        </div>
                        <div>
                          <label className={estiloLabel}>Perfil PPPoE (Profile MikroTik)</label>
                          <input type="text" value={form.perfil_radius} onChange={(e) => setForm({ ...form, perfil_radius: e.target.value })} placeholder="Ex: 100M, 200M, BLOQUEADO" className={estiloInput} />
                        </div>
                        <div>
                          <label className={estiloLabel}>VLAN</label>
                          <input type="text" value={form.vlan} onChange={(e) => setForm({ ...form, vlan: e.target.value })} placeholder="Ex: 100" className={estiloInput} />
                        </div>
                      </div>
                      {/* Info sync */}
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                        <CloudUpload className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-mono text-emerald-300/70">
                          Ao salvar, o PPPoE Secret sera {acessoRede?.login_pppoe ? 'atualizado' : 'criado'} automaticamente no MikroTik com login, senha e profile configurados.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CampoLeitura label="Login PPPoE" valor={acessoRede?.login_pppoe} campo="login" />
                      <CampoLeitura label="Senha PPPoE" valor={acessoRede?.senha_pppoe} campo="senha" sensivel />
                      <CampoLeitura label="IP Fixo" valor={acessoRede?.ip_fixo} campo="ip" />
                      <CampoLeitura label="MAC Address" valor={acessoRede?.mac_address} campo="mac" />
                      <CampoLeitura label="Perfil PPPoE" valor={acessoRede?.perfil_radius} campo="perfil" />
                      <CampoLeitura label="VLAN" valor={acessoRede?.vlan} campo="vlan" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dados Fibra / ONU */}
              <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
                <CardHeader className="border-b border-zinc-900/85 pb-4">
                  <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                    <Signal className="w-4 h-4 text-cyan-400" />
                    Dados de Fibra / ONU
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {editando ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={estiloLabel}>Porta OLT</label>
                        <input type="text" value={form.porta_olt} onChange={(e) => setForm({ ...form, porta_olt: e.target.value })} placeholder="Ex: 1/1/1" className={estiloInput} />
                      </div>
                      <div>
                        <label className={estiloLabel}>CTO ID</label>
                        <input type="text" value={form.cto_id} onChange={(e) => setForm({ ...form, cto_id: e.target.value })} placeholder="ID da CTO" className={estiloInput} />
                      </div>
                      <div>
                        <label className={estiloLabel}>Serial ONU</label>
                        <input type="text" value={form.onu_serial} onChange={(e) => setForm({ ...form, onu_serial: e.target.value })} placeholder="Serial da ONU/ONT" className={estiloInput} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <CampoLeitura label="Porta OLT" valor={acessoRede?.porta_olt} campo="olt" />
                      <CampoLeitura label="CTO ID" valor={acessoRede?.cto_id} campo="cto" />
                      <CampoLeitura label="Serial ONU" valor={acessoRede?.onu_serial} campo="onu" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                <Monitor className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono font-bold text-emerald-400 uppercase">Integracao MikroTik Ativa</p>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    Ao salvar o login e senha PPPoE, o sistema cria ou atualiza automaticamente o PPPoE Secret no MikroTik.
                    O campo &quot;Perfil PPPoE&quot; define qual profile sera usado (ex: 100M, 200M). Se deixar vazio, usa o profile &quot;default&quot;.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}