"use client"
import React, { useState, useEffect, Suspense } from 'react';
import { ShieldCheck, Mail, Lock, User, KeyRound, ArrowRight, Loader2, Wrench, Headset } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [senha, setSenha] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');
  
  // 🛠️ Novo estado para escolher o tipo de colaborador (atendente ou tecnico)
  const [tipoColaborador, setTipoColaborador] = useState<'atendente' | 'tecnico'>('atendente');

  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro('');
    setMensagemSucesso('');

    if (!nome || !email || !senha || !codigoConvite) {
      setMensagemErro('Preencha todos os campos obrigatórios, incluindo o código de convite.');
      return;
    }

    setCarregando(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usuario: nome, 
          email, 
          senha,
          codigoConvite,
          tipo: tipoColaborador // 🚀 Envia se é 'atendente' ou 'tecnico' para a API
        })
      });

      const textoResposta = await res.text();
      let data;
      try {
        data = JSON.parse(textoResposta);
      } catch (e) {
        throw new Error(`Erro interno no servidor (HTML retornado): ${textoResposta.substring(0, 100)}`);
      }
      
      if (res.ok && data.sucesso) {
        setMensagemSucesso(data.mensagem || 'Conta ativada com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMensagemErro(data.mensagem || 'Erro ao ativar conta.');
      }
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      setMensagemErro(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
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
            <p className="text-xs text-zinc-400 font-mono mt-1">Ativação de Convite de Funcionário</p>
          </div>
        </div>

        {mensagemErro && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[11px] font-mono text-center break-words">
            {mensagemErro}
          </div>
        )}
        {mensagemSucesso && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[11px] font-mono text-center">
            {mensagemSucesso}
          </div>
        )}

        <div className="bg-[#0a0a0a] border border-[#1e3b29] rounded-2xl p-6 shadow-2xl space-y-6">
          
          {/* ABAS DO TOPO */}
          <div className="flex bg-black border border-[#1e3b29] rounded-xl p-1 font-mono">
            <Link href="/login" className="flex-1 py-2.5 text-center text-xs font-bold text-zinc-400 hover:text-white transition-colors rounded-lg flex items-center justify-center">
              Entrar
            </Link>
            <div className="flex-1 py-2.5 text-center text-xs font-bold bg-emerald-500 text-black rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-default">
              Ativar Convite
            </div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[11px] font-mono text-center">
            🔒 Área exclusiva para colaboradores convidados por e-mail.
          </div>

          {/* FORMULÁRIO DE ATIVAÇÃO */}
          <form onSubmit={handleRegister} className="space-y-4 font-mono">
            
            {/* SELETOR DE TIPO DE COLABORADOR */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Cargo / Tipo de Conta</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoColaborador('atendente')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tipoColaborador === 'atendente'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Headset className="w-4 h-4" /> Atendente
                </button>
                <button
                  type="button"
                  onClick={() => setTipoColaborador('tecnico')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tipoColaborador === 'tecnico'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Wrench className="w-4 h-4" /> Técnico
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Seu Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="email"
                  required
                  disabled={!!emailParam}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@provedora.com"
                  className={`w-full bg-black/60 border rounded-xl px-3.5 py-2.5 pl-10 text-xs transition-colors ${
                    emailParam 
                    ? 'border-emerald-500/40 text-emerald-400 cursor-not-allowed bg-emerald-950/10' 
                    : 'border-zinc-800 text-white focus:outline-none focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Crie sua Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Código de Convite da Empresa</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
                <input 
                  type="text"
                  required
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value)}
                  placeholder="EX: V5-XXXXXX"
                  className="w-full bg-black/60 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-emerald-400 font-bold uppercase tracking-widest focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-emerald-900/50"
                />
              </div>
              <p className="text-[9px] text-zinc-500 mt-1">Insira o código enviado no seu e-mail de convite pela gerência.</p>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full mt-4 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>FINALIZAR CADASTRO DA EQUIPE <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#021708] flex items-center justify-center text-emerald-400 font-mono text-xs">Carregando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}