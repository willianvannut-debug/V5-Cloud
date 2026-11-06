// ============================================================
// V5 Fibra - Wide Pay API Client
// ============================================================

interface WidePayConfig {
  walletId: string;
  walletToken: string;
}

interface WidePayItem {
  descricao: string;
  valor: number;
  quantidade?: number;
}

interface WidePayCobranca {
  forma: string;
  cliente: string;
  pessoa: 'Física' | 'Jurídica';
  cpf?: string;
  cnpj?: string;
  itens: WidePayItem[];
  vencimento: string;
  email?: string;
  telefone?: string;
  referencia?: string;
  notificacao?: string;
  multa?: number;
  juros?: number;
  desconto?: number;
}

interface WidePayCarne {
  forma: string;
  cliente: string;
  pessoa: 'Física' | 'Jurídica';
  cpf?: string;
  cnpj?: string;
  itens: WidePayItem[];
  vencimento: string;
  parcelas: number;
  dividir: 'Sim' | 'Não';
  email?: string;
  telefone?: string;
  referencia?: string;
  notificacao?: string;
}

export class WidePayClient {
  private baseUrl = 'https://api.widepay.com/v1';
  private auth: string;

  constructor(config: WidePayConfig) {
    this.auth = Buffer.from(`${config.walletId}:${config.walletToken}`).toString('base64');
  }

  private async request(endpoint: string, body: Record<string, any> = {}) {
    const formData = this.toFormData(body);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await response.json();

    if (!data.sucesso) {
      const errorMsg = data.erro || 'Erro desconhecido na API Wide Pay';
      throw new Error(errorMsg);
    }

    return data;
  }

  private toFormData(obj: Record<string, any>, prefix = ''): string {
    const parts: string[] = [];

    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      const value = obj[key];

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            parts.push(this.toFormData(item, `${fullKey}[${index}]`));
          } else {
            parts.push(`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(item)}`);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        parts.push(this.toFormData(value, fullKey));
      } else if (value !== undefined && value !== null) {
        parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
      }
    }

    return parts.filter(p => p).join('&');
  }

  // ---- Cobranças ----

  async criarCobranca(data: WidePayCobranca) {
    return this.request('/recebimentos/cobrancas/adicionar', data);
  }

  async consultarCobranca(id?: string | string[]) {
    const body: any = {};
    if (id) body.id = id;
    return this.request('/recebimentos/cobrancas/consultar', body);
  }

  async cancelarCobranca(id: string | string[]) {
    return this.request('/recebimentos/cobrancas/cancelar', { id });
  }

  async obterBoleto(id: string, html = false, pix = false) {
    return this.request('/recebimentos/cobrancas/boleto', {
      id, html: html ? 'Sim' : 'Não', pix: pix ? 'Sim' : 'Não'
    });
  }

  async obterPix(id: string) {
    return this.request('/recebimentos/cobrancas/pix', { id });
  }

  async receberManualmente(id: string | string[]) {
    return this.request('/recebimentos/cobrancas/manual', { id });
  }

  // ---- Carnês ----

  async criarCarne(data: WidePayCarne) {
    return this.request('/recebimentos/carnes/adicionar', data);
  }

  async consultarCarne(id?: string | string[]) {
    const body: any = {};
    if (id) body.id = id;
    return this.request('/recebimentos/carnes/consultar', body);
  }

  async cancelarCarne(id: string | string[]) {
    return this.request('/recebimentos/carnes/cancelar', { id });
  }

  // ---- Notificações (Webhook) ----

  async consultarNotificacaoCobranca(notificacaoId: string) {
    return this.request('/recebimentos/cobrancas/notificacao', { id: notificacaoId });
  }

  async consultarNotificacaoCarne(notificacaoId: string) {
    return this.request('/recebimentos/carnes/notificacao', { id: notificacaoId });
  }

  // ---- Teste de conexão ----

  async testarConexao() {
    try {
      const result = await this.consultarCobranca();
      return { success: true, message: 'Conexão OK!' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}