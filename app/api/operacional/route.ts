import { NextResponse } from 'next/server';

// Armazenamento em memória no servidor (simples e rápido)
// Se o servidor reiniciar, os estados pendentes resetam, o que costuma ser ideal para o fluxo operacional do dia.
let dadosOperacionais: any[] = [];

export async function GET() {
  return NextResponse.json(dadosOperacionais);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ...campos } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const index = dadosOperacionais.findIndex((p: any) => p.id === id);
    if (index >= 0) {
      dadosOperacionais[index] = { ...dadosOperacionais[index], ...campos, id };
    } else {
      dadosOperacionais.push({ id, ...campos });
    }

    return NextResponse.json({ success: true, dados: dadosOperacionais });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    dadosOperacionais = dadosOperacionais.filter((p: any) => p.id !== id);
    return NextResponse.json({ success: true, dados: dadosOperacionais });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao limpar dados' }, { status: 500 });
  }
}