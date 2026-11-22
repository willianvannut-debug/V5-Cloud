import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')
path = os.path.join(BASE, 'app', 'dashboard', 'clientes', '[id]', 'components', 'TabConexao.tsx')

with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# ======================================================================
# 1) Novas funcoes de sync com o MikroTik via bridge (mk-proxy), no mesmo
#    padrao ja usado e testado em app/dashboard/clientes/acesso-rede/page.tsx
#    (pppoe/secrets/add e pppoe/secrets/set). Inseridas logo apos gerarSenha,
#    antes do comentario "SALVAR CONEXAO".
# ======================================================================
old_antes_salvar = """    setFormConexao(prev => ({ ...prev, senha_pppoe: senha }));
    mostrarSucesso(`Senha gerada: ${senha}`);
  };

  // ==========================
  // SALVAR CONEXAO (NOVA OU EDICAO)
  // ==========================
  const salvarConexao = async () => {"""

new_antes_salvar = """    setFormConexao(prev => ({ ...prev, senha_pppoe: senha }));
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
  const salvarConexao = async () => {"""

assert t.count(old_antes_salvar) == 1, "ponto de insercao das funcoes de sync nao encontrado"
t = t.replace(old_antes_salvar, new_antes_salvar)

# ======================================================================
# 2) salvarConexao: depois de gravar no Supabase, sincroniza o secret real
#    no MikroTik (cria na primeira vez, atualiza nas edicoes).
# ======================================================================
old_salvar_body = """      if (editandoConexao) {
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
        mostrarSucesso('Conexao atualizada!');
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
        mostrarSucesso('Nova conexao adicionada!');
      }"""

new_salvar_body = """      const loginAnterior = editandoConexao
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
      }"""

assert t.count(old_salvar_body) == 1, "corpo de salvarConexao nao encontrado"
t = t.replace(old_salvar_body, new_salvar_body)

with open(path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK TabConexao.tsx')
