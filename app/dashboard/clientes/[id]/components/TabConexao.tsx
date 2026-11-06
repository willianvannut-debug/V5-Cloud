// ================================================================================
// TAB CONEXAO - PPPoE com integração MikroTik REAL
// Busca conexões ativas no MikroTik, mostra status real online/offline,
// derrubar sessão, bloquear/desbloquear via PPPoE profile (Bridge Service)
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import {
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  RefreshCw,
  Activity,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertTriangle,
  X,
  Zap,
  Signal,
  Clock,
  ArrowDownUp,
  Shield,
  Key,
  Globe,
  Server,
  Loader2,
} from 'lucide-react';
import { supabase, estiloInput, estiloRotulo, estiloValor } from '../shared';

interface TabConexaoProps {
  cliente: any;
  editando: boolean;
  formEdit: any;
  setFormEdit: (fn: (prev: any) => any) => void;
}

interface ConexaoMK {
  id: string;
  name: string;
  service: string;
  caller_id: string;
  address: string;
  uptime: string;
  encoding: string;
}

export default function TabConexao({ cliente, editando, formEdit, setFormEdit }: TabConexaoProps) {
  const { operador } = useAuth();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [modalConfirmar, setModalConfirmar] = useState<{
    titulo: string;
    mensagem: string;
    tipo: 'danger' | 'warning' | 'info';
    acao: () => void;
  } | null>(null);
  const [executando, setExecutando] = useState('');

  // Estado da conexão real do MikroTik
  const [conexaoMK, setConexaoMK] = useState<ConexaoMK | null>(null);
  const [buscandoStatus, setBuscandoStatus] = useState(false);
  const online = !!conexaoMK;

  // ==========================
  // BUSCAR STATUS REAL NO MIKROTIK
  // ==========================
  const buscarStatusMK = useCallback(async () => {
    if (!operador?.empresaId || !cliente?.login_pppoe) {
      setConexaoMK(null);
      return;
    }

    setBuscandoStatus(true);
    try {
      const res = await fetch(
        `/api/mk-proxy?path=pppoe/active&empresa_id=${operador.empresaId}`
      );
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const loginCliente = cliente.login_pppoe.toLowerCase();
        const conexao = data.data.find(
          (c: any) => c.name?.toLowerCase() === loginCliente
        );
        setConexaoMK(conexao || null);
      } else {
        setConexaoMK(null);
      }
    } catch {
      setConexaoMK(null);
    } finally {
      setBuscandoStatus(false);
    }
  }, [operador?.empresaId, cliente?.login_pppoe]);

  // Buscar status ao montar e a cada 30 segundos
  useEffect(() => {
    buscarStatusMK();
    const interval = setInterval(buscarStatusMK, 30000);
    return () => clearInterval(interval);
  }, [buscarStatusMK]);

  // ==========================
  // HELPERS
  // ==========================
  const mostrarSucesso = (msg: string) => {
    setSucessoMsg(msg);
    setTimeout(() => setSucessoMsg(''), 3000);
  };

  const mostrarErro = (msg: string) => {
    setErroMsg(msg);
    setTimeout(() => setErroMsg(''), 5000);
  };

  const copiar = (texto: string, label?: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      mostrarSucesso(`${label || 'Texto'} copiado!`);
    }).catch(() => {
      mostrarErro('Nao foi possivel copiar');
    });
  };

  const copiarCredenciais = () => {
    if (!cliente.login_pppoe) {
      mostrarErro('Login PPPoE nao configurado');
      return;
    }
    const texto = `Login: ${cliente.login_pppoe}\nSenha: ${cliente.senha_pppoe || '-'}`;
    copiar(texto, 'Credenciais');
  };

  // ==========================
  // MASCARA MAC ADDRESS
  // ==========================
  const mascaraMAC = (v: string) => {
    return v.replace(/[^a-fA-F0-9]/g, '')
      .toUpperCase()
      .replace(/(.{2})(?=.)/g, '$1:')
      .slice(0, 17);
  };

  // ==========================
  // GERAR LOGIN/SENHA PPPOE
  // ==========================
  const gerarLoginPPPoE = () => {
    const cpf = (cliente.cpf || '').replace(/\D/g, '');
    const cnpj = (cliente.cnpj || '').replace(/\D/g, '');
    const doc = cpf || cnpj;
    if (!doc) {
      mostrarErro('Cliente precisa ter CPF ou CNPJ cadastrado');
      return;
    }
    const login = `${doc}@v5fibra`;
    setFormEdit((prev: any) => ({ ...prev, login_pppoe: login }));
    mostrarSucesso(`Login gerado: ${login}`);
  };

  const gerarSenhaPPPoE = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
      senha += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormEdit((prev: any) => ({ ...prev, senha_pppoe: senha }));
    mostrarSucesso(`Senha gerada: ${senha}`);
  };

  // ==========================
  // ACOES DE CONEXAO (VIA PPPoE PROFILE - MIKROTIK)
  // ==========================
  const bloquearConexao = async () => {
    setExecutando('bloqueando');
    try {
      const res = await fetch('/api/mikrotik/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cliente_id: cliente.id, acao: 'bloquear' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro desconhecido');
      mostrarSucesso('Conexao bloqueada no MikroTik (perfil bloqueado)');
      buscarStatusMK();
    } catch (e: any) {
      mostrarErro('Erro ao bloquear: ' + (e.message || ''));
    } finally {
      setExecutando('');
      setModalConfirmar(null);
    }
  };

  const desbloquearConexao = async () => {
    setExecutando('desbloqueando');
    try {
      const res = await fetch('/api/mikrotik/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cliente_id: cliente.id, acao: 'desbloquear' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro desconhecido');
      mostrarSucesso('Conexao desbloqueada no MikroTik (perfil restaurado)');
      buscarStatusMK();
    } catch (e: any) {
      mostrarErro('Erro ao desbloquear: ' + (e.message || ''));
    } finally {
      setExecutando('');
      setModalConfirmar(null);
    }
  };

  const derrubarSessao = async () => {
    setExecutando('derrubando');
    try {
      if (!operador?.empresaId || !cliente.login_pppoe) {
        mostrarErro('Login PPPoE nao configurado');
        setExecutando('');
        setModalConfirmar(null);
        return;
      }

      const res = await fetch(`/api/mk-proxy?path=pppoe/disconnect&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cliente.login_pppoe }),
      });

      const data = await res.json();
      if (data.success) {
        mostrarSucesso('Sessao derrubada com sucesso! Cliente sera desconectado.');
        setConexaoMK(null);
        setTimeout(buscarStatusMK, 5000);
      } else {
        mostrarErro(data.error || 'Erro ao derrubar sessao');
      }
    } catch {
      mostrarErro('Erro ao conectar com o servidor');
    } finally {
      setExecutando('');
      setModalConfirmar(null);
    }
  };

  // ==========================
  // ATUALIZAR CAMPO
  // ==========================
  const atualizarCampo = (campo: string, valor: string) => {
    if (campo === 'mac_address') {
      valor = mascaraMAC(valor);
    }
    setFormEdit((prev: any) => ({ ...prev, [campo]: valor }));
  };

  const CampoTexto = ({ label, campo, placeholder, copiavel }: { label: string; campo: string; placeholder?: string; copiavel?: boolean }) => (
    <div>
      <label className={estiloRotulo}>{label}</label>
      {editando ? (
        <input type="text" placeholder={placeholder || label} value={formEdit[campo] || ''} onChange={(e) => atualizarCampo(campo, e.target.value)} className={estiloInput} />
      ) : (
        <div className="flex items-center gap-2">
          <p className={estiloValor}>{cliente[campo] || <span className="text-zinc-600">-</span>}</p>
          {copiavel && cliente[campo] && (
            <button onClick={() => copiar(cliente[campo], label)} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer"><Copy className="w-3 h-3" /></button>
          )}
        </div>
      )}
    </div>
  );

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="space-y-6">
      {/* Mensagens */}
      {sucessoMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {sucessoMsg}
        </div>
      )}
      {erroMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {erroMsg}
        </div>
      )}

      {/* Status de conexão — DADOS REAIS DO MIKROTIK */}
      <Card className={`border ${online ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${online ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {buscandoStatus ? (
                  <Loader2 className="w-7 h-7 text-zinc-400 animate-spin" />
                ) : online ? (
                  <Wifi className="w-7 h-7 text-emerald-400" />
                ) : (
                  <WifiOff className="w-7 h-7 text-red-400" />
                )}
              </div>
              <div>
                <p className={`text-sm font-bold font-mono ${online ? 'text-emerald-400' : 'text-red-400'}`}>
                  {buscandoStatus ? 'VERIFICANDO...' : online ? 'ONLINE' : 'OFFLINE'}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {online ? 'Conectado via PPPoE no MikroTik' : cliente.login_pppoe ? 'Sem conexao ativa no MikroTik' : 'Login PPPoE nao configurado'}
                </p>
                {cliente.status === 'bloqueado' && (
                  <p className="text-[10px] font-mono text-red-500 mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Conexao bloqueada pelo provedor
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={buscarStatusMK}
                  disabled={buscandoStatus}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  title="Atualizar status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${buscandoStatus ? 'animate-spin' : ''}`} />
                </button>
                <div className={`w-4 h-4 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              </div>
              {cliente.login_pppoe && (
                <p className="text-[10px] font-mono text-zinc-600">{cliente.login_pppoe}</p>
              )}
            </div>
          </div>

          {/* Info real do MikroTik quando online */}
          {online && conexaoMK && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-emerald-500/10">
              <div>
                <p className="text-[10px] font-mono text-emerald-600 uppercase">IP Atribuido</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">{conexaoMK.address || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-emerald-600 uppercase">Uptime</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">{conexaoMK.uptime || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-emerald-600 uppercase">MAC</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">{conexaoMK.caller_id || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-emerald-600 uppercase">Servico</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">{conexaoMK.service || 'pppoe'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dados PPPoE */}
      <div>
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
          <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest">Acesso PPPoE</p>
          <div className="flex items-center gap-2">
            {!editando && cliente.login_pppoe && (
              <button
                onClick={copiarCredenciais}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/60 text-zinc-500 text-[10px] font-mono hover:text-emerald-400 transition-all cursor-pointer"
              >
                <Copy className="w-3 h-3" /> COPIAR TUDO
              </button>
            )}
            {editando && (
              <div className="flex items-center gap-1">
                <button
                  onClick={gerarLoginPPPoE}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <Key className="w-3 h-3" /> GERAR LOGIN
                </button>
                <button
                  onClick={gerarSenhaPPPoE}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  <Zap className="w-3 h-3" /> GERAR SENHA
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={estiloRotulo}>Login PPPoE</label>
            {editando ? (
              <input type="text" value={formEdit.login_pppoe || ''} onChange={(e) => atualizarCampo('login_pppoe', e.target.value)} className={estiloInput} placeholder="usuario@provedor" />
            ) : (
              <div className="flex items-center gap-2">
                <p className={estiloValor}>{cliente.login_pppoe || <span className="text-zinc-600">Nao configurado</span>}</p>
                {cliente.login_pppoe && (
                  <button onClick={() => copiar(cliente.login_pppoe, 'Login')} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer"><Copy className="w-3 h-3" /></button>
                )}
              </div>
            )}
          </div>
          <div>
            <label className={estiloRotulo}>Senha PPPoE</label>
            {editando ? (
              <input type="text" value={formEdit.senha_pppoe || ''} onChange={(e) => atualizarCampo('senha_pppoe', e.target.value)} className={estiloInput} placeholder="senha" />
            ) : (
              <div className="flex items-center gap-2">
                <p className={estiloValor}>
                  {cliente.senha_pppoe ? (mostrarSenha ? cliente.senha_pppoe : '••••••••') : <span className="text-zinc-600">-</span>}
                </p>
                {cliente.senha_pppoe && (
                  <>
                    <button onClick={() => setMostrarSenha(!mostrarSenha)} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer">
                      {mostrarSenha ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button onClick={() => copiar(cliente.senha_pppoe, 'Senha')} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer"><Copy className="w-3 h-3" /></button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dados de Rede */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Dados de Rede</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CampoTexto label="IP Fixo" campo="ip_fixo" placeholder="0.0.0.0" copiavel />
          <CampoTexto label="MAC Address" campo="mac_address" placeholder="AA:BB:CC:DD:EE:FF" copiavel />
          <CampoTexto label="Perfil RADIUS" campo="perfil_radius" placeholder="plano_100mb" copiavel />
          <CampoTexto label="VLAN" campo="vlan" copiavel />
          <CampoTexto label="Porta OLT" campo="porta_olt" copiavel />
          <CampoTexto label="Serial ONU" campo="onu_serial" copiavel />
        </div>
      </div>

      {/* Botoes de acao */}
      <div className="flex flex-wrap gap-3">
        {cliente.status === 'bloqueado' ? (
          <button
            onClick={() => setModalConfirmar({
              titulo: 'Desbloquear Conexao',
              mensagem: `Tem certeza que deseja DESBLOQUEAR a conexao de ${cliente.nome}? O cliente voltara a ter acesso a internet.`,
              tipo: 'info',
              acao: desbloquearConexao,
            })}
            disabled={!!executando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {executando === 'desbloqueando' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            DESBLOQUEAR
          </button>
        ) : (
          <button
            onClick={() => setModalConfirmar({
              titulo: 'Bloquear Conexao',
              mensagem: `Tem certeza que deseja BLOQUEAR a conexao de ${cliente.nome}? O cliente perdera acesso a internet imediatamente.`,
              tipo: 'danger',
              acao: bloquearConexao,
            })}
            disabled={!!executando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-bold uppercase hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {executando === 'bloqueando' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            BLOQUEAR CONEXAO
          </button>
        )}
        <button
          onClick={() => setModalConfirmar({
            titulo: 'Derrubar Sessao',
            mensagem: `Derrubar a sessao PPPoE de ${cliente.nome}? O cliente sera desconectado e precisara reconectar.`,
            tipo: 'warning',
            acao: derrubarSessao,
          })}
          disabled={!!executando || !online}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase hover:bg-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {executando === 'derrubando' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          DERRUBAR SESSAO
        </button>
      </div>

      {/* ================================================================ */}
      {/* MODAL: CONFIRMACAO */}
      {/* ================================================================ */}
      {modalConfirmar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalConfirmar(null)}>
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  modalConfirmar.tipo === 'danger' ? 'bg-red-500/20' :
                  modalConfirmar.tipo === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                }`}>
                  {modalConfirmar.tipo === 'danger' ? <AlertTriangle className="w-5 h-5 text-red-400" /> :
                   modalConfirmar.tipo === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> :
                   <CheckCircle className="w-5 h-5 text-blue-400" />}
                </div>
                <h3 className="text-sm font-bold font-mono text-white uppercase">{modalConfirmar.titulo}</h3>
              </div>
              <button onClick={() => setModalConfirmar(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-zinc-400 leading-relaxed">{modalConfirmar.mensagem}</p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalConfirmar(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono font-bold uppercase hover:bg-zinc-900 transition-all cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                onClick={modalConfirmar.acao}
                disabled={!!executando}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 cursor-pointer ${
                  modalConfirmar.tipo === 'danger' ? 'bg-red-600 hover:bg-red-500' :
                  modalConfirmar.tipo === 'warning' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {executando ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}