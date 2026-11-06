// app/api/financial/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaDaSessao } from '@/lib/auth-server';

const BACKEND_URL = process.env.FINANCIAL_BACKEND_URL || 'http://localhost:4000';

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { path } = await params;
  const targetPath = `/api/financial/${path.join('/')}`;
  const url = new URL(req.url);
  const queryString = url.search;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-empresa-id': sessao.empresaId,
    'x-operador-id': sessao.operadorId,
    'x-operador-role': sessao.role,
  };

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      fetchOptions.body = await req.text();
    } catch {}
  }

  try {
    const response = await fetch(`${BACKEND_URL}${targetPath}${queryString}`, fetchOptions);
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Backend financeiro indisponível', detail: error.message },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}