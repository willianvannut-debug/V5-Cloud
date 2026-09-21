"use client"
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { ShieldCheck, Mail, Lock, User, KeyRound, ArrowRight, Loader2, Wrench, Headset, FileText, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
// Importa o medidor de força de senha
import { PasswordStrengthMeter } from '@/components/ui/password-strength';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [senha, setSenha] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');
  
  // 🛠️ Estado para o cargo
  const [tipoColaborador, setTipoColaborador] = useState<'atendente' | 'tecnico'>('atendente');
  
  // 🔒 Estados de validação
  const [isSenhaForte, setIsSenhaForte] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // 📝 Estados dos Termos de Uso dinâmicos
  const [modalAberto, setModalAberto] = useState(false);
  const [termoLidoNoModal, setTermoLidoNoModal] = useState(false);
  const [concordouTermos, setConcordouTermos] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Função para mudar de cargo e resetar o aceite dos termos
  const handleMudancaCargo = (cargo: 'atendente' | 'tecnico') => {
    setTipoColaborador(cargo);
    setConcordouTermos(false);
    setTermoLidoNoModal(false);
  };

  const handleScrollModal = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (scrollBottom <= 15) {
      setTermoLidoNoModal(true);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro('');
    setMensagemSucesso('');

    if (!nome || !email || !senha || !codigoConvite) {
      setMensagemErro('Preencha todos os campos obrigatórios, incluindo o código de convite.');
      return;
    }

    if (!isSenhaForte) {
      setMensagemErro('Sua senha não é forte o suficiente. Cumpra todos os requisitos visuais.');
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
          tipo: tipoColaborador 
        })
      });

      const textoResposta = await res.text();
      let data;
      try {
        data = JSON.parse(textoResposta);
      } catch (err) {
        throw new Error(`Erro interno no servidor: ${textoResposta.substring(0, 100)}`);
      }
      
      if (res.ok && data.sucesso) {
        setMensagemSucesso(data.mensagem || 'Conta ativada com sucesso! Redirecionando...');
        setTimeout(() => {
          window.location.replace('/login');
        }, 2000);
      } else {
        setMensagemErro(data.mensagem || 'Erro ao ativar conta.');
      }
    } catch (err: any) {
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
          
          <div className="flex bg-black border border-[#1e3b29] rounded-xl p-1 font-mono">
            <Link href="/login" className="flex-1 py-2.5 text-center text-xs font-bold text-zinc-400 hover:text-white transition-colors rounded-lg flex items-center justify-center">
              Entrar
            </Link>
            <div className="flex-1 py-2.5 text-center text-xs font-bold bg-emerald-500 text-black rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-default">
              Ativar Convite
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 font-mono">
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Cargo / Tipo de Conta</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleMudancaCargo('atendente')}
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
                  onClick={() => handleMudancaCargo('tecnico')}
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
                  type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" required disabled={!!emailParam} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colaborador@provedora.com"
                  className={`w-full bg-black/60 border rounded-xl px-3.5 py-2.5 pl-10 text-xs transition-colors ${
                    emailParam ? 'border-emerald-500/40 text-emerald-400 cursor-not-allowed bg-emerald-950/10' : 'border-zinc-800 text-white focus:outline-none focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Crie sua Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              
              {senha.length > 0 && (
                <div className="pt-2">
                  <PasswordStrengthMeter 
                    value={senha} 
                    onStrengthChange={(isStrong) => setIsSenhaForte(isStrong)} 
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 tracking-wider">Código de Convite da Empresa</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-emerald-400" />
                <input 
                  type="text" required value={codigoConvite} onChange={(e) => setCodigoConvite(e.target.value)} placeholder="EX: V5-XXXXXX"
                  className="w-full bg-black/60 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-emerald-400 font-bold uppercase tracking-widest focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-emerald-900/50"
                />
              </div>
            </div>

            {/* SECÇÃO DOS TERMOS */}
            <div className="pt-4 border-t border-zinc-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setModalAberto(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> LER TERMOS DE USO E LGPD
                </button>
                <span className={`text-[9px] font-bold ${termoLidoNoModal ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {termoLidoNoModal ? "✅ TERMOS LIDOS" : "⚠️ LEITURA PENDENTE"}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="concordoEquipe"
                  disabled={!termoLidoNoModal}
                  checked={concordouTermos}
                  onChange={(e) => setConcordouTermos(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-800 bg-black text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <label htmlFor="concordoEquipe" className={`text-[10px] select-none ${!termoLidoNoModal ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-300 cursor-pointer'}`}>
                  Li e concordo com os Termos de Confidencialidade para {tipoColaborador === 'atendente' ? 'Atendentes' : 'Técnicos'}.
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando || !isSenhaForte || !concordouTermos}
              className={`w-full mt-4 py-3.5 font-bold uppercase text-[11px] tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                carregando || !isSenhaForte || !concordouTermos
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-900/50 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer'
              }`}
            >
              {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>FINALIZAR CADASTRO DA EQUIPE <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

          </form>
        </div>
      </div>

      {/* MODAL DE TERMOS DINÂMICO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#1e3b29] w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                  Termo de Uso e Responsabilidade - Perfil {tipoColaborador === 'atendente' ? 'Atendente' : 'Técnico'}
                </h3>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CAIXA DE TEXTO COM CORES ESMERALDA, CINZA E ALERTAS */}
            <div ref={modalScrollRef} onScroll={handleScrollModal} className="w-full h-[60vh] max-h-[500px] bg-black/90 border border-zinc-800 rounded-xl p-6 text-xs text-zinc-300 overflow-y-auto space-y-6 select-none font-mono leading-relaxed">
              
              <div className="text-center pb-4 border-b border-zinc-800/50 mb-6">
                <h2 className="text-base text-emerald-400 font-black tracking-wider uppercase mb-1">TERMO DE USO E RESPONSABILIDADE</h2>
                <h3 className="text-xs text-zinc-300 font-bold uppercase mb-2">Acesso do Perfil de {tipoColaborador === 'atendente' ? 'Atendente' : 'Técnico'}</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">V5 Cloud Enterprise</p>
              </div>

              {/* === TEXTO EXATO DO ATENDENTE === */}
              {tipoColaborador === 'atendente' && (
                <>
                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">1. DEFINIÇÃO E ESCOPO DO PERFIL DE ATENDENTE</h4>
                    <p>O perfil de 'Atendente' na plataforma V5 Cloud Enterprise destina-se exclusivamente aos colaboradores da Empresa Provedora responsáveis pela captação inicial de leads, pela recepção de solicitações de viabilidade técnica e pelo gerenciamento pré-comercial de potenciais clientes.</p>
                    <p>O Atendente possui acesso restrito e controlado a um conjunto específico de funcionalidades e dados, sendo expressamente proibido qualquer utilização fora dos limites operacionais estabelecidos neste documento.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">2. DADOS AOS QUAIS O ATENDENTE TEM ACESSO</h4>
                    <p>O Atendente possui visualização exclusivamente dos seguintes dados relativos aos leads (potenciais clientes) que submeteram solicitações de viabilidade técnica:</p>
                    <p>(i) Nome completo do cliente;<br/>(ii) Número de telefone/WhatsApp para contato direto;<br/>(iii) Endereço completo (logradouro, número, CEP e referência);<br/>(iv) Resultado da análise automatizada de viabilidade técnica gerada pelo sistema (distância estimada à CTO mais próxima e indicador de cobertura);<br/>(v) Status da solicitação (processando, viável, inviável ou pendente);<br/>(vi) Data e horário da solicitação.</p>
                    <p className="mt-3 font-bold text-amber-400 uppercase text-[10px]">O Atendente NÃO possui acesso a:</p>
                    <p>(a) Mapa completo de infraestrutura de rede (localização das CTOs e rotas de fibra);<br/>(b) Dados financeiros, histórico de pagamentos ou informações de faturamento da Empresa Provedora;<br/>(c) Configurações globais, relatórios gerenciais ou análises estratégicas da empresa;<br/>(d) Credenciais, senhas ou informações de autenticação de outros usuários;<br/>(e) Dados de perfis administrativos ou de técnicos não relacionados às suas atribuições.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">3. RESPONSABILIDADES E OBRIGAÇÕES DO ATENDENTE</h4>
                    <p>O Atendente, enquanto usuário da plataforma V5 Cloud Enterprise, compromete-se a:</p>
                    
                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.1 Confidencialidade e Proteção de Dados</h5>
                    <p>Manter sigilo e confidencialidade absolutos sobre todos os dados pessoais dos leads a que tenha acesso, incluindo nomes, telefones, endereços e resultados de viabilidade técnica, sob pena de rescisão imediata do contrato de trabalho e responsabilização civil e criminal.</p>
                    <p>Não compartilhar, divulgar, transferir ou ceder informações de leads para terceiros alheios à Empresa Provedora, salvo com expressa autorização do Gerente.</p>
                    <p>Não utilizar os dados de contato de leads (telefone e WhatsApp) para fins pessoais, comerciais alternativos ou não autorizados pela Empresa Provedora.</p>

                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.2 Utilização Lícita da Plataforma</h5>
                    <p>Utilizar a plataforma exclusivamente para as finalidades operacionais relacionadas à captação e qualificação de leads, respeitando os horários de funcionamento e os limites de acesso definidos pelo Gerente.</p>
                    <p>Não utilizar robôs, scripts automatizados, extração de dados (scraping) ou qualquer ferramenta que tenha por objetivo sobrecarregar os servidores, contornar controles de segurança ou acessar informações além dos seus privilégios.</p>
                    <p>Executar todas as ações de forma manual e legítima, respeitando o fluxo operacional normal do sistema.</p>

                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.3 Segurança da Credencial e da Sessão</h5>
                    <p>Manter a confidencialidade absoluta de sua senha e credenciais de acesso, não as compartilhando com outros colaboradores, nem mesmo com o Gerente ou colegas.</p>
                    <p>Efetuar o encerramento seguro (logout) da sessão ao término de cada utilização, especialmente em computadores compartilhados ou de uso público.</p>
                    <p>Notificar imediatamente o Gerente ou a administração do sistema caso suspeite que sua senha foi comprometida ou que alguém tenha acessado sua conta sem autorização.</p>
                    <p>Nunca registrar a sua senha em arquivos de texto, post-its, navegadores ou qualquer meio inseguro.</p>

                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.4 Conformidade com Legislação de Proteção de Dados</h5>
                    <p>Reconhecer e respeitar os direitos dos titulares dos dados (potenciais clientes) conforme estabelecido pela Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).</p>
                    <p>Não solicitar, coletar ou armazenar informações adicionais além daquelas estritamente necessárias (nome, telefone, endereço e CEP) para o teste de viabilidade técnica.</p>
                    <p>Informar claramente aos leads que os seus dados serão utilizados exclusivamente para análise de cobertura técnica, contato comercial e gestão de instalação do serviço.</p>
                    <p>Respeitar as solicitações de exclusão de dados, bloqueio de contato ou revogação de consentimento formuladas por leads, repassando-as imediatamente ao Gerente.</p>

                    <h5 className="text-red-400 font-bold text-[11px] pt-2 uppercase">3.5 Proibição de Engenharia Reversa e Acesso Não Autorizado</h5>
                    <p>É expressamente proibido ao Atendente tentar contornar protocolos de segurança, acessar funcionalidades restritas, realizar engenharia reversa, descompilar código ou buscar explorar vulnerabilidades no sistema.</p>
                    <p>Qualquer tentativa de acesso não autorizado será considerada violação grave deste termo, sujeitando o Atendente a rescisão imediata de contrato e acionamento de autoridades competentes.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">4. RESPONSABILIDADE E RESPONSABILIZAÇÃO</h4>
                    <p>O Atendente é pessoal e integralmente responsável:<br/>
                    (i) Por toda e qualquer ação, inserção, edição ou consulta de dados efetuada através de sua conta na plataforma;<br/>
                    (ii) Por violações de confidencialidade, vazamentos, compartilhamentos não autorizados ou mau uso de informações de leads;<br/>
                    (iii) Por não conformidade com a legislação de proteção de dados (LGPD) e Marco Civil da Internet;<br/>
                    (iv) Por danos, prejuízos ou exposição de infraestrutura decorrentes de ações negligentes ou maliciosas;<br/>
                    (v) Por perda de oportunidades de negócio resultantes de seu mau uso da plataforma ou negligência na gestão de leads.</p>
                    <p>A Empresa Provedora, enquanto empregadora/contratante do Atendente, é a responsável primária pela supervisão, correção de condutas inadequadas e implementação de medidas disciplinares.</p>
                    <p>A V5 Cloud, enquanto fornecedora da plataforma, exime-se de responsabilidade por abusos, vazamentos de dados ou violações de privacidade perpetrados pelos usuários (Atendentes, Técnicos ou Gerentes) da Empresa Provedora.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">5. MONITORAMENTO, LOGS E AUDITORIA</h4>
                    <p>O Atendente reconhece e aceita que:<br/>
                    (i) Todas as suas ações na plataforma (login, consultas, edições, exportações) são automaticamente registradas em logs de sistema pela V5 Cloud;<br/>
                    (ii) O Gerente da Empresa Provedora tem acesso total aos registros de suas atividades e pode auditar qualquer ação por motivos de segurança, compliance ou investigação de incidentes;<br/>
                    (iii) Os logs compreendem data, horário, endereço IP de origem, ações executadas e dados acessados;<br/>
                    (iv) Estes registros podem ser retidos pela V5 Cloud pelo prazo mínimo de 6 (seis) meses, conforme exigido pelo Marco Civil da Internet (Lei nº 12.965/2014);<br/>
                    (v) Em caso de investigação de incidente de segurança, vazamento ou violação de privacidade, as informações de log podem ser utilizadas como evidência e compartilhadas com autoridades legais competentes.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider">6. SANÇÕES E RESCISÃO DE ACESSO</h4>
                    <p>Em caso de violação grave de qualquer disposição deste Termo de Uso, incluindo, mas não limitado a, vazamento de dados, engenharia reversa, compartilhamento de credenciais ou acesso não autorizado, a V5 Cloud reserva-se o direito de:<br/>
                    (a) Suspender imediatamente o acesso do Atendente à plataforma;<br/>
                    (b) Notificar a Empresa Provedora da violação para que proceda com as medidas disciplinares internas cabíveis;<br/>
                    (c) Cancelar definitivamente a conta do usuário e bloqueá-lo de futuros acessos;<br/>
                    (d) Comunicar o incidente às autoridades competentes quando apropriado (ANPD, polícia civil, etc.);<br/>
                    (e) Acionar medidas judiciais para reparação de danos causados ao sistema, dados ou reputação da V5 Cloud.</p>
                    <p>A Empresa Provedora também se compromete a remover imediatamente o acesso do Atendente ao sistema (através do painel de administração) em caso de desligamento, rescisão contratual, mudança de cargo ou qualquer alteração nas suas atribuições operacionais.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">7. LIMITAÇÕES DE RESPONSABILIDADE</h4>
                    <p>A V5 Cloud não se responsabiliza por:<br/>
                    (i) Acessos não autorizados resultantes de negligência do Atendente na proteção de sua senha;<br/>
                    (ii) Perda de dados pessoais, vazamentos de informações de leads ou danos à reputação decorrentes de ações negligentes ou maliciosas do Atendente;<br/>
                    (iii) Falhas de negócio, perdas de oportunidades comerciais ou prejuízos operacionais resultantes de mau uso ou subutilização da plataforma pelo Atendente;<br/>
                    (iv) Indisponibilidades temporárias do sistema decorrentes de manutenção, atualizações ou falhas em infraestruturas de terceiros.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">8. LEGISLAÇÃO APLICÁVEL E FORO</h4>
                    <p>Este Termo de Uso é regido, interpretado e executado de acordo com as leis da República Federativa do Brasil, em especial:<br/>
                    • Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018);<br/>
                    • Marco Civil da Internet (Lei nº 12.965/2014);<br/>
                    • Consolidação das Leis do Trabalho (CLT - Lei nº 5.452/1943), quando aplicável;<br/>
                    • Código Civil Brasileiro (Lei nº 10.406/2002).</p>
                    <p>Fica eleito o Foro da Comarca da sede da V5 Cloud para dirimir quaisquer controvérsias, litígios ou dúvidas oriundas da utilização da plataforma ou da interpretação deste documento, com expressa renúncia a qualquer outro foro.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">9. ACEITAÇÃO E VIGÊNCIA DO TERMO</h4>
                    <p>Ao acessar a plataforma V5 Cloud Enterprise no perfil de Atendente, o colaborador da Empresa Provedora declara expressamente que:<br/>
                    (i) Leu, compreendeu e concorda integralmente com todas as disposições deste Termo de Uso;<br/>
                    (ii) Assume total responsabilidade pelas suas ações na plataforma;<br/>
                    (iii) Reconhece ser vinculado por este documento independentemente de assinatura impressa.</p>
                    <p>Este Termo de Uso entra em vigor no momento do primeiro acesso à plataforma e permanece vigente enquanto durar a atividade do Atendente como colaborador da Empresa Provedora.</p>
                  </section>
                </>
              )}

              {/* === TEXTO EXATO DO TÉCNICO === */}
              {tipoColaborador === 'tecnico' && (
                <>
                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">1. DEFINIÇÃO E ESCOPO DO PERFIL DE TÉCNICO</h4>
                    <p>O perfil de 'Técnico' na plataforma V5 Cloud Enterprise destina-se exclusivamente aos colaboradores da Empresa Provedora responsáveis pela execução de atividades técnicas de campo, instalação de serviços, inspeção de infraestrutura e validação presencial da viabilidade técnica de cobertura.</p>
                    <p>O Técnico possui acesso restrito e compartimentado a informações operacionais necessárias para executar suas atividades de instalação e manutenção, sendo expressamente proibido qualquer utilização fora dos limites estabelecidos neste documento.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">2. DADOS AOS QUAIS O TÉCNICO TEM ACESSO</h4>
                    <p>O Técnico possui visualização exclusivamente dos seguintes dados operacionais, estritamente necessários para a execução de trabalhos de instalação e validação técnica de cobertura:</p>
                    <p>(i) Nome completo do cliente;<br/>(ii) Número de telefone/WhatsApp para contato direto com o cliente (exclusivamente para agendamento, confirmação de visita e coordenação operacional);<br/>(iii) Endereço completo do cliente (logradouro, número, CEP e coordenadas de geolocalização para localização em mapa);<br/>(iv) Localização das Caixas de Terminação Óptica (CTOs) mais próximas ao endereço do cliente (coordenadas geográficas e distância estimada);<br/>(v) Informações técnicas básicas sobre infraestrutura local (rotas de fibra, obstáculos conhecidos, notas de instalação anterior);<br/>(vi) Status da solicitação de viabilidade (viável, inviável ou em processamento).</p>
                    <p className="mt-3 font-bold text-amber-400 uppercase text-[10px]">O Técnico NÃO possui acesso a:</p>
                    <p>(a) Mapa completo de infraestrutura da Empresa Provedora ou de áreas além do seu escopo de atuação;<br/>(b) Dados financeiros, histórico de pagamentos ou informações de faturamento;<br/>(c) Listas completas de leads ou análises comerciais de mercado;<br/>(d) Configurações globais, relatórios gerenciais ou informações estratégicas da empresa;<br/>(e) Credenciais, senhas ou informações de autenticação de outros usuários;<br/>(f) Dados de perfis administrativos, de atendentes ou de outros técnicos não relacionados às suas atividades de campo.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">3. RESPONSABILIDADES E OBRIGAÇÕES DO TÉCNICO</h4>
                    <p>O Técnico, enquanto usuário da plataforma V5 Cloud Enterprise, compromete-se a:</p>
                    
                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.1 Confidencialidade e Proteção de Dados</h5>
                    <p>Manter sigilo absoluto sobre todos os dados pessoais dos clientes a que tenha acesso (nome, telefone, endereço e informações de geolocalização), sob pena de rescisão imediata de contrato e responsabilização civil e criminal.</p>
                    <p>Não divulgar, transferir ou compartilhar informações de clientes ou dados de infraestrutura para terceiros alheios à Empresa Provedora, salvo com expressa autorização escrita do Gerente.</p>
                    <p>Utilizar o número de telefone/WhatsApp do cliente exclusivamente para coordenação operacional de agendamento, confirmação de visita, comunicação de atrasos ou resolução de dúvidas técnicas relacionadas à instalação. É proibido qualquer contato comercial não autorizado, solicitação de favores pessoais ou usos alternativos.</p>
                    <p>Não capturar, fotografar, copiar ou reter informações adicionais sobre infraestrutura de rede além daquelas necessárias para a execução da tarefa específica de instalação/inspeção.</p>

                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.2 Utilização Restrita da Plataforma</h5>
                    <p>Acessar a plataforma exclusivamente para consultar dados necessários às atividades de campo, visualizar a localização de clientes e CTOs, e atualizar o status de trabalhos concluídos.</p>
                    <p>Não exportar, baixar em massa, copiar integralmente ou extrair listagens de clientes, endereços ou infraestrutura para armazenamento local em dispositivos pessoais ou na nuvem.</p>
                    <p>Não utilizar robôs, scripts, bots ou qualquer ferramenta automatizada que tenha por objetivo acessar, coletar ou processar dados da plataforma de forma não autorizada.</p>
                    <p>Executar todas as ações de forma manual, transparente e de acordo com os procedimentos operacionais estabelecidos pela Empresa Provedora.</p>

                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.3 Segurança da Credencial e Sessão</h5>
                    <p>Guardar sua senha com confidencialidade absoluta, não a compartilhando com outros colaboradores, clientes ou terceiros.</p>
                    <p>Efetuar logout (encerramento de sessão) ao término de cada utilização, especialmente se estiver utilizando dispositivos móveis, tablets ou computadores de propriedade da empresa compartilhados com outros técnicos.</p>
                    <p>Notificar imediatamente o Gerente caso suspeite de qualquer comprometimento de sua senha, acesso não autorizado ou atividade anômala em sua conta.</p>
                    <p>Nunca armazenar sua senha em bloco de notas, aplicativos de mensagem, e-mails ou qualquer meio que não seja seguro.</p>

                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.4 Conformidade com Legislação de Proteção de Dados</h5>
                    <p>Reconhecer e respeitar os direitos dos clientes conforme garantido pela Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).</p>
                    <p>Informar claramente ao cliente, quando necessário, que os seus dados serão utilizados exclusivamente para análise técnica, coordenação de instalação e prestação do serviço de internet.</p>
                    <p>Respeitar solicitações de exclusão de dados ou bloqueio de contato formuladas por clientes, repassando-as imediatamente ao Gerente ou ao Atendente.</p>
                    <p>Não realizar coleta de dados pessoais adicionais (como CPF, data de nascimento, informações bancárias) sem expressa autorização e justificativa operacional clara.</p>

                    <h5 className="text-emerald-300 font-bold text-[11px] pt-2 uppercase">3.5 Manutenção da Integridade de Dados de Infraestrutura</h5>
                    <p>Acessar informações de infraestrutura (localização de CTOs, rotas de fibra) exclusivamente para a execução de trabalhos específicos de instalação autorizados.</p>
                    <p>Não modificar, editar, excluir ou alterar dados de CTOs, rotas de fibra ou qualquer informação de mapeamento de rede, mesmo que identificar imprecisões ou desatualizações.</p>
                    <p>Em caso de identificação de erros no mapeamento de infraestrutura, reportar os achados imediatamente ao Gerente ou à equipe de operações, que procederá com as correções apropriadas.</p>
                    <p>Não compartilhar coordenadas precisas de CTOs, mapas de rede ou dados de infraestrutura com clientes ou terceiros, pois estes constituem informações estratégicas e confidenciais da Empresa Provedora.</p>

                    <h5 className="text-red-400 font-bold text-[11px] pt-2 uppercase">3.6 Proibição de Engenharia Reversa e Acesso Não Autorizado</h5>
                    <p>É expressamente proibido ao Técnico tentar contornar protocolos de segurança, forçar acesso a áreas restritas, realizar engenharia reversa, capturar tráfego de dados ou explorar vulnerabilidades do sistema.</p>
                    <p>Qualquer tentativa de acesso não autorizado ou evasão de controles de privilégio será considerada violação grave, sujeitando o Técnico a rescisão imediata e acionamento de autoridades competentes.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">4. RESPONSABILIDADE E RESPONSABILIZAÇÃO</h4>
                    <p>O Técnico é pessoal e integralmente responsável:<br/>
                    (i) Por todas as ações, consultas e atualizações efetuadas através de sua conta na plataforma;<br/>
                    (ii) Por violações de confidencialidade, vazamentos de dados de clientes ou infraestrutura, e compartilhamentos não autorizados;<br/>
                    (iii) Por não conformidade com a legislação de proteção de dados (LGPD) e Marco Civil da Internet;<br/>
                    (iv) Por danos, prejuízos ou exposição de infraestrutura decorrentes de negligência, má conduta ou má utilização da plataforma;<br/>
                    (v) Por atrasos, falhas técnicas ou insatisfação de clientes resultantes de mau uso ou subutilização das ferramentas da plataforma.</p>
                    <p>A Empresa Provedora, enquanto empregadora do Técnico, é responsável pela supervisão e implementação de medidas disciplinares em caso de infrações.</p>
                    <p>A V5 Cloud, enquanto fornecedora da plataforma, exime-se de responsabilidade por violações de confidencialidade, vazamentos de dados ou abusos perpetrados pelos usuários (Técnicos, Atendentes ou Gerentes) da Empresa Provedora.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">5. MONITORAMENTO, LOGS E AUDITORIA</h4>
                    <p>O Técnico reconhece e aceita que:<br/>
                    (i) Todas as suas ações na plataforma (login, consultas de dados, atualizações) são automaticamente registradas em logs de sistema;<br/>
                    (ii) O Gerente da Empresa Provedora tiene acesso total aos seus registros de atividade para auditoria, segurança e investigação de incidentes;<br/>
                    (iii) Os logs compreendem data, hora, endereço IP, localização geográfica (se disponível) e todas as operações executadas;<br/>
                    (iv) Estes registros são retidos pela V5 Cloud pelo prazo mínimo de 6 (seis) meses conforme exigido pelo Marco Civil da Internet;<br/>
                    (v) Em caso de investigação de violação de segurança ou vazamento de dados, os logs podem ser utilizados como evidência e compartilhados com autoridades legais competentes.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider">6. SANÇÕES E RESCISÃO DE ACESSO</h4>
                    <p>Em caso de violação grave deste Termo de Uso, incluindo vazamento de dados, compartilhamento de credenciais, engenharia reversa ou acesso não autorizado, a V5 Cloud reserva-se o direito de:<br/>
                    (a) Suspender imediatamente o acesso do Técnico à plataforma;<br/>
                    (b) Notificar a Empresa Provedora para implementação de medidas disciplinares;<br/>
                    (c) Cancelar definitivamente a conta do usuário e bloqueá-lo de futuros acessos;<br/>
                    (d) Comunicar o incidente às autoridades competentes quando apropriado;<br/>
                    (e) Acionar medidas judiciais para reparação de danos causados.</p>
                    <p>A Empresa Provedora compromete-se a remover imediatamente o acesso do Técnico (através do painel de administração) em caso de desligamento, rescisão contratual ou mudança de atribuições.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">7. LIMITAÇÕES DE RESPONSABILIDADE</h4>
                    <p>A V5 Cloud não se responsabiliza por:<br/>
                    (i) Acessos não autorizados resultantes de negligência do Técnico na proteção de sua senha;<br/>
                    (ii) Vazamentos de dados, perda de confidencialidade de clientes ou danos à reputação decorrentes de ações do Técnico;<br/>
                    (iii) Falhas operacionais, atrasos em instalação ou prejuízos comerciais resultantes de mau uso da plataforma;<br/>
                    (iv) Indisponibilidades temporárias do sistema.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">8. LEGISLAÇÃO APLICÁVEL E FORO</h4>
                    <p>Este Termo de Uso é regido pelas leis da República Federativa do Brasil, em especial:<br/>
                    • Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018);<br/>
                    • Marco Civil da Internet (Lei nº 12.965/2014);<br/>
                    • Consolidação das Leis do Trabalho (CLT - Lei nº 5.452/1943);<br/>
                    • Código Civil Brasileiro (Lei nº 10.406/2002).</p>
                    <p>Fica eleito o Foro da Comarca da sede da V5 Cloud para dirimir controvérsias oriundas deste documento.</p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">9. ACEITAÇÃO E VIGÊNCIA DO TERMO</h4>
                    <p>Ao acessar a plataforma V5 Cloud Enterprise no perfil de Técnico, o colaborador da Empresa Provedora declara expressamente que:<br/>
                    (i) Leu, compreendeu e concorda integralmente com todas as disposições deste Termo de Uso;<br/>
                    (ii) Assume total responsabilidade pelas suas ações na plataforma;<br/>
                    (iii) Reconhece ser vinculado por este documento independentemente de assinatura impressa.</p>
                    <p>Este Termo permanece vigente enquanto durar a atividade do Técnico como colaborador da Empresa Provedora.</p>
                  </section>
                </>
              )}
              
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-900/50 mt-2">
              <span className="text-[10px] text-zinc-500">
                {termoLidoNoModal ? "✨ Leitura concluída!" : "⬇️ Desça até o final para liberar"}
              </span>
              <button
                type="button"
                disabled={!termoLidoNoModal}
                onClick={() => {
                  setConcordouTermos(true);
                  setModalAberto(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                CONCORDO E ACEITO
              </button>
            </div>

          </div>
        </div>
      )}

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