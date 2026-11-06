// ============================================================
// V5 Fibra - Tipos do módulo financeiro
// ============================================================

export interface GatewayConfig {
  id: string;
  tenantId: string;
  apiKeySandbox: string;
  apiKeyProduction: string;
  environment: 'sandbox' | 'production';
  webhookToken: string;
  webhookUrl: string;
  asaasWalletId: string;
  finePercentage: number;
  interestMonthlyPct: number;
  discountDaysBefore: number;
  discountPercentage: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  allowBoleto: boolean;
  allowPix: boolean;
  allowCreditCard: boolean;
  v5SplitWalletId?: string;
  v5SplitFixedValue?: number;
  v5SplitPercentage?: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  customer_id: string;
  asaas_charge_id?: string;
  amount: number;
  net_amount?: number;
  status: InvoiceStatus;
  billing_type: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
  due_date: string;
  paid_at?: string;
  description?: string;
  external_reference?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  pix_qrcode?: string;
  pix_payload?: string;
  invoice_url?: string;
  fine_percentage?: number;
  interest_monthly_pct?: number;
  discount_days_before?: number;
  discount_percentage?: number;
  discount_type?: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RECEIVED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'CANCELED'
  | 'REFUND_REQUESTED';

export interface InstallmentPlan {
  id: string;
  tenant_id: string;
  customer_id: string;
  total_amount: number;
  installment_count: number;
  billing_type: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELED';
  created_at: string;
}

export interface BillingRule {
  id: string;
  tenant_id: string;
  name: string;
  enabled: boolean;
  steps: BillingRuleStep[];
}

export interface BillingRuleStep {
  id: string;
  rule_id: string;
  days_offset: number;
  offset_type: 'before' | 'after';
  action: 'notify_email' | 'notify_sms' | 'notify_whatsapp' | 'block' | 'unblock' | 'negativate';
  message_template?: string;
  enabled: boolean;
  sort_order: number;
}

export interface PaymentEvent {
  id: string;
  tenant_id: string;
  invoice_id: string;
  event_type: string;
  asaas_event: string;
  data: any;
  created_at: string;
}

export interface AsaasCustomer {
  id: string;
  tenant_id: string;
  customer_id: string;
  asaas_customer_id: string;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  tenant_id?: string;
  event_type: string;
  payload: any;
  status: 'received' | 'processed' | 'error';
  error_message?: string;
  created_at: string;
}

export interface AccountPayable {
  id: string;
  tenant_id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
  category: string;
  supplier?: string;
  recurrence?: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditBureauEntry {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  customer_document: string;
  amount: number;
  days_overdue: number;
  status: 'PENDING' | 'SENT' | 'NEGATIVATED' | 'REMOVED';
  sent_at?: string;
  removed_at?: string;
  invoice_id: string;
  due_date: string;
}

export interface FiscalNote {
  id: string;
  tenant_id: string;
  invoice_id?: string;
  number: string;
  series: string;
  status: 'DRAFT' | 'AUTHORIZED' | 'CANCELED' | 'ERROR';
  xml?: string;
  pdf_url?: string;
  authorization_date?: string;
  cancel_date?: string;
  created_at: string;
}