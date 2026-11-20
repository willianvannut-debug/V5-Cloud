import os
path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'app', 'dashboard', 'clientes', 'page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1) adiciona o import do componente de visão Root
old_import = "import { useAuth } from '@/context/AuthContext';"
new_import = "import { useAuth } from '@/context/AuthContext';\nimport RootEmpresasClientesView from '@/components/RootEmpresasClientesView';"
assert content.count(old_import) == 1, "import useAuth não encontrado (ou duplicado)"
content = content.replace(old_import, new_import)

# 2) insere o branch logo antes do "RENDER" principal da página,
#    assim que carrega como superadmin/root mostra as EMPRESAS do V5 Cloud
#    em vez dos clientes finais do tenant (pra não misturar os dois).
old_render = """  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">"""
new_render = """  // ==========================
  // ROOT MASTER: se quem está logado é superadmin/root, esta aba mostra
  // as EMPRESAS que assinam o V5 Cloud, não os clientes finais do tenant.
  // ==========================
  if (operador && (operador.role === 'superadmin' || operador.role === 'root')) {
    return <RootEmpresasClientesView role={operador.role} />;
  }

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">"""
assert content.count(old_render) == 1, "bloco de render não encontrado"
content = content.replace(old_render, new_render)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK clientes/page.tsx com branch de superadmin')
