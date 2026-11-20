import os
path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'app', 'api', 'superadmin', 'consumo', 'route.ts')
print('path =', path)
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """    // 1. Busca todas as empresas
    // IMPORTANTE: nunca usar select('*') aqui — essa lista vai para o
    // front-end do Root Master, então só trazemos os campos de empresa
    // que fazem sentido mostrar (nunca termo_hash/termo_ip/senha/tokens
    // de gateway, que não vivem nesta tabela mas poderiam vir no futuro).
    const { data: empresas, error: erroEmpresas } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_empresa, cnpj, endereco, lat, lon, plano, status_assinatura, telefone_suporte, criado_em')
      .order('criado_em', { ascending: true });"""
new = """    // 1. Busca todas as empresas
    // IMPORTANTE: nunca usar select('*') aqui — essa lista vai para o
    // front-end do Root Master, então só trazemos os campos de empresa
    // que fazem sentido mostrar (nunca termo_hash/termo_ip/senha/tokens
    // de gateway, que não vivem nesta tabela mas poderiam vir no futuro).
    // "cnpj" NAO e uma coluna real de "empresas" (so existe em "clientes",
    // a tabela de clientes finais de cada provedor) - selecionar essa coluna
    // aqui quebrava a query inteira com "column empresas.cnpj does not exist"
    // e por isso a lista de clientes do Root Master aparecia vazia.
    const { data: empresas, error: erroEmpresas } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_empresa, endereco, lat, lon, plano, status_assinatura, telefone_suporte, criado_em')
      .order('criado_em', { ascending: true });"""
assert content.count(old) == 1, "select block not found"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK consumo select fixed (cnpj removed)')
