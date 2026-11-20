import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')
path = os.path.join(BASE, 'app', 'tecnico', 'ordens', 'page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1) import: useRef (useEffect/useState/useCallback ja importados)
old_import = "import React, { useEffect, useState, useCallback } from 'react';"
new_import = "import React, { useEffect, useState, useCallback, useRef } from 'react';"
assert c.count(old_import) == 1, "import react nao encontrado"
c = c.replace(old_import, new_import)

# 2) logo apos o estado online/setOnline, adiciona o watcher de GPS que
#    envia a posicao pra /api/tecnicos/localizacao enquanto houver alguma
#    OS deste tecnico em "em_deslocamento" -- é o elo que faltava entre o
#    botao "Iniciar Deslocamento" e o mapa de rastreamento do cliente.
old_online_effect = """  useEffect(() => {
    setOnline(navigator.onLine);
    const ficarOnline = () => setOnline(true);
    const ficarOffline = () => setOnline(false);
    window.addEventListener('online', ficarOnline);
    window.addEventListener('offline', ficarOffline);
    return () => {
      window.removeEventListener('online', ficarOnline);
      window.removeEventListener('offline', ficarOffline);
    };
  }, []);"""
new_online_effect = """  useEffect(() => {
    setOnline(navigator.onLine);
    const ficarOnline = () => setOnline(true);
    const ficarOffline = () => setOnline(false);
    window.addEventListener('online', ficarOnline);
    window.addEventListener('offline', ficarOffline);
    return () => {
      window.removeEventListener('online', ficarOnline);
      window.removeEventListener('offline', ficarOffline);
    };
  }, []);

  // ==================== RASTREAMENTO GPS AO VIVO ====================
  // Enquanto o tecnico tiver alguma OS "em_deslocamento", manda a posicao
  // atual pra /api/tecnicos/localizacao a cada poucos segundos. E essa
  // tabela (tecnico_localizacoes) que a tela "tecnico a caminho" do
  // cliente ja escuta via Realtime -- so faltava alguem escrever nela.
  const watchIdRef = useRef<number | null>(null);
  const ultimoEnvioRef = useRef<number>(0);

  const enviarLocalizacao = useCallback((lat: number, lng: number) => {
    fetch('/api/tecnicos/localizacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    }).catch((e) => console.error('Erro ao enviar localizacao:', e));
  }, []);

  useEffect(() => {
    const emDeslocamento = ordens.some((os) => os.status === 'em_deslocamento');

    if (emDeslocamento && watchIdRef.current === null && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const agora = Date.now();
          // Throttle: no maximo 1 envio a cada 8s, pra nao floodar a API
          if (agora - ultimoEnvioRef.current < 8000) return;
          ultimoEnvioRef.current = agora;
          enviarLocalizacao(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.error('Erro de geolocalizacao:', err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
    }

    if (!emDeslocamento && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [ordens, enviarLocalizacao]);"""
assert c.count(old_online_effect) == 1, "efeito online/offline nao encontrado"
c = c.replace(old_online_effect, new_online_effect)

# 3) no botao "Iniciar Deslocamento": captura e envia a posicao atual na
#    hora (nao espera o watchPosition, que so dispara no proximo evento
#    do GPS) -- assim o pin do cliente ja aparece no lugar certo de cara.
old_iniciar = """              onClick={() => atualizarOS(detalhe.id, { status: 'em_deslocamento' })}
              disabled={atualizando || !online}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              Iniciar Deslocamento
            </button>"""
new_iniciar = """              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => enviarLocalizacao(pos.coords.latitude, pos.coords.longitude),
                    (err) => console.error('Erro de geolocalizacao:', err),
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }
                atualizarOS(detalhe.id, { status: 'em_deslocamento' });
              }}
              disabled={atualizando || !online}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              Iniciar Deslocamento
            </button>"""
assert c.count(old_iniciar) == 1, "botao Iniciar Deslocamento nao encontrado"
c = c.replace(old_iniciar, new_iniciar)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('OK app/tecnico/ordens/page.tsx')
