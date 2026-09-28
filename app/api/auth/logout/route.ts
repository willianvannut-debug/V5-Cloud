import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  // Apenas o servidor consegue apagar um cookie HttpOnly com segurança
  
  // 1. Aguarde a promise dos cookies resolver
  const cookieStore = await cookies(); 
  
  // 2. Agora sim, apague o cookie
  cookieStore.delete('v5_session');

  return NextResponse.json({
    sucesso: true,
  });
}