import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')
path = os.path.join(BASE, 'app', 'dashboard', 'ordens', 'criar', 'page.tsx')

with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# ======================================================================
# Pedido do usuario: colocar pin no mapa na criacao de OS deve ser
# opcional, com uma caixa de marcar que o gerente ativa se quiser marcar
# o pin. Antes o mapa aparecia sempre aberto (so um aviso se nao marcado,
# nao bloqueava o envio -- mas visualmente parecia obrigatorio).
# ======================================================================

old_state = """  // Coordenadas do mapa
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);"""

new_state = """  // Coordenadas do mapa
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mostrarPin, setMostrarPin] = useState(false);"""

assert t.count(old_state) == 1, "declaracao de latitude/longitude nao encontrada"
t = t.replace(old_state, new_state)

old_remover = """  const removerPin = () => {
    setLatitude(null);
    setLongitude(null);
  };"""

new_remover = """  const removerPin = () => {
    setLatitude(null);
    setLongitude(null);
  };

  const alternarMostrarPin = (marcado: boolean) => {
    setMostrarPin(marcado);
    if (!marcado) {
      setLatitude(null);
      setLongitude(null);
    }
  };"""

assert t.count(old_remover) == 1, "funcao removerPin nao encontrada"
t = t.replace(old_remover, new_remover)

old_bloco = """          {/* ==================== MAPA COM PIN ==================== */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2 flex items-center gap-1.5">
              <Crosshair className="w-3 h-3" /> Pin no Mapa (GPS do Técnico)
            </label>
            <p className="text-[10px] font-mono text-zinc-600 mb-3">
              Clique no mapa para marcar a localização exata. O técnico usará essas coordenadas para navegar.
            </p>

            <MapaPinComponent
              latitude={latitude}
              longitude={longitude}
              onChange={handleMapChange}
            />

            {latitude && longitude ? (
              <div className="mt-3 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    Pin definido: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </span>
                </div>
                <button type="button" onClick={removerPin}
                  className="text-zinc-400 hover:text-red-400 cursor-pointer p-1 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-mono text-amber-400">
                  Nenhum pin colocado — o técnico não terá navegação GPS
                </span>
              </div>
            )}
          </div>"""

new_bloco = """          {/* ==================== PIN NO MAPA (OPCIONAL) ==================== */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mostrarPin}
                onChange={(e) => alternarMostrarPin(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
                <Crosshair className="w-3 h-3" /> Colocar pin no mapa (opcional)
              </span>
            </label>
            <p className="text-[10px] font-mono text-zinc-600 mt-1.5 ml-6">
              Marque esta opção se quiser indicar a localização exata para o técnico navegar via GPS. Se não marcar, a OS é criada normalmente, sem pin.
            </p>

            {mostrarPin && (
              <div className="mt-4">
                <p className="text-[10px] font-mono text-zinc-600 mb-3">
                  Clique no mapa para marcar a localização exata. O técnico usará essas coordenadas para navegar.
                </p>

                <MapaPinComponent
                  latitude={latitude}
                  longitude={longitude}
                  onChange={handleMapChange}
                />

                {latitude && longitude ? (
                  <div className="mt-3 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        Pin definido: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </span>
                    </div>
                    <button type="button" onClick={removerPin}
                      className="text-zinc-400 hover:text-red-400 cursor-pointer p-1 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-mono text-amber-400">
                      Nenhum pin colocado ainda — clique no mapa acima
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>"""

assert t.count(old_bloco) == 1, "bloco do mapa de pin nao encontrado"
t = t.replace(old_bloco, new_bloco)

with open(path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK page.tsx (pin no mapa opcional)')
