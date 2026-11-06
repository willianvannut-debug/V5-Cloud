// lib/api.ts
// V5 Fibra - API Client (frontend)
// O cookie v5_session é enviado automaticamente pelo credentials: 'include'

const API_BASE = '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || data.message || `Erro ${res.status}` };
    }

    return { data };
  } catch (err: any) {
    return { error: err.message || 'Erro de conexão' };
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T>(path: string, body?: any) => request<T>('PUT', path, body),
  delete: <T>(path: string, body?: any) => request<T>('DELETE', path, body),
};