// lib/rateLimit.ts
const ipRateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Configurações padrão
const WINDOW_MS = 60 * 1000; // Janela de 1 minuto
const MAX_TENTATIVAS = 5;      // Máximo de 5 tentativas por minuto por IP

export function verificarRateLimit(ip: string): { permitido: boolean; tempoRestanteSegundos: number } {
  const agora = Date.now();
  const registro = ipRateLimitMap.get(ip);

  if (!registro) {
    ipRateLimitMap.set(ip, { count: 1, lastReset: agora });
    return { permitido: true, tempoRestanteSegundos: 0 };
  }

  // Se passou o tempo da janela, reseta o contador
  if (agora - registro.lastReset > WINDOW_MS) {
    ipRateLimitMap.set(ip, { count: 1, lastReset: agora });
    return { permitido: true, tempoRestanteSegundos: 0 };
  }

  // Incrementa as tentativas
  registro.count++;

  if (registro.count > MAX_TENTATIVAS) {
    const tempoDecorrido = agora - registro.lastReset;
    const tempoRestanteSegundos = Math.ceil((WINDOW_MS - tempoDecorrido) / 1000);
    return { permitido: false, tempoRestanteSegundos };
  }

  return { permitido: true, tempoRestanteSegundos: 0 };
}