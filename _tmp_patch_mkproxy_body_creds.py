import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')
path = os.path.join(BASE, 'app', 'api', 'mk-proxy', 'route.ts')

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# ======================================================================
# Causa raiz encontrada em producao (testado ao vivo com o Bridge real):
# as rotas de ESCRITA do Bridge (pppoe/secrets/add, /set, /remove, etc)
# exigem host/user/password tambem no corpo da requisicao -- so enviar
# como headers x-mk-* (que e o que o codigo ja fazia, e funciona pras
# rotas de LEITURA) nao basta. Sem isso o Bridge respondia sempre
# 400 "host, user, password, client_name, client_password e profile
# obrigatorios", nao importa o que mais fosse enviado no body. Isso
# quebrava toda escrita no MikroTik via mk-proxy -- inclusive a pagina
# acesso-rede, que ja existia antes e nao foi tocada nesta sessao.
# ======================================================================
old_post = """    const url = `${BRIDGE_URL}/${bridgePath}`
    const headers = await buildHeaders(finalServerId, finalEmpresaId)

    const fetchOptions: any = {
      method: 'POST',
      headers,
    }

    if (bodyData) {
      fetchOptions.body = JSON.stringify(bodyData)
    }"""

new_post = """    const url = `${BRIDGE_URL}/${bridgePath}`
    const headers = await buildHeaders(finalServerId, finalEmpresaId)

    // Rotas de escrita do Bridge (pppoe/secrets/add, /set, /remove, etc)
    // exigem host/user/password tambem no corpo, alem dos headers x-mk-*.
    // Sem isso o Bridge recusa com 400 "host, user, password ... obrigatorios"
    // mesmo com os headers corretos -- confirmado testando direto contra o
    // Bridge real. O spread de bodyData por ultimo deixa um valor explicito
    // enviado pelo chamador sobrescrever o resolvido aqui, se precisar.
    let serverConfig: { ip_address?: string; api_user?: string; api_password?: string } | null = null
    if (finalServerId) {
      serverConfig = await getServerConfig(finalServerId)
    } else if (finalEmpresaId) {
      serverConfig = await getDefaultServer(finalEmpresaId)
    }

    const bodyComCredenciais = bodyData
      ? {
          host: serverConfig?.ip_address || undefined,
          user: serverConfig?.api_user || undefined,
          password: serverConfig?.api_password || undefined,
          ...bodyData,
        }
      : bodyData

    const fetchOptions: any = {
      method: 'POST',
      headers,
    }

    if (bodyComCredenciais) {
      fetchOptions.body = JSON.stringify(bodyComCredenciais)
    }"""

assert c.count(old_post) == 1, "bloco POST (fetchOptions) nao encontrado"
c = c.replace(old_post, new_post)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('OK mk-proxy/route.ts')
