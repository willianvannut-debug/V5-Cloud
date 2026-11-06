import { NextResponse } from 'next/server'

export async function GET(req) {
  return NextResponse.json({ funcionando: true, caminho: req.nextUrl.pathname })
}

export async function POST(req) {
  return NextResponse.json({ funcionando: true, caminho: req.nextUrl.pathname })
}