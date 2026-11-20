import os
path = os.path.expanduser('~/mnt/v5-saas/app/api/dashboard/overview/route.ts')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """  const ticketsAbertos = chamados.filter(c => !CHAMADO_FECHADO.has(norm(c.status))).length;

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
new = """  const ticketsAbertos = chamados.filter(c => !CHAMADO_FECHADO.has(norm(c.status))).length;

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
assert content.count(old) == 1, "tail block not found"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK debug added')
