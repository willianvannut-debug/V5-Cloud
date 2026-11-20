import os
path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'components', 'Sidebar.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """    {
      name: 'Root Master', href: '/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'],
      subMenu: [
        { name: 'Visão Geral', href: '/dashboard/superadmin', icon: ShieldCheck, cor: 'text-emerald-400' },
        { name: 'Clientes', href: '/dashboard/superadmin/clientes', icon: Building2, cor: 'text-blue-400' },
        { name: 'Mapa', href: '/dashboard/superadmin/mapa', icon: Map, cor: 'text-cyan-400' },
        { name: 'Tickets Admin', href: '/dashboard/superadmin/tickets', icon: LifeBuoy, cor: 'text-amber-400' },
      ],
    },"""
new = """    // Clientes/Mapa das EMPRESAS do V5 Cloud agora aparecem dentro da aba
    // "Clientes" normal (quando quem loga é superadmin/root), e não aqui.
    {
      name: 'Root Master', href: '/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'],
      subMenu: [
        { name: 'Visão Geral', href: '/dashboard/superadmin', icon: ShieldCheck, cor: 'text-emerald-400' },
        { name: 'Tickets Admin', href: '/dashboard/superadmin/tickets', icon: LifeBuoy, cor: 'text-amber-400' },
      ],
    },"""
assert content.count(old) == 1, "bloco Root Master não encontrado"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK sidebar: Clientes/Mapa removidos do submenu Root Master')
