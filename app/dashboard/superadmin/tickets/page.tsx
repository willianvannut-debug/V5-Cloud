// app/dashboard/superadmin/tickets/page.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Clock, 
  AlertCircle, 
  User, 
  Check, 
  RefreshCw,
  Send
} from 'lucide-react';

const CATEGORIAS_TICKET = [
  { valor: 'tecnico', label: 'Suporte Técnico' },
  { valor: 'financeiro', label: 'Financeiro' },
  { valor: 'comercial_leads', label: 'Comercial / Leads' },
  { valor: 'duvida', label: 'Dúvida Geral' },
  { valor: 'sugestao', label: 'Sugestão de Melhoria' },
  { valor: 'bug', label: 'Erro / Bug no Sistema' },
  { valor: 'outro', label: 'Outro' }
];

export default function SuperAdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviandoResposta, setEnviandoResposta] = useState<string | null>(null);

  const buscarTicketsAdmin = async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/admin/tickets');
      const data = await res.json();

      if (data.sucesso) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Erro ao buscar tickets:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarTicketsAdmin();
  }, []);

  const ticketsFiltrados = tickets.filter(t => {
    const passaStatus = filtroStatus === 'todos' || t.status === filtroStatus;
    const passaCategoria = filtroCategoria === 'todas' || t.categoria === filtroCategoria;
    return passaStatus && passaCategoria;
  });

  const labelCategoria = (valor: string) => {
    return CATEGORIAS_TICKET.find(c => c.valor === valor)?.label || 'Outro';
  };

  const alterarStatusTicket = async (id: string, novoStatus: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      const data = await res.json();

      if (data.sucesso) {
        setTickets(tickets.map(t => t.id === id ? { ...t, status: novoStatus } : t));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const enviarResposta = async (id: string) => {
    const textoResposta = respostas[id]?.trim();
    if (!textoResposta) return;

    setEnviandoResposta(id);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolvido', resposta: textoResposta })
      });
      const data = await res.json();

      if (data.sucesso) {
        setTickets(tickets.map(t => t.id === id ? data.ticket : t));
        setRespostas(prev => ({ ...prev, [id]: '' }));
      }
    } catch (err) {
      console.error('Erro ao enviar resposta:', err);
    } finally {
      setEnviandoResposta(null);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#0a0a0a] min-h-screen text-white font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-8 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-emerald-950/30 border border-zinc-800/80 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
            <LifeBuoy className="w-5 h-5" /> Super Admin — Gestão de Atendimento
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight font-mono text-white">
            Central de Chamados
          </h1>
          <p className="text-zinc-400 text-xs font-mono">
            Monitorize e responda aos tickets de suporte enviados pelos clientes da rede em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={buscarTicketsAdmin}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-xs font-mono flex items-center gap-2 cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
          </button>

          <select 
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="bg-black/70 border border-zinc-700 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="todas">Todas as Categorias</option>
            {CATEGORIAS_TICKET.map((cat) => (
              <option key={cat.valor} value={cat.valor}>{cat.label}</option>
            ))}
          </select>

          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-black/70 border border-zinc-700 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="aberto">Abertos</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvidos</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold px-1">
          Chamados Registrados ({ticketsFiltrados.length})
        </h2>

        {carregando ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            A carregar chamados do servidor...
          </div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="p-12 bg-zinc-900/40 border border-zinc-900 rounded-2xl text-center text-zinc-500 font-mono text-xs space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-zinc-600" />
            <p>Nenhum chamado encontrado com o filtro selecionado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ticketsFiltrados.map((ticket) => (
              <div 
                key={ticket.id} 
                className="p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-emerald-500/30 rounded-2xl transition-all duration-200 space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800/60 pb-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Cliente: <span className="text-zinc-300">{ticket.cliente_nome || ticket.user_id}</span>
                    </span>
                    <h3 className="text-sm font-bold font-mono text-white">
                      {ticket.assunto}
                    </h3>
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {labelCategoria(ticket.categoria)}
                    </span>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider shrink-0 ${
                    ticket.status === 'resolvido' 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : ticket.status === 'em_andamento'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-zinc-800/80">
                  {ticket.mensagem}
                </p>

                {ticket.resposta && (
                  <div className="bg-emerald-950/30 border border-emerald-800/50 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Resposta enviada</span>
                    <p className="text-xs text-emerald-200 font-sans leading-relaxed">{ticket.resposta}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <textarea
                    value={respostas[ticket.id] || ''}
                    onChange={(e) => setRespostas(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                    placeholder="Escreva a resposta para o cliente..."
                    rows={2}
                    className="flex-1 bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <button
                    onClick={() => enviarResposta(ticket.id)}
                    disabled={enviandoResposta === ticket.id || !respostas[ticket.id]?.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer h-full"
                  >
                    <Send className="w-3.5 h-3.5" /> {enviandoResposta === ticket.id ? 'Enviando...' : 'Responder'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                  <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Aberto em: {new Date(ticket.criado_at).toLocaleDateString()} às {new Date(ticket.criado_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {ticket.status !== 'em_andamento' && (
                      <button 
                        onClick={() => alterarStatusTicket(ticket.id, 'em_andamento')}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                      >
                        Marcar Em Andamento
                      </button>
                    )}

                    {ticket.status !== 'resolvido' && (
                      <button 
                        onClick={() => alterarStatusTicket(ticket.id, 'resolvido')}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Marcar Resolvido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}