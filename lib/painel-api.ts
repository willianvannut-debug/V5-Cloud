// lib/painel-api.ts
// Ajudante do navegador para falar com /api/painel/v1/*.
// A autorização vai no cookie httpOnly do operador (v5_session), enviado
// automaticamente por ser mesma origem. O navegador nunca escolhe a empresa:
// o servidor usa a empresa do cookie.

export class PainelApiError extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

export async function painelApi<T = any>(
  caminho: string,
  opcoes: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`/api/painel/v1/${caminho.replace(/^\//, '')}`, {
    method: opcoes.method || (opcoes.body ? 'POST' : 'GET'),
    headers: opcoes.body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new PainelApiError(dados?.erro || 'Erro de conexão', res.status);
  return dados as T;
}
