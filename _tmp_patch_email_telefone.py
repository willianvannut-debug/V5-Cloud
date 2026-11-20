import os

# 1) API: adiciona email e telefone da empresa no select
api_path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'app', 'api', 'superadmin', 'consumo', 'route.ts')
with open(api_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_select = ".select('id, nome_empresa, endereco, lat, lon, plano, status_assinatura, telefone_suporte, criado_em')"
new_select = ".select('id, nome_empresa, endereco, lat, lon, plano, status_assinatura, telefone_suporte, email, telefone, criado_em')"
assert content.count(old_select) == 1, "select não encontrado na API"
content = content.replace(old_select, new_select)

with open(api_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK API: email/telefone adicionados ao select')

# 2) Componente: mostra email/telefone da empresa na coluna Contato
view_path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'components', 'RootEmpresasClientesView.tsx')
with open(view_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_interface = """  plano: string | null;
  status_assinatura: string | null;
  telefone_suporte: string | null;
  criado_em: string | null;"""
new_interface = """  plano: string | null;
  status_assinatura: string | null;
  telefone_suporte: string | null;
  email: string | null;
  telefone: string | null;
  criado_em: string | null;"""
assert content.count(old_interface) == 1, "interface EmpresaCliente não encontrada"
content = content.replace(old_interface, new_interface)

old_import_icons = "Users, Network, Phone, Calendar, Loader2,"
new_import_icons = "Users, Network, Phone, Mail, Calendar, Loader2,"
assert content.count(old_import_icons) == 1, "import de ícones não encontrado"
content = content.replace(old_import_icons, new_import_icons)

old_contato = """                    <td className="p-4 text-zinc-400">
                      {emp.telefone_suporte ? (
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {emp.telefone_suporte}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>"""
new_contato = """                    <td className="p-4 text-zinc-400">
                      <div className="space-y-1">
                        {(emp.telefone_suporte || emp.telefone) ? (
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {emp.telefone_suporte || emp.telefone}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                        {emp.email && (
                          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><Mail className="w-3 h-3" /> {emp.email}</span>
                        )}
                      </div>
                    </td>"""
assert content.count(old_contato) == 1, "coluna de contato não encontrada"
content = content.replace(old_contato, new_contato)

# Busca também por email agora
old_filtro = """    return empresas.filter((e) =>
      (e.nome_empresa || '').toLowerCase().includes(termo) ||
      (e.endereco || '').toLowerCase().includes(termo)
    );"""
new_filtro = """    return empresas.filter((e) =>
      (e.nome_empresa || '').toLowerCase().includes(termo) ||
      (e.endereco || '').toLowerCase().includes(termo) ||
      (e.email || '').toLowerCase().includes(termo)
    );"""
assert content.count(old_filtro) == 1, "filtro de busca não encontrado"
content = content.replace(old_filtro, new_filtro)

with open(view_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK componente: email/telefone exibidos na coluna Contato + busca')
