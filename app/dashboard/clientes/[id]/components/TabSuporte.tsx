// ================================================================================
// TAB SUPORTE - Chamados do cliente
// ================================================================================

"use client"
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Headphones, Plus } from 'lucide-react';

interface TabSuporteProps {
  clienteId: string;
}

export default function TabSuporte({ clienteId }: TabSuporteProps) {
  const [chamados] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest">Chamados do Cliente</p>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer">
          <Plus className="w-3 h-3" /> NOVO CHAMADO
        </button>
      </div>

      {chamados.length === 0 ? (
        <Card className="border border-zinc-900 bg-zinc-900/40">
          <CardContent className="p-8 text-center">
            <Headphones className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-xs font-mono text-zinc-500">Nenhum chamado encontrado</p>
            <p className="text-[10px] font-mono text-zinc-600 mt-1">Os chamados de suporte deste cliente aparecerao aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chamados.map((c: any, i: number) => (
            <Card key={i} className="border border-zinc-900 bg-zinc-900/40 hover:border-zinc-700 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold font-mono text-white">{c.titulo}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">{c.data}</p>
                  </div>
                  <span className={`px-2 py-1 rounded border text-[10px] font-mono font-bold ${c.aberto ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                    {c.aberto ? 'ABERTO' : 'RESOLVIDO'}
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