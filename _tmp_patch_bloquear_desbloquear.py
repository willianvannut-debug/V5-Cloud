# -*- coding: utf-8 -*-
import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')
path = os.path.join(BASE, 'app', 'dashboard', 'clientes', '[id]', 'components', 'TabConexao.tsx')

with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# ======================================================================
# CAUSA RAIZ: os botoes BLOQUEAR/DESBLOQUEAR chamavam /api/mikrotik/block,
# que nao existe como rota propria -- cai no catch-all generico
# app/api/mikrotik/[...path]/route.js, que so retorna
# {funcionando:true, caminho:...} sem o campo "success". Como o front
# checa "if (!res.ok || !data.success) throw ...", o bloqueio/desbloqueio
# SEMPRE falhava (sempre caia no catch e mostrava "Erro ao bloquear").
#
# A pagina app/dashboard/mikrotik/monitor/page.tsx ja tem uma
# implementacao real e funcionando de bloqueio, via mk-proxy
# (pppoe/secret/set-profile), trocando o perfil PPP do secret pra
# "BLOQUEADO". Essa correcao usa o mesmo caminho ja validado, em vez da
# rota inexistente -- e no desbloqueio, restaura o perfil_radius que ja
# esta salvo na conexao (em vez de pedir pro usuario escolher de novo).
# ======================================================================

old_bloquear = """  const bloquearConexao = async (conexao: ConexaoPPPoE) => {
    setExecutando('bloqueando');
    try {
      const res = await fetch('/api/mikrotik/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cliente_id: cliente.id, login_pppoe: conexao.login_pppoe, acao: 'bloquear' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro desconhecido');

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
  };"""

new_bloquear = """  const bloquearConexao = async (conexao: ConexaoPPPoE) => {
    if (!operador?.empresaId || !conexao.login_pppoe) {
      mostrarErro('Login PPPoE nao configurado nesta conexao');
      setModalConfirmar(null);
      return;
    }
    setExecutando('bloqueando');
    try {
      const res = await fetch(`/api/mk-proxy?path=pppoe/secret/set-profile&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_name: conexao.login_pppoe, profile: 'BLOQUEADO' }),
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
  };"""

assert t.count(old_bloquear) == 1, "bloquearConexao antigo nao encontrado"
t = t.replace(old_bloquear, new_bloquear)

old_desbloquear = """  const desbloquearConexao = async (conexao: ConexaoPPPoE) => {
    setExecutando('desbloqueando');
    try {
      const res = await fetch('/api/mikrotik/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cliente_id: cliente.id, login_pppoe: conexao.login_pppoe, acao: 'desbloquear' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro desconhecido');

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
  };"""

new_desbloquear = """  const desbloquearConexao = async (conexao: ConexaoPPPoE) => {
    if (!operador?.empresaId || !conexao.login_pppoe) {
      mostrarErro('Login PPPoE nao configurado nesta conexao');
      setModalConfirmar(null);
      return;
    }
    setExecutando('desbloqueando');
    try {
      const res = await fetch(`/api/mk-proxy?path=pppoe/secret/set-profile&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Restaura o perfil que ja estava salvo nesta conexao (plano do
        // cliente). Se por algum motivo a conexao nao tiver perfil
        // salvo, usa "default" em vez de deixar o secret sem perfil.
        body: JSON.stringify({ secret_name: conexao.login_pppoe, profile: conexao.perfil_radius || 'default' }),
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
  };"""

assert t.count(old_desbloquear) == 1, "desbloquearConexao antigo nao encontrado"
t = t.replace(old_desbloquear, new_desbloquear)

with open(path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK TabConexao.tsx (bloquear/desbloquear via mk-proxy)')
