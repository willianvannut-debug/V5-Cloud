import os

# ---- route.ts: remove debugFinanceiro block ----
path1 = os.path.expanduser('~/mnt/v5-saas/app/api/dashboard/overview/route.ts')
with open(path1, 'r', encoding='utf-8') as f:
    c1 = f.read()

old1 = """  const ticketsAbertos = chamados.filter(c => !CHAMADO_FECHADO.has(norm(c.status))).length;

  // DEBUG TEMPORARIO — remover depois de confirmar a causa do painel financeiro zerado
  const debugFinanceiro = {
    empresaId,
    hoje,
    mesAtual,
    totalFaturasNoBanco: faturas.length,
    totalFaturasConsideradas: fat.length,
    totalVencidas: fat.filter(f => f.vencido).length,
    totalPagas: fat.filter(f => f.pago).length,
    totalAbertas: fat.filter(f => f.aberto).length,
    amostra: fat.slice(0, 6).map(f => ({
      nome: f.nome,
      statusOriginal: f.statusOriginal,
      venc: f.venc,
      pagoEm: f.pagoEm,
      valor: f.valor,
      pago: f.pago,
      vencido: f.vencido,
      aberto: f.aberto,
    })),
  };

  return NextResponse.json({
    data: {
      clientes: clientesRes,
      leads: leadsRes,
      financeiro: financeiroRes,
      contratos: contratosRes,
      recebidoHoje,
      ticketsAbertos,
      graficoFaturamento: temDadosGrafico ? graficoFaturamento : [],
      faturasPendentes,
      ultimosLeads,
    },
    avisos,
    debugFinanceiro,
  });
}"""
new1 = """  const ticketsAbertos = chamados.filter(c => !CHAMADO_FECHADO.has(norm(c.status))).length;

  return NextResponse.json({
    data: {
      clientes: clientesRes,
      leads: leadsRes,
      financeiro: financeiroRes,
      contratos: contratosRes,
      recebidoHoje,
      ticketsAbertos,
      graficoFaturamento: temDadosGrafico ? graficoFaturamento : [],
      faturasPendentes,
      ultimosLeads,
    },
    avisos,
  });
}"""
assert c1.count(old1) == 1, "route.ts debug block not found"
c1 = c1.replace(old1, new1)
with open(path1, 'w', encoding='utf-8') as f:
    f.write(c1)
print('OK route.ts cleaned')

# ---- page.tsx: remove debugInfo state, capture and render ----
path2 = os.path.expanduser('~/mnt/v5-saas/app/dashboard/page.tsx')
with open(path2, 'r', encoding='utf-8') as f:
    c2 = f.read()

old_state = "  const [syncMsg, setSyncMsg] = useState('');\n  const [debugInfo, setDebugInfo] = useState<any>(null);\n\n  useEffect(() => {"
new_state = "  const [syncMsg, setSyncMsg] = useState('');\n\n  useEffect(() => {"
assert c2.count(old_state) == 1, "page.tsx state anchor not found"
c2 = c2.replace(old_state, new_state)

old_json = """      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar dashboard');
      if (json.avisos?.length) console.warn('[Dashboard] tabelas com problema:', json.avisos);
      if (json.debugFinanceiro) setDebugInfo({ ...json.debugFinanceiro, avisos: json.avisos || [] });
      const d = json.data;"""
new_json = """      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar dashboard');
      if (json.avisos?.length) console.warn('[Dashboard] tabelas com problema:', json.avisos);
      const d = json.data;"""
assert c2.count(old_json) == 1, "page.tsx json anchor not found"
c2 = c2.replace(old_json, new_json)

old_banner = """      {syncMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 font-mono text-xs">
          {syncMsg}
        </div>
      )}

      {debugInfo && (
        <div className="bg-zinc-900/60 border border-yellow-600/30 rounded-lg p-3 text-yellow-300 font-mono text-[11px] overflow-x-auto">
          <div className="mb-1 text-yellow-400">DEBUG TEMPORARIO (financeiro):</div>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}"""
new_banner = """      {syncMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 font-mono text-xs">
          {syncMsg}
        </div>
      )}"""
assert c2.count(old_banner) == 1, "page.tsx banner anchor not found"
c2 = c2.replace(old_banner, new_banner)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(c2)
print('OK page.tsx cleaned')
