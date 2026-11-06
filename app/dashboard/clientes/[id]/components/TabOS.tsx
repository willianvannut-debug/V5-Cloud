// ================================================================================
// TAB OS - Ordens de Servico
// ================================================================================

"use client"
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench, Plus } from 'lucide-react';

interface TabOSProps {
  clienteId: string;
}

export default function TabOS({ clienteId }: TabOSProps) {
  const [ordens] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest">Ordens de Servico</p>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer">
          <Plus className="w-3 h-3" /> NOVA OS
        </button>
      </div>

      {ordens.length === 0 ? (
        <Card className="border border-zinc-900 bg-zinc-900/40">
          <CardContent className="p-8 text-center">
            <Wrench className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-xs font-mono text-zinc-500">Nenhuma OS encontrada</p>
            <p className="text-[10px] font-mono text-zinc-600 mt-1">Instalacoes, manutencoes e visitas tecnicas aparecerao aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordens.map((o: any, i: number) => (
            <Card key={i} className="border border-zinc-900 bg-zinc-900/40 hover:border-zinc-700 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold font-mono text-white">{o.tipo}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{o.data} - {o.tecnico}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded border text-[10px] font-mono font-bold ${o.status === 'concluida' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                    {o.status?.toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}