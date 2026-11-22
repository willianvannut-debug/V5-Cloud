# -*- coding: utf-8 -*-
import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')
path = os.path.join(BASE, 'app', 'dashboard', 'clientes', '[id]', 'components', 'TabConexao.tsx')

with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# ======================================================================
# Testando ao vivo contra o Bridge real: path=pppoe/secret/set-profile
# (copiado de app/dashboard/mikrotik/monitor/page.tsx) NAO EXISTE no
# Bridge -- ele responde com uma pagina HTML de erro (404), nao JSON, daí
# o "Unexpected token '<' ... is not valid JSON". Ou seja, o botao
# BLOQUEAR/LIBERAR da tela de monitor tambem esta quebrado hoje (bug
# pre-existente, fora do escopo agora, vou avisar o usuario).
#
# O endpoint real que funciona (testado contra o roteador de verdade,
# profile mudou de 100-Mega pra BLOQUEADO e voltou) e o mesmo ja usado em
# atualizarSecretMikrotik: path=pppoe/secrets/set (plural), com
# original_name identificando o secret e profile o novo perfil.
# ======================================================================

old_bloquear_fetch = """      const res = await fetch(`/api/mk-proxy?path=pppoe/secret/set-profile&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_name: conexao.login_pppoe, profile: 'BLOQUEADO' }),
      });"""

new_bloquear_fetch = """      const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_name: conexao.login_pppoe, profile: 'BLOQUEADO' }),
      });"""

assert t.count(old_bloquear_fetch) == 1, "fetch de bloquearConexao nao encontrado"
t = t.replace(old_bloquear_fetch, new_bloquear_fetch)

old_desbloquear_fetch = """      const res = await fetch(`/api/mk-proxy?path=pppoe/secret/set-profile&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Restaura o perfil que ja estava salvo nesta conexao (plano do
        // cliente). Se por algum motivo a conexao nao tiver perfil
        // salvo, usa "default" em vez de deixar o secret sem perfil.
        body: JSON.stringify({ secret_name: conexao.login_pppoe, profile: conexao.perfil_radius || 'default' }),
      });"""

new_desbloquear_fetch = """      const res = await fetch(`/api/mk-proxy?path=pppoe/secrets/set&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Restaura o perfil que ja estava salvo nesta conexao (plano do
        // cliente). Se por algum motivo a conexao nao tiver perfil
        // salvo, usa "default" em vez de deixar o secret sem perfil.
        body: JSON.stringify({ original_name: conexao.login_pppoe, profile: conexao.perfil_radius || 'default' }),
      });"""

assert t.count(old_desbloquear_fetch) == 1, "fetch de desbloquearConexao nao encontrado"
t = t.replace(old_desbloquear_fetch, new_desbloquear_fetch)

with open(path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK TabConexao.tsx (endpoint correto pppoe/secrets/set)')
