'use client';

// ============================================================
// V5 Fibra - Página: Régua de Cobrança
// Menu: Financeiro > Régua de Cobrança
// Estilo: V5 Dark Theme (Tailwind + Card components)
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bell,
  Plus,
  Save,
  Loader2,
  Check,
  Info,
  Trash2,
  MessageCircle,
  Mail,
  Smartphone,
  Clock,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  AlertTriangle,
  Zap,
  Edit3,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

// --- Tipos ---
interface Step {
  id: string;
  step_type: 'before' | 'after';
  days_offset: number;
  channel: 'whatsapp' | 'email' | 'sms';
  message: string;
  enabled: boolean;
  sort_order: number;
}

interface ReguaConfig {
  id: string;
  name: string;
  enabled: boolean;
  steps: Step[];
}

// --- Helpers ---
const channelConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  email:    { label: 'E-mail',   icon: Mail,          color: 'text-blue-400',  bg: 'bg-blue-500/10 border-blue-500/20' },
  sms:      { label: 'SMS',      icon: Smartphone,    color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
};

const variables = [
  { tag: '{nome}', desc: 'Nome do cliente' },
  { tag: '{valor}', desc: 'Valor da fatura' },
  { tag: '{vencimento}', desc: 'Data de vencimento' },
  { tag: '{dias}', desc: 'Dias para/de atraso' },
  { tag: '{link}', desc: 'Link de pagamento' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative" type="button">
      <div className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

// ============================================================
// Componente Principal
// ============================================================
export default function ReguaCobrancaPage() {
  const [config, setConfig] = useState<ReguaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form novo step
  const [newStep, setNewStep] = useState({
    step_type: 'before' as 'before' | 'after',
    days_offset: 3,
    channel: 'whatsapp' as 'whatsapp' | 'email' | 'sms',
    message: 'Olá {nome}! Sua fatura de R${valor} vence em {dias} dias. Pague pelo link: {link}',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await api.get<any>('/financial/regua');
      const raw = res.data || res;
      const d = raw?.steps ? raw : raw?.data?.steps ? raw.data : null;

      if (d) {
        setConfig({
          id: d.id,
          name: d.name || 'Régua Padrão',
          enabled: d.enabled ?? true,
          steps: Array.isArray(d.steps) ? d.steps : [],
        });
      }
    } catch (err) {
      console.error('Erro ao carregar régua:', err);
      // Se não existe, cria config vazia
      setConfig({
        id: '',
        name: 'Régua Padrão',
        enabled: true,
        steps: [],
      });
    }
    setLoading(false);
  };

  const handleToggleRegua = async (enabled: boolean) => {
    if (!config) return;
    setConfig({ ...config, enabled });
    await api.put('/financial/regua', { name: config.name, enabled });
  };

  const handleToggleStep = async (stepId: string, enabled: boolean) => {
    if (!config) return;
    const step = config.steps.find(s => s.id === stepId);
    if (!step) return;

    setConfig({
      ...config,
      steps: config.steps.map(s => s.id === stepId ? { ...s, enabled } : s),
    });

    await api.put(`/financial/regua/steps/${stepId}`, { ...step, enabled });
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<Step>) => {
    if (!config) return;
    const step = config.steps.find(s => s.id === stepId);
    if (!step) return;

    const updated = { ...step, ...updates };
    setConfig({
      ...config,
      steps: config.steps.map(s => s.id === stepId ? updated : s),
    });

    await api.put(`/financial/regua/steps/${stepId}`, updated);
    setEditingStep(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleAddStep = async () => {
    setSaving(true);
    const res = await api.post<any>('/financial/regua/steps', newStep);
    if (!res.error) {
      await loadConfig();
      setShowAddForm(false);
      setNewStep({
        step_type: 'before',
        days_offset: 3,
        channel: 'whatsapp',
        message: 'Olá {nome}! Sua fatura de R${valor} vence em {dias} dias. Pague pelo link: {link}',
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    setSaving(false);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!config) return;
    setConfig({
      ...config,
      steps: config.steps.filter(s => s.id !== stepId),
    });
    await api.delete(`/financial/regua/steps/${stepId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!config) return null;

  // Separa steps antes e depois do vencimento e ordena
  const sortedSteps = [...config.steps].sort((a, b) => {
    const aVal = a.step_type === 'before' ? -a.days_offset : a.days_offset;
    const bVal = b.step_type === 'before' ? -b.days_offset : b.days_offset;
    return aVal - bVal;
  });

  const beforeSteps = sortedSteps.filter(s => s.step_type === 'before');
  const afterSteps = sortedSteps.filter(s => s.step_type === 'after');
  const activeSteps = config.steps.filter(s => s.enabled).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-bold text-zinc-50 uppercase tracking-wide">Régua de Cobrança</h1>
            <p className="text-xs font-mono text-zinc-500">Notificações automáticas de cobrança</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={config.enabled} onChange={handleToggleRegua} />
          <span className={`text-xs font-mono ${config.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {config.enabled ? 'ATIVA' : 'INATIVA'}
          </span>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-mono">Alterações salvas!</span>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-zinc-900/40 border-zinc-800">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Total de Etapas</p>
          <p className="text-2xl font-mono font-bold text-zinc-100 mt-1">{config.steps.length}</p>
        </div>
        <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Etapas Ativas</p>
          <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">{activeSteps}</p>
        </div>
        <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Antes do Vencimento</p>
          <p className="text-2xl font-mono font-bold text-blue-400 mt-1">{beforeSteps.length}</p>
        </div>
        <div className="p-4 rounded-xl border bg-red-500/5 border-red-500/20">
          <p className="text-[10px] font-mono uppercase text-zinc-500">Após Vencimento</p>
          <p className="text-2xl font-mono font-bold text-red-400 mt-1">{afterSteps.length}</p>
        </div>
      </div>

      {/* ==================== LINHA DO TEMPO VISUAL ==================== */}
      <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Visão Geral da Régua
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 overflow-x-auto">
          <div className="flex items-center justify-center min-w-[600px]">
            {/* Steps antes do vencimento */}
            {beforeSteps.map((step, i) => {
              const ch = channelConfig[step.channel] || channelConfig.whatsapp;
              const Icon = ch.icon;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center gap-2 relative group">
                    {/* Toggle */}
                    <div className="mb-1">
                      <button
                        onClick={() => handleToggleStep(step.id, !step.enabled)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${step.enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${step.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {/* Bolinha */}
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      step.enabled
                        ? 'border-blue-400 bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'border-zinc-700 bg-zinc-800/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${step.enabled ? ch.color : 'text-zinc-600'}`} />
                    </div>
                    {/* Label */}
                    <div className="text-center">
                      <p className={`text-[10px] font-mono font-bold ${step.enabled ? 'text-blue-400' : 'text-zinc-600'}`}>
                        -{step.days_offset}d
                      </p>
                      <p className={`text-[8px] font-mono ${step.enabled ? 'text-zinc-400' : 'text-zinc-700'}`}>
                        {ch.label}
                      </p>
                    </div>
                  </div>
                  {/* Linha conectora */}
                  <div className={`h-0.5 w-12 mx-1 mt-2 ${step.enabled ? 'bg-blue-500/30' : 'bg-zinc-800'}`} />
                </React.Fragment>
              );
            })}

            {/* Marcador VENCIMENTO */}
            <div className="flex flex-col items-center gap-2 mx-3 relative">
              <div className="mb-1 h-4" />
              <div className="w-12 h-12 rounded-full border-2 border-yellow-400 bg-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-mono font-bold text-yellow-400">DIA</p>
                <p className="text-[8px] font-mono text-yellow-400/70">Vencimento</p>
              </div>
            </div>

            {/* Steps depois do vencimento */}
            {afterSteps.map((step, i) => {
              const ch = channelConfig[step.channel] || channelConfig.whatsapp;
              const Icon = ch.icon;
              return (
                <React.Fragment key={step.id}>
                  {/* Linha conectora */}
                  <div className={`h-0.5 w-12 mx-1 mt-2 ${step.enabled ? 'bg-red-500/30' : 'bg-zinc-800'}`} />
                  <div className="flex flex-col items-center gap-2 relative group">
                    {/* Toggle */}
                    <div className="mb-1">
                      <button
                        onClick={() => handleToggleStep(step.id, !step.enabled)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${step.enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${step.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {/* Bolinha */}
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      step.enabled
                        ? 'border-red-400 bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                        : 'border-zinc-700 bg-zinc-800/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${step.enabled ? ch.color : 'text-zinc-600'}`} />
                    </div>
                    {/* Label */}
                    <div className="text-center">
                      <p className={`text-[10px] font-mono font-bold ${step.enabled ? 'text-red-400' : 'text-zinc-600'}`}>
                        +{step.days_offset}d
                      </p>
                      <p className={`text-[8px] font-mono ${step.enabled ? 'text-zinc-400' : 'text-zinc-700'}`}>
                        {ch.label}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-blue-400 bg-blue-500/20" />
              <span className="text-[9px] font-mono text-zinc-500">Antes do vencimento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-yellow-400 bg-yellow-500/20" />
              <span className="text-[9px] font-mono text-zinc-500">Dia do vencimento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-red-400 bg-red-500/20" />
              <span className="text-[9px] font-mono text-zinc-500">Após vencimento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-zinc-700 bg-zinc-800/50" />
              <span className="text-[9px] font-mono text-zinc-500">Desativada</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <span className="text-blue-400 text-xs font-mono">
          A régua de cobrança envia notificações automáticas para seus clientes antes e depois do vencimento.
          Use as variáveis {'{nome}'}, {'{valor}'}, {'{vencimento}'}, {'{dias}'} e {'{link}'} nas mensagens.
        </span>
      </div>

      {/* ==================== TIMELINE ==================== */}
      <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Linha do Tempo da Cobrança
            </CardTitle>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-[10px] font-mono uppercase transition-all"
            >
              <Plus className="w-3 h-3" />
              Nova Etapa
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Antes do vencimento */}
          {beforeSteps.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-blue-500/20" />
                <span className="text-[10px] font-mono uppercase text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  Antes do Vencimento
                </span>
                <div className="h-px flex-1 bg-blue-500/20" />
              </div>
              <div className="space-y-3">
                {beforeSteps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    editing={editingStep === step.id}
                    onEdit={() => setEditingStep(step.id)}
                    onCancelEdit={() => setEditingStep(null)}
                    onToggle={(enabled) => handleToggleStep(step.id, enabled)}
                    onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                    onDelete={() => handleDeleteStep(step.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Marcador do vencimento */}
          <div className="flex items-center gap-2 my-6">
            <div className="h-px flex-1 bg-yellow-500/30" />
            <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/30">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] font-mono uppercase font-bold text-yellow-400">
                Dia do Vencimento
              </span>
            </div>
            <div className="h-px flex-1 bg-yellow-500/30" />
          </div>

          {/* Depois do vencimento */}
          {afterSteps.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-red-500/20" />
                <span className="text-[10px] font-mono uppercase text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                  Após Vencimento
                </span>
                <div className="h-px flex-1 bg-red-500/20" />
              </div>
              <div className="space-y-3">
                {afterSteps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    editing={editingStep === step.id}
                    onEdit={() => setEditingStep(step.id)}
                    onCancelEdit={() => setEditingStep(null)}
                    onToggle={(enabled) => handleToggleStep(step.id, enabled)}
                    onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                    onDelete={() => handleDeleteStep(step.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {config.steps.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Bell className="w-10 h-10 text-zinc-700" />
              <p className="text-sm font-mono text-zinc-600">Nenhuma etapa configurada</p>
              <p className="text-xs font-mono text-zinc-700">Clique em "Nova Etapa" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== MODAL NOVA ETAPA ==================== */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="text-sm font-mono font-bold text-zinc-100 uppercase">Nova Etapa</h3>
              <button onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Quando</label>
                  <select
                    value={newStep.step_type}
                    onChange={(e) => setNewStep({ ...newStep, step_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="before">Antes do vencimento</option>
                    <option value="after">Após o vencimento</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Dias</label>
                  <input
                    type="number"
                    min="1"
                    value={newStep.days_offset}
                    onChange={(e) => setNewStep({ ...newStep, days_offset: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Canal</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(channelConfig).map(([key, ch]) => (
                    <button
                      key={key}
                      onClick={() => setNewStep({ ...newStep, channel: key as any })}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                        newStep.channel === key
                          ? ch.bg + ' ' + ch.color
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      <ch.icon className="w-3.5 h-3.5" />
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Mensagem</label>
                <textarea
                  value={newStep.message}
                  onChange={(e) => setNewStep({ ...newStep, message: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {variables.map((v) => (
                    <button
                      key={v.tag}
                      onClick={() => setNewStep({ ...newStep, message: newStep.message + ' ' + v.tag })}
                      className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[9px] font-mono text-zinc-400 transition-colors"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-800">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddStep}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-mono font-bold uppercase text-xs disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Componente: Step Card
// ============================================================
function StepCard({
  step,
  editing,
  onEdit,
  onCancelEdit,
  onToggle,
  onUpdate,
  onDelete,
}: {
  step: Step;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onToggle: (enabled: boolean) => void;
  onUpdate: (updates: Partial<Step>) => void;
  onDelete: () => void;
}) {
  const ch = channelConfig[step.channel] || channelConfig.whatsapp;
  const Icon = ch.icon;
  const isAfter = step.step_type === 'after';

  const [editMsg, setEditMsg] = useState(step.message);
  const [editDays, setEditDays] = useState(step.days_offset);
  const [editChannel, setEditChannel] = useState(step.channel);

  return (
    <div className={`relative p-4 rounded-xl border transition-all ${
      step.enabled
        ? isAfter
          ? 'bg-red-500/5 border-red-500/10 hover:border-red-500/30'
          : 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30'
        : 'bg-zinc-900/40 border-zinc-800 opacity-50'
    }`}>
      <div className="flex items-start gap-3">
        {/* Ícone do canal */}
        <div className={`p-2 rounded-lg border ${ch.bg}`}>
          <Icon className={`w-4 h-4 ${ch.color}`} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono font-bold ${isAfter ? 'text-red-400' : 'text-blue-400'}`}>
              {step.days_offset} {step.days_offset === 1 ? 'dia' : 'dias'} {isAfter ? 'após' : 'antes'}
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${ch.bg} ${ch.color}`}>
              {ch.label}
            </span>
            {!step.enabled && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600">
                PAUSADA
              </span>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Dias</label>
                  <input
                    type="number"
                    min="1"
                    value={editDays}
                    onChange={(e) => setEditDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Canal</label>
                  <select
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Mensagem</label>
                <textarea
                  value={editMsg}
                  onChange={(e) => setEditMsg(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {variables.map((v) => (
                    <button
                      key={v.tag}
                      onClick={() => setEditMsg(prev => prev + ' ' + v.tag)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[8px] font-mono text-zinc-500"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onCancelEdit} className="px-3 py-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300">
                  Cancelar
                </button>
                <button
                  onClick={() => onUpdate({ days_offset: editDays, channel: editChannel, message: editMsg })}
                  className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-mono hover:bg-emerald-500/30"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs font-mono text-zinc-400 leading-relaxed truncate">
              {step.message}
            </p>
          )}
        </div>

        {/* Ações */}
        {!editing && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Editar"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <Toggle checked={step.enabled} onChange={onToggle} />
          </div>
        )}
      </div>
    </div>
  );
}