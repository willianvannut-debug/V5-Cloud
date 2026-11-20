import os
path = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'components', 'RootEmpresasMapaView.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove o debug temporário
old_debug = """      <div style={{color:'#fbbf24',fontFamily:'monospace',fontSize:'11px'}}>
        [DEBUG] empresas recebidas: {empresas.length} · com lat/lon válidos: {empresas.filter(e => e.lat && e.lon && !isNaN(e.lat) && !isNaN(e.lon)).length} · carregando={String(carregando)} · mapaPronto={String(mapaPronto)}
      </div>
      <div className="flex-1 min-h-[600px] border border-zinc-900 bg-zinc-900/20 rounded-2xl overflow-hidden relative">"""
new_fixed = """      {/* Altura FIXA em px (não flex-1/min-h): o Leaflet mede o container no
          momento em que monta, e uma altura vinda de flexbox pode resolver
          para 0px antes do layout assentar — aí o mapa nunca aparece. */}
      <div className="w-full h-[600px] border border-zinc-900 bg-zinc-900/20 rounded-2xl overflow-hidden relative z-0">"""
assert content.count(old_debug) == 1, "bloco de debug não encontrado"
content = content.replace(old_debug, new_fixed)

# remove também o "flex flex-col" do wrapper externo, que não é mais necessário
old_wrapper = '<div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans flex flex-col">'
new_wrapper = '<div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">'
assert content.count(old_wrapper) == 1, "wrapper externo não encontrado"
content = content.replace(old_wrapper, new_wrapper)

# remove o debug do dynamic() (volta pro loading normal, sem o texto vermelho)
old_dynamic_end = """  },
  {
    ssr: false,
    loading: () => <div style={{color:'#f87171',padding:'16px',fontFamily:'monospace'}}>[DEBUG] carregando bundle do mapa (react-leaflet)...</div>,
  }
);"""
new_dynamic_end = """  },
  { ssr: false }
);"""
assert content.count(old_dynamic_end) == 1, "fim do dynamic() (debug) não encontrado"
content = content.replace(old_dynamic_end, new_dynamic_end)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK altura fixa aplicada e debug removido')
