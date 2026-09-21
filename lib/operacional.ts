export async function lerOperacional(): Promise<any[]> {
  try {
    const res = await fetch('/api/operacional', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function salvarOperacional(id: string, campos: Record<string, any>) {
  try {
    await fetch('/api/operacional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...campos }),
    });
    // Dispara evento local caso esteja na mesma aba/aparelho
    window.dispatchEvent(new Event('v5-operacional'));
  } catch (error) {
    console.error('Erro ao salvar operacional:', error);
  }
}

export async function limparOperacional(id: string) {
  try {
    await fetch(`/api/operacional?id=${id}`, {
      method: 'DELETE',
    });
    window.dispatchEvent(new Event('v5-operacional'));
  } catch (error) {
    console.error('Erro ao limpar operacional:', error);
  }
}