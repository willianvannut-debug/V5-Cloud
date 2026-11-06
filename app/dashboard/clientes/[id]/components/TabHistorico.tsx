// ================================================================================
// TAB HISTORICO - Timeline de eventos do cliente
// ================================================================================

"use client"
import React, { useState } from 'react';
import {
  User,
  Edit3,
  Ban,
  XCircle,
  Clock,
} from 'lucide-react';

interface TabHistoricoProps {
  cliente: any;
}

export default function TabHistorico({ cliente }: TabHistoricoProps) {
  const [eventos] = useState<any[]>([]);

  // Eventos basicos a partir dos dados do cliente
  const eventosBase: { tipo: string; texto: string; data: string; icone: React.ReactNode; cor: string }[] = [
    {
      tipo: 'cadastro',
      texto: 'Cliente cadastrado no sistema',
      data: cliente.created_at ? new Date(cliente.created_at).toLocaleString('pt-BR') : '-',
      icone: <User className="w-4 h-4 text-emerald-400" />,
      cor: 'border-emerald-500/30',
    },
  ];

  if (cliente.updated_at && cliente.updated_at !== cliente.created_at) {
    eventosBase.push({
      tipo: 'atualizacao',
      texto: 'Dados atualizados',
      data: new Date(cliente.updated_at).toLocaleString('pt-BR'),
      icone: <Edit3 className="w-4 h-4 text-blue-400" />,
      cor: 'border-blue-500/30',
    });
  }

  if (cliente.data_bloqueio) {
    eventosBase.push({
      tipo: 'bloqueio',
      texto: 'Conexao bloqueada',
      data: new Date(cliente.data_bloqueio).toLocaleString('pt-BR'),
      icone: <Ban className="w-4 h-4 text-red-400" />,
      cor: 'border-red-500/30',
    });
  }

  if (cliente.data_cancelamento) {
    eventosBase.push({
      tipo: 'cancelamento',
      texto: `Cancelado: ${cliente.motivo_cancelamento || 'Sem motivo informado'}`,
      data: new Date(cliente.data_cancelamento).toLocaleString('pt-BR'),
      icone: <XCircle className="w-4 h-4 text-zinc-400" />,
      cor: 'border-zinc-500/30',
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest">Timeline do Cliente</p>

      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-800" />

        <div className="space-y-4">
          {[...eventosBase].reverse().map((ev, i) => (
            <div key={i} className="flex items-start gap-4 relative">
              <div className={`w-10 h-10 rounded-xl bg-zinc-900 border ${ev.cor} flex items-center justify-center shrink-0 z-10`}>
                {ev.icone}
              </div>
              <div className="pt-1">
                <p className="text-xs font-mono text-zinc-200">{ev.texto}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{ev.data}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {eventos.length === 0 && eventosBase.length <= 1 && (
        <div className="text-center py-4">
          <p className="text-[10px] font-mono text-zinc-600">Mais eventos serao registrados conforme o uso do sistema</p>
        </div>
      )}
    </div>
  );
}