import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')

# ======================================================================
# 1) app/tecnico/ordens/page.tsx
#    - aviso de consentimento antes de iniciar deslocamento
#    - throttle do GPS: 8s -> 10s (pedido explicito do usuario, pra
#      economizar processamento/bateria)
# ======================================================================
tk_path = os.path.join(BASE, 'app', 'tecnico', 'ordens', 'page.tsx')
with open(tk_path, 'r', encoding='utf-8') as f:
    t = f.read()

# 1a) novo estado showAvisoDeslocamento, junto dos outros estados
old_state = "  const [gpsApp, setGpsApp] = useState('google');"
new_state = """  const [gpsApp, setGpsApp] = useState('google');
  const [showAvisoDeslocamento, setShowAvisoDeslocamento] = useState(false);"""
assert t.count(old_state) == 1, "estado gpsApp nao encontrado"
t = t.replace(old_state, new_state)

# 1b) throttle 8s -> 10s
old_throttle = """          const agora = Date.now();
          // Throttle: no maximo 1 envio a cada 8s, pra nao floodar a API
          if (agora - ultimoEnvioRef.current < 8000) return;"""
new_throttle = """          const agora = Date.now();
          // Throttle: no maximo 1 envio a cada 10s (pedido do usuario, pra
          // economizar GPS/bateria do tecnico -- nao precisa ser instantaneo)
          if (agora - ultimoEnvioRef.current < 10000) return;"""
assert t.count(old_throttle) == 1, "throttle nao encontrado"
t = t.replace(old_throttle, new_throttle)

# 1c) nova funcao confirmarIniciarDeslocamento, logo apos atualizarOS
old_atualizar_end = """    } catch (e) {
      console.error('Erro ao atualizar:', e);
    } finally {
      setAtualizando(false);
    }
  };

  // Navegação GPS — usa coordenadas quando disponível, senão endereço texto
  const abrirGPS = (os: OS) => {"""
new_atualizar_end = """    } catch (e) {
      console.error('Erro ao atualizar:', e);
    } finally {
      setAtualizando(false);
    }
  };

  // Confirma o aviso de compartilhamento de localizacao e so entao inicia
  // o deslocamento (captura a posicao atual na hora + muda o status)
  const confirmarIniciarDeslocamento = useCallback(() => {
    if (!detalhe) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => enviarLocalizacao(pos.coords.latitude, pos.coords.longitude),
        (err) => console.error('Erro de geolocalizacao:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    atualizarOS(detalhe.id, { status: 'em_deslocamento' });
    setShowAvisoDeslocamento(false);
  }, [detalhe, enviarLocalizacao]);

  // Navegação GPS — usa coordenadas quando disponível, senão endereço texto
  const abrirGPS = (os: OS) => {"""
assert t.count(old_atualizar_end) == 1, "fim de atualizarOS nao encontrado"
t = t.replace(old_atualizar_end, new_atualizar_end)

# 1d) botao "Iniciar Deslocamento": agora so abre o aviso, nao faz mais
#     a geolocalizacao/atualizarOS direto (isso foi pro confirmarIniciarDeslocamento)
old_botao = """              onClick={() => {
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
new_botao = """              onClick={() => setShowAvisoDeslocamento(true)}
              disabled={atualizando || !online}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              Iniciar Deslocamento
            </button>"""
assert t.count(old_botao) == 1, "botao Iniciar Deslocamento nao encontrado"
t = t.replace(old_botao, new_botao)

# 1e) modal de aviso, inserido antes do fechamento da tela de detalhe
old_fecho_detalhe = """          {/* PASSO 3: CONCLUIR */}
          {detalhe.status === 'em_execucao' && (
            <button
              onClick={() => atualizarOS(detalhe.id, { status: 'concluida', observacoes_tecnico: observacao || null })}
              disabled={atualizando || !online}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {detalhe.chamado_id ? 'Resolver Chamado' : 'Concluir OS'}
            </button>
          )}
        </div>
      </div>
    );
  }"""
new_fecho_detalhe = """          {/* PASSO 3: CONCLUIR */}
          {detalhe.status === 'em_execucao' && (
            <button
              onClick={() => atualizarOS(detalhe.id, { status: 'concluida', observacoes_tecnico: observacao || null })}
              disabled={atualizando || !online}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {detalhe.chamado_id ? 'Resolver Chamado' : 'Concluir OS'}
            </button>
          )}
        </div>

        {/* Aviso de compartilhamento de localizacao antes de iniciar deslocamento */}
        {showAvisoDeslocamento && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Navigation className="w-5 h-5" />
                <h3 className="font-mono font-bold uppercase text-sm">Compartilhar localização</h3>
              </div>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed">
                A partir de agora sua localização será enviada pro cliente a cada 10 segundos, pra ele acompanhar sua chegada no mapa — igual um app de transporte. Isso para automaticamente assim que você apertar "Cheguei" no local.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAvisoDeslocamento(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono font-bold uppercase text-xs py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarIniciarDeslocamento}
                  disabled={atualizando}
                  className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-mono font-bold uppercase text-xs py-3 rounded-xl disabled:opacity-50 transition-colors"
                >
                  Entendi, iniciar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }"""
assert t.count(old_fecho_detalhe) == 1, "fechamento da tela de detalhe nao encontrado"
t = t.replace(old_fecho_detalhe, new_fecho_detalhe)

with open(tk_path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK app/tecnico/ordens/page.tsx')

# ======================================================================
# 2) app/api/ordens-servico/route.ts
#    - push "Seu tecnico chegou!" quando o status vira em_execucao
# ======================================================================
os_path = os.path.join(BASE, 'app', 'api', 'ordens-servico', 'route.ts')
with open(os_path, 'r', encoding='utf-8') as f:
    c = f.read()

old_push_deslocamento_end = """      if (tokens && tokens.length > 0) {
        const messages = tokens.map((t: any) => ({
          to: t.token, sound: 'default',
          title: 'Tecnico a caminho!',
          body: 'Um tecnico esta indo ate voce. Acompanhe em tempo real no app!',
          data: { tipo: 'tecnico_a_caminho', os_id: data.id },
        }));
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
        } catch (e) { console.error('Erro push:', e); }
      }
    }

    return NextResponse.json(osEnriquecida);"""
new_push_deslocamento_end = """      if (tokens && tokens.length > 0) {
        const messages = tokens.map((t: any) => ({
          to: t.token, sound: 'default',
          title: 'Tecnico a caminho!',
          body: 'Um tecnico esta indo ate voce. Acompanhe em tempo real no app!',
          data: { tipo: 'tecnico_a_caminho', os_id: data.id },
        }));
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
        } catch (e) { console.error('Erro push:', e); }
      }
    }

    // Se o tecnico apertou "Cheguei" (em_execucao), avisa o cliente que
    // ele chegou -- essa notificacao nao existia antes, so tinha a de
    // "a caminho" e a de "concluida".
    if (body.status === 'em_execucao' && data.cliente_id) {
      const { data: tokensChegou } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('cliente_id', data.cliente_id)
        .eq('empresa_id', session.empresaId)
        .eq('ativo', true);

      if (tokensChegou && tokensChegou.length > 0) {
        const messages = tokensChegou.map((t: any) => ({
          to: t.token, sound: 'default',
          title: 'Seu tecnico chegou!',
          body: 'O tecnico ja esta no local e vai iniciar o atendimento.',
          data: { tipo: 'tecnico_chegou', os_id: data.id },
        }));
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
        } catch (e) { console.error('Erro push:', e); }
      }
    }

    return NextResponse.json(osEnriquecida);"""
assert c.count(old_push_deslocamento_end) == 1, "bloco de push em_deslocamento nao encontrado"
c = c.replace(old_push_deslocamento_end, new_push_deslocamento_end)

with open(os_path, 'w', encoding='utf-8') as f:
    f.write(c)
print('OK app/api/ordens-servico/route.ts')
