//app/convite/page.tsx

"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Mail, KeyRound, User, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AceitarConvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleAceitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !codigo || !nome || !senha) {
      setMensagem('Preencha todos os campos.');
      return;
    }

    setCarregando(true);
    setMensagem('');

    try {
      const res = await fetch('/api/equipe/aceitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), codigo: codigo.trim().toUpperCase(), nome, senha })
      });

      const data = await res.json();
      if (data.sucesso) {
        setSucesso(true);
        setMensagem('Conta ativada com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          router.push('/login');
        }, 2500);
      } else {
        setMensagem(data.mensagem || 'Código ou e-mail inválidos.');
      }
    } catch (err) {
      setMensagem('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-zinc-50">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">V5 Fibra Enterprise</h1>
          <p className="text-xs text-zinc-400 font-mono">Ativação de Conta e Ingresso na Equipe</p>
        </div>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-emerald-400 flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Insira seu Código de Convite
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {sucesso ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-3 text-center">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{mensagem}</span>
              </div>
            ) : (
              <form onSubmit={handleAceitar} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-zinc-500">Seu E-mail Convidado</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colaborador@provedora.com"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-zinc-500">Código de Verificação (Recebido por E-mail)</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text"
                      required
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="EX: A9B2C"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-emerald-400 font-mono font-bold uppercase tracking-widest focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-zinc-500">Seu Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-zinc-500">Crie uma Senha Segura</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                    <input 
                      type="password"
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {mensagem && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono">
                    {mensagem}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Ativar Conta e Entrar
                </button>

              </form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}