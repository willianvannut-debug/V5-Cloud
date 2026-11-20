import os
path = os.path.expanduser('~/mnt/v5-saas/components/Sidebar.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """    { name: 'Tickets Admin', href: '/dashboard/superadmin/tickets', icon: LifeBuoy, roles: ['superadmin'] },
    { name: 'Root Master', href: '/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'] },
  ];"""
new = """    // ROOT MASTER (ADM do V5 Cloud em si — empresas/provedores que assinam o sistema,
    // nunca os clientes finais de cada provedor)
    {
      name: 'Root Master', href: '/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'],
      subMenu: [
        { name: 'Visão Geral', href: '/dashboard/superadmin', icon: ShieldCheck, cor: 'text-emerald-400' },
        { name: 'Clientes', href: '/dashboard/superadmin/clientes', icon: Building2, cor: 'text-blue-400' },
        { name: 'Mapa', href: '/dashboard/superadmin/mapa', icon: Map, cor: 'text-cyan-400' },
        { name: 'Tickets Admin', href: '/dashboard/superadmin/tickets', icon: LifeBuoy, cor: 'text-amber-400' },
      ],
    },
  ];"""
assert content.count(old) == 1, "root master block not found"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK sidebar rootmaster updated')
