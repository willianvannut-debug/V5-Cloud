'use client';

// ============================================================
// V5 Fibra - Hook: useDashboard
// Busca os dados do dashboard financeiro (KPIs, gráficos, listas)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

export interface DashboardKPIs {
  monthlyRevenue: number;
  monthlyRevenueChange: number; // % vs mês anterior
  totalPending: number;
  totalOverdue: number;
  overdueRate: number; // % inadimplência
  activeCustomers: number;
  averageTicket: number;
}

export interface RevenueByMonth {
  month: string; // "2024-01", "2024-02"
  label: string; // "Jan", "Fev"
  revenue: number;
  count: number;
}

export interface UpcomingInvoice {
  id: string;
  customer_name: string;
  amount: number;
  due_date: string;
  billing_type: string;
  status: string;
}

export interface TopDebtor {
  customer_id: string;
  customer_name: string;
  total_overdue: number;
  overdue_count: number;
  oldest_due_date: string;
}

export interface RevenueByMethod {
  method: string; // BOLETO, PIX, CREDIT_CARD
  total: number;
  count: number;
  percentage: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  revenueByMonth: RevenueByMonth[];
  upcomingInvoices: UpcomingInvoice[];
  topDebtors: TopDebtor[];
  revenueByMethod: RevenueByMethod[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await api.get<DashboardData>('/financial/dashboard');

    if (res.data) {
      setData(res.data);
    }
    if (res.error) {
      setError(res.error);
      // Dados zerados para não quebrar a tela
      setData({
        kpis: {
          monthlyRevenue: 0,
          monthlyRevenueChange: 0,
          totalPending: 0,
          totalOverdue: 0,
          overdueRate: 0,
          activeCustomers: 0,
          averageTicket: 0,
        },
        revenueByMonth: [],
        upcomingInvoices: [],
        topDebtors: [],
        revenueByMethod: [],
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refresh: fetchDashboard };
}