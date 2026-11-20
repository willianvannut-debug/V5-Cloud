import os
path = os.path.expanduser('~/mnt/v5-saas/app/dashboard/page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1) state
old_state = "  const [syncMsg, setSyncMsg] = useState('');\n\n  useEffect(() => {"
new_state = "  const [syncMsg, setSyncMsg] = useState('');\n  const [debugInfo, setDebugInfo] = useState<any>(null);\n\n  useEffect(() => {"
assert content.count(old_state) == 1, "state anchor not found"
content = content.replace(old_state, new_state)

# 2) capture debugFinanceiro from response
old_json = """      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar dashboard');
      if (json.avisos?.length) console.warn('[Dashboard] tabelas com problema:', json.avisos);
      const d = json.data;"""
new_json = """      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar dashboard');
      if (json.avisos?.length) console.warn('[Dashboard] tabelas com problema:', json.avisos);
      if (json.debugFinanceiro) setDebugInfo(json.debugFinanceiro);
      const d = json.data;"""
assert content.count(old_json) == 1, "json parse anchor not found"
content = content.replace(old_json, new_json)

# 3) render debug block right after the syncMsg banner
old_banner = """      {syncMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 font-mono text-xs">
          {syncMsg}
        </div>
      )}"""
new_banner = old_banner + """

      {debugInfo && (
        <div className="bg-zinc-900/60 border border-yellow-600/30 rounded-lg p-3 text-yellow-300 font-mono text-[11px] overflow-x-auto">
          <div className="mb-1 text-yellow-400">DEBUG TEMPORARIO (financeiro):</div>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}"""
assert content.count(old_banner) == 1, "banner anchor not found"
content = content.replace(old_banner, new_banner)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK debug UI added')
