import os
path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'app', 'dashboard', 'clientes', 'mapa', 'page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1) import do componente de visão Root
old_import = "import { useAuth } from '@/context/AuthContext';"
new_import = "import { useAuth } from '@/context/AuthContext';\nimport RootEmpresasMapaView from '@/components/RootEmpresasMapaView';"
assert content.count(old_import) == 1, "import useAuth não encontrado (ou duplicado)"
content = content.replace(old_import, new_import)

# 2) passa a pegar também "operador" do useAuth (antes só pegava "empresa")
old_hook = "  const { empresa } = useAuth();"
new_hook = "  const { empresa, operador } = useAuth();"
assert content.count(old_hook) == 1, "hook useAuth(empresa) não encontrado"
content = content.replace(old_hook, new_hook)

# 3) branch: se for superadmin/root, mostra o mapa das EMPRESAS do V5 Cloud
old_render = """  return (
    <div className="p-6 space-y-4 bg-[#0a0a0a] min-h-screen text-zinc-50 font-mono">

      {/* HEADER */}"""
new_render = """  if (operador && (operador.role === 'superadmin' || operador.role === 'root')) {
    return <RootEmpresasMapaView role={operador.role} />;
  }

  return (
    <div className="p-6 space-y-4 bg-[#0a0a0a] min-h-screen text-zinc-50 font-mono">

      {/* HEADER */}"""
assert content.count(old_render) == 1, "bloco de render não encontrado"
content = content.replace(old_render, new_render)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK clientes/mapa/page.tsx com branch de superadmin')
