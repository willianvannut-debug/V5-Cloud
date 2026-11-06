// ================================================================================
// TAB PLANO - Contrato, upgrade/downgrade, fidelidade, cancelar, historico
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Wifi,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { supabase, estiloInput, estiloLabel, estiloSelect, estiloRotulo } from '../shared';

interface TabPlanoProps {
  clienteId: string;
  empresa: any;
}

export default function TabPlano({ clienteId, empresa }: TabPlanoProps) {
  const [contrato, setContrato] = useState<any>(null);
  const [planoAtual, setPlanoAtual] = useState<any>(null);
  const [planosDisponiveis, setPlanosDisponiveis] = useState<any[]>([]);
  const [carregandoContrato, setCarregandoContrato] = useState(true);
  const [modalPlano, setModalPlano] = useState<'upgrade' | 'downgrade' | null>(null);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>('');
  const [salvandoPlano, setSalvandoPlano] = useState(false);
  const [fidelidadeMeses, setFidelidadeMeses] = useState<number>(0);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [historicContratos, setHistoricContratos] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  // ==========================
  // CARREGAR CONTRATO + PLANOS
  // ==========================
  const carregarContrato = useCallback(async () => {
    if (!clienteId || !supabase || !empresa) return;
    setCarregandoContrato(true);
    try {
      const { data: contratoData } = await supabase
        .from('contratos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('status', 'ativo')
        .single();

      setContrato(contratoData);

      const { data: planosData } = await supabase
        .from('planos')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('nome');

      setPlanosDisponiveis(planosData || []);

      if (contratoData?.plano_id) {
        const planoDoContrato = (planosData || []).find((p: any) => p.id === contratoData.plano_id);
        setPlanoAtual(planoDoContrato || null);
      } else {
        setPlanoAtual(null);
      }
    } catch (e) {
      console.error('Erro ao carregar contrato:', e);
    } finally {
      setCarregandoContrato(false);
    }
  }, [clienteId, empresa]);

  useEffect(() => {
    carregarContrato();
  }, [carregarContrato]);

  // ==========================
  // CARREGAR HISTORICO
  // ==========================
  const carregarHistorico = useCallback(async () => {
    if (!clienteId || !supabase) return;
    setCarregandoHistorico(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, planos(nome, velocidade, preco)')
        .eq('cliente_id', clienteId)
        .in('status', ['encerrado', 'cancelado'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoricContratos(data || []);
    } catch (e) {
      console.error('Erro ao carregar historico:', e);
    } finally {
      setCarregandoHistorico(false);
    }
  }, [clienteId]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  // ==========================
  // VINCULAR / TROCAR PLANO
  // ==========================
  const vincularPlano = async (planoId: string) => {
    if (!supabase || !empresa || !clienteId) return;
    setSalvandoPlano(true);
    try {
      const hoje = new Date();
      const dataInicio = hoje.toISOString().split('T')[0];
      let dataVencimento: string | null = null;
      if (fidelidadeMeses > 0) {
        const venc = new Date(hoje);
        venc.setMonth(venc.getMonth() + fidelidadeMeses);
        dataVencimento = venc.toISOString().split('T')[0];
      }

      if (contrato) {
        await supabase
          .from('contratos')
          .update({
            status: 'encerrado',
            observacoes: `Plano alterado em ${new Date().toLocaleDateString('pt-BR')}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contrato.id);

        const { error } = await supabase
          .from('contratos')
          .insert({
            empresa_id: empresa.id,
            cliente_id: clienteId,
            plano_id: planoId,
            data_inicio: dataInicio,
            data_vencimento: dataVencimento,
            fidelidade_meses: fidelidadeMeses,
            status: 'ativo',
            observacoes: `${modalPlano === 'upgrade' ? 'Upgrade' : modalPlano === 'downgrade' ? 'Downgrade' : 'Vinculação'} - Plano anterior: ${planoAtual?.nome || 'Nenhum'}`,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contratos')
          .insert({
            empresa_id: empresa.id,
            cliente_id: clienteId,
            plano_id: planoId,
            data_inicio: dataInicio,
            data_vencimento: dataVencimento,
            fidelidade_meses: fidelidadeMeses,
            status: 'ativo',
          });
        if (error) throw error;
      }
      await carregarContrato();
      await carregarHistorico();
      setModalPlano(null);
      setPlanoSelecionado('');
      setFidelidadeMeses(0);
    } catch (e: any) {
      console.error('Erro ao vincular plano:', e);
      alert('Erro ao vincular plano: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setSalvandoPlano(false);
    }
  };

  // ==========================
  // CANCELAR CONTRATO
  // ==========================
  const cancelarContrato = async () => {
    if (!supabase || !contrato) return;
    setCancelando(true);
    try {
      if (contrato.fidelidade_meses > 0 && contrato.data_vencimento) {
        const vencimento = new Date(contrato.data_vencimento + 'T00:00:00');
        if (vencimento > new Date()) {
          const confirma = confirm(
            `⚠️ ATENÇÃO: Este contrato tem fidelidade até ${vencimento.toLocaleDateString('pt-BR')}.\n\nO cancelamento antes do prazo pode gerar multa contratual.\n\nDeseja continuar mesmo assim?`
          );
          if (!confirma) {
            setCancelando(false);
            return;
          }
        }
      }

      const { error } = await supabase
        .from('contratos')
        .update({
          status: 'cancelado',
          observacoes: motivoCancelamento
            ? `Cancelado em ${new Date().toLocaleDateString('pt-BR')} - Motivo: ${motivoCancelamento}`
            : `Cancelado em ${new Date().toLocaleDateString('pt-BR')}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contrato.id);

      if (error) throw error;
      await carregarContrato();
      await carregarHistorico();
      setModalCancelar(false);
      setMotivoCancelamento('');
    } catch (e: any) {
      console.error('Erro ao cancelar contrato:', e);
      alert('Erro ao cancelar: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setCancelando(false);
    }
  };

  // ==========================
  // RENDER
  // ==========================
  if (carregandoContrato) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
        <span className="ml-2 text-xs text-zinc-500 font-mono">Carregando contrato...</span>
      </div>
    );
  }

  const planosUpgrade = planoAtual
    ? planosDisponiveis.filter(p => {
        const valorAtual = parseFloat((planoAtual.preco || '0').replace(/[^\d,]/g, '').replace(',', '.'));
        const valorPlano = parseFloat((p.preco || '0').replace(/[^\d,]/g, '').replace(',', '.'));
        return valorPlano > valorAtual && p.id !== planoAtual.id;
      })
    : planosDisponiveis;

  const planosDowngrade = planoAtual
    ? planosDisponiveis.filter(p => {
        const valorAtual = parseFloat((planoAtual.preco || '0').replace(/[^\d,]/g, '').replace(',', '.'));
        const valorPlano = parseFloat((p.preco || '0').replace(/[^\d,]/g, '').replace(',', '.'));
        return valorPlano < valorAtual && p.id !== planoAtual.id;
      })
    : [];

  return (
    <div className="space-y-6">
      {!contrato && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-xs text-yellow-400 font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Cliente sem plano vinculado. Selecione um plano abaixo para ativar o contrato.
        </div>
      )}

      {/* Dados do contrato */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Dados do Contrato</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-zinc-900 bg-zinc-900/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className={estiloRotulo}>Plano Atual</p>
                  <p className="text-sm font-bold font-mono text-white">{planoAtual?.nome || 'Sem Plano'}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between"><span className="text-zinc-500">Velocidade</span><span className="text-zinc-300">{planoAtual?.velocidade || '-'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Valor</span><span className="text-zinc-300">{planoAtual?.preco || '-'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Tipo</span><span className="text-zinc-300">Fibra Optica</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-900 bg-zinc-900/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className={estiloRotulo}>Contrato</p>
                  <p className="text-sm font-bold font-mono text-white">{contrato ? 'Ativo' : 'Sem Contrato'}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between"><span className="text-zinc-500">Fidelidade</span><span className="text-zinc-300">{contrato?.fidelidade_meses ? `${contrato.fidelidade_meses} meses` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Inicio</span><span className="text-zinc-300">{contrato?.data_inicio ? new Date(contrato.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Vencimento</span><span className="text-zinc-300">{contrato?.data_vencimento ? new Date(contrato.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selecao de planos (sem plano) */}
      {!planoAtual && planosDisponiveis.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Selecionar Plano</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {planosDisponiveis.map((plano: any) => (
              <Card
                key={plano.id}
                className={`border cursor-pointer transition-all hover:border-emerald-500/50 ${planoSelecionado === plano.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-900 bg-zinc-900/40'}`}
                onClick={() => setPlanoSelecionado(plano.id)}
              >
                <CardContent className="p-4">
                  <p className="text-sm font-bold font-mono text-white">{plano.nome}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-1">{plano.velocidade}</p>
                  <p className="text-lg font-black text-emerald-400 font-mono mt-2">{plano.preco}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {planoSelecionado && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className={estiloRotulo}>Fidelidade</label>
                <select
                  value={fidelidadeMeses}
                  onChange={(e) => setFidelidadeMeses(Number(e.target.value))}
                  className={estiloSelect + " max-w-[200px]"}
                >
                  <option value={0}>Sem fidelidade</option>
                  <option value={12}>12 meses</option>
                  <option value={24}>24 meses</option>
                </select>
              </div>
              <button
                onClick={() => vincularPlano(planoSelecionado)}
                disabled={salvandoPlano}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                {salvandoPlano ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {salvandoPlano ? 'VINCULANDO...' : 'VINCULAR PLANO'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botoes de acao */}
      {planoAtual && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setModalPlano('upgrade'); setPlanoSelecionado(''); }}
            disabled={planosUpgrade.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowUpCircle className="w-4 h-4" /> UPGRADE
          </button>
          <button
            onClick={() => { setModalPlano('downgrade'); setPlanoSelecionado(''); }}
            disabled={planosDowngrade.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono font-bold uppercase hover:bg-orange-500/20 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowDownCircle className="w-4 h-4" /> DOWNGRADE
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase hover:bg-blue-500/20 transition-all cursor-pointer">
            <FileText className="w-4 h-4" /> GERAR CONTRATO
          </button>
          <button
            onClick={() => { setModalCancelar(true); setMotivoCancelamento(''); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-bold uppercase hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <XCircle className="w-4 h-4" /> CANCELAR CONTRATO
          </button>
        </div>
      )}

      {/* Modal Upgrade/Downgrade */}
      {modalPlano && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalPlano(null)}>
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-white uppercase">
                {modalPlano === 'upgrade' ? '⬆ Upgrade de Plano' : '⬇ Downgrade de Plano'}
              </h3>
              <button onClick={() => setModalPlano(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-mono">
              Plano atual: <span className="text-white font-bold">{planoAtual?.nome}</span> — {planoAtual?.velocidade} — {planoAtual?.preco}
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(modalPlano === 'upgrade' ? planosUpgrade : planosDowngrade).map((plano: any) => (
                <div
                  key={plano.id}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${planoSelecionado === plano.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}
                  onClick={() => setPlanoSelecionado(plano.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold font-mono text-white">{plano.nome}</p>
                      <p className="text-xs text-zinc-400 font-mono">{plano.velocidade}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-400 font-mono">{plano.preco}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className={estiloRotulo + " mb-0"}>Fidelidade</label>
              <select
                value={fidelidadeMeses}
                onChange={(e) => setFidelidadeMeses(Number(e.target.value))}
                className={estiloSelect + " max-w-[200px]"}
              >
                <option value={0}>Sem fidelidade</option>
                <option value={12}>12 meses</option>
                <option value={24}>24 meses</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setModalPlano(null); setFidelidadeMeses(0); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono font-bold uppercase hover:bg-zinc-900 transition-all cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                onClick={() => planoSelecionado && vincularPlano(planoSelecionado)}
                disabled={!planoSelecionado || salvandoPlano}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                {salvandoPlano ? 'SALVANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Contrato */}
      {modalCancelar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalCancelar(false)}>
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-red-400 uppercase">⚠ Cancelar Contrato</h3>
              <button onClick={() => setModalCancelar(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-mono">
              <p className="font-bold mb-1">Atenção!</p>
              <p>Ao cancelar o contrato, o cliente ficará sem plano ativo.</p>
              {contrato?.fidelidade_meses > 0 && contrato?.data_vencimento && new Date(contrato.data_vencimento + 'T00:00:00') > new Date() && (
                <p className="mt-2 text-yellow-400 font-bold">
                  ⚠ Contrato com fidelidade até {new Date(contrato.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}. Cancelamento antecipado pode gerar multa.
                </p>
              )}
            </div>

            <p className="text-xs text-zinc-400 font-mono">
              Plano atual: <span className="text-white font-bold">{planoAtual?.nome}</span> — {planoAtual?.preco}
            </p>

            <div>
              <label className={estiloLabel}>Motivo do cancelamento</label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Cliente solicitou, mudança de endereço, inadimplência..."
                className={estiloInput + " min-h-[80px] resize-none"}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalCancelar(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono font-bold uppercase hover:bg-zinc-900 transition-all cursor-pointer"
              >
                VOLTAR
              </button>
              <button
                onClick={cancelarContrato}
                disabled={cancelando}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelando ? 'CANCELANDO...' : 'CONFIRMAR CANCELAMENTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historico de Planos */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Histórico de Planos</p>
        {carregandoHistorico ? (
          <div className="flex items-center gap-2 py-4">
            <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
            <span className="text-xs text-zinc-500 font-mono">Carregando...</span>
          </div>
        ) : historicContratos.length === 0 ? (
          <p className="text-xs text-zinc-600 font-mono bg-zinc-900/40 rounded-xl p-4 border border-zinc-900">
            Nenhum plano anterior registrado.
          </p>
        ) : (
          <div className="space-y-2">
            {historicContratos.map((hist: any) => (
              <div key={hist.id} className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hist.status === 'cancelado' ? 'bg-red-500/10' : 'bg-zinc-800'}`}>
                    {hist.status === 'cancelado' ? <XCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono text-white">{hist.planos?.nome || 'Plano removido'}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {hist.planos?.velocidade || '-'} — {hist.planos?.preco || '-'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${hist.status === 'cancelado' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {hist.status === 'cancelado' ? 'Cancelado' : 'Encerrado'}
                  </span>
                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                    {hist.data_inicio ? new Date(hist.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    {' → '}
                    {hist.updated_at ? new Date(hist.updated_at).toLocaleDateString('pt-BR') : '-'}
                  </p>
                  {hist.fidelidade_meses > 0 && (
                    <p className="text-[10px] text-zinc-600 font-mono">Fidelidade: {hist.fidelidade_meses} meses</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}