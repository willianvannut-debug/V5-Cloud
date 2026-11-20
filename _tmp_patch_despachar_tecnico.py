import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')

# ======================================================================
# 1) app/api/ordens-servico/route.ts
#    - aceita chamado_id no POST
#    - ao criar a OS a partir de um chamado, vincula (tecnico_id + status
#      em_andamento) de volta no chamado de origem
# ======================================================================
os_path = os.path.join(BASE, 'app', 'api', 'ordens-servico', 'route.ts')
with open(os_path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1a) nova função helper, logo antes do comentário "// POST - Criar nova OS"
old_comment = "// POST - Criar nova OS\nexport async function POST(request: NextRequest) {"
new_comment = """// Vincula a OS recem-criada ao chamado de origem (quando a OS nasceu de um
// despacho feito a partir de um chamado) e marca o chamado como
// em_andamento com o tecnico atribuido. Antes dessa funcao a coluna
// chamados.tecnico_id e ordens_servico.chamado_id existiam no banco mas
// nada nunca escrevia nelas -- essa era a lacuna entre chamado e OS.
async function vincularChamadoOS(
  chamadoId: string | null | undefined,
  tecnicoId: string | null,
  empresaId: string,
) {
  if (!chamadoId) return;
  try {
    await supabase
      .from('chamados')
      .update({ tecnico_id: tecnicoId, status: 'em_andamento' })
      .eq('id', chamadoId)
      .eq('empresa_id', empresaId);
  } catch (e) {
    console.error('Erro ao vincular OS ao chamado:', e);
  }
}

// POST - Criar nova OS
export async function POST(request: NextRequest) {"""
assert c.count(old_comment) == 1, "comentario POST nao encontrado"
c = c.replace(old_comment, new_comment)

# 1b) insertData: grava o chamado_id na OS
old_insert = """      tecnico_id: tecnicoLider,
      agendada_para: body.agendada_para || null,
    };"""
new_insert = """      tecnico_id: tecnicoLider,
      agendada_para: body.agendada_para || null,
      chamado_id: body.chamado_id || null,
    };"""
assert c.count(old_insert) == 1, "insertData nao encontrado"
c = c.replace(old_insert, new_insert)

# 1c) fallback de colunas opcionais: tambem tenta sem chamado_id se a coluna
#     nao existir (mesmo padrao defensivo que ja existe pra tecnicos_ids)
old_opcionais = "const colunasOpcionais = ['tecnicos_ids', 'latitude', 'longitude'];"
new_opcionais = "const colunasOpcionais = ['tecnicos_ids', 'latitude', 'longitude', 'chamado_id'];"
assert c.count(old_opcionais) == 1, "colunasOpcionais nao encontrado"
c = c.replace(old_opcionais, new_opcionais)

# 1d) chama vincularChamadoOS nos dois caminhos de sucesso (principal e fallback)
old_fallback_return = """        const enriched = await enriquecerOS([data2]);
        return NextResponse.json(enriched[0], { status: 201 });
      }"""
new_fallback_return = """        const enriched = await enriquecerOS([data2]);
        await vincularChamadoOS(body.chamado_id, tecnicoLider, session.empresaId);
        return NextResponse.json(enriched[0], { status: 201 });
      }"""
assert c.count(old_fallback_return) == 1, "retorno fallback nao encontrado"
c = c.replace(old_fallback_return, new_fallback_return)

old_main_return = """    const enriched = await enriquecerOS([data]);
    return NextResponse.json(enriched[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}"""
new_main_return = """    const enriched = await enriquecerOS([data]);
    await vincularChamadoOS(body.chamado_id, tecnicoLider, session.empresaId);
    return NextResponse.json(enriched[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}"""
assert c.count(old_main_return) == 1, "retorno principal nao encontrado"
c = c.replace(old_main_return, new_main_return)

with open(os_path, 'w', encoding='utf-8') as f:
    f.write(c)
print('OK app/api/ordens-servico/route.ts')

# ======================================================================
# 2) app/dashboard/suporte/tickets/page.tsx
#    - lista de tecnicos da empresa
#    - botao "Despachar tecnico" no detalhe do chamado -> cria OS vinculada
# ======================================================================
tk_path = os.path.join(BASE, 'app', 'dashboard', 'suporte', 'tickets', 'page.tsx')
with open(tk_path, 'r', encoding='utf-8') as f:
    t = f.read()

# 2a) tipo Tecnico, logo apos a interface Categoria
old_categoria_iface = """interface Categoria {
  id: string;
  nome: string;
}"""
new_categoria_iface = """interface Categoria {
  id: string;
  nome: string;
}

interface Tecnico {
  id: string;
  nome: string;
}"""
assert t.count(old_categoria_iface) == 1, "interface Categoria nao encontrada"
t = t.replace(old_categoria_iface, new_categoria_iface)

# 2b) novos estados, logo apos busca/setBusca
old_busca_state = '  const [busca, setBusca] = useState("");'
new_busca_state = '''  const [busca, setBusca] = useState("");
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoEscolhido, setTecnicoEscolhido] = useState("");
  const [despachando, setDespachando] = useState(false);'''
assert t.count(old_busca_state) == 1, "estado busca nao encontrado"
t = t.replace(old_busca_state, new_busca_state)

# 2c) fetchTecnicos, logo apos fetchCategorias, e inclui no useEffect inicial
old_fetch_cat = '''  const fetchCategorias = useCallback(async () => {
    try {
      const data = await apiFetch("/api/suporte/categorias");
      setCategorias(data.filter((c: any) => c.ativo));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchChamados(); fetchCategorias(); }, [fetchChamados, fetchCategorias]);'''
new_fetch_cat = '''  const fetchCategorias = useCallback(async () => {
    try {
      const data = await apiFetch("/api/suporte/categorias");
      setCategorias(data.filter((c: any) => c.ativo));
    } catch (e) { console.error(e); }
  }, []);

  // Tecnicos da empresa, para o despacho a partir do chamado
  const fetchTecnicos = useCallback(async () => {
    try {
      const data = await apiFetch("/api/tecnicos");
      setTecnicos(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchChamados(); fetchCategorias(); fetchTecnicos(); }, [fetchChamados, fetchCategorias, fetchTecnicos]);'''
assert t.count(old_fetch_cat) == 1, "fetchCategorias/useEffect nao encontrado"
t = t.replace(old_fetch_cat, new_fetch_cat)

# 2d) funcao despacharTecnico, logo apos atualizarChamado
old_atualizar = '''  async function atualizarChamado(campo: string, valor: string) {
    if (!selectedId) return;
    try {
      await apiFetch("/api/suporte/chamados", {
        method: "PATCH",
        body: JSON.stringify({ id: selectedId, [campo]: valor }),
      });
      const detalhe = await apiFetch(`/api/suporte/chamados?id=${selectedId}`);
      setChamadoDetalhe(detalhe);
      fetchChamados();
    } catch (e) { console.error(e); }
  }'''
new_atualizar = '''  async function atualizarChamado(campo: string, valor: string) {
    if (!selectedId) return;
    try {
      await apiFetch("/api/suporte/chamados", {
        method: "PATCH",
        body: JSON.stringify({ id: selectedId, [campo]: valor }),
      });
      const detalhe = await apiFetch(`/api/suporte/chamados?id=${selectedId}`);
      setChamadoDetalhe(detalhe);
      fetchChamados();
    } catch (e) { console.error(e); }
  }

  // ── Despachar tecnico: cria a OS ja vinculada a este chamado ─────
  // (antes nao existia nenhum jeito de sair do chamado pra uma OS com
  // tecnico atribuido -- o chamado e a OS viviam em tabelas sem ligacao)
  async function despacharTecnico() {
    if (!selectedId || !chamadoDetalhe || !tecnicoEscolhido) return;
    setDespachando(true);
    try {
      await apiFetch("/api/ordens-servico", {
        method: "POST",
        body: JSON.stringify({
          tipo: "reparo",
          cliente_id: chamadoDetalhe.cliente_id,
          tecnico_id: tecnicoEscolhido,
          descricao: `Chamado #${chamadoDetalhe.protocolo}: ${chamadoDetalhe.assunto}`,
          prioridade: chamadoDetalhe.prioridade,
          chamado_id: chamadoDetalhe.id,
        }),
      });
      const detalhe = await apiFetch(`/api/suporte/chamados?id=${selectedId}`);
      setChamadoDetalhe(detalhe);
      fetchChamados();
      setTecnicoEscolhido("");
    } catch (e) {
      console.error(e);
    } finally {
      setDespachando(false);
    }
  }'''
assert t.count(old_atualizar) == 1, "atualizarChamado nao encontrado"
t = t.replace(old_atualizar, new_atualizar)

# 2e) UI: bloco de despacho de tecnico, logo apos os seletores de
#     status/prioridade/SLA e antes do comentario "{/* Chat */}"
old_selectors_close = '''                  )}
                </div>
              </div>

              {/* Chat */}'''
new_selectors_close = '''                  )}
                </div>

                {/* Despacho de tecnico: cria uma OS ja vinculada a este chamado */}
                <div className="mt-3 pt-3 border-t border-zinc-800/60">
                  <label className="block text-[9px] font-mono uppercase text-zinc-600 mb-1">
                    Tecnico
                  </label>
                  {chamadoDetalhe.tecnico_id ? (
                    <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                      <UserCog size={12} />
                      {tecnicos.find((t) => t.id === chamadoDetalhe.tecnico_id)?.nome || "Tecnico atribuido"}
                      <span className="text-zinc-600">· OS criada</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={tecnicoEscolhido}
                        onChange={(e) => setTecnicoEscolhido(e.target.value)}
                        className="bg-black/50 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-emerald-500/50 focus:outline-none"
                      >
                        <option value="">Selecionar tecnico...</option>
                        {tecnicos.map((tec) => (
                          <option key={tec.id} value={tec.id}>{tec.nome}</option>
                        ))}
                      </select>
                      <button
                        onClick={despacharTecnico}
                        disabled={!tecnicoEscolhido || despachando}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {despachando ? <Loader2 size={12} className="animate-spin" /> : <UserCog size={12} />}
                        Despachar tecnico
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat */}'''
assert t.count(old_selectors_close) == 1, "fechamento dos seletores nao encontrado"
t = t.replace(old_selectors_close, new_selectors_close)

with open(tk_path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK app/dashboard/suporte/tickets/page.tsx')
