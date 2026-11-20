import os
path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'components', 'RootEmpresasMapaView.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_dynamic_end = """  },
  { ssr: false }
);"""
new_dynamic_end = """  },
  {
    ssr: false,
    loading: () => <div style={{color:'#f87171',padding:'16px',fontFamily:'monospace'}}>[DEBUG] carregando bundle do mapa (react-leaflet)...</div>,
  }
);"""
assert content.count(old_dynamic_end) == 1, "fim do dynamic() não encontrado"
content = content.replace(old_dynamic_end, new_dynamic_end)

old_render_area = """      <div className="flex-1 min-h-[600px] border border-zinc-900 bg-zinc-900/20 rounded-2xl overflow-hidden relative">
        {carregando ? (
          <div className="absolute inset-0 flex items-center justify-center text-emerald-500 font-mono text-xs animate-pulse uppercase font-bold tracking-widest">
            Sincronizando com Supabase...
          </div>
        ) : mapaPronto ? (
          <MapaEmpresasNoSSR empresas={empresasFiltradas} />
        ) : null}
      </div>"""
new_render_area = """      <div style={{color:'#fbbf24',fontFamily:'monospace',fontSize:'11px'}}>
        [DEBUG] empresas recebidas: {empresas.length} · com lat/lon válidos: {empresas.filter(e => e.lat && e.lon && !isNaN(e.lat) && !isNaN(e.lon)).length} · carregando={String(carregando)} · mapaPronto={String(mapaPronto)}
      </div>
      <div className="flex-1 min-h-[600px] border border-zinc-900 bg-zinc-900/20 rounded-2xl overflow-hidden relative">
        {carregando ? (
          <div className="absolute inset-0 flex items-center justify-center text-emerald-500 font-mono text-xs animate-pulse uppercase font-bold tracking-widest">
            Sincronizando com Supabase...
          </div>
        ) : mapaPronto ? (
          <MapaEmpresasNoSSR empresas={empresasFiltradas} />
        ) : null}
      </div>"""
assert content.count(old_render_area) == 1, "área de render do mapa não encontrada"
content = content.replace(old_render_area, new_render_area)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK debug instrumentado no RootEmpresasMapaView')
