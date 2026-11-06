// ============================================================
// V5 Fibra - Router principal do módulo financeiro
// ============================================================

import { Router } from 'express';
import { Pool } from 'pg';
import { gatewayRoutes } from './gateway.routes';
import { invoiceRoutes } from './invoices.routes';
import { reguaRoutes } from './regua.routes';
import { billingRoutes } from './billing.routes';
import { carneRoutes } from './carne.routes';
import { dashboardRoutes } from './dashboard.routes';
import { settingsRoutes } from './settings.routes';
import { webhookRoutes } from './webhook.routes';
import { financialRoutes } from './financial.routes';
import { billsRoutes } from './bills.routes';
import { cashflowRoutes } from './cashflow.routes';
import { syncRoutes } from './sync.routes';

export function createFinancialModule(config: { db: Pool }) {
  const { db } = config;
  const router = Router();

  // Gateway (Wide Pay config)
  router.use('/gateway', gatewayRoutes(db));

  // Faturas / Cobranças
  router.use('/invoices', invoiceRoutes(db));

  // Régua de cobrança
  router.use('/regua', reguaRoutes(db));

  // Billing (automação de cobrança)
  router.use('/billing', billingRoutes(db));

  // Carnês
  router.use('/carne', carneRoutes(db));

  // Dashboard financeiro
  router.use('/dashboard', dashboardRoutes(db));

  // Configurações
  router.use('/settings', settingsRoutes(db));

  // Webhooks (notificações do Wide Pay)
  router.use('/webhook', webhookRoutes(db));

  // Financeiro geral
  router.use('/financial', financialRoutes(db));

  // Contas a Pagar
  router.use('/bills', billsRoutes(db));

  // Fluxo de Caixa
  router.use('/cashflow', cashflowRoutes(db));

  // Sincronização Wide Pay → Sistema
  router.use('/sync', syncRoutes(db));

  return { router };
}