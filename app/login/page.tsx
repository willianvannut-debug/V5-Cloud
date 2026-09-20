//app/login/page.tsx

"use client"
import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2, KeyRound, CheckCircle2, X, Ban } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  
  // 🔒 Novo estado para travar o botão rigidamente quando houver Rate Limit (429)
  const [bloqueadoPorRateLimit, setBloqueadoPorRateLimit] = useState(false);

  // Estados da Modal "Esqueceu a Senha"
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [sucessoRecuperacao, setSucessoRecuperacao] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueadoPorRateLimit) return; // Trava de segurança extra

    setMensagemErro('');
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const data = await res.json();

      // 🛑 Se o servidor retornar 429 (Rate Limit Excedido), ativamos o bloqueio total no front-end
      if (res.status === 429) {
        setBloqueadoPorRateLimit(true);
        setMensagemErro(data.mensagem || 'Muitas tentativas incorretas. Acesso temporariamente bloqueado.');
        return;
      }

      if (res.ok) {
        // 🚀 Redirecionamento Inteligente baseado no cargo do operador:
        const cargo = data.operador?.role?.toLowerCase();
        
        if (cargo === 'tecnico') {
          window.location.href = '/tecnico';          // Técnico vai direto para a tela de campo
        } else if (cargo === 'atendente') {
          window.location.href = '/dashboard/leads'; // Atendente vai direto para os leads
        } else {
          window.location.href = '/dashboard';       // Gerente ou Superadmin vai para a Visão Geral
        }
      } else {
        setMensagemErro(data.mensagem || 'E-mail ou senha incorretos.');
      }
    } catch (err) {
      setMensagemErro('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  const handleEnviarRecuperacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecuperacao) return;

    setEnviandoRecuperacao(true);
    setTimeout(() => {
      setEnviandoRecuperacao(false);
      setSucessoRecuperacao(true);
      setTimeout(() => {
        setSucessoRecuperacao(false);
        setModalSenhaAberto(false);
        setEmailRecuperacao('');
      }, 2500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#021708] flex items-center justify-center p-4 font-sans text-zinc-50">
      <div className="w-full max-w-md space-y-6">
        
        {/* CABEÇALHO */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-black border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest font-mono text-white">V5 Cloud</h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">Acesse sua conta profissional no SaaS</p>
          </div>
        </div>

        {mensagemErro && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[11px] font-mono text-center flex items-center justify-center gap-2">
            <Ban className="w-4 h-4 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
        )}

        <div className="bg-[#0a0a0a] border border-[#1e3b29] rounded-2xl p-6 shadow-2xl space-y-6">
          
          {/* ABAS DO TOPO */}
          <div className="flex bg-black border border-[#1e3b29] rounded-xl p-1 font-mono">
            <div className="flex-1 py-2.5 text-center text-xs font-bold bg-emerald-500 text-black rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-default">
              Entrar
            </div>
            <Link href="/register" className="flex-1 py-2.5 text-center text-xs font-bold text-zinc-400 hover:text-white transition-colors rounded-lg flex items-center justify-center">
              Ativar Convite
            </Link>
          </div>

          {/* FORMULÁRIO DE LOGIN */}
          <form onSubmit={handleLogin} className="space-y-4 font-mono">
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="email"
                  required
                  disabled={bloqueadoPorRateLimit}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Senha</label>
                <button 
                  type="button"
                  onClick={() => setModalSenhaAberto(true)}
                  className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="password"
                  required
                  disabled={bloqueadoPorRateLimit}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando || bloqueadoPorRateLimit}
              className={`w-full mt-4 py-3.5 font-bold uppercase text-[11px] tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                bloqueadoPorRateLimit
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer'
              } disabled:opacity-50`}
            >
              {carregando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : bloqueadoPorRateLimit ? (
                <><Ban className="w-4 h-4" /> ACESSO BLOQUEADO TEMPORARIAMENTE</>
              ) : (
                <>ACESSAR PAINEL <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

          </form>

          {/* RODAPÉ */}
          <div className="text-center pt-2 border-t border-zinc-900 font-mono">
            <p className="text-[11px] text-zinc-500">
              Quer assinar a V5 Telecom?{' '}
              <Link href="/planos" className="text-emerald-400 hover:underline font-bold">
                Ver Planos e Preços
              </Link>
            </p>
          </div>

        </div>
      </div>

      {/* MODAL "ESQUECEU A SENHA" */}
      {modalSenhaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-[#1e3b29] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Recuperação de Senha</h3>
              </div>
              <button 
                onClick={() => setModalSenhaAberto(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sucessoRecuperacao ? (
              <div className="py-8 text-center space-y-3">
                <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-white font-bold">Link enviado com sucesso!</p>
                <p className="text-[11px] text-zinc-400">Verifique sua caixa de entrada para redefinir sua senha.</p>
              </div>
            ) : (
              <form onSubmit={handleEnviarRecuperacao} className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Insira seu e-mail corporativo cadastrado. Enviaremos um link seguro para a redefinição de senha.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-400">E-mail Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                    <input 
                      type="email"
                      required
                      value={emailRecuperacao}
                      onChange={(e) => setEmailRecuperacao(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={enviandoRecuperacao}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {enviandoRecuperacao ? <Loader2 className="w-4 h-4 animate-spin" /> : "ENVIAR LINK DE RECUPERAÇÃO"}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}