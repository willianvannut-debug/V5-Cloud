// ============================================================
// V5 Fibra - Asaas API Client v3
// ============================================================

import { GatewayConfig } from '../types/financial.types';

export class AsaasClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: GatewayConfig) {
    this.baseUrl = config.environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
    this.apiKey = config.environment === 'production'
      ? config.apiKeyProduction
      : config.apiKeySandbox;
  }

  private async request(method: string, path: string, body?: any) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.errors?.map((e: any) => e.description).join(', ') || `Asaas error ${res.status}`;
      throw new Error(errorMsg);
    }
    return data;
  }

  // --- Customers ---
  async createCustomer(data: {
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    postalCode?: string;
    externalReference?: string;
  }) {
    return this.request('POST', '/customers', data);
  }

  async getCustomer(id: string) {
    return this.request('GET', `/customers/${id}`);
  }

  async findCustomerByCpfCnpj(cpfCnpj: string) {
    return this.request('GET', `/customers?cpfCnpj=${cpfCnpj}`);
  }

  // --- Charges ---
  async createCharge(data: {
    customer: string;
    billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    fine?: { value: number };
    interest?: { value: number };
    discount?: { value: number; dueDateLimitDays: number; type: 'PERCENTAGE' | 'FIXED' };
    split?: Array<{ walletId: string; fixedValue?: number; percentualValue?: number }>;
  }) {
    return this.request('POST', '/payments', data);
  }

  async getCharge(id: string) {
    return this.request('GET', `/payments/${id}`);
  }

  async listCharges(params: { customer?: string; status?: string; offset?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params.customer) query.append('customer', params.customer);
    if (params.status) query.append('status', params.status);
    if (params.offset !== undefined) query.append('offset', String(params.offset));
    if (params.limit !== undefined) query.append('limit', String(params.limit));
    return this.request('GET', `/payments?${query}`);
  }

  async deleteCharge(id: string) {
    return this.request('DELETE', `/payments/${id}`);
  }

  async refundCharge(id: string, value?: number) {
    return this.request('POST', `/payments/${id}/refund`, value ? { value } : undefined);
  }

  // --- PIX ---
  async getPixQrCode(chargeId: string) {
    return this.request('GET', `/payments/${chargeId}/pixQrCode`);
  }

  // --- Boleto ---
  async getBoletoBarcode(chargeId: string) {
    return this.request('GET', `/payments/${chargeId}/identificationField`);
  }

  // --- Installments ---
  async createInstallment(data: {
    customer: string;
    billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
    totalValue: number;
    installmentCount: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    fine?: { value: number };
    interest?: { value: number };
    split?: Array<{ walletId: string; fixedValue?: number; percentualValue?: number }>;
  }) {
    return this.request('POST', '/payments', {
      ...data,
      installmentCount: data.installmentCount,
      totalValue: data.totalValue,
    });
  }

  // --- Balance ---
  async getBalance() {
    return this.request('GET', '/finance/balance');
  }

  async getStatistics() {
    return this.request('GET', '/finance/payment/statistics');
  }

  // --- Webhook ---
  async getWebhookConfig() {
    return this.request('GET', '/webhook');
  }

  async updateWebhookConfig(data: {
    url: string;
    email?: string;
    apiVersion?: number;
    enabled: boolean;
    interrupted: boolean;
    authToken?: string;
  }) {
    return this.request('POST', '/webhook', data);
  }
}