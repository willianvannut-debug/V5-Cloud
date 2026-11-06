// ============================================================
// V5 Fibra - Hook: useGateway
// Gerencia configuração do gateway Wide Pay
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

const FINANCIAL_API = '/api/financial';

// ============================================================
// Tipos
// ============================================================

export interface GatewayFormData {
  provider: string;
  apiKeySandbox: string;
  apiKeyProduction: string;
  environment: string;
  webhookToken: string;
  widepayWalletId: string;
  widepayWalletToken: string;
  finePercentage: number;
  interestMonthlyPct: number;
  discountDaysBefore: number;
  discountPercentage: number;
  discountType: string;
  allowBoleto: boolean;
  allowPix: boolean;
  allowCreditCard: boolean;
}

export interface GatewayData {
  configured: boolean;
  data: {
    id?: string;
    widepay_wallet_id: string;
    widepay_wallet_token_masked: string;
    fine_percentage: number;
    interest_monthly_pct: number;
    discount_days_before: number;
    discount_percentage: number;
    discount_type: string;
    allow_boleto: boolean;
    allow_pix: boolean;
    enabled: boolean;
  } | null;
}

export interface TestResult {
  success: boolean;
  message: string;
  balance?: number;
}

// ============================================================
// Hook
// ============================================================

export function useGateway() {
  const [gateway, setGateway] = useState<GatewayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string>('');

  // ---- Buscar configuração atual ----
  const fetchGateway = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${FINANCIAL_API}/gateway`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }

      const result = await res.json();

      if (result.configured && result.data) {
        setGateway({
          configured: true,
          data: {
            id: result.data.id,
            widepay_wallet_id: result.data.wallet_id || '',
            widepay_wallet_token_masked: result.data.wallet_token_masked || '',
            fine_percentage: result.data.fine_percentage ?? 2,
            interest_monthly_pct: result.data.interest_monthly_pct ?? 1,
            discount_days_before: result.data.discount_days_before ?? 0,
            discount_percentage: result.data.discount_percentage ?? 0,
            discount_type: result.data.discount_type || 'PERCENTAGE',
            allow_boleto: result.data.allow_boleto ?? true,
            allow_pix: result.data.allow_pix ?? true,
            enabled: result.data.enabled ?? true,
          },
        });
      } else {
        setGateway({ configured: false, data: null });
      }
    } catch (err: any) {
      console.error('Erro ao carregar gateway:', err);
      setError('Erro ao carregar configuração do gateway');
      setGateway({ configured: false, data: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateway();
  }, [fetchGateway]);

  // ---- Salvar configuração ----
  const saveGateway = async (form: GatewayFormData): Promise<boolean> => {
    try {
      setSaving(true);
      setError('');

      const body: Record<string, any> = {
        wallet_id: form.widepayWalletId,
        fine_percentage: form.finePercentage,
        interest_monthly_pct: form.interestMonthlyPct,
        discount_days_before: form.discountDaysBefore,
        discount_percentage: form.discountPercentage,
        discount_type: form.discountType,
        allow_boleto: form.allowBoleto,
        allow_pix: form.allowPix,
        environment: form.environment || 'production',
      };

      if (form.widepayWalletToken) {
        body.wallet_token = form.widepayWalletToken;
      } else if (gateway?.data?.widepay_wallet_id) {
        if (!form.widepayWalletId && gateway.data.widepay_wallet_id) {
          body.wallet_id = gateway.data.widepay_wallet_id;
        }
      }

      if (!gateway?.configured && !form.widepayWalletToken) {
        setError('Token da carteira é obrigatório na primeira configuração');
        return false;
      }

      const res = await fetch(`${FINANCIAL_API}/gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || 'Erro ao salvar configuração');
        return false;
      }

      await fetchGateway();
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar gateway:', err);
      setError('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ---- Testar conexão ----
  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError('');

      const res = await fetch(`${FINANCIAL_API}/gateway/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const result = await res.json();
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Conexão OK!' : 'Falha na conexão'),
        balance: result.balance,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Erro ao testar: ' + (err.message || 'Verifique se o backend está online'),
      });
    } finally {
      setTesting(false);
    }
  };

  return {
    gateway,
    loading,
    saving,
    testing,
    testResult,
    error,
    saveGateway,
    testConnection,
  };
}