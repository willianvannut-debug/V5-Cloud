// ============================================================
// V5 Fibra - Job automático de sincronização Wide Pay
// Roda periodicamente para TODAS as empresas com gateway
// Wide Pay habilitado, puxando pagamentos recebidos/atrasados
// para a tabela FATURAS — sem precisar de ação manual.
// ============================================================

import { Pool } from 'pg';
import { syncWidePayForEmpresa } from '../services/widepay-sync.service';

const INTERVALO_MS = 15 * 60 * 1000; // 15 minutos

export class WidePaySyncJob {
  private db: Pool;
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(db: Pool) {
    this.db = db;
  }

  start() {
    console.log('[WidePaySyncJob] Sincronização automática Wide Pay iniciada (a cada 15 min).');

    // Rodar uma vez logo na subida do servidor
    this.run();

    this.interval = setInterval(() => {
      this.run();
    }, INTERVALO_MS);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[WidePaySyncJob] Sincronização automática Wide Pay parada.');
  }

  async run() {
    if (this.running) {
      console.log('[WidePaySyncJob] Execução anterior ainda em andamento, pulando esta rodada.');
      return;
    }
    this.running = true;

    try {
      const tenants = await this.db.query(
        `SELECT DISTINCT tenant_id FROM gateway_configs WHERE enabled = true AND tenant_id IS NOT NULL`
      );

      if (tenants.rows.length === 0) {
        console.log('[WidePaySyncJob] Nenhuma empresa com Wide Pay habilitado.');
        return;
      }

      for (const row of tenants.rows) {
        const empresaId = row.tenant_id;
        try {
          await syncWidePayForEmpresa(this.db, empresaId);
        } catch (err: any) {
          console.error(`[WidePaySyncJob] Erro ao sincronizar empresa ${empresaId}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('[WidePaySyncJob] Erro geral:', err.message);
    } finally {
      this.running = false;
    }
  }
}
