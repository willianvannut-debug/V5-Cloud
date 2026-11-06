'use client';

// ============================================================
// V5 Fibra - Página: Gateway de Pagamento (Wide Pay)
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, Key, Globe, Link2, CreditCard, Percent,
  Check, X, Loader2, Eye, EyeOff, Save,
} from 'lucide-react';
import { useGateway, GatewayFormData } from '@/lib/useGateway';

// ============================================================
// Componentes auxiliares
// ============================================================

function Toggle({ checked, onChange, label, icon }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-black/50 border border-zinc-800 rounded-xl mb-3">
      <span className="flex items-center gap-2.5 text-sm text-white font-mono">{icon}{label}</span>
      <div
        className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}
        onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      >
        <div className={`w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] transition-all ${checked ? 'left-[23px]' : 'left-[3px]'}`} />
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, masked }: {
  value: string; onChange: (v: string) => void; placeholder?: string; masked?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={masked || placeholder}
        className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 pr-10"
      />
      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer" onClick={() => setShow(!show)}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ============================================================
// Componente principal
// ============================================================

export default function GatewayPage() {
  const { gateway, loading, saving, testing, testResult, error, saveGateway, testConnection } = useGateway();

  const [form, setForm] = useState<GatewayFormData>({
    provider: 'widepay',
    apiKeySandbox: '',
    apiKeyProduction: '',
    environment: 'production',
    webhookToken: '',
    widepayWalletId: '',
    widepayWalletToken: '',
    finePercentage: 2,
    interestMonthlyPct: 1,
    discountDaysBefore: 0,
    discountPercentage: 0,
    discountType: 'PERCENTAGE',
    allowBoleto: true,
    allowPix: true,
    allowCreditCard: false,
  });

  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (gateway?.data) {
      const d = gateway.data;
      setForm((prev) => ({
        ...prev,
        provider: 'widepay',
        environment: 'production',
        widepayWalletId: d.widepay_wallet_id || '',
        finePercentage: d.fine_percentage ?? 2,
        interestMonthlyPct: d.interest_monthly_pct ?? 1,
        discountDaysBefore: d.discount_days_before ?? 0,
        discountPercentage: d.discount_percentage ?? 0,
        discountType: d.discount_type || 'PERCENTAGE',
        allowBoleto: d.allow_boleto ?? true,
        allowPix: d.allow_pix ?? true,
        allowCreditCard: false,
      }));
    }
  }, [gateway]);

  const updateForm = (field: keyof GatewayFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSuccessMsg('');

    if (!form.widepayWalletId && !gateway?.data?.widepay_wallet_id) {
      return;
    }

    const ok = await saveGateway({ ...form, provider: 'widepay', environment: 'production' });
    if (ok) {
      setSuccessMsg('Configuração salva com sucesso!');
      setForm((prev) => ({ ...prev, widepayWalletToken: '' }));
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const isConfigured = gateway?.configured ?? false;

  if (loading) {
    return (
      <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" /> Gateway de Pagamento
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5 font-mono">Carregando configurações...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-zinc-800 rounded-lg animate-pulse w-3/5" />
                <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-10 bg-zinc-800 rounded-lg animate-pulse w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" /> Gateway de Pagamento
            {isConfigured && (
              <span className="ml-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-emerald-400" />
                Wide Pay Ativo
              </span>
            )}
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5 font-mono">
            Configure sua integração com o Wide Pay para processar boletos e PIX.
          </p>
        </div>
      </div>

      {/* ALERTS */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2">
          <X className="w-4 h-4" /> {error}
        </div>
      )}
      {testResult && (
        <div className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
          testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {testResult.message}
          {testResult.balance !== undefined && <span className="ml-2 font-bold">Saldo: R$ {testResult.balance.toFixed(2)}</span>}
        </div>
      )}

      {/* Aviso se não configurado */}
      {!isConfigured && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-mono">
          <p className="font-bold mb-1">⚠️ Gateway não configurado</p>
          <p className="text-amber-500/80">Preencha o ID e o Token da sua carteira Wide Pay abaixo para começar a gerar cobranças reais (boletos e PIX).</p>
        </div>
      )}

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ============================================================ */}
        {/* CARD 1 - Credenciais Wide Pay */}
        {/* ============================================================ */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Key className="w-4 h-4 text-emerald-400" />
              </div>
              Credenciais Wide Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-[11px] font-mono">
              💡 As credenciais estão em: <strong>widepay.com → Configurações → API</strong>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">ID da Carteira *</label>
              <input
                type="text" value={form.widepayWalletId}
                onChange={(e) => updateForm('widepayWalletId', e.target.value)}
                placeholder="Ex: 148446"
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              {gateway?.data?.widepay_wallet_id && !form.widepayWalletId && (
                <p className="text-[10px] text-zinc-600 font-mono mt-1">Atual: {gateway.data.widepay_wallet_id}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Token da Carteira *</label>
              <PasswordInput
                value={form.widepayWalletToken}
                onChange={(v) => updateForm('widepayWalletToken', v)}
                placeholder="Cole o token aqui..."
                masked={gateway?.data?.widepay_wallet_token_masked}
              />
              {gateway?.data?.widepay_wallet_token_masked && !form.widepayWalletToken && (
                <p className="text-[10px] text-zinc-600 font-mono mt-1">Atual: {gateway.data.widepay_wallet_token_masked}</p>
              )}
            </div>

            {/* Test Connection */}
            <div className="flex justify-end pt-2">
              <button
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                  testing || !isConfigured ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700'
                }`}
                onClick={testConnection} disabled={testing || !isConfigured}
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2 - Webhook */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Link2 className="w-4 h-4 text-emerald-400" />
              </div>
              Webhook (Notificações)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-[11px] font-mono">
                💡 No Wide Pay, a URL de notificação é enviada junto com cada cobrança. Você pode definir uma URL padrão nas configurações da carteira no site widepay.com.
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">
                O Wide Pay envia um POST com o ID da notificação quando o status de uma cobrança muda. O sistema consulta automaticamente os detalhes e atualiza o status da fatura.
              </p>
              {isConfigured && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[11px] font-mono flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Webhook configurado automaticamente nas cobranças.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CARD 3 - Métodos de Pagamento */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              Métodos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Toggle checked={form.allowBoleto} onChange={(v) => updateForm('allowBoleto', v)} label="Boleto Bancário" />
            <Toggle checked={form.allowPix} onChange={(v) => updateForm('allowPix', v)} label="PIX" />
            <p className="text-[10px] text-zinc-500 font-mono mt-3">
              O Wide Pay suporta Boleto e PIX. Selecione os métodos disponíveis para seus clientes.
            </p>
          </CardContent>
        </Card>

        {/* CARD 4 - Juros, Multa e Desconto */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Percent className="w-4 h-4 text-emerald-400" />
              </div>
              Juros, Multa e Desconto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Multa (%)</label>
                <input type="number" value={form.finePercentage} onChange={(e) => updateForm('finePercentage', parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" min="0" max="20" step="0.1" />
                <p className="text-[10px] text-zinc-600 font-mono mt-1">Percentual após vencimento</p>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Juros ao mês (%)</label>
                <input type="number" value={form.interestMonthlyPct} onChange={(e) => updateForm('interestMonthlyPct', parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" min="0" max="20" step="0.1" />
                <p className="text-[10px] text-zinc-600 font-mono mt-1">Juros mensal proporcional por dia</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Tipo de Desconto</label>
              <div className="flex bg-black/50 border border-zinc-800 rounded-xl overflow-hidden">
                <button className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${form.discountType === 'PERCENTAGE' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                  onClick={() => updateForm('discountType', 'PERCENTAGE')}>Percentual (%)</button>
                <button className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${form.discountType === 'FIXED' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                  onClick={() => updateForm('discountType', 'FIXED')}>Valor Fixo (R$)</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Desconto {form.discountType === 'PERCENTAGE' ? '(%)' : '(R$)'}</label>
                <input type="number" value={form.discountPercentage} onChange={(e) => updateForm('discountPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" min="0" step="0.1" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block">Dias antes do venc.</label>
                <input type="number" value={form.discountDaysBefore} onChange={(e) => updateForm('discountDaysBefore', parseInt(e.target.value) || 0)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" min="0" max="30" step="1" />
                <p className="text-[10px] text-zinc-600 font-mono mt-1">0 = sem desconto antecipado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          className={`px-6 py-3 rounded-xl transition-all font-mono flex items-center gap-2 text-xs font-bold uppercase ${
            saving ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer'
          }`}
          onClick={handleSave} disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}