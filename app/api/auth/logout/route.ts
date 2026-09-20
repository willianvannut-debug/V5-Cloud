//app/api/auth/logout/route.ts

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  // Apenas o servidor consegue apagar um cookie HttpOnly com segurança
  cookies().delete('v5_session');
  
  return NextResponse.json({ 
    sucesso: true, 
    mensagem: 'Sessão encerrada com sucesso e cookie destruído.' 
  });
}