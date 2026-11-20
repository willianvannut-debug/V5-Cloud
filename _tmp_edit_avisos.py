import os
path = os.path.expanduser('~/mnt/v5-saas/app/dashboard/page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """      if (json.avisos?.length) console.warn('[Dashboard] tabelas com problema:', json.avisos);
      if (json.debugFinanceiro) setDebugInfo(json.debugFinanceiro);"""
new = """      if (json.avisos?.length) console.warn('[Dashboard] tabelas com problema:', json.avisos);
      if (json.debugFinanceiro) setDebugInfo({ ...json.debugFinanceiro, avisos: json.avisos || [] });"""
assert content.count(old) == 1, "avisos anchor not found"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK avisos added to debug')
