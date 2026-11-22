// ================================================================================
// TAB CONEXAO - MULTIPLAS CONEXOES PPPoE por cliente
// Cada cliente pode ter N pontos (Casa, Casa da namorada, Escritorio, etc)
// Busca status real no MikroTik para cada conexao individualmente
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
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertTriangle,
  X,
  Zap,
  Key,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  MapPin,
  Save,
  Search,
  Download,
  UserCheck,
} from 'lucide-react';
import { supabase, estiloInput, estiloRotulo, estiloValor } from '../shared';

interface TabConexaoProps {
  cliente: any;
  editando: boolean;
  formEdit: any;
  setFormEdit: (fn: (prev: any) => any) => void;
}

interface ConexaoPPPoE {
  id: string;
  cliente_id: string;
  empresa_id: string;
  descricao: string;
  login_pppoe: string | null;
  senha_pppoe: string | null;
  mac_address: string | null;
  perfil_radius: string | null;
  ip_fixo: string | null;
  vlan: string | null;
  porta_olt: string | null;
  onu_serial: string | null;
  status: string;
  created_at: string;
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

// ==========================
// CAMPO DE FORMULARIO (componente top-level - identidade estavel entre
// renders, para o <input> nao perder o foco a cada tecla digitada)
// ==========================
function CampoForm({ label, campo, placeholder, copiavel, valor, estaEditando, valorForm, onMudar, onCopiar }: {
  label: string;
  campo: string;
  placeholder?: string;
  copiavel?: boolean;
  valor?: string;
  estaEditando: boolean;
  valorForm?: string;
  onMudar: (campo: string, valor: string) => void;
  onCopiar: (valor: string, label: string) => void;
}) {
  const valorExibir = valor ?? '';

  if (estaEditando) {
    return (
      <div>
        <label className={estiloRotulo}>{label}</label>
        <input
          type="text"
          placeholder={placeholder || label}
          value={valorForm || ''}
          onChange={(e) => onMudar(campo, e.target.value)}
          className={estiloInput}
        />
      </div>
    );
  }

  return (
    <div>
      <label className={estiloRotulo}>{label}</label>
      <div className="flex items-center gap-2">
        <p className={estiloValor}>{valorExibir || <span className="text-zinc-600">-</span>}</p>
        {copiavel && valorExibir && (
          <button onClick={() => onCopiar(valorExibir, label)} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TabConexao({ cliente, editando, formEdit, setFormEdit }: TabConexaoProps) {
  const { operador } = useAuth();

  // Lista de conexoes do banco
  const [conexoes, setConexoes] = useState<ConexaoPPPoE[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Status MikroTik (mapa login -> dados)
  const [statusMK, setStatusMK] = useState<Record<string, ConexaoMK>>({});
  const [buscandoMK, setBuscandoMK] = useState(false);

  // UI
  const [expandida, setExpandida] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState<Record<string, boolean>>({});
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [executando, setExecutando] = useState('');
  const [modalConfirmar, setModalConfirmar] = useState<{
    titulo: string;
    mensagem: string;
    tipo: 'danger' | 'warning' | 'info';
    acao: () => void;
  } | null>(null);

  // Formulario de nova conexao / edicao individual
  const [editandoConexao, setEditandoConexao] = useState<string | null>(null);
  const [formConexao, setFormConexao] = useState<Partial<ConexaoPPPoE>>({});
  const [adicionando, setAdicionando] = useState(false);

  // Importar conexao existente
  const [modalImportar, setModalImportar] = useState(false);
  const [buscaImportar, setBuscaImportar] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<any[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);
  const [conexoesSelecionado, setConexoesSelecionado] = useState<any[]>([]);
  const [carregandoConexoes, setCarregandoConexoes] = useState(false);
  const [descricaoImport, setDescricaoImport] = useState('');

  // ==========================
  // CARREGAR CONEXOES DO BANCO
  // ==========================
  const carregarConexoes = useCallback(async () => {
    if (!cliente?.id) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('conexoes_pppoe')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConexoes(data || []);
      // Expandir a primeira automaticamente
      if (data && data.length > 0 && !expandida) {
        setExpandida(data[0].id);
      }
    } catch (e: any) {
      console.error('Erro ao carregar conexoes:', e);
      mostrarErro('Erro ao carregar conexoes');
    } finally {
      setCarregando(false);
    }
  }, [cliente?.id]);

  useEffect(() => {
    carregarConexoes();
  }, [carregarConexoes]);

  // ==========================
  // BUSCAR STATUS MIKROTIK (TODAS AS CONEXOES)
  // ==========================
  const buscarStatusMK = useCallback(async () => {
    if (!operador?.empresaId || conexoes.length === 0) return;

    setBuscandoMK(true);
    try {
      const res = await fetch(
        `/api/mk-proxy?path=pppoe/active&empresa_id=${operador.empresaId}`
      );
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const mapa: Record<string, ConexaoMK> = {};
        for (const conexao of conexoes) {
          if (conexao.login_pppoe) {
            const loginLower = conexao.login_pppoe.toLowerCase();
            const encontrada = data.data.find(
              (c: any) => c.name?.toLowerCase() === loginLower
            );
            if (encontrada) {
              mapa[conexao.id] = encontrada;
            }
          }
        }
        setStatusMK(mapa);
      }
    } catch {
      // silencioso
    } finally {
      setBuscandoMK(false);
    }
  }, [operador?.empresaId, conexoes]);

  useEffect(() => {
    if (conexoes.length > 0) {
      buscarStatusMK();
      const interval = setInterval(buscarStatusMK, 30000);
      return () => clearInterval(interval);
    }
  }, [buscarStatusMK, conexoes.length]);

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

  const mascaraMAC = (v: string) => {
    return v.replace(/[^a-fA-F0-9]/g, '')
      .toUpperCase()
      .replace(/(.{2})(?=.)/g, '$1:')
      .slice(0, 17);
  };

  // ==========================
  // GERAR LOGIN/SENHA
  // ==========================
  const gerarLogin = () => {
    const cpf = (cliente.cpf || '').replace(/\D/g, '');
    const cnpj = (cliente.cnpj || '').replace(/\D/g, '');
    const doc = cpf || cnpj;
    if (!doc) {
      mostrarErro('Cliente precisa ter CPF ou CNPJ cadastrado');
      return;
    }
    const sufixo = conexoes.length > 0 ? `-${conexoes.length + 1}` : '';
    const login = `${doc}${sufixo}@v5fibra`;
    setFormConexao(prev => ({ ...prev, login_pppoe: login }));
    mostrarSucesso(`Login gerado: ${login}`);
  };

  const gerarSenha = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
      senha += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormConexao(prev => ({ ...prev, senha_pppoe: senha }));
    mostrarSucesso(`Senha gerada: ${senha}`);
  };

  // ==========================
  // SYNC DO SECRET PPPOE NO MIKROTIK (via bridge / mk-proxy)
  // Antes, "Novo Ponto" e a edicao de uma conexao so gravavam no Supabase
  // -- o roteador nunca ficava sabendo do login/senha, entao o cliente
  // nunca conseguia conectar de verdade. Mesmo padrao ja usado e validado
  // em app/dashboard/clientes/acesso-rede/page.tsx.
  // ==========================
  const criarSecretMikrotik = async (
    login: string,
    senha: string,
    perfil: string,
    ipFixo: string,
    nomeCliente: string
  ): Promise<{ ok: boolean; erro?: string }> => {
    if (!operador?.empresaId) return { ok: false, erro: 'Empresa nao identificada' };
    try {
      const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/add&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: login,
          client_password: senha,
          profile: perfil || 'default',
          remote_address: ipFixo || undefined,
          comment: `V5 Fibra - ${nomeCliente}`,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Secret ja existe no router (ex: foi criado por fora) -> atualiza em vez de criar
        if (data.error && data.error.includes('already')) {
          return await atualizarSecretMikrotik(login, login, senha, perfil, ipFixo, nomeCliente);
        }
        return { ok: false, erro: data.error || 'Erro desconhecido' };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Erro de conexao com o Bridge' };
    }
  };

  const atualizarSecretMikrotik = async (
    loginAnterior: string,
    loginNovo: string,
    senha: string,
    perfil: string,
    ipFixo: string,
    nomeCliente: string
  ): Promise<{ ok: boolean; erro?: string }> => {
    if (!operador?.empresaId) return { ok: false, erro: 'Empresa nao identificada' };
    try {
      const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_name: loginAnterior,
          client_name: loginNovo !== loginAnterior ? loginNovo : undefined,
          client_password: senha || undefined,
          profile: perfil || undefined,
          remote_address: ipFixo || undefined,
          comment: `V5 Fibra - ${nomeCliente}`,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Secret ainda nao existe no router -> cria
        if (data.error && data.error.includes('nao encontrado')) {
          return await criarSecretMikrotik(loginNovo, senha, perfil, ipFixo, nomeCliente);
        }
        return { ok: false, erro: data.error || 'Erro desconhecido' };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, erro: err.message || 'Erro de conexao com o Bridge' };
    }
  };

  // ==========================
  // SALVAR CONEXAO (NOVA OU EDICAO)
  // ==========================
  const salvarConexao = async () => {
    if (!formConexao.descricao?.trim()) {
      mostrarErro('Descricao e obrigatoria (ex: Casa, Escritorio)');
      return;
    }

    setExecutando('salvando');
    try {
      const loginAnterior = editandoConexao
        ? conexoes.find((c) => c.id === editandoConexao)?.login_pppoe || null
        : null;

      if (editandoConexao) {
        // Atualizar existente
        const { error } = await supabase
          .from('conexoes_pppoe')
          .update({
            descricao: formConexao.descricao,
            login_pppoe: formConexao.login_pppoe || null,
            senha_pppoe: formConexao.senha_pppoe || null,
            mac_address: formConexao.mac_address || null,
            perfil_radius: formConexao.perfil_radius || null,
            ip_fixo: formConexao.ip_fixo || null,
            vlan: formConexao.vlan || null,
            porta_olt: formConexao.porta_olt || null,
            onu_serial: formConexao.onu_serial || null,
          })
          .eq('id', editandoConexao);

        if (error) throw error;

        if (formConexao.login_pppoe && formConexao.senha_pppoe) {
          const sync = await atualizarSecretMikrotik(
            loginAnterior || formConexao.login_pppoe,
            formConexao.login_pppoe,
            formConexao.senha_pppoe,
            formConexao.perfil_radius || '',
            formConexao.ip_fixo || '',
            cliente.nome
          );
          if (sync.ok) {
            mostrarSucesso('Conexao atualizada e secret sincronizado no MikroTik!');
          } else {
            mostrarErro(`Conexao atualizada no sistema, mas falhou ao sincronizar no MikroTik: ${sync.erro || 'erro desconhecido'}`);
          }
        } else {
          mostrarSucesso('Conexao atualizada!');
        }
      } else {
        // Criar nova
        const { error } = await supabase
          .from('conexoes_pppoe')
          .insert({
            cliente_id: cliente.id,
            empresa_id: cliente.empresa_id,
            descricao: formConexao.descricao,
            login_pppoe: formConexao.login_pppoe || null,
            senha_pppoe: formConexao.senha_pppoe || null,
            mac_address: formConexao.mac_address || null,
            perfil_radius: formConexao.perfil_radius || null,
            ip_fixo: formConexao.ip_fixo || null,
            vlan: formConexao.vlan || null,
            porta_olt: formConexao.porta_olt || null,
            onu_serial: formConexao.onu_serial || null,
          });

        if (error) throw error;

        if (formConexao.login_pppoe && formConexao.senha_pppoe) {
          const sync = await criarSecretMikrotik(
            formConexao.login_pppoe,
            formConexao.senha_pppoe,
            formConexao.perfil_radius || '',
            formConexao.ip_fixo || '',
            cliente.nome
          );
          if (sync.ok) {
            mostrarSucesso('Nova conexao criada e PPPoE provisionado no MikroTik!');
          } else {
            mostrarErro(`Conexao salva no sistema, mas falhou ao criar o PPPoE no MikroTik: ${sync.erro || 'erro desconhecido'}`);
          }
        } else {
          mostrarSucesso('Nova conexao adicionada! (sem login/senha PPPoE, nao foi provisionada no MikroTik)');
        }
      }

      setEditandoConexao(null);
      setAdicionando(false);
      setFormConexao({});
      await carregarConexoes();
    } catch (e: any) {
      mostrarErro('Erro ao salvar: ' + (e.message || ''));
    } finally {
      setExecutando('');
    }
  };

  // ==========================
  // EXCLUIR CONEXAO
  // ==========================
  const excluirConexao = async (id: string) => {
    setExecutando('excluindo');
    try {
      const { error } = await supabase
        .from('conexoes_pppoe')
        .delete()
        .eq('id', id);

      if (error) throw error;
      mostrarSucesso('Conexao removida!');
      setModalConfirmar(null);
      await carregarConexoes();
    } catch (e: any) {
      mostrarErro('Erro ao excluir: ' + (e.message || ''));
    } finally {
      setExecutando('');
    }
  };

  // ==========================
  // ACOES MIKROTIK
  // ==========================
  const bloquearConexao = async (conexao: ConexaoPPPoE) => {
    if (!operador?.empresaId || !conexao.login_pppoe) {
      mostrarErro('Login PPPoE nao configurado nesta conexao');
      setModalConfirmar(null);
      return;
    }
    setExecutando('bloqueando');
    try {
      const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_name: conexao.login_pppoe, profile: 'BLOQUEADO' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro desconhecido');

      // Derruba a sessao ativa pra bloqueio ter efeito imediato (troca de
      // perfil so vale no proximo reconnect, sem isso o cliente continua
      // conectado no perfil antigo ate cair sozinho).
      try {
        await fetch(`/api/mk-proxy?path=pppoe/disconnect&empresa_id=${operador.empresaId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: conexao.login_pppoe }),
        });
      } catch {}

      // Atualizar status no banco
      await supabase.from('conexoes_pppoe').update({ status: 'bloqueado' }).eq('id', conexao.id);

      mostrarSucesso('Conexao bloqueada no MikroTik');
      await carregarConexoes();
      buscarStatusMK();
    } catch (e: any) {
      mostrarErro('Erro ao bloquear: ' + (e.message || ''));
    } finally {
      setExecutando('');
      setModalConfirmar(null);
    }
  };

  const desbloquearConexao = async (conexao: ConexaoPPPoE) => {
    if (!operador?.empresaId || !conexao.login_pppoe) {
      mostrarErro('Login PPPoE nao configurado nesta conexao');
      setModalConfirmar(null);
      return;
    }
    setExecutando('desbloqueando');
    try {
      const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Restaura o perfil que ja estava salvo nesta conexao (plano do
        // cliente). Se por algum motivo a conexao nao tiver perfil
        // salvo, usa "default" em vez de deixar o secret sem perfil.
        body: JSON.stringify({ original_name: conexao.login_pppoe, profile: conexao.perfil_radius || 'default' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro desconhecido');

      await supabase.from('conexoes_pppoe').update({ status: 'ativo' }).eq('id', conexao.id);

      mostrarSucesso('Conexao desbloqueada no MikroTik');
      await carregarConexoes();
      buscarStatusMK();
    } catch (e: any) {
      mostrarErro('Erro ao desbloquear: ' + (e.message || ''));
    } finally {
      setExecutando('');
      setModalConfirmar(null);
    }
  };

  const derrubarSessao = async (conexao: ConexaoPPPoE) => {
    setExecutando('derrubando');
    try {
      if (!operador?.empresaId || !conexao.login_pppoe) {
        mostrarErro('Login PPPoE nao configurado nesta conexao');
        setExecutando('');
        setModalConfirmar(null);
        return;
      }

      const res = await fetch(`/api/mk-proxy?path=pppoe/disconnect&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: conexao.login_pppoe }),
      });

      const data = await res.json();
      if (data.success) {
        mostrarSucesso('Sessao derrubada! Cliente sera desconectado.');
        setStatusMK(prev => {
          const novo = { ...prev };
          delete novo[conexao.id];
          return novo;
        });
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
  // INICIAR EDICAO DE CONEXAO
  // ==========================
  const iniciarEdicao = (conexao: ConexaoPPPoE) => {
    setEditandoConexao(conexao.id);
    setAdicionando(false);
    setFormConexao({
      descricao: conexao.descricao,
      login_pppoe: conexao.login_pppoe || '',
      senha_pppoe: conexao.senha_pppoe || '',
      mac_address: conexao.mac_address || '',
      perfil_radius: conexao.perfil_radius || '',
      ip_fixo: conexao.ip_fixo || '',
      vlan: conexao.vlan || '',
      porta_olt: conexao.porta_olt || '',
      onu_serial: conexao.onu_serial || '',
    });
    setExpandida(conexao.id);
  };

  const iniciarNova = () => {
    setAdicionando(true);
    setEditandoConexao(null);
    setFormConexao({ descricao: '' });
  };

  const cancelarForm = () => {
    setAdicionando(false);
    setEditandoConexao(null);
    setFormConexao({});
  };

  // ==========================
  // IMPORTAR CONEXAO EXISTENTE
  // ==========================
  const buscarClientesParaImportar = async () => {
    if (!buscaImportar.trim() || buscaImportar.trim().length < 3) {
      mostrarErro('Digite pelo menos 3 caracteres para buscar');
      return;
    }

    setBuscandoClientes(true);
    setResultadosBusca([]);
    setClienteSelecionado(null);
    setConexoesSelecionado([]);
    try {
      const termo = buscaImportar.trim();
      // Busca por nome ou CPF (diferente do cliente atual)
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cpf, login_pppoe, empresa_id')
        .eq('empresa_id', cliente.empresa_id)
        .neq('id', cliente.id)
        .or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%,login_pppoe.ilike.%${termo}%`)
        .limit(10);

      if (error) throw error;
      setResultadosBusca(data || []);
      if (data?.length === 0) {
        mostrarErro('Nenhum cliente encontrado');
      }
    } catch (e: any) {
      mostrarErro('Erro na busca: ' + (e.message || ''));
    } finally {
      setBuscandoClientes(false);
    }
  };

  const selecionarClienteImportar = async (cli: any) => {
    setClienteSelecionado(cli);
    setCarregandoConexoes(true);
    try {
      // Buscar conexoes desse cliente na tabela conexoes_pppoe
      const { data: conexoesDB } = await supabase
        .from('conexoes_pppoe')
        .select('*')
        .eq('cliente_id', cli.id);

      if (conexoesDB && conexoesDB.length > 0) {
        setConexoesSelecionado(conexoesDB);
      } else if (cli.login_pppoe) {
        // Fallback: se nao tem na tabela conexoes_pppoe, pega direto do cliente
        setConexoesSelecionado([{
          id: 'from_cliente',
          login_pppoe: cli.login_pppoe,
          senha_pppoe: cli.senha_pppoe,
          mac_address: cli.mac_address,
          perfil_radius: cli.perfil_radius,
          ip_fixo: cli.ip_fixo,
          vlan: cli.vlan,
          porta_olt: cli.porta_olt,
          onu_serial: cli.onu_serial,
          descricao: 'Principal',
        }]);
      } else {
        setConexoesSelecionado([]);
        mostrarErro('Este cliente nao tem conexoes PPPoE');
      }
    } catch {
      mostrarErro('Erro ao carregar conexoes do cliente');
    } finally {
      setCarregandoConexoes(false);
    }
  };

  const importarConexao = async (con: any) => {
    if (!descricaoImport.trim()) {
      mostrarErro('Dê um nome para o ponto (ex: Casa 2, Escritório)');
      return;
    }

    setExecutando('importando');
    try {
      // Inserir como nova conexao do cliente atual
      const { error } = await supabase
        .from('conexoes_pppoe')
        .insert({
          cliente_id: cliente.id,
          empresa_id: cliente.empresa_id,
          descricao: descricaoImport.trim(),
          login_pppoe: con.login_pppoe || null,
          senha_pppoe: con.senha_pppoe || null,
          mac_address: con.mac_address || null,
          perfil_radius: con.perfil_radius || null,
          ip_fixo: con.ip_fixo || null,
          vlan: con.vlan || null,
          porta_olt: con.porta_olt || null,
          onu_serial: con.onu_serial || null,
        });

      if (error) throw error;

      // Se veio da tabela conexoes_pppoe, remover do cliente original
      if (con.id && con.id !== 'from_cliente') {
        await supabase.from('conexoes_pppoe').delete().eq('id', con.id);
      }

      mostrarSucesso(`Conexao "${descricaoImport}" importada com sucesso!`);
      setModalImportar(false);
      setBuscaImportar('');
      setResultadosBusca([]);
      setClienteSelecionado(null);
      setConexoesSelecionado([]);
      setDescricaoImport('');
      await carregarConexoes();
    } catch (e: any) {
      mostrarErro('Erro ao importar: ' + (e.message || ''));
    } finally {
      setExecutando('');
    }
  };

  // ==========================
  // CAMPO DE FORMULARIO: handler estavel usado pelo <CampoForm> (ver
  // definicao top-level acima, fora de TabConexao -- e essa a correcao
  // do bug de perda de foco a cada tecla digitada).
  // ==========================
  const aoMudarCampo = (campo: string, v: string) => {
    if (campo === 'mac_address') v = mascaraMAC(v);
    setFormConexao(prev => ({ ...prev, [campo]: v }));
  };

  const estaEditandoForm = Boolean(editandoConexao || adicionando);

  // ==========================
  // RENDER
  // ==========================
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-3 text-xs font-mono text-zinc-500">Carregando conexoes...</span>
      </div>
    );
  }

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

      {/* Header com botao adicionar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest">
            Conexoes PPPoE ({conexoes.length})
          </p>
          <button
            onClick={buscarStatusMK}
            disabled={buscandoMK}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all cursor-pointer"
            title="Atualizar status MikroTik"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${buscandoMK ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalImportar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold uppercase hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> IMPORTAR EXISTENTE
          </button>
          <button
            onClick={iniciarNova}
            disabled={adicionando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> NOVO PONTO
          </button>
        </div>
      </div>

      {/* Sem conexoes */}
      {conexoes.length === 0 && !adicionando && (
        <Card className="border border-zinc-800/50">
          <CardContent className="p-8 text-center">
            <WifiOff className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-xs font-mono text-zinc-500">Nenhuma conexao PPPoE cadastrada</p>
            <p className="text-[10px] font-mono text-zinc-700 mt-1">Clique em "NOVO PONTO" para adicionar</p>
          </CardContent>
        </Card>
      )}

      {/* ===== FORMULARIO NOVA CONEXAO ===== */}
      {adicionando && (
        <Card className="border border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-mono font-bold text-emerald-400 uppercase">Novo Ponto de Internet</p>
              </div>
              <button onClick={cancelarForm} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className={estiloRotulo}>Descricao do ponto *</label>
              <input
                type="text"
                placeholder="Ex: Casa, Escritorio, Casa da namorada"
                value={formConexao.descricao || ''}
                onChange={(e) => setFormConexao(prev => ({ ...prev, descricao: e.target.value }))}
                className={estiloInput}
              />
            </div>

            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Acesso PPPoE</p>
              <button onClick={gerarLogin} className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/20 cursor-pointer">
                <Key className="w-3 h-3" /> GERAR LOGIN
              </button>
              <button onClick={gerarSenha} className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/20 cursor-pointer">
                <Zap className="w-3 h-3" /> GERAR SENHA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoForm label="Login PPPoE" campo="login_pppoe" placeholder="usuario@v5fibra" estaEditando={estaEditandoForm} valorForm={formConexao.login_pppoe || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
              <CampoForm label="Senha PPPoE" campo="senha_pppoe" placeholder="senha" estaEditando={estaEditandoForm} valorForm={formConexao.senha_pppoe || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
            </div>

            <p className="text-[10px] font-mono text-zinc-500 uppercase border-b border-zinc-800 pb-2">Dados de Rede</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <CampoForm label="IP Fixo" campo="ip_fixo" placeholder="0.0.0.0" estaEditando={estaEditandoForm} valorForm={formConexao.ip_fixo || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
              <CampoForm label="MAC Address" campo="mac_address" placeholder="AA:BB:CC:DD:EE:FF" estaEditando={estaEditandoForm} valorForm={formConexao.mac_address || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
              <CampoForm label="Perfil RADIUS" campo="perfil_radius" placeholder="plano_100mb" estaEditando={estaEditandoForm} valorForm={formConexao.perfil_radius || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
              <CampoForm label="VLAN" campo="vlan" estaEditando={estaEditandoForm} valorForm={formConexao.vlan || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
              <CampoForm label="Porta OLT" campo="porta_olt" estaEditando={estaEditandoForm} valorForm={formConexao.porta_olt || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
              <CampoForm label="Serial ONU" campo="onu_serial" estaEditando={estaEditandoForm} valorForm={formConexao.onu_serial || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={cancelarForm} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono uppercase hover:bg-zinc-900 transition-all cursor-pointer">
                CANCELAR
              </button>
              <button
                onClick={salvarConexao}
                disabled={executando === 'salvando'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-mono font-bold uppercase hover:bg-emerald-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {executando === 'salvando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                SALVAR
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== LISTA DE CONEXOES (ACCORDION) ===== */}
      {conexoes.map((conexao) => {
        const online = !!statusMK[conexao.id];
        const mkData = statusMK[conexao.id];
        const isExpandida = expandida === conexao.id;
        const isEditando = editandoConexao === conexao.id;

        return (
          <Card key={conexao.id} className={`border ${online ? 'border-emerald-500/20' : conexao.status === 'bloqueado' ? 'border-red-500/20' : 'border-zinc-800/50'} transition-all`}>
            <CardContent className="p-0">
              {/* Header do accordion */}
              <button
                onClick={() => {
                  if (isEditando) return;
                  setExpandida(isExpandida ? null : conexao.id);
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    online ? 'bg-emerald-500/20' : conexao.status === 'bloqueado' ? 'bg-red-500/20' : 'bg-zinc-800'
                  }`}>
                    {buscandoMK ? (
                      <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                    ) : online ? (
                      <Wifi className="w-5 h-5 text-emerald-400" />
                    ) : conexao.status === 'bloqueado' ? (
                      <Lock className="w-5 h-5 text-red-400" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-zinc-600" />
                      <p className="text-sm font-mono font-bold text-white">{conexao.descricao}</p>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                        online ? 'bg-emerald-500/20 text-emerald-400' :
                        conexao.status === 'bloqueado' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {online ? 'ONLINE' : conexao.status === 'bloqueado' ? 'BLOQUEADO' : 'OFFLINE'}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                      {conexao.login_pppoe || 'Sem login configurado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {online && <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />}
                  {isExpandida ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </div>
              </button>

              {/* Conteudo expandido */}
              {isExpandida && (
                <div className="px-4 pb-4 space-y-4 border-t border-zinc-900">
                  {/* Info MikroTik quando online */}
                  {online && mkData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div>
                        <p className="text-[10px] font-mono text-emerald-600 uppercase">IP Atribuido</p>
                        <p className="text-xs font-mono text-emerald-400 font-bold">{mkData.address || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-emerald-600 uppercase">Uptime</p>
                        <p className="text-xs font-mono text-emerald-400 font-bold">{mkData.uptime || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-emerald-600 uppercase">MAC</p>
                        <p className="text-xs font-mono text-emerald-400 font-bold">{mkData.caller_id || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-emerald-600 uppercase">Servico</p>
                        <p className="text-xs font-mono text-emerald-400 font-bold">{mkData.service || 'pppoe'}</p>
                      </div>
                    </div>
                  )}

                  {/* Dados PPPoE */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
                      <p className="text-[10px] font-mono uppercase text-emerald-500 tracking-widest">Acesso PPPoE</p>
                      {isEditando && (
                        <div className="flex items-center gap-1">
                          <button onClick={gerarLogin} className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/20 cursor-pointer">
                            <Key className="w-3 h-3" /> GERAR LOGIN
                          </button>
                          <button onClick={gerarSenha} className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono hover:bg-emerald-500/20 cursor-pointer">
                            <Zap className="w-3 h-3" /> GERAR SENHA
                          </button>
                        </div>
                      )}
                      {!isEditando && conexao.login_pppoe && (
                        <button
                          onClick={() => {
                            const texto = `Login: ${conexao.login_pppoe}\nSenha: ${conexao.senha_pppoe || '-'}`;
                            copiar(texto, 'Credenciais');
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/60 text-zinc-500 text-[10px] font-mono hover:text-emerald-400 transition-all cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> COPIAR TUDO
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CampoForm label="Login PPPoE" campo="login_pppoe" placeholder="usuario@v5fibra" copiavel valor={conexao.login_pppoe || ''} estaEditando={estaEditandoForm} valorForm={formConexao.login_pppoe || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
                      <div>
                        <label className={estiloRotulo}>Senha PPPoE</label>
                        {isEditando ? (
                          <input
                            type="text"
                            placeholder="senha"
                            value={formConexao.senha_pppoe || ''}
                            onChange={(e) => setFormConexao(prev => ({ ...prev, senha_pppoe: e.target.value }))}
                            className={estiloInput}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className={estiloValor}>
                              {conexao.senha_pppoe
                                ? (mostrarSenha[conexao.id] ? conexao.senha_pppoe : '••••••••')
                                : <span className="text-zinc-600">-</span>
                              }
                            </p>
                            {conexao.senha_pppoe && (
                              <>
                                <button
                                  onClick={() => setMostrarSenha(prev => ({ ...prev, [conexao.id]: !prev[conexao.id] }))}
                                  className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer"
                                >
                                  {mostrarSenha[conexao.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button onClick={() => copiar(conexao.senha_pppoe!, 'Senha')} className="text-zinc-600 hover:text-emerald-400 transition-all cursor-pointer">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dados de Rede */}
                  <div>
                    <p className="text-[10px] font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Dados de Rede</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <CampoForm label="IP Fixo" campo="ip_fixo" placeholder="0.0.0.0" copiavel valor={conexao.ip_fixo || ''} estaEditando={estaEditandoForm} valorForm={formConexao.ip_fixo || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
                      <CampoForm label="MAC Address" campo="mac_address" placeholder="AA:BB:CC:DD:EE:FF" copiavel valor={conexao.mac_address || ''} estaEditando={estaEditandoForm} valorForm={formConexao.mac_address || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
                      <CampoForm label="Perfil RADIUS" campo="perfil_radius" placeholder="plano_100mb" copiavel valor={conexao.perfil_radius || ''} estaEditando={estaEditandoForm} valorForm={formConexao.perfil_radius || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
                      <CampoForm label="VLAN" campo="vlan" copiavel valor={conexao.vlan || ''} estaEditando={estaEditandoForm} valorForm={formConexao.vlan || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
                      <CampoForm label="Porta OLT" campo="porta_olt" copiavel valor={conexao.porta_olt || ''} estaEditando={estaEditandoForm} valorForm={formConexao.porta_olt || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
                      <CampoForm label="Serial ONU" campo="onu_serial" copiavel valor={conexao.onu_serial || ''} estaEditando={estaEditandoForm} valorForm={formConexao.onu_serial || ''} onMudar={aoMudarCampo} onCopiar={copiar} />
                    </div>
                  </div>

                  {/* Botoes de acao */}
                  {isEditando ? (
                    <div className="flex gap-3 pt-2">
                      <button onClick={cancelarForm} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono uppercase hover:bg-zinc-900 transition-all cursor-pointer">
                        CANCELAR
                      </button>
                      <button
                        onClick={salvarConexao}
                        disabled={executando === 'salvando'}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-mono font-bold uppercase hover:bg-emerald-500 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {executando === 'salvando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        SALVAR
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {/* Editar */}
                      <button
                        onClick={() => iniciarEdicao(conexao)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-mono uppercase hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" /> EDITAR DADOS
                      </button>

                      {/* Bloquear/Desbloquear */}
                      {conexao.status === 'bloqueado' ? (
                        <button
                          onClick={() => setModalConfirmar({
                            titulo: 'Desbloquear Conexao',
                            mensagem: `Desbloquear "${conexao.descricao}" de ${cliente.nome}?`,
                            tipo: 'info',
                            acao: () => desbloquearConexao(conexao),
                          })}
                          disabled={!!executando}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Unlock className="w-3.5 h-3.5" /> DESBLOQUEAR
                        </button>
                      ) : (
                        <button
                          onClick={() => setModalConfirmar({
                            titulo: 'Bloquear Conexao',
                            mensagem: `Bloquear "${conexao.descricao}" de ${cliente.nome}? O ponto perdera acesso a internet.`,
                            tipo: 'danger',
                            acao: () => bloquearConexao(conexao),
                          })}
                          disabled={!!executando}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono uppercase hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" /> BLOQUEAR
                        </button>
                      )}

                      {/* Derrubar sessao */}
                      <button
                        onClick={() => setModalConfirmar({
                          titulo: 'Derrubar Sessao',
                          mensagem: `Derrubar sessao PPPoE de "${conexao.descricao}"? O ponto sera desconectado.`,
                          tipo: 'warning',
                          acao: () => derrubarSessao(conexao),
                        })}
                        disabled={!!executando || !online}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono uppercase hover:bg-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> DERRUBAR
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => setModalConfirmar({
                          titulo: 'Excluir Conexao',
                          mensagem: `Excluir permanentemente "${conexao.descricao}"? Esta acao nao pode ser desfeita.`,
                          tipo: 'danger',
                          acao: () => excluirConexao(conexao.id),
                        })}
                        disabled={!!executando}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-mono uppercase hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> EXCLUIR
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ================================================================ */}
      {/* MODAL: IMPORTAR CONEXAO EXISTENTE */}
      {/* ================================================================ */}
      {modalImportar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalImportar(false)}>
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/20">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase">Importar Conexao Existente</h3>
                  <p className="text-[10px] font-mono text-zinc-500">Busque outro cliente e puxe o PPPoE dele</p>
                </div>
              </div>
              <button onClick={() => { setModalImportar(false); setClienteSelecionado(null); setResultadosBusca([]); setBuscaImportar(''); setDescricaoImport(''); }} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca */}
            {!clienteSelecionado && (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Buscar por nome, CPF ou login PPPoE..."
                    value={buscaImportar}
                    onChange={(e) => setBuscaImportar(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarClientesParaImportar()}
                    className={estiloInput + ' flex-1'}
                  />
                  <button
                    onClick={buscarClientesParaImportar}
                    disabled={buscandoClientes}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-mono uppercase hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {buscandoClientes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>

                {/* Resultados */}
                {resultadosBusca.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">Selecione o cliente:</p>
                    {resultadosBusca.map((cli) => (
                      <button
                        key={cli.id}
                        onClick={() => selecionarClienteImportar(cli)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <UserCheck className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-bold text-white truncate">{cli.nome}</p>
                          <p className="text-[10px] font-mono text-zinc-500">
                            CPF: {cli.cpf || '-'} | PPPoE: {cli.login_pppoe || 'sem login'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Cliente selecionado — mostrar conexoes */}
            {clienteSelecionado && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs font-mono font-bold text-blue-400">{clienteSelecionado.nome}</p>
                    <p className="text-[10px] font-mono text-blue-300/60">CPF: {clienteSelecionado.cpf || '-'}</p>
                  </div>
                  <button
                    onClick={() => { setClienteSelecionado(null); setConexoesSelecionado([]); setDescricaoImport(''); }}
                    className="ml-auto text-zinc-500 hover:text-white text-[10px] font-mono cursor-pointer"
                  >
                    TROCAR
                  </button>
                </div>

                {carregandoConexoes ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                ) : conexoesSelecionado.length === 0 ? (
                  <p className="text-xs font-mono text-zinc-500 text-center py-4">Nenhuma conexao PPPoE encontrada neste cliente</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">Conexoes disponiveis para importar:</p>
                    {conexoesSelecionado.map((con, idx) => (
                      <div key={con.id || idx} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-emerald-400" />
                          <p className="text-xs font-mono font-bold text-white">{con.descricao || 'Conexao'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div><span className="text-zinc-600">Login:</span> <span className="text-zinc-300">{con.login_pppoe || '-'}</span></div>
                          <div><span className="text-zinc-600">Perfil:</span> <span className="text-zinc-300">{con.perfil_radius || '-'}</span></div>
                          <div><span className="text-zinc-600">MAC:</span> <span className="text-zinc-300">{con.mac_address || '-'}</span></div>
                          <div><span className="text-zinc-600">IP:</span> <span className="text-zinc-300">{con.ip_fixo || '-'}</span></div>
                        </div>

                        {/* Nome do ponto + botao importar */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Nome do ponto (ex: Casa 2)"
                            value={descricaoImport}
                            onChange={(e) => setDescricaoImport(e.target.value)}
                            className={estiloInput + ' flex-1 !text-xs'}
                          />
                          <button
                            onClick={() => importarConexao(con)}
                            disabled={executando === 'importando'}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-mono font-bold uppercase hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            {executando === 'importando' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            IMPORTAR
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
                {executando ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}